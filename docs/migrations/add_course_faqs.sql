-- Propose database schema migration: Add 'faqs' JSONB column to courses table
-- Run in Supabase SQL editor or migration runner

ALTER TABLE courses ADD COLUMN faqs jsonb DEFAULT '[]'::jsonb;
