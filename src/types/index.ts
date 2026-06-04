export interface Playlist {
  id: string;
  created_at: string;
  title: string;
}

export interface Song {
  id: string;
  playlist_id: string;
  youtube_url: string;
  title?: string;
  thumbnail_url?: string;
  transpose: number; // Semitones (-12 to 12)
  order: number;
}
