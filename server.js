import express from 'express';
import cors from 'cors';
import youtubedl from 'youtube-dl-exec';
import https from 'https';
import fs from 'fs';

const app = express();
app.use(cors());

// Helper to get yt-dlp options
const getYoutubeDlOptions = (isPlaylist = false) => {
  const options = {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addHeader: [
      'referer:https://www.youtube.com/',
      'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ],
    extractorArgs: 'youtube:player-client=ios,web',
  };

  if (isPlaylist) {
    options.flatPlaylist = true;
  } else {
    options.format = 'bestaudio';
  }

  // Support cookies to bypass bot detection
  if (process.env.YT_DLP_COOKIES) {
    options.cookies = process.env.YT_DLP_COOKIES;
  } else if (process.env.YT_DLP_COOKIES_FROM_BROWSER) {
    options.cookiesFromBrowser = process.env.YT_DLP_COOKIES_FROM_BROWSER;
  } else if (fs.existsSync('cookies.txt')) {
    options.cookies = 'cookies.txt';
  }

  return options;
};

app.get('/api/stream', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).send('videoId is required');

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[Proxy] yt-dlp extracting: ${videoUrl}`);

  try {
    // Extract the direct audio URL using yt-dlp
    const output = await youtubedl(videoUrl, getYoutubeDlOptions());

    if (!output || !output.url) {
      throw new Error('Failed to extract direct audio URL');
    }

    console.log(`[Proxy] Successfully extracted URL for ${videoId}`);
    
    // Handle Range requests for seeking
    const headers = {};
    if (req.headers.range) {
      headers.range = req.headers.range;
      console.log(`[Proxy] Range request: ${req.headers.range}`);
    }

    // Pipe the audio stream directly to the response
    https.get(output.url, { headers }, (audioStream) => {
      // Forward status code (e.g., 206 Partial Content)
      res.status(audioStream.statusCode);

      // Forward relevant headers
      const forwardHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control'
      ];

      forwardHeaders.forEach(h => {
        if (audioStream.headers[h]) {
          res.setHeader(h, audioStream.headers[h]);
        }
      });
      
      audioStream.pipe(res);

      audioStream.on('error', (err) => {
        console.error('[Proxy] Audio stream error:', err.message);
        if (!res.headersSent) res.status(500).send('Audio stream error');
      });
    }).on('error', (err) => {
      console.error('[Proxy] HTTPS GET error:', err.message);
      if (!res.headersSent) res.status(500).send('Failed to fetch audio from URL');
    });

  } catch (error) {
    console.error('[Proxy] yt-dlp Error:', error.message);
    if (!res.headersSent) {
      res.status(500).send(`Failed to extract stream: ${error.message}`);
    }
  }
});

app.get('/api/info', async (req, res) => {
  const { videoId, playlistId } = req.query;
  const target = videoId 
    ? `https://www.youtube.com/watch?v=${videoId}` 
    : `https://www.youtube.com/playlist?list=${playlistId}`;

  console.log(`[Proxy] Extracting info for: ${target}`);

  try {
    const output = await youtubedl(target, getYoutubeDlOptions(!!playlistId));

    if (playlistId) {
      // Return simplified entries for playlist
      const entries = output.entries.map(e => ({
        id: e.id,
        title: e.title,
        thumbnail: e.thumbnails?.[0]?.url || ''
      }));
      res.json({ title: output.title, entries });
    } else {
      res.json({
        id: output.id,
        title: output.title,
        thumbnail: output.thumbnail || output.thumbnails?.[0]?.url || ''
      });
    }
  } catch (error) {
    console.error('[Proxy] Info Error:', error.message);
    res.status(500).send(`Failed to extract info: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Proxy] Audio proxy running on port ${PORT}`);
});
