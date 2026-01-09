-- Migration: Fix WAN video generation race condition
-- Adds 'fetching' status for optimistic locking during result fetch

-- Drop the existing constraint and add new one with 'fetching' status
ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_status_check;

-- Add constraint with new 'fetching' status
-- Note: Supabase might have auto-generated constraint name, try common patterns
DO $$
BEGIN
    -- Try to drop by common auto-generated names
    BEGIN
        ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
        ALTER TABLE generations DROP CONSTRAINT IF EXISTS "generations_status_check1";
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Drop all check constraints on status column
    EXECUTE (
        SELECT COALESCE(
            string_agg('ALTER TABLE generations DROP CONSTRAINT IF EXISTS ' || quote_ident(conname) || ';', ' '),
            ''
        )
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE c.conrelid = 'generations'::regclass
        AND c.contype = 'c'
        AND a.attname = 'status'
    );
END $$;

-- Add the new check constraint with 'fetching' status
ALTER TABLE generations ADD CONSTRAINT generations_status_check
    CHECK (status IN ('pending', 'processing', 'fetching', 'completed', 'failed'));

-- Create partial index for faster lookup of active generations
CREATE INDEX IF NOT EXISTS idx_generations_active_status
    ON generations(user_id, status)
    WHERE status IN ('processing', 'fetching');

-- Index for requestId lookup in metadata (for WAN polling)
CREATE INDEX IF NOT EXISTS idx_generations_request_id
    ON generations((metadata->>'requestId'))
    WHERE metadata->>'requestId' IS NOT NULL;

-- Comment for documentation
COMMENT ON CONSTRAINT generations_status_check ON generations IS
    'Status values: pending (initial), processing (generating), fetching (downloading result), completed, failed';
