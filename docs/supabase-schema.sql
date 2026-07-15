-- ============================================================
-- Embark LMS — Supabase schema migration (Sprint 0)
-- PRD v5: 2 roles, offline payments, live + recorded + hybrid
-- Run in Supabase SQL editor or via `supabase db push`
-- ============================================================

-- ---------- Enums ----------
create type user_role as enum ('student', 'admin');
create type delivery_type as enum ('recorded', 'live', 'hybrid');
create type course_status as enum ('draft', 'published', 'archived');
create type batch_status as enum ('open', 'running', 'completed');
create type session_status as enum ('upcoming', 'live', 'completed');
create type lesson_type as enum ('video', 'notes', 'quiz', 'recording');
create type request_status as enum ('new', 'contacted', 'paid', 'enrolled', 'dropped');
create type enrollment_source as enum ('request', 'cohort', 'admin');
create type attendance_source as enum ('auto', 'admin');

-- ---------- Profiles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup (name/phone collected in app, updated after)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: is current user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Courses & curriculum ----------
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text,
  delivery_type delivery_type not null default 'hybrid',
  price_inr_display integer not null default 0,
  status course_status not null default 'draft',
  completion_criteria jsonb not null default '{"min_attendance_pct": 75, "all_quizzes_passed": true, "all_lessons_completed": false}',
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  drip_locked boolean not null default false
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  type lesson_type not null default 'video',
  video_url text,
  content_md text,
  sort_order integer not null default 0,
  is_free_preview boolean not null default false
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null,
  file_url text not null
);

-- ---------- Batches & live sessions ----------
create table batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  invite_code text unique,
  starts_at date,
  ends_at date,
  status batch_status not null default 'open'
);

create table live_sessions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  duration_min integer not null default 55,
  meeting_url text,          -- NEVER exposed via public select policies
  recording_url text,
  status session_status not null default 'upcoming'
);

create table session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references live_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_click_at timestamptz,
  attended boolean not null default false,
  marked_by attendance_source not null default 'auto',
  unique (session_id, user_id)
);

-- ---------- Enrollment ----------
create table enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status request_status not null default 'new',
  student_note text,
  admin_notes text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One OPEN request per student per course
create unique index uniq_open_request on enrollment_requests (user_id, course_id)
  where status in ('new', 'contacted', 'paid');

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  batch_id uuid references batches(id) on delete set null,
  source enrollment_source not null default 'request',
  granted_by uuid references profiles(id),
  enrolled_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_id)
);

-- Helper: is current user enrolled (not revoked) in a course?
-- (Defined here, AFTER the enrollments table, because language-sql
--  function bodies are validated at creation time.)
create or replace function is_enrolled(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments
    where user_id = auth.uid() and course_id = p_course and revoked_at is null
  );
$$;

-- ---------- Progress, quizzes, certificates, feedback ----------
create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  pass_pct integer not null default 70,
  max_attempts integer not null default 2
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  body text not null,
  options jsonb not null,          -- ["opt A", "opt B", ...]
  correct_index integer not null,  -- only readable post-submit via server
  explanation text,
  sort_order integer not null default 0
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  score_pct integer not null,
  answers jsonb not null,
  attempted_at timestamptz not null default now()
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  verify_code uuid unique not null default gen_random_uuid(),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  session_id uuid references live_sessions(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comments text,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index idx_modules_course on modules(course_id);
create index idx_lessons_module on lessons(module_id);
create index idx_batches_course on batches(course_id);
create index idx_sessions_batch on live_sessions(batch_id);
create index idx_att_session on session_attendance(session_id);
create index idx_req_status on enrollment_requests(status);
create index idx_enroll_user on enrollments(user_id);
create index idx_progress_user on progress(user_id);
create index idx_attempts_user on quiz_attempts(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Rule of thumb: admins full access; students read published
-- content + own rows; enrollment/attendance writes are
-- admin-or-server only. Meeting URLs & correct answers are
-- served ONLY through server actions using the service role.
-- ============================================================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table resources enable row level security;
alter table batches enable row level security;
alter table live_sessions enable row level security;
alter table session_attendance enable row level security;
alter table enrollment_requests enable row level security;
alter table enrollments enable row level security;
alter table progress enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table quiz_attempts enable row level security;
alter table certificates enable row level security;
alter table feedback enable row level security;

-- Profiles: user sees/updates own; admin sees all
create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid());
create policy "admin profile all" on profiles for all using (is_admin());

-- Courses: everyone reads published; admin all
create policy "published courses" on courses for select using (status = 'published' or is_admin());
create policy "admin courses" on courses for all using (is_admin());

-- Modules/lessons/resources: enrolled students or free preview; admin all
create policy "modules read" on modules for select using (
  is_admin() or exists (
    select 1 from courses c where c.id = course_id and c.status = 'published'
  ));  -- module titles are public (shown on course landing page)
create policy "admin modules" on modules for all using (is_admin());

create policy "lessons read" on lessons for select using (
  is_admin()
  or is_free_preview
  or exists (
    select 1 from modules m join courses c on c.id = m.course_id
    where m.id = module_id and is_enrolled(c.id)
  ));
create policy "admin lessons" on lessons for all using (is_admin());

create policy "resources read" on resources for select using (
  is_admin() or exists (
    select 1 from lessons l join modules m on m.id = l.module_id
    where l.id = lesson_id and is_enrolled(m.course_id)
  ));
create policy "admin resources" on resources for all using (is_admin());

-- Batches: enrolled students see own batch; admin all
create policy "batches read" on batches for select using (
  is_admin() or exists (
    select 1 from enrollments e where e.batch_id = id
    and e.user_id = auth.uid() and e.revoked_at is null
  ));
create policy "admin batches" on batches for all using (is_admin());

-- Live sessions: enrolled batch students can read, BUT the app must
-- select explicit columns EXCLUDING meeting_url in client queries.
-- meeting_url is fetched only in a server action at join time.
create policy "sessions read" on live_sessions for select using (
  is_admin() or exists (
    select 1 from enrollments e where e.batch_id = live_sessions.batch_id
    and e.user_id = auth.uid() and e.revoked_at is null
  ));
create policy "admin sessions" on live_sessions for all using (is_admin());

-- Attendance: student reads own; inserts own join-click during live window; admin all
create policy "own attendance read" on session_attendance for select
  using (user_id = auth.uid() or is_admin());
create policy "own join click" on session_attendance for insert
  with check (user_id = auth.uid());
create policy "admin attendance" on session_attendance for all using (is_admin());

-- Enrollment requests: student creates + reads own; admin all
create policy "own requests" on enrollment_requests for select
  using (user_id = auth.uid() or is_admin());
create policy "create request" on enrollment_requests for insert
  with check (user_id = auth.uid());
create policy "admin requests" on enrollment_requests for all using (is_admin());

-- Enrollments: student reads own; ONLY admin creates/updates (core business rule)
create policy "own enrollments read" on enrollments for select
  using (user_id = auth.uid() or is_admin());
create policy "admin enrollments write" on enrollments for all using (is_admin());

-- Progress: student inserts/reads own (only for enrolled courses); admin reads all
create policy "own progress" on progress for select using (user_id = auth.uid() or is_admin());
create policy "mark progress" on progress for insert with check (
  user_id = auth.uid() and exists (
    select 1 from lessons l join modules m on m.id = l.module_id
    where l.id = lesson_id and is_enrolled(m.course_id)
  ));

-- Quizzes: readable if lesson readable; questions readable WITHOUT correct answers
-- (client queries must exclude correct_index/explanation; scoring happens server-side)
create policy "quizzes read" on quizzes for select using (true);
create policy "admin quizzes" on quizzes for all using (is_admin());
create policy "questions read" on questions for select using (
  is_admin() or exists (
    select 1 from quizzes q join lessons l on l.id = q.lesson_id
    join modules m on m.id = l.module_id
    where q.id = quiz_id and is_enrolled(m.course_id)
  ));
create policy "admin questions" on questions for all using (is_admin());

-- Attempts: student inserts/reads own; admin reads all
create policy "own attempts" on quiz_attempts for select using (user_id = auth.uid() or is_admin());
create policy "submit attempt" on quiz_attempts for insert with check (user_id = auth.uid());

-- Certificates: student reads own; public verification handled by server
-- action querying with service role by verify_code; admin all
create policy "own certificates" on certificates for select using (user_id = auth.uid() or is_admin());
create policy "admin certificates" on certificates for all using (is_admin());

-- Feedback: student inserts/reads own; admin reads all
create policy "own feedback" on feedback for select using (user_id = auth.uid() or is_admin());
create policy "give feedback" on feedback for insert with check (user_id = auth.uid());

-- ============================================================
-- SECURITY NOTES FOR THE APP LAYER (read by AI dev sessions)
-- 1. meeting_url: never select in client code. Join button calls a
--    server action: verify enrollment -> log join click -> return URL.
-- 2. questions.correct_index & explanation: never select client-side
--    pre-submit. Quiz scoring is a server action.
-- 3. Certificate issuance & verification page use the service role.
-- 4. Grant Access (enrollments insert) is an admin server action that
--    also flips the request status to 'enrolled' and sends email.
-- ============================================================

-- ---------- Community posts ----------
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  post_type text not null check (post_type in ('achievement', 'thanks', 'help', 'announcement', 'update')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  image_url text,
  video_url text,
  created_at timestamptz not null default now(),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz
);

create index idx_community_posts_status_created on community_posts(status, created_at desc);
create index idx_community_posts_user_id on community_posts(user_id);

alter table community_posts enable row level security;

create policy "Anyone can view approved posts" on community_posts
  for select using (status = 'approved' or user_id = auth.uid() or is_admin());

create policy "Users can insert their own pending posts" on community_posts
  for insert with check (auth.uid() = user_id and status = 'pending');

create policy "Admins can do everything" on community_posts
  for all using (is_admin());

-- ---------- Community likes & comments ----------
create table community_post_likes (
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_comments_post_id on community_post_comments(post_id);
create index idx_likes_post_id on community_post_likes(post_id);

alter table community_post_likes enable row level security;
alter table community_post_comments enable row level security;

create policy "Anyone can view likes" on community_post_likes
  for select using (true);

create policy "Users can toggle own likes" on community_post_likes
  for all using (auth.uid() = user_id);

create policy "Anyone can view comments" on community_post_comments
  for select using (true);

create policy "Users can comment" on community_post_comments
  for insert with check (auth.uid() = user_id);

create policy "Users/Admins can delete comments" on community_post_comments
  for delete using (auth.uid() = user_id or is_admin());


