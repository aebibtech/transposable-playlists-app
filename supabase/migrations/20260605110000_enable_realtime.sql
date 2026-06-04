-- Enable real-time for songs and playlists
alter publication supabase_realtime add table songs;
alter publication supabase_realtime add table playlists;

-- Set replica identity to full to ensure we get all data in the payload for real-time
alter table songs replica identity full;
alter table playlists replica identity full;
