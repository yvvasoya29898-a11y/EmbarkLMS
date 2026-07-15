-- Propose database schema migration: Support original price slash tracking for courses
-- Run in Supabase SQL editor or migration runner

-- 1. Add original_price_inr integer column
ALTER TABLE courses ADD COLUMN original_price_inr integer DEFAULT 0;
