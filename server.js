import express from 'express';
import cors from 'cors';
import youtubedl from 'youtube-dl-exec';
import https from 'https';

const app = express();
app.use(cors());

app.get('/api/stream', async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).send('videoId is required');

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[Proxy] yt-dlp extracting: ${videoUrl}`);

  try {
    // Extract the direct audio URL using yt-dlp
    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      format: 'bestaudio'
    });

    if (!output || !output.url) {
      throw new Error('Failed to extract direct audio URL');
    }

    console.log(`[Proxy] Successfully extracted URL for ${videoId}`);
    
    // Pipe the audio stream directly to the response
    https.get(output.url, (audioStream) => {
      res.setHeader('Content-Type', 'audio/mpeg'); // Tone.js handles mpeg well
      
      // Pass along the content length if available
      if (audioStream.headers['content-length']) {
        res.setHeader('Content-Length', audioStream.headers['content-length']);
      }
      
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
    const output = await youtubedl(target, {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true
    });

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
