-- ============================================================
-- SQL Migration: Add missing database performance indexes
-- ============================================================

-- Create index for session attendance lookup by user
CREATE INDEX IF NOT EXISTS idx_session_attendance_user_id ON session_attendance(user_id);

-- Create indexes for enrollments batch and course filters
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id ON enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Create index for quiz attempts filter by quiz id
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);

-- Create composite index on enrollment requests for user and course lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_user_course ON enrollment_requests(user_id, course_id);
