-- Migration: Add token history tracking system
-- Provides comprehensive audit trail for all token transactions

-- Create token history table for tracking all token changes
CREATE TABLE IF NOT EXISTS token_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive = deduction, Negative = refund/addition
    type TEXT NOT NULL CHECK (type IN ('deduction', 'refund', 'purchase', 'bonus', 'reset')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    generation_type TEXT, -- 'image', 'video', 'edit', etc.
    generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
    description TEXT,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_history_user_created ON token_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_history_user_type ON token_history(user_id, type);
CREATE INDEX IF NOT EXISTS idx_token_history_generation ON token_history(generation_id) WHERE generation_id IS NOT NULL;

-- Function: Refund tokens for failed generation
-- This reverses a committed token charge and creates history record
CREATE OR REPLACE FUNCTION refund_tokens(
    p_user_id UUID, 
    p_amount INTEGER,
    p_generation_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'Generation failed'
)
RETURNS JSON AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_history_id UUID;
BEGIN
    -- Lock the profile row to prevent concurrent modifications
    SELECT * INTO v_profile
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User profile not found'
        );
    END IF;

    -- Calculate current balance
    v_balance_before := COALESCE(v_profile.tokens_total, 0) - COALESCE(v_profile.tokens_used, 0);

    -- Refund tokens by reducing tokens_used
    UPDATE profiles
    SET tokens_used = GREATEST(COALESCE(tokens_used, 0) - p_amount, 0)
    WHERE id = p_user_id;

    v_balance_after := v_balance_before + p_amount;

    -- Create history record
    INSERT INTO token_history (
        user_id, amount, type, status, 
        generation_type, generation_id, description,
        balance_before, balance_after
    )
    VALUES (
        p_user_id, -p_amount, 'refund', 'success',
        CASE WHEN p_generation_id IS NOT NULL THEN 
            (SELECT type FROM generations WHERE id = p_generation_id)
        ELSE NULL END,
        p_generation_id, p_reason,
        v_balance_before, v_balance_after
    )
    RETURNING id INTO v_history_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Tokens refunded successfully',
        'amount', p_amount,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'history_id', v_history_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Record token history entry
-- Used for tracking purchases, bonuses, and other non-generation transactions
CREATE OR REPLACE FUNCTION record_token_history(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_status TEXT,
    p_generation_type TEXT DEFAULT NULL,
    p_generation_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_history_id UUID;
BEGIN
    SELECT * INTO v_profile
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User profile not found'
        );
    END IF;

    v_balance_before := COALESCE(v_profile.tokens_total, 0) - COALESCE(v_profile.tokens_used, 0);
    
    -- For deductions, balance decreases; for refunds/purchases, it increases
    IF p_type = 'deduction' THEN
        v_balance_after := v_balance_before - p_amount;
    ELSE
        v_balance_after := v_balance_before + ABS(p_amount);
    END IF;

    INSERT INTO token_history (
        user_id, amount, type, status,
        generation_type, generation_id, description,
        balance_before, balance_after
    )
    VALUES (
        p_user_id, p_amount, p_type, p_status,
        p_generation_type, p_generation_id, p_description,
        v_balance_before, v_balance_after
    )
    RETURNING id INTO v_history_id;

    RETURN json_build_object(
        'success', true,
        'history_id', v_history_id,
        'balance_after', v_balance_after
    );
END;
$$ LANGUAGE plpgsql;

-- Update commit_token_charge to also record history
CREATE OR REPLACE FUNCTION commit_token_charge(p_reservation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_reservation token_reservations%ROWTYPE;
    v_profile profiles%ROWTYPE;
    v_balance_before INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- Lock and fetch the reservation
    SELECT * INTO v_reservation
    FROM token_reservations
    WHERE id = p_reservation_id
    AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Reservation not found or already processed'
        );
    END IF;

    -- Get current balance before update
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE id = v_reservation.user_id;
    
    v_balance_before := COALESCE(v_profile.tokens_total, 0) - COALESCE(v_profile.tokens_used, 0);
    v_balance_after := v_balance_before - v_reservation.amount;

    -- Update profile tokens
    UPDATE profiles
    SET tokens_used = COALESCE(tokens_used, 0) + v_reservation.amount
    WHERE id = v_reservation.user_id;

    -- Mark reservation as committed
    UPDATE token_reservations
    SET status = 'committed'
    WHERE id = p_reservation_id;

    -- Record in history
    INSERT INTO token_history (
        user_id, amount, type, status,
        description, balance_before, balance_after
    )
    VALUES (
        v_reservation.user_id, v_reservation.amount, 'deduction', 'success',
        'Generation token charge', v_balance_before, v_balance_after
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Tokens deducted successfully',
        'amount', v_reservation.amount,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after
    );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for token_history
ALTER TABLE token_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token history
CREATE POLICY "Users can view own token history"
ON token_history FOR SELECT
USING (auth.uid() = user_id);
