-- Migration: Fix daily limit reset in get_daily_limit_info function
-- Issue: get_daily_limit_info was not resetting counter when past reset time

-- Function: Get user's daily limit info (now with auto-reset)
CREATE OR REPLACE FUNCTION get_daily_limit_info(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_limit INTEGER;
    v_plan TEXT;
    v_remaining INTEGER;
    v_used INTEGER;
    v_reset_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'User not found');
    END IF;

    -- Check if we need to reset (past reset time)
    IF v_profile.daily_generations_reset_at IS NULL OR v_profile.daily_generations_reset_at < NOW() THEN
        -- Reset the counter
        UPDATE profiles SET
            daily_generations_count = 0,
            daily_generations_reset_at = NOW() + INTERVAL '1 day'
        WHERE id = p_user_id
        RETURNING daily_generations_count, daily_generations_reset_at INTO v_used, v_reset_at;
    ELSE
        v_used := COALESCE(v_profile.daily_generations_count, 0);
        v_reset_at := v_profile.daily_generations_reset_at;
    END IF;

    v_plan := COALESCE(v_profile.plan, 'free');

    SELECT daily_generations INTO v_limit FROM plan_limits WHERE plan = v_plan;
    IF v_limit IS NULL THEN v_limit := 3; END IF;

    v_remaining := v_limit - v_used;
    IF v_remaining < 0 THEN v_remaining := 0; END IF;

    RETURN json_build_object(
        'plan', v_plan,
        'limit', v_limit,
        'used', v_used,
        'remaining', v_remaining,
        'resets_at', v_reset_at
    );
END;
$$ LANGUAGE plpgsql;

-- Also fix check_daily_limit to ensure it returns correct remaining count
-- The original had a bug: it was returning (limit - count - 1) which is wrong
-- It should return (limit - count) BEFORE the generation happens
CREATE OR REPLACE FUNCTION check_daily_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, resets_at TIMESTAMPTZ, plan_name TEXT) AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_limit INTEGER;
    v_plan TEXT;
    v_count INTEGER;
BEGIN
    -- Get profile with lock to prevent race conditions
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, NOW(), 'unknown'::TEXT;
        RETURN;
    END IF;

    -- Reset counter if past reset time
    IF v_profile.daily_generations_reset_at IS NULL OR v_profile.daily_generations_reset_at < NOW() THEN
        UPDATE profiles SET
            daily_generations_count = 0,
            daily_generations_reset_at = NOW() + INTERVAL '1 day'
        WHERE id = p_user_id
        RETURNING * INTO v_profile;
    END IF;

    -- Get plan (default to 'free' if null)
    v_plan := COALESCE(v_profile.plan, 'free');

    -- Get plan limit
    SELECT daily_generations INTO v_limit
    FROM plan_limits WHERE plan = v_plan;

    -- Default to free limit if plan not found
    IF v_limit IS NULL THEN
        v_limit := 3;
    END IF;

    v_count := COALESCE(v_profile.daily_generations_count, 0);

    -- Check if user has reached limit
    IF v_count >= v_limit THEN
        RETURN QUERY SELECT
            FALSE,
            0,
            v_profile.daily_generations_reset_at,
            v_plan;
    ELSE
        -- Return remaining BEFORE this generation (so if count=0, limit=3, remaining=3)
        RETURN QUERY SELECT
            TRUE,
            v_limit - v_count,
            v_profile.daily_generations_reset_at,
            v_plan;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add increment_daily_generation with reset check too
CREATE OR REPLACE FUNCTION increment_daily_generation(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_new_count INTEGER;
    v_reset_at TIMESTAMPTZ;
BEGIN
    -- First check if we need to reset
    SELECT daily_generations_reset_at INTO v_reset_at
    FROM profiles WHERE id = p_user_id;

    IF v_reset_at IS NULL OR v_reset_at < NOW() THEN
        -- Reset first, then increment to 1
        UPDATE profiles
        SET 
            daily_generations_count = 1,
            daily_generations_reset_at = NOW() + INTERVAL '1 day'
        WHERE id = p_user_id
        RETURNING daily_generations_count INTO v_new_count;
    ELSE
        -- Normal increment
        UPDATE profiles
        SET daily_generations_count = COALESCE(daily_generations_count, 0) + 1
        WHERE id = p_user_id
        RETURNING daily_generations_count INTO v_new_count;
    END IF;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    RETURN json_build_object('success', true, 'new_count', v_new_count);
END;
$$ LANGUAGE plpgsql;
