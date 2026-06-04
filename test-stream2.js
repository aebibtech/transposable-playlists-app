import play from 'play-dl';

async function test() {
  try {
    const info = await play.video_info('https://www.youtube.com/watch?v=UCuPlpGUdwc');
    console.log('Sample format:', info.format[0]);
    console.log('Format URLs:', info.format.map(f => f.url).filter(Boolean).length);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
