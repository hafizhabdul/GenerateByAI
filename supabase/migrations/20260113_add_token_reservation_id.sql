-- Add token_reservation_id to long_video_jobs for proper token refund handling
-- This allows us to commit tokens on success or cancel/refund on failure

ALTER TABLE long_video_jobs 
ADD COLUMN IF NOT EXISTS token_reservation_id TEXT;

COMMENT ON COLUMN long_video_jobs.token_reservation_id IS 'Reservation ID from token system for commit/cancel on job completion/failure';
