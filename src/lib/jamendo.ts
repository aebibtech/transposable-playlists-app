
const CLIENT_ID = '709fa152'; // Test Client ID

export interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  image: string;
  audio: string;
  duration: number;
}

export async function searchJamendo(query: string): Promise<JamendoTrack[]> {
  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=10&search=${encodeURIComponent(query)}&audioformat=mp32`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results;
}

export function getJamendoStreamUrl(audioUrl: string): string {
  return audioUrl;
}
