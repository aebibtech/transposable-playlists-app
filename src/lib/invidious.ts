
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

export interface InvidiousVideo {
  videoId: string;
  title: string;
  author: string;
  videoThumbnails: {
    quality: string;
    url: string;
    width: number;
    height: number;
  }[];
  lengthSeconds: number;
}

export async function searchInvidious(query: string): Promise<InvidiousVideo[]> {
  const url = `${PROXY_URL}/api/invidious/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

export async function getInvidiousStreamUrl(videoId: string): Promise<string> {
  const url = `${PROXY_URL}/api/invidious/stream?videoId=${videoId}`;
  const response = await fetch(url);
  const data = await response.json();
  
  // Try to find an audio-only stream first
  const audioStream = data.adaptiveFormats?.find((f: any) => f.type.startsWith('audio/'));
  if (audioStream) return audioStream.url;
  
  // Fallback to a muxed stream
  const muxedStream = data.formatStreams?.[0];
  return muxedStream?.url || '';
}
