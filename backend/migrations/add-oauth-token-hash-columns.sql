-- Migration: Add OAuth Token Hash Columns for Performance Optimization
-- Date: 2024-12-XX
-- Description: Adds indexed SHA-256 hash columns to oauth_token table for fast token lookup
--              This fixes the critical performance issue where all tokens were loaded and iterated

-- Add new columns for fast indexed lookup
ALTER TABLE developers.oauth_token
ADD COLUMN IF NOT EXISTS "accessTokenHash" VARCHAR(64) NULL,
ADD COLUMN IF NOT EXISTS "refreshTokenHash" VARCHAR(64) NULL;

-- Create indexes for fast lookup (O(1) instead of O(n))
CREATE INDEX IF NOT EXISTS "IDX_oauth_token_accessTokenHash" ON developers.oauth_token("accessTokenHash");
CREATE INDEX IF NOT EXISTS "IDX_oauth_token_refreshTokenHash" ON developers.oauth_token("refreshTokenHash");

-- Add unique constraints to prevent hash collisions
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_oauth_token_accessTokenHash" ON developers.oauth_token("accessTokenHash") WHERE "accessTokenHash" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_oauth_token_refreshTokenHash" ON developers.oauth_token("refreshTokenHash") WHERE "refreshTokenHash" IS NOT NULL;

-- Backfill existing tokens with SHA-256 hashes
-- Note: This requires the application to generate hashes for existing tokens
-- The application code will handle this automatically for new tokens
-- For existing tokens, you may need to run a data migration script

COMMENT ON COLUMN developers.oauth_token."accessTokenHash" IS 'SHA-256 hash of access token for fast indexed lookup (performance optimization)';
COMMENT ON COLUMN developers.oauth_token."refreshTokenHash" IS 'SHA-256 hash of refresh token for fast indexed lookup (performance optimization)';

