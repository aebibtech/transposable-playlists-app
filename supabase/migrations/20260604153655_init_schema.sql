-- Create Playlists table
create table playlists (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null
);

-- Create Songs table
create table songs (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade not null,
  youtube_url text not null, -- Stores the Video ID
  title text,
  transpose integer default 0 not null,
  "order" integer default 0 not null
);

-- Enable Row Level Security (RLS)
alter table playlists enable row level security;
alter table songs enable row level security;

-- Create public access policies
create policy "Public read access" on playlists for select using (true);
create policy "Public insert access" on playlists for insert with check (true);

create policy "Public read access" on songs for select using (true);
create policy "Public insert access" on songs for insert with check (true);
create policy "Public update access" on songs for update using (true);
create policy "Public delete access" on songs for delete using (true);
