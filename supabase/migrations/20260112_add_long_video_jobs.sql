-- Long Video Jobs Table
-- Tracks multi-segment video generation jobs for creating 1-2 minute marketing videos

CREATE TABLE IF NOT EXISTS long_video_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'stitching', 'completed', 'failed')),
    
    -- Content
    prompt TEXT NOT NULL,
    
    -- Duration settings
    target_duration INTEGER NOT NULL CHECK (target_duration IN (60, 90, 120)),
    current_duration INTEGER NOT NULL DEFAULT 0,
    
    -- Generation settings (JSON)
    settings JSONB NOT NULL DEFAULT '{
        "resolution": "720p",
        "aspectRatio": "16:9"
    }'::jsonb,
    
    -- Segments (array of segment info)
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Result
    final_video_url TEXT,
    
    -- Token tracking
    tokens_reserved INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    
    -- Error info
    error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_long_video_jobs_user_id ON long_video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_long_video_jobs_status ON long_video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_long_video_jobs_created_at ON long_video_jobs(created_at DESC);

-- Index for finding incomplete jobs (for cleanup/resume)
CREATE INDEX IF NOT EXISTS idx_long_video_jobs_pending ON long_video_jobs(user_id, status) 
    WHERE status IN ('pending', 'processing');

-- Enable RLS
ALTER TABLE long_video_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own jobs
CREATE POLICY "Users can view own long video jobs"
    ON long_video_jobs FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own jobs
CREATE POLICY "Users can create own long video jobs"
    ON long_video_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own jobs
CREATE POLICY "Users can update own long video jobs"
    ON long_video_jobs FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own jobs
CREATE POLICY "Users can delete own long video jobs"
    ON long_video_jobs FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_long_video_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_long_video_jobs_updated_at
    BEFORE UPDATE ON long_video_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_long_video_jobs_updated_at();

-- Comment for documentation
COMMENT ON TABLE long_video_jobs IS 'Tracks long video generation jobs (1-2 minutes) using chain generation approach';
COMMENT ON COLUMN long_video_jobs.segments IS 'JSON array of segment info: [{id, generationId, order, status, duration, videoUrl, thumbnailUrl, createdAt}]';
COMMENT ON COLUMN long_video_jobs.settings IS 'JSON object: {resolution, aspectRatio, negativePrompt?}';
