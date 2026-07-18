-- Propose database schema migration: Update RLS policies for batches and live_sessions
-- Run in Supabase SQL editor

-- 1. Drop existing select policies
DROP POLICY IF EXISTS "batches read" ON batches;
DROP POLICY IF EXISTS "sessions read" ON live_sessions;

-- 2. Re-create select policy for batches to allow read if the course is published, user is admin, or user is enrolled
CREATE POLICY "batches read" ON batches FOR SELECT USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND c.status = 'published'
  ) OR EXISTS (
    SELECT 1 FROM enrollments e WHERE e.batch_id = id
    AND e.user_id = auth.uid() AND e.revoked_at IS NULL
  )
);

-- 3. Re-create select policy for live_sessions to allow read if the course is published, user is admin, or user is enrolled
CREATE POLICY "sessions read" ON live_sessions FOR SELECT USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM batches b JOIN courses c ON c.id = b.course_id
    WHERE b.id = batch_id AND c.status = 'published'
  ) OR EXISTS (
    SELECT 1 FROM enrollments e WHERE e.batch_id = live_sessions.batch_id
    AND e.user_id = auth.uid() AND e.revoked_at IS NULL
  )
);
