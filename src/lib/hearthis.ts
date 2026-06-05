
export interface HearthisTrack {
  id: string;
  title: string;
  user: {
    username: string;
  };
  thumb: string;
  stream_url: string;
  duration: string;
}

export async function searchHearthis(query: string): Promise<HearthisTrack[]> {
  const url = `https://api-v2.hearthis.at/search/?t=${encodeURIComponent(query)}&count=10`;
  const response = await fetch(url);
  const data = await response.json();
  // Hearthis API sometimes returns a single object if only one result
  return Array.isArray(data) ? data : (data ? [data] : []);
}
