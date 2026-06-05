import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.send('OK');
});

const INVIDIOUS_INSTANCE = 'https://inv.nadeko.net'; // Switched to a more stable instance

app.get('/api/invidious/search', async (req, res) => {
  const { q } = req.query;
  try {
    const response = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/search?q=${encodeURIComponent(q)}&type=video&limit=10`);
    if (!response.ok) throw new Error(`Invidious error: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[Proxy] Expected JSON but got:', text.substring(0, 100));
      throw new Error('Invidious instance returned non-JSON response (possibly rate limited or down).');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Invidious Search Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invidious/stream', async (req, res) => {
  const { videoId } = req.query;
  try {
    const response = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${videoId}?local=true`);
    if (!response.ok) throw new Error(`Invidious error: ${response.status}`);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invidious instance returned non-JSON response.');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Invidious Stream Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Proxy] Health check running on port ${PORT}`);
});
