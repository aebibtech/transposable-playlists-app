import play from 'play-dl';

async function test() {
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=UCuPlpGUdwc');
    console.log('Formats found:', info.format.length);
    const stream = await play.stream_from_info(info);
    console.log('Stream URL:', stream.url);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
