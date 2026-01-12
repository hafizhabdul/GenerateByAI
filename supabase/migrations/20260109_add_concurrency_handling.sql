-- Migration: Add token reservation system for concurrency handling
-- This prevents race conditions when multiple concurrent requests try to deduct tokens

-- Create token reservations table
CREATE TABLE IF NOT EXISTS token_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_token_reservations_user_status ON token_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_token_reservations_expires ON token_reservations(expires_at) WHERE status = 'pending';

-- Function: Reserve tokens atomically with row-level lock
-- Returns JSON with success status, reservation_id, and available tokens after reservation
CREATE OR REPLACE FUNCTION reserve_tokens(p_user_id UUID, p_cost INTEGER)
RETURNS JSON AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_current_balance INTEGER;
    v_pending_reservations INTEGER;
    v_available INTEGER;
    v_reservation_id UUID;
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
    v_current_balance := COALESCE(v_profile.tokens_total, 0) - COALESCE(v_profile.tokens_used, 0);

    -- Get sum of pending reservations (that haven't expired)
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_reservations
    FROM token_reservations
    WHERE user_id = p_user_id
    AND status = 'pending'
    AND expires_at > NOW();

    -- Calculate actual available tokens
    v_available := v_current_balance - v_pending_reservations;

    -- Check if enough tokens available
    IF v_available < p_cost THEN
        RETURN json_build_object(
            'success', false,
            'message', format('Insufficient tokens. This action requires %s tokens, but you only have %s available.', p_cost, v_available),
            'required', p_cost,
            'available', v_available
        );
    END IF;

    -- Create reservation
    INSERT INTO token_reservations (user_id, amount, status, expires_at)
    VALUES (p_user_id, p_cost, 'pending', NOW() + INTERVAL '10 minutes')
    RETURNING id INTO v_reservation_id;

    RETURN json_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'available_after', v_available - p_cost
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Commit a token reservation (deduct tokens after successful generation)
CREATE OR REPLACE FUNCTION commit_token_charge(p_reservation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_reservation token_reservations%ROWTYPE;
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

    -- Update profile tokens
    UPDATE profiles
    SET tokens_used = COALESCE(tokens_used, 0) + v_reservation.amount
    WHERE id = v_reservation.user_id;

    -- Mark reservation as committed
    UPDATE token_reservations
    SET status = 'committed'
    WHERE id = p_reservation_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Tokens deducted successfully',
        'amount', v_reservation.amount
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Cancel a token reservation (if generation failed)
CREATE OR REPLACE FUNCTION cancel_token_reservation(p_reservation_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE token_reservations
    SET status = 'cancelled'
    WHERE id = p_reservation_id
    AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Reservation not found or already processed'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Reservation cancelled'
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup expired reservations (run periodically via cron or trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE token_reservations
    SET status = 'cancelled'
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for token_reservations
ALTER TABLE token_reservations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reservations
CREATE POLICY "Users can view own reservations"
ON token_reservations FOR SELECT
USING (auth.uid() = user_id);

-- Only the system (service role) can insert/update reservations
-- This is handled by the RPC functions which run with elevated privileges
