import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  streamId: string;
  title?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  status?: 'uploading' | 'processing' | 'ready' | 'error' | 'rejected';
  cfReadyToStream?: boolean;
  cfProcessingStatus?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
}

export default function VideoPlayer({
  streamId,
  title,
  poster,
  className = "",
  autoPlay = false,
  controls = true,
  status = 'ready',
  cfReadyToStream = false,
  cfProcessingStatus = 'pending',
  onLoadStart,
  onLoadEnd,
  onError
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Generate Cloudflare Stream URLs using correct customer subdomain
  const getStreamUrl = (streamId: string) => {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/manifest/video.m3u8`;
  };

  const getThumbnailUrl = (streamId: string) => {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/thumbnails/thumbnail.jpg`;
  };

  const getIframeUrl = (streamId: string) => {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/iframe`;
  };

  const getWatchUrl = (streamId: string) => {
    return `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/watch`;
  };

  // Check if video is ready for playback
  const isVideoReady = () => {
    return (status === 'ready' || cfReadyToStream) && streamId && streamId.length > 0;
  };

  const getStatusMessage = () => {
    if (cfProcessingStatus === 'error' || status === 'rejected') {
      return 'Video processing failed';
    }
    if (cfProcessingStatus === 'uploading') {
      return 'Video is uploading...';
    }
    if (cfProcessingStatus === 'processing' || status === 'processing') {
      return 'Video is processing...';
    }
    if (cfProcessingStatus === 'ready' || status === 'ready') {
      return 'Video ready to play';
    }
    
    switch(status) {
      case 'uploading':
        return 'Video is uploading...';
      case 'processing':
        return 'Video is processing...';
      case 'error':
      case 'rejected':
        return 'Video processing failed';
      default:
        return 'Video ready to play';
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      onLoadStart?.();
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
      onLoadEnd?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = (e: Event) => {
      const errorMessage = 'Video playback error. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
    };
  }, [onLoadStart, onLoadEnd, onError]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value[0];
    setVolume(value[0]);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const retryLoad = () => {
    setError(null);
    setIsLoading(true);
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  };

  // Show processing state for videos not ready for playback
  if (!isVideoReady()) {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
          <div className="text-center">
            <div className="mb-4">
              {cfProcessingStatus === 'uploading' || status === 'uploading' || cfProcessingStatus === 'processing' || status === 'processing' ? (
                <Loader2 className="w-16 h-16 mx-auto mb-2 text-blue-400 animate-spin" />
              ) : cfProcessingStatus === 'error' || status === 'error' || status === 'rejected' ? (
                <div className="w-16 h-16 mx-auto mb-2 text-red-400 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              ) : (
                <Play className="w-16 h-16 mx-auto mb-2 text-gray-400" />
              )}
              <p className="text-lg font-medium">{getStatusMessage()}</p>
              <p className="text-sm text-gray-400 mt-1">
                {title || `Stream ID: ${streamId}`}
              </p>
            </div>
            {(cfProcessingStatus === 'error' || status === 'error' || status === 'rejected') && (
              <div className="space-y-2">
                <Button onClick={retryLoad} variant="outline" className="text-white border-white hover:bg-white hover:text-black">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Load
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Video is ready for playback - try multiple approaches
  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Try HLS/HTML5 video first */}
      {!error && (
        <video
          ref={videoRef}
          className="w-full h-full"
          poster={poster || getThumbnailUrl(streamId)}
          autoPlay={autoPlay}
          controls={false}
          crossOrigin="anonymous"
          preload="metadata"
        >
          <source src={getStreamUrl(streamId)} type="application/vnd.apple.mpegurl" />
          <source src={`https://customer-eyuarig5yvnak9in.cloudflarestream.com/${streamId}/manifest/video.mpd`} type="application/dash+xml" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Fallback to iframe if HLS fails */}
      {error && (
        <iframe
          src={getIframeUrl(streamId)}
          className="w-full h-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          title={title || 'Video player'}
          onLoad={() => {
            setIsLoading(false);
            setError(null);
          }}
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Custom video controls */}
      {controls && showControls && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-20">
          <div className="flex items-center gap-4">
            <Button
              onClick={togglePlayPause}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <div className="flex-1">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
              />
            </div>
            
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <Button
              onClick={toggleMute}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            
            <div className="w-20">
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-full"
              />
            </div>
            
            <Button
              onClick={toggleFullscreen}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Error fallback with external links */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white z-10">
          <div className="text-center">
            <div className="mb-4">
              <Play className="w-16 h-16 mx-auto mb-2 text-gray-400" />
              <p className="text-lg font-medium">Video Player</p>
              <p className="text-sm text-gray-400 mt-1">Stream ID: {streamId}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={retryLoad} variant="outline" className="text-white border-white hover:bg-white hover:text-black">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button 
                onClick={() => window.open(getWatchUrl(streamId), '_blank')} 
                variant="outline" 
                className="text-white border-white hover:bg-white hover:text-black ml-2"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Stream
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}