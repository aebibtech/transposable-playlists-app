import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Playlist } from '../types';
import { useState } from 'react';
import { Plus, Music } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Playlist[];
    },
  });

  const createPlaylist = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from('playlists')
        .insert([{ title }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setNewPlaylistTitle('');
    },
  });

  if (isLoading) return <div>Loading playlists...</div>;

  return (
    <div>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Create New Playlist</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            className="input"
            placeholder="Playlist Title"
            value={newPlaylistTitle}
            onChange={(e) => setNewPlaylistTitle(e.target.value)}
          />
          <button
            className="button"
            onClick={() => createPlaylist.mutate(newPlaylistTitle)}
            disabled={!newPlaylistTitle || createPlaylist.isPending}
          >
            <Plus size={20} />
          </button>
        </div>
      </section>

      <section>
        <h2>Your Playlists</h2>
        <div className="playlist-grid">
          {playlists?.map((playlist) => (
            <Link
              key={playlist.id}
              to="/playlist/$id"
              params={{ id: playlist.id }}
              className="card"
            >
              <Music size={40} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
              <h3>{playlist.title}</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                {new Date(playlist.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
