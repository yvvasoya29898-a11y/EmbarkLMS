-- Add media columns to community_posts
alter table community_posts add column image_url text;
alter table community_posts add column video_url text;
