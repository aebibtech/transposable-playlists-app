import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Song, Playlist } from '../types';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash, ChevronUp, ChevronDown, Play as PlayIcon, GripVertical, Share2, Search, Loader2 } from 'lucide-react';
import { PitchShiftPlayer } from '../components/PitchShiftPlayer';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { searchAll, getStreamUrl, type UnifiedTrack } from '../lib/music';
import '../App.css';

export const Route = createFileRoute('/playlist/$id')({
  component: PlaylistView,
});

function PlaylistView() {
  const { id: playlistId } = Route.useParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const handleSaveTitle = (val: string) => {
    if (val.trim() && val !== playlist?.title) {
      updatePlaylistTitle.mutate(val);
    }
    setIsEditingTitle(false);
  };

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

  useEffect(() => {
    if (playlist?.title && !isEditingTitle) {
      setEditedTitle(playlist.title);
    }
  }, [playlist?.title, isEditingTitle]);

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

  useEffect(() => {
    if (currentSong && songs) {
      const updated = songs.find(s => s.id === currentSong.id);
      if (updated && updated.transpose !== currentSong.transpose) {
        setCurrentSong(updated);
      }
    }
  }, [songs, currentSong]);

  // Resolve stream URL when currentSong changes
  useEffect(() => {
    if (currentSong) {
      getStreamUrl(currentSong.audio_id, currentSong.source).then(setCurrentStreamUrl);
    } else {
      setCurrentStreamUrl(null);
    }
  }, [currentSong]);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchAll(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addSong = useMutation({
    mutationFn: async (track: UnifiedTrack) => {
      const { error } = await supabase.from('songs').insert([
        {
          playlist_id: playlistId,
          audio_id: (track.source === 'audius' || track.source === 'invidious') ? track.id : track.rawStreamUrl,
          source: track.source,
          title: track.title,
          thumbnail_url: track.thumbnail || '',
          transpose: 0,
          order: (songs?.length || 0),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', playlistId] });
      setSearchQuery('');
      setSearchResults([]);
    },
  });

  const updateTranspose = useCallback((songId: string, transpose: number) => {
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

    queryClient.setQueryData(['songs', playlistId], reordered);

    const updates = reordered.map((song, index) => ({
      id: song.id,
      playlist_id: song.playlist_id,
      audio_id: song.audio_id,
      source: song.source,
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
                if (e.key === 'Enter') handleSaveTitle(editedTitle);
                if (e.key === 'Escape') {
                  setEditedTitle(playlist?.title || '');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
            />
          ) : (
            <h1 onClick={() => setIsEditingTitle(true)} title="Click to edit title">
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
          {currentSong && currentStreamUrl ? (
            <div className="player-card">
              <PitchShiftPlayer
                audioUrl={currentStreamUrl}
                transpose={currentSong.transpose}
                onEnded={playNextSong}
              />
              <div className="current-info">
                <h2>{currentSong.title}</h2>
                <div className="source-tag" data-source={currentSong.source}>{currentSong.source}</div>
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
                placeholder="Search All Sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="button-primary" 
                onClick={handleSearch} 
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((track, idx) => (
                  <div key={`${track.id}-${idx}`} className="search-item">
                    <img src={track.thumbnail} alt="" />
                    <div className="search-item-info">
                      <span className="track-title">{track.title}</span>
                      <span className="track-artist">{track.artist} • <span className="source-label" data-source={track.source}>{track.source}</span></span>
                    </div>
                    <button 
                      className="add-btn"
                      onClick={() => addSong.mutate(track)}
                      disabled={addSong.isPending}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                            <img src={song.thumbnail_url || 'https://via.placeholder.com/150'} alt="" />
                            <div className="play-overlay">
                              <PlayIcon size={16} fill="white" />
                            </div>
                          </div>

                          <div className="song-details" onClick={() => setCurrentSong(song)}>
                            <span className="song-title">{song.title}</span>
                            <span className="source-label-small">{song.source}</span>
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


