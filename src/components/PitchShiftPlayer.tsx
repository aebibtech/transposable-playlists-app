import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Play, Square, Loader2, FastForward, Rewind } from 'lucide-react';

interface PitchShiftPlayerProps {
  videoId: string;
  transpose: number;
  onEnded?: () => void;
}

export function PitchShiftPlayer({ videoId, transpose, onEnded }: PitchShiftPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Create a native Audio element for streaming
    const audio = new Audio();
    const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';
    audio.src = `${proxyUrl}/api/stream?videoId=${videoId}`;
    audio.crossOrigin = 'anonymous';
    audio.playbackRate = playbackRate;
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

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleError = () => setError('Failed to load audio stream. The video might be restricted.');
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="custom-player">
      <div className="player-controls">
        {error ? (
           <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>
        ) : isLoaded ? (
          <>
            <button 
              className="play-button" 
              onClick={togglePlay} 
            >
              {isPlaying ? <Square size={32} fill="white" /> : <Play size={32} fill="white" />}
            </button>

            <div className="seek-container">
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                className="seek-bar"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
              />
            </div>

            <div className="speed-controls">
              <button 
                className="speed-btn"
                onClick={() => handleSpeedChange(Math.max(0.5, playbackRate - 0.1))}
                title="Slower"
              >
                <Rewind size={20} />
              </button>
              <span className="speed-val">{playbackRate.toFixed(2)}x</span>
              <button 
                className="speed-btn"
                onClick={() => handleSpeedChange(Math.min(2, playbackRate + 0.1))}
                title="Faster"
              >
                <FastForward size={20} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={40} className="animate-spin" />
            <div>Buffering Audio...</div>
          </div>
        )}
      </div>
      
      <div className="player-status">
        {isPlaying ? 'Now Playing' : isLoaded ? 'Ready to Play' : 'Connecting to Stream'}
      </div>

      <div className="player-info-row">
        <div className="pitch-info">
          Pitch: {transpose > 0 ? `+${transpose}` : transpose} Semitones
        </div>
        <div className="speed-info">
          Speed: {playbackRate.toFixed(2)}x
        </div>
      </div>
    </div>
  );
}
