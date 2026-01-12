-- ============================================================================
-- User Stats RPC Function
-- Replaces 9 sequential queries with 1 optimized query
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_user_stats(UUID);

-- Create optimized stats function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT json_build_object(
        'total_images', COUNT(*) FILTER (WHERE type = 'image'),
        'total_videos', COUNT(*) FILTER (WHERE type = 'video'),
        'total_favorites', COUNT(*) FILTER (WHERE is_favorite = true),
        'today_images', COUNT(*) FILTER (
            WHERE type = 'image'
            AND created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Jakarta'
        ),
        'today_videos', COUNT(*) FILTER (
            WHERE type = 'video'
            AND created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Jakarta'
        )
    )
    FROM generations
    WHERE user_id = p_user_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_stats IS 'Get aggregated user statistics in a single query. Returns total images, videos, favorites, and today counts.';
