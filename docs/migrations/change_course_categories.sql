-- Propose database schema migration: Support multiple categories per course
-- Run in Supabase SQL editor or migration runner

-- 1. Add categories text array column
ALTER TABLE courses ADD COLUMN categories text[] DEFAULT '{}'::text[];

-- 2. Migrate existing single category entries into the categories array
UPDATE courses SET categories = ARRAY[category] WHERE category IS NOT NULL AND category <> '';

-- 3. Drop the old category column
ALTER TABLE courses DROP COLUMN category;
