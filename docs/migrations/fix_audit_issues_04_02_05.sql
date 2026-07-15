-- Migration: Fix Audit Issues #04, #02, and #05
-- Resolves N+1 Auth Calls, N+1 Reports Queries, and Quiz submission race conditions.

-- 1. Fix Audit Issue #04: Add email column to profiles, update trigger, and backfill
alter table profiles add column email text;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone, email)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', ''), 
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email
  );
  return new;
end $$;

-- Backfill existing users
update profiles
set email = users.email
from auth.users as users
where profiles.id = users.id;

-- 2. Fix Audit Issue #05: Add unique constraint on quiz attempts (user_id, quiz_id, attempt_number)
alter table quiz_attempts add column attempt_number integer;

-- Backfill attempt numbers sequentially based on attempted_at timestamp
with ranked_attempts as (
  select id, row_number() over (partition by user_id, quiz_id order by attempted_at) as rnum
  from quiz_attempts
)
update quiz_attempts
set attempt_number = ranked_attempts.rnum
from ranked_attempts
where quiz_attempts.id = ranked_attempts.id;

alter table quiz_attempts alter column attempt_number set not null;

alter table quiz_attempts add constraint unique_user_quiz_attempt unique (user_id, quiz_id, attempt_number);
