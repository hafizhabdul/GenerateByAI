-- Migration: Add daily generation limits per plan
-- Limits: Free=3, Starter=5, Creator=10, Business=20

-- Add daily generation tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_generations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_generations_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day');

-- Create plan_limits table for configurable limits
CREATE TABLE IF NOT EXISTS plan_limits (
    plan TEXT PRIMARY KEY,
    daily_generations INTEGER NOT NULL,
    description TEXT
);

-- Insert default plan limits
INSERT INTO plan_limits (plan, daily_generations, description) VALUES
    ('free', 3, 'Free tier - 3 generations per day'),
    ('starter', 5, 'Starter tier - 5 generations per day'),
    ('creator', 10, 'Creator tier - 10 generations per day'),
    ('business', 20, 'Business tier - 20 generations per day')
ON CONFLICT (plan) DO UPDATE SET
    daily_generations = EXCLUDED.daily_generations,
    description = EXCLUDED.description;

-- Function: Check daily limit and return status
-- Returns: allowed (boolean), remaining (integer), resets_at (timestamptz)
CREATE OR REPLACE FUNCTION check_daily_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, resets_at TIMESTAMPTZ, plan_name TEXT) AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_limit INTEGER;
    v_plan TEXT;
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

    -- Check if user has reached limit
    IF COALESCE(v_profile.daily_generations_count, 0) >= v_limit THEN
        RETURN QUERY SELECT
            FALSE,
            0,
            v_profile.daily_generations_reset_at,
            v_plan;
    ELSE
        RETURN QUERY SELECT
            TRUE,
            v_limit - COALESCE(v_profile.daily_generations_count, 0) - 1,
            v_profile.daily_generations_reset_at,
            v_plan;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment daily generation count (call after successful generation)
CREATE OR REPLACE FUNCTION increment_daily_generation(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    UPDATE profiles
    SET daily_generations_count = COALESCE(daily_generations_count, 0) + 1
    WHERE id = p_user_id
    RETURNING daily_generations_count INTO v_new_count;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;

    RETURN json_build_object('success', true, 'new_count', v_new_count);
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's daily limit info without modifying anything
CREATE OR REPLACE FUNCTION get_daily_limit_info(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_limit INTEGER;
    v_plan TEXT;
    v_remaining INTEGER;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'User not found');
    END IF;

    v_plan := COALESCE(v_profile.plan, 'free');

    SELECT daily_generations INTO v_limit FROM plan_limits WHERE plan = v_plan;
    IF v_limit IS NULL THEN v_limit := 3; END IF;

    v_remaining := v_limit - COALESCE(v_profile.daily_generations_count, 0);
    IF v_remaining < 0 THEN v_remaining := 0; END IF;

    RETURN json_build_object(
        'plan', v_plan,
        'limit', v_limit,
        'used', COALESCE(v_profile.daily_generations_count, 0),
        'remaining', v_remaining,
        'resets_at', v_profile.daily_generations_reset_at
    );
END;
$$ LANGUAGE plpgsql;

-- RLS Policy for plan_limits (read-only for all authenticated users)
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plan limits"
ON plan_limits FOR SELECT
USING (true);
