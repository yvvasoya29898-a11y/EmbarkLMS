# AGENTS.md — Embark LMS build conventions
Read this file plus `/docs/PRD.md` and `/docs/supabase-schema.sql` at the start of EVERY session. Wireframes with behavior annotations: `/docs/embark-lms-wireframes.html` (screens S1–S9, A1–A6).

## Project
Embark LMS (embarkai.in) — online LMS for AI courses. Two roles: `student`, `admin`. Delivery types: recorded / live / hybrid. NO online payments: students submit enrollment requests, the team calls them, payment is collected offline (UPI/bank), Admin grants access. Live classes run on Google Meet/Zoom links; recordings are YouTube unlisted.

## Stack (do not deviate)
- Next.js 15, App Router, TypeScript strict, Server Components by default
- Tailwind CSS v4 (no other CSS frameworks; no styled-components)
- Supabase: Postgres + Auth + Storage; `@supabase/ssr` for clients
- Email: Resend (transactional only)
- PDFs (certificates): @react-pdf/renderer
- Deploy target: Vercel. No paid services. No new dependencies without a stated reason.

## Folder structure
```
app/
  (public)/            # catalog, course pages, verify/[code], auth
  (student)/dashboard/ # S5–S9 screens
  (student)/learn/[courseSlug]/
  (admin)/admin/       # A1–A6 screens, layout enforces admin role
  api/                 # route handlers only where server actions don't fit
lib/
  supabase/            # server.ts, client.ts, middleware.ts
  actions/             # server actions grouped by domain (enrollment.ts, sessions.ts, quiz.ts, certificates.ts)
  email/               # Resend templates
components/            # shared UI; colocate screen-specific components with routes
docs/                  # PRD.md, supabase-schema.sql, wireframes, this file
```

## Non-negotiable security rules
1. **Only admins create enrollments.** Grant Access is a server action: verify `is_admin()`, insert enrollment, set request status `enrolled`, send email. Never expose an enrollment insert to students.
2. **`live_sessions.meeting_url` never reaches the client in lists.** Client queries select explicit columns excluding it. The Join button calls a server action that: checks enrollment in the batch → checks time window (T−15 min to end) → upserts `session_attendance.joined_click_at` → returns the URL.
3. **Quiz answers are server-side.** Pre-submit question queries exclude `correct_index` and `explanation`. Scoring is a server action; it enforces `max_attempts`.
4. **Every content read is gated server-side** (enrollment check in the server component/action), not just hidden in UI.
5. All lesson/recording/resource URLs render only for enrolled users (except `is_free_preview`).
6. Certificate verification page queries by `verify_code` with the service role and exposes only name, course, issue date.
7. Never use the service-role key in client bundles. Env vars: service key server-only.

## Data rules
- Timezone: store timestamptz (UTC); display IST (`Asia/Kolkata`) everywhere.
- Currency: INR integers (no paise decimals needed), format `₹2,999`.
- Session state is derived from time (`starts_at`, `duration_min`), not stored transitions; the `status` column is a convenience updated lazily.
- Enrollment request pipeline: `new → contacted → paid → enrolled | dropped`. One open request per user per course (partial unique index exists).
- Certificate criteria live in `courses.completion_criteria` JSON: `{min_attendance_pct, all_quizzes_passed, all_lessons_completed}`. Evaluate in one function `checkCompletion(userId, courseId)` reused everywhere.

## UI conventions
- Follow the wireframes; keep it clean and minimal, mobile-responsive (students will use phones).
- Status badge colors: request pipeline (new=blue, contacted=amber, paid=green, dropped=gray); sessions (upcoming=amber, live=red, completed=green).
- Empty states always have a CTA. Errors say what happened + what to do.
- All admin tables need CSV export where the wireframe shows it.

## Workflow rules for AI sessions
- Build ONE vertical slice per session (e.g., "enrollment request flow: S3 button + S4 page + A2 inbox row"). Don't scaffold unrelated screens.
- Before writing code, restate the slice, the tables touched, and the server actions needed. Wait for confirmation if anything conflicts with this file.
- After each slice: list files changed, migrations needed, and manual test steps.
- Never modify `docs/supabase-schema.sql` silently — propose schema changes explicitly as a new migration file.
- Flag for human review whenever touching: RLS, enrollment granting, meeting-URL serving, quiz scoring, admin middleware.

## Definition of done (per slice)
- Type-safe (no `any`), builds clean, works logged-out/student/admin as appropriate
- RLS respected (test with a student account, not just admin)
- Matches the wireframe's annotation box for that screen
- Committed with a descriptive message
