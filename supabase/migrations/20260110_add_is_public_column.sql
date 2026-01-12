-- Add is_public column to generations table
-- Free users: is_public = true (their generations are shown in community)
-- Paid users (bought tokens): is_public = false (private by default)

ALTER TABLE generations
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add index for faster community queries
CREATE INDEX IF NOT EXISTS idx_generations_is_public
ON generations(is_public)
WHERE is_public = true AND status = 'completed';

-- Comment for documentation
COMMENT ON COLUMN generations.is_public IS 'If true, this generation is visible in the public community gallery. Free users = public, Paid users = private by default.';
