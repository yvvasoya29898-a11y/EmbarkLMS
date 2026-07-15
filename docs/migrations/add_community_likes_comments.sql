-- Likes Table
create table community_post_likes (
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Comments Table
create table community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_comments_post_id on community_post_comments(post_id);
create index idx_likes_post_id on community_post_likes(post_id);

-- Enable RLS
alter table community_post_likes enable row level security;
alter table community_post_comments enable row level security;

-- Likes Policies
create policy "Anyone can view likes" on community_post_likes
  for select using (true);

create policy "Users can toggle own likes" on community_post_likes
  for all using (auth.uid() = user_id);

-- Comments Policies
create policy "Anyone can view comments" on community_post_comments
  for select using (true);

create policy "Users can comment" on community_post_comments
  for insert with check (auth.uid() = user_id);

create policy "Users/Admins can delete comments" on community_post_comments
  for delete using (auth.uid() = user_id or is_admin());
