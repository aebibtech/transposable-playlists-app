import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Play, Square, Loader2 } from 'lucide-react';

interface PitchShiftPlayerProps {
  videoId: string;
  transpose: number;
  onEnded?: () => void;
}

export function PitchShiftPlayer({ videoId, transpose, onEnded }: PitchShiftPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    setError(null);
    setIsPlaying(false);

    // Create a native Audio element for streaming
    const audio = new Audio();
    const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';
    audio.src = `${proxyUrl}/api/stream?videoId=${videoId}`;
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const pitchShift = new Tone.PitchShift({
      pitch: transpose,
    }).toDestination();
    pitchShiftRef.current = pitchShift;

    // Connect Audio element to Tone.js
    const source = Tone.getContext().createMediaElementSource(audio);
    Tone.connect(source, pitchShift);

    const handleCanPlay = async () => {
      setIsLoaded(true);
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Autoplay blocked by browser. User interaction required.');
      }
    };
    const handleError = () => setError('Failed to load audio stream. The video might be restricted.');
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.src = '';
      pitchShift.dispose();
    };
  }, [videoId]);

  useEffect(() => {
    if (pitchShiftRef.current) {
      pitchShiftRef.current.pitch = transpose;
    }
  }, [transpose]);

  const togglePlay = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="custom-player">
      <div style={{ marginBottom: '1.5rem' }}>
        {error ? (
           <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>
        ) : isLoaded ? (
          <button 
            className="play-button" 
            onClick={togglePlay} 
          >
            {isPlaying ? <Square size={32} fill="white" className="play-icon" /> : <Play size={32} fill="white" className="play-icon" />}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={40} className="animate-spin" />
            <div>Buffering Audio...</div>
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        {isPlaying ? 'Now Playing' : isLoaded ? 'Ready to Play' : 'Connecting to Stream'}
      </div>

      <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
        Pitch: {transpose > 0 ? `+${transpose}` : transpose} Semitones
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Speed: 1.00x (Fixed)
      </div>
    </div>
  );
}
