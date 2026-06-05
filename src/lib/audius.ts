
const APP_NAME = 'TRANSPOSABLE_PLAYLISTS';

let cachedHost: string | null = null;

export async function getAudiusHost(): Promise<string> {
  if (cachedHost) return cachedHost;

  try {
    const response = await fetch('https://api.audius.co');
    const { data: nodes } = await response.json();
    cachedHost = nodes[Math.floor(Math.random() * nodes.length)];
    return cachedHost!;
  } catch (error) {
    console.error('Failed to fetch Audius host, falling back to default', error);
    return 'https://discoveryprovider.audius.co';
  }
}

export interface AudiusTrack {
  id: string;
  title: string;
  artwork: {
    '150x150': string;
    '480x480': string;
    '1000x1000': string;
  };
  user: {
    name: string;
  };
  duration: number;
}

export async function searchAudius(query: string): Promise<AudiusTrack[]> {
  const host = await getAudiusHost();
  const response = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP_NAME}`);
  const { data } = await response.json();
  return data;
}

export async function getAudiusStreamUrl(trackId: string): Promise<string> {
  const host = await getAudiusHost();
  return `${host}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}
