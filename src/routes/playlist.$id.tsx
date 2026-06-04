import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Song, Playlist } from '../types';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash, ChevronUp, ChevronDown, Play as PlayIcon, GripVertical, Share2 } from 'lucide-react';
import { PitchShiftPlayer } from '../components/PitchShiftPlayer';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import '../App.css';

export const Route = createFileRoute('/playlist/$id')({

  component: PlaylistView,
});

function PlaylistView() {
  const { id: playlistId } = Route.useParams();
  const queryClient = useQueryClient();
  const [newSongUrl, setNewSongUrl] = useState('');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const handleSaveTitle = (val: string) => {
    if (val.trim() && val !== playlist?.title) {
      updatePlaylistTitle.mutate(val);
    }
    setIsEditingTitle(false);
  };

  // Sync currentSong with live data (for transpose changes)
  const { data: playlist } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();
      if (error) throw error;
      return data as Playlist;
    },
  });

  const { data: songs, isLoading } = useQuery({
    queryKey: ['songs', playlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data as Song[];
    },
  });

  // Sync edited title when playlist loads
  useEffect(() => {
    if (playlist?.title && !isEditingTitle) {
      setEditedTitle(playlist.title);
    }
  }, [playlist?.title, isEditingTitle]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`playlist:${playlistId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'songs',
        filter: `playlist_id=eq.${playlistId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['songs', playlistId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'playlists',
        filter: `id=eq.${playlistId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playlistId, queryClient]);

  // Update currentSong when the underlying data changes (for instant transpose)
  useEffect(() => {
    if (currentSong && songs) {
      const updated = songs.find(s => s.id === currentSong.id);
      if (updated && updated.transpose !== currentSong.transpose) {
        setCurrentSong(updated);
      }
    }
  }, [songs, currentSong]);

  const updatePlaylistTitle = useMutation({
    mutationFn: async (newTitle: string) => {
      const { error } = await supabase
        .from('playlists')
        .update({ title: newTitle })
        .eq('id', playlistId);
      if (error) throw error;
    },
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({ queryKey: ['playlist', playlistId] });
      const previousPlaylist = queryClient.getQueryData(['playlist', playlistId]);
      queryClient.setQueryData(['playlist', playlistId], (old: Playlist | undefined) => 
        old ? { ...old, title: newTitle } : old
      );
      return { previousPlaylist };
    },
    onError: (_err, _newTitle, context) => {
      if (context?.previousPlaylist) {
        queryClient.setQueryData(['playlist', playlistId], context.previousPlaylist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    },
  });

  const addSong = useMutation({
    mutationFn: async (url: string) => {
      const videoId = extractVideoId(url);
      const playlistIdMatch = extractPlaylistId(url);
      const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

      if (playlistIdMatch) {
        // Import whole playlist
        const res = await fetch(`${proxyUrl}/api/info?playlistId=${playlistIdMatch}`);
        const data = await res.json();
        const baseOrder = songs?.length || 0;
        
        const inserts = data.entries.map((entry: any, index: number) => ({
          playlist_id: playlistId,
          youtube_url: entry.id,
          title: entry.title,
          thumbnail_url: entry.thumbnail,
          transpose: 0,
          order: baseOrder + index,
        }));

        const { error } = await supabase.from('songs').insert(inserts);
        if (error) throw error;
      } else if (videoId) {
        // Single song
        const res = await fetch(`${proxyUrl}/api/info?videoId=${videoId}`);
        const info = await res.json();
        
        const { error } = await supabase.from('songs').insert([
          {
            playlist_id: playlistId,
            youtube_url: videoId,
            title: info.title,
            thumbnail_url: info.thumbnail,
            transpose: 0,
            order: (songs?.length || 0),
          },
        ]);
        if (error) throw error;
      } else {
        throw new Error('Invalid YouTube URL');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', playlistId] });
      setNewSongUrl('');
    },
  });

  const updateTranspose = useCallback((songId: string, transpose: number) => {
    // Optimistic update for immediate feedback
    queryClient.setQueryData(['songs', playlistId], (old: Song[] | undefined) => {
      if (!old) return old;
      return old.map(s => s.id === songId ? { ...s, transpose } : s);
    });

    supabase
      .from('songs')
      .update({ transpose })
      .eq('id', songId)
      .then(({ error }) => {
        if (error) queryClient.invalidateQueries({ queryKey: ['songs', playlistId] });
      });
  }, [playlistId, queryClient]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !songs) return;
    
    const reordered = Array.from(songs);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // Optimistic UI
    queryClient.setQueryData(['songs', playlistId], reordered);

    // Update orders in DB
    const updates = reordered.map((song, index) => ({
      id: song.id,
      playlist_id: song.playlist_id,
      youtube_url: song.youtube_url,
      order: index
    }));

    const { error } = await supabase.from('songs').upsert(updates);
    if (error) {
      console.error('Reorder error:', error);
      queryClient.invalidateQueries({ queryKey: ['songs', playlistId] });
    }
  };

  const deleteSong = useMutation({
    mutationFn: async (songId: string) => {
      const { error } = await supabase.from('songs').delete().eq('id', songId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', playlistId] });
    },
  });

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const extractPlaylistId = (url: string) => {
    const match = url.match(/[&?]list=([^&]+)/);
    return match ? match[1] : null;
  };

  const playNextSong = () => {
    if (!currentSong || !songs) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex < songs.length - 1) {
      setCurrentSong(songs[currentIndex + 1]);
    }
  };

  if (isLoading || !playlist) return <div className="loading">Loading playlist...</div>;

  return (
    <div className="playlist-page">
      <header className="playlist-header">
        <div className="header-content">
          {isEditingTitle ? (
            <input
              className="title-input"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={() => handleSaveTitle(editedTitle)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveTitle(editedTitle);
                }
                if (e.key === 'Escape') {
                  setEditedTitle(playlist?.title || '');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
            />
          ) : (
            <h1 
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
            >
              {playlist?.title}
            </h1>
          )}
          <button className="button-icon" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied!');
          }}>
            <Share2 size={20} />
            <span>Share</span>
          </button>
        </div>
      </header>

      <div className="player-grid">
        <div className="main-player">
          {currentSong ? (
            <div className="player-card">
              <PitchShiftPlayer
                videoId={currentSong.youtube_url}
                transpose={currentSong.transpose}
                onEnded={playNextSong}
              />
              <div className="current-info">
                <h2>{currentSong.title}</h2>
              </div>
            </div>
          ) : (
            <div className="player-placeholder">
              <PlayIcon size={48} />
              <p>Select a song to start playing</p>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <div className="add-section">
            <div className="input-group">
              <input
                className="input"
                placeholder="YouTube URL or Playlist Link"
                value={newSongUrl}
                onChange={(e) => setNewSongUrl(e.target.value)}
              />
              <button 
                className="button-primary" 
                onClick={() => addSong.mutate(newSongUrl)} 
                disabled={addSong.isPending}
              >
                {addSong.isPending ? '...' : <Plus size={20} />}
              </button>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="songs">
              {(provided) => (
                <div 
                  className="song-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {songs?.map((song, index) => (
                    <Draggable key={song.id} draggableId={song.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`song-card ${currentSong?.id === song.id ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div className="drag-handle" {...provided.dragHandleProps}>
                            <GripVertical size={16} />
                          </div>
                          
                          <div className="song-thumb" onClick={() => setCurrentSong(song)}>
                            <img src={song.thumbnail_url || 'https://via.placeholder.com/120x90'} alt="" />
                            <div className="play-overlay">
                              <PlayIcon size={16} fill="white" />
                            </div>
                          </div>

                          <div className="song-details" onClick={() => setCurrentSong(song)}>
                            <span className="song-title">{song.title || song.youtube_url}</span>
                          </div>
                          
                          <div className="song-actions">
                            <div className="transpose-pill">
                              <button onClick={(e) => { e.stopPropagation(); updateTranspose(song.id, song.transpose - 1) }}>
                                <ChevronDown size={14} />
                              </button>
                              <span className="transpose-val">{song.transpose > 0 ? `+${song.transpose}` : song.transpose}</span>
                              <button onClick={(e) => { e.stopPropagation(); updateTranspose(song.id, song.transpose + 1) }}>
                                <ChevronUp size={14} />
                              </button>
                            </div>
                            <button
                              className="delete-btn"
                              onClick={(e) => { e.stopPropagation(); deleteSong.mutate(song.id) }}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </aside>
      </div>
    </div>
  );
}
