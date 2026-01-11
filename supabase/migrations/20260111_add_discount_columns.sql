-- Add discount-related columns to payments table
-- These columns track discount information for audit purposes

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS original_amount INTEGER,
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN payments.original_amount IS 'Original price before discount was applied (null if no discount)';
COMMENT ON COLUMN payments.discount_code IS 'Discount code used for this payment (e.g., LAUNCH50)';
COMMENT ON COLUMN payments.discount_percentage IS 'Percentage discount applied (e.g., 50 for 50% off)';

-- Create index for querying payments by discount code (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_payments_discount_code ON payments(discount_code) WHERE discount_code IS NOT NULL;
