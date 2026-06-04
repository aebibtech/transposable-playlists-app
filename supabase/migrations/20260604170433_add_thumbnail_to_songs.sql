-- Add thumbnail_url to songs table
alter table songs add column if not exists thumbnail_url text;
