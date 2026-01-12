-- Migration: Fix refund function
-- 1. Remove error_message column reference (use metadata instead)
-- 2. Include 'fetching' status in refund eligibility

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
    v_rows_affected INTEGER;
    v_current_metadata JSONB;
BEGIN
    -- 1. Atomic status update on generations (if ID provided)
    -- This prevents multiple refunds for the same generation
    IF p_generation_id IS NOT NULL THEN
        -- Get current metadata first
        SELECT metadata INTO v_current_metadata
        FROM generations
        WHERE id = p_generation_id;

        -- Update status to failed and store error in metadata
        UPDATE generations
        SET status = 'failed',
            metadata = COALESCE(v_current_metadata, '{}'::jsonb) || jsonb_build_object('error', p_reason)
        WHERE id = p_generation_id
        AND status IN ('processing', 'pending', 'fetching'); -- Include 'fetching' status

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

        -- If no rows affected it means it's already failed, completed, or not found
        IF v_rows_affected = 0 THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Generation already processed, completed, or not found'
            );
        END IF;
    END IF;

    -- 2. Lock the profile row
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

    -- 3. Calculate balance
    v_balance_before := COALESCE(v_profile.tokens_total, 0) - COALESCE(v_profile.tokens_used, 0);

    -- 4. Refund tokens AND decrement daily count
    UPDATE profiles
    SET tokens_used = GREATEST(COALESCE(tokens_used, 0) - p_amount, 0),
        daily_generations_count = GREATEST(COALESCE(daily_generations_count, 0) - 1, 0)
    WHERE id = p_user_id;

    v_balance_after := v_balance_before + p_amount;

    -- 5. Create history record
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
        'message', 'Tokens and daily quota refunded successfully',
        'amount', p_amount,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'history_id', v_history_id
    );
END;
$$ LANGUAGE plpgsql;
