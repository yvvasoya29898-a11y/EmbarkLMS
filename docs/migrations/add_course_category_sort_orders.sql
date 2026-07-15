-- Propose database schema migration: Support manual sequence sorting for courses per tab
-- Run in Supabase SQL editor or migration runner

-- 1. Add category_sort_orders JSONB column
ALTER TABLE courses ADD COLUMN category_sort_orders jsonb DEFAULT '{}'::jsonb;
