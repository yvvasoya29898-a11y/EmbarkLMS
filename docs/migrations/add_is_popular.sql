-- Propose database schema migration: Add 'is_popular' column to courses table
-- Run in Supabase SQL editor or migration runner

ALTER TABLE courses ADD COLUMN is_popular boolean NOT NULL DEFAULT false;
