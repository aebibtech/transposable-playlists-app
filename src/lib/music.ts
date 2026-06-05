
import { searchAudius, getAudiusStreamUrl } from './audius';
import { searchJamendo } from './jamendo';
import { searchHearthis } from './hearthis';
import { searchRadio } from './radio';
import { searchInvidious, getInvidiousStreamUrl } from './invidious';

export interface UnifiedTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  source: 'audius' | 'jamendo' | 'hearthis' | 'radio' | 'invidious';
  rawStreamUrl?: string; // For Jamendo, Hearthis, Radio
}

export async function searchAll(query: string): Promise<UnifiedTrack[]> {
  const [audiusResults, jamendoResults, hearthisResults, radioResults, invidiousResults] = await Promise.all([
    searchAudius(query).catch(() => []),
    searchJamendo(query).catch(() => []),
    searchHearthis(query).catch(() => []),
    searchRadio(query).catch(() => []),
    searchInvidious(query).catch(() => []),
  ]);

  const unified: UnifiedTrack[] = [
    ...audiusResults.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.user.name,
      thumbnail: t.artwork?.['150x150'] || '',
      source: 'audius' as const,
    })),
    ...jamendoResults.map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artist_name,
      thumbnail: t.image || '',
      source: 'jamendo' as const,
      rawStreamUrl: t.audio,
    })),
    ...hearthisResults.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.user.username,
      thumbnail: t.thumb || '',
      source: 'hearthis' as const,
      rawStreamUrl: t.stream_url,
    })),
    ...radioResults.map(t => ({
      id: t.stationuuid,
      title: t.name,
      artist: `${t.country} • ${t.tags.split(',').slice(0, 2).join(', ')}`,
      thumbnail: t.favicon || '',
      source: 'radio' as const,
      rawStreamUrl: t.url_resolved,
    })),
    ...invidiousResults.map(t => ({
      id: t.videoId,
      title: t.title,
      artist: t.author,
      thumbnail: t.videoThumbnails?.find(v => v.quality === 'default')?.url || t.videoThumbnails?.[0]?.url || '',
      source: 'invidious' as const,
    })),
  ];

  return unified;
}

export async function getStreamUrl(audioId: string, source: 'audius' | 'jamendo' | 'hearthis' | 'radio' | 'invidious'): Promise<string> {
  if (source === 'audius') {
    return getAudiusStreamUrl(audioId);
  } else if (source === 'invidious') {
    return getInvidiousStreamUrl(audioId);
  } else {
    // For others, audioId is the actual URL
    return audioId;
  }
}
