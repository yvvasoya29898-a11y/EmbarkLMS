-- Propose database schema migration: Support manual sequence sorting for courses
-- Run in Supabase SQL editor or migration runner

-- 1. Add sort_order integer column
ALTER TABLE courses ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
