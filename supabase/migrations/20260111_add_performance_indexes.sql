-- ============================================================================
-- Performance Indexes
-- Run this AFTER the RPC function migration
--
-- NOTE: These use regular CREATE INDEX (not CONCURRENTLY) so they can run
-- in Supabase SQL Editor. For large tables in production, consider running
-- each index separately with CONCURRENTLY outside of a transaction.
-- ============================================================================

-- Composite index for user + type queries (most common pattern)
-- Used by: /api/user stats, /api/generations filtering
CREATE INDEX IF NOT EXISTS
    idx_generations_user_type ON generations(user_id, type);

-- Composite index for user + created_at (for date filtering)
-- Used by: /api/generations with date sorting
CREATE INDEX IF NOT EXISTS
    idx_generations_user_created ON generations(user_id, created_at DESC);

-- Partial index for community queries (only completed + public)
-- Used by: /api/community - significantly speeds up public gallery
CREATE INDEX IF NOT EXISTS
    idx_generations_community ON generations(created_at DESC)
    WHERE status = 'completed' AND is_public = true;

-- Index for payment queries
-- Used by: /api/payments, /api/checkout history
CREATE INDEX IF NOT EXISTS
    idx_payments_user_status ON payments(user_id, status);

-- Index for pending video status checks
-- Used by: /api/video-status polling
CREATE INDEX IF NOT EXISTS
    idx_generations_pending_video ON generations(user_id, status, type)
    WHERE status IN ('pending', 'processing') AND type = 'video';

-- Index for favorite queries
-- Used by: /api/generations?favorites=true
CREATE INDEX IF NOT EXISTS
    idx_generations_user_favorites ON generations(user_id, is_favorite)
    WHERE is_favorite = true;
