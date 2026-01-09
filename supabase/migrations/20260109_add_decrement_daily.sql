-- Migration: Add function to decrement daily generation count (for refunds)

CREATE OR REPLACE FUNCTION decrement_daily_generation(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    UPDATE profiles
    SET daily_generations_count = GREATEST(COALESCE(daily_generations_count, 0) - 1, 0)
    WHERE id = p_user_id
    RETURNING daily_generations_count INTO v_new_count;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    RETURN json_build_object('success', true, 'new_count', v_new_count);
END;
$$ LANGUAGE plpgsql;
