export interface Playlist {
  id: string;
  created_at: string;
  title: string;
}

export interface Song {
  id: string;
  playlist_id: string;
  audio_id: string;
  source: 'audius' | 'jamendo' | 'hearthis' | 'radio' | 'invidious';
  title?: string;
  thumbnail_url?: string;
  transpose: number; // Semitones (-12 to 12)
  order: number;
}
