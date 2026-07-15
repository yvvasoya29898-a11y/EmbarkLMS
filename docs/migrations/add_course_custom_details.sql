-- Propose database schema migration: Add 'highlights' and 'instructors' JSONB columns to courses table
-- Run in Supabase SQL editor or migration runner

ALTER TABLE courses ADD COLUMN highlights jsonb DEFAULT '[]'::jsonb;
ALTER TABLE courses ADD COLUMN instructors jsonb DEFAULT '[]'::jsonb;
