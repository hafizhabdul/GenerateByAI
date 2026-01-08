-- ============================================
-- SESSIONS TABLE - Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Create sessions table for grouping generations (like ChatGPT/Gemini)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Session info
    title TEXT, -- Auto-generated from first prompt or user-editable
    type TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status flags
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE
);

-- Add session_id column to generations table
ALTER TABLE generations 
ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_type ON sessions(type);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_is_archived ON sessions(is_archived);
CREATE INDEX idx_sessions_is_pinned ON sessions(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_generations_session_id ON generations(session_id);

-- Function to auto-update updated_at on sessions
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamp();

-- ============================================
-- MIGRATION: Assign existing generations to sessions
-- This groups old generations by time proximity (30 min)
-- ============================================
DO $$
DECLARE
    rec RECORD;
    current_session_id UUID;
    last_time TIMESTAMPTZ;
    last_user_id UUID;
    last_type TEXT;
    session_gap INTERVAL := '30 minutes';
BEGIN
    current_session_id := NULL;
    last_time := NULL;
    last_user_id := NULL;
    last_type := NULL;
    
    -- Loop through all generations ordered by user, type, and time
    FOR rec IN 
        SELECT id, user_id, type, prompt, created_at
        FROM generations
        WHERE session_id IS NULL
        ORDER BY user_id, type, created_at ASC
    LOOP
        -- Check if we need a new session
        IF current_session_id IS NULL 
           OR rec.user_id != last_user_id 
           OR rec.type != last_type
           OR (rec.created_at - last_time) > session_gap 
        THEN
            -- Create a new session
            INSERT INTO sessions (user_id, type, title, created_at, updated_at)
            VALUES (
                rec.user_id, 
                rec.type, 
                LEFT(rec.prompt, 100), -- Title from first prompt
                rec.created_at,
                rec.created_at
            )
            RETURNING id INTO current_session_id;
        END IF;
        
        -- Assign generation to current session
        UPDATE generations 
        SET session_id = current_session_id 
        WHERE id = rec.id;
        
        -- Update tracking variables
        last_time := rec.created_at;
        last_user_id := rec.user_id;
        last_type := rec.type;
    END LOOP;
END $$;
