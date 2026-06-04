-- Add update and delete policies for playlists
create policy "Public update access" on playlists for update using (true);
create policy "Public delete access" on playlists for delete using (true);
