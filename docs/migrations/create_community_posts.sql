-- Create community_posts table
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  post_type text not null check (post_type in ('achievement', 'thanks', 'help', 'announcement', 'update')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz
);

-- Index for fast queries
create index idx_community_posts_status_created on community_posts(status, created_at desc);
create index idx_community_posts_user_id on community_posts(user_id);

-- Enable RLS
alter table community_posts enable row level security;

-- RLS policies
create policy "Anyone can view approved posts" on community_posts
  for select using (status = 'approved' or user_id = auth.uid() or is_admin());

create policy "Users can insert their own pending posts" on community_posts
  for insert with check (auth.uid() = user_id and status = 'pending');

create policy "Admins can do everything" on community_posts
  for all using (is_admin());
