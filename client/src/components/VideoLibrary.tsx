import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Eye, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

interface Video {
  id: number;
  title: string;
  description: string;
  status: string;
  cfStreamId: string;
  cfReadyToStream: boolean;
  cfProcessingStatus: string;
  views: number;
  createdAt: string;
  duration: number;
  thumbnailUrl: string;
}

interface VideoLibraryProps {
  videos: Video[];
  onVideoSelect?: (video: Video) => void;
  showPlayButton?: boolean;
  className?: string;
}

export default function VideoLibrary({ 
  videos, 
  onVideoSelect, 
  showPlayButton = true,
  className = ""
}: VideoLibraryProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const canPlayVideo = (video: Video) => {
    return video.cfStreamId && (video.cfReadyToStream || video.cfProcessingStatus === 'ready');
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getThumbnailUrl = (video: Video) => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.cfStreamId) {
      return `https://customer-${video.cfStreamId}.cloudflarestream.com/${video.cfStreamId}/thumbnails/thumbnail.jpg`;
    }
    return '/placeholder-thumbnail.jpg';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <Card key={video.id} className="glass-card bg-card-gradient border-white/20 overflow-hidden">
            <div className="relative">
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                <img 
                  src={getThumbnailUrl(video)}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-thumbnail.jpg';
                  }}
                />
                
                {/* Play button overlay */}
                {showPlayButton && canPlayVideo(video) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="lg"
                          className="text-white hover:text-gray-300 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3"
                          onClick={() => setPlayingVideo(video)}
                        >
                          <Play className="w-8 h-8" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl w-full">
                        <DialogHeader>
                          <DialogTitle>{video.title}</DialogTitle>
                        </DialogHeader>
                        <div className="aspect-video">
                          <VideoPlayer
                            streamId={video.cfStreamId}
                            title={video.title}
                            className="w-full h-full"
                            controls={true}
                            status={video.status as any}
                            cfReadyToStream={video.cfReadyToStream}
                            cfProcessingStatus={video.cfProcessingStatus}
                            onError={(error) => {
                              console.error('Video playback error:', error);
                            }}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                
                {/* Status indicator */}
                <div className="absolute top-2 right-2">
                  <Badge className={`${getStatusColor(video.status)} text-white flex items-center gap-1`}>
                    {getStatusIcon(video.status)}
                    {video.status}
                  </Badge>
                </div>

                {/* Duration */}
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg line-clamp-2">{video.title}</CardTitle>
              {video.description && (
                <p className="text-white/70 text-sm line-clamp-2">{video.description}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Video stats */}
              <div className="flex items-center justify-between text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{video.views.toLocaleString()} views</span>
                </div>
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Processing status */}
              {video.cfProcessingStatus && video.cfProcessingStatus !== 'ready' && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-2">
                  <p className="text-yellow-200 text-xs">
                    Processing: {video.cfProcessingStatus}
                  </p>
                </div>
              )}

              {/* Stream info */}
              {video.cfStreamId && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${video.cfReadyToStream ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-xs text-white/70">
                      {video.cfReadyToStream ? 'Ready to stream' : 'Processing'}
                    </span>
                  </div>
                  
                  {video.cfStreamId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const streamUrl = `https://customer-${video.cfStreamId}.cloudflarestream.com/${video.cfStreamId}/iframe`;
                        window.open(streamUrl, '_blank');
                      }}
                      className="text-white/70 hover:text-white p-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {canPlayVideo(video) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 text-white border-white/20 hover:bg-white/10"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full">
                      <DialogHeader>
                        <DialogTitle>{video.title}</DialogTitle>
                      </DialogHeader>
                      <div className="aspect-video">
                        <VideoPlayer
                          streamId={video.cfStreamId}
                          title={video.title}
                          className="w-full h-full"
                          controls={true}
                          status={video.cfReadyToStream ? 'ready' : 
                                 video.cfProcessingStatus === 'uploading' ? 'uploading' :
                                 video.cfProcessingStatus === 'error' ? 'error' : 'processing'}
                          onError={(error) => {
                            console.error('Video playback error:', error);
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                
                {onVideoSelect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVideoSelect(video)}
                    className="text-white/70 hover:text-white"
                  >
                    Select
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12">
          <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-white text-lg font-medium">No videos found</p>
          <p className="text-white/70 text-sm mt-2">Upload your first video to get started</p>
        </div>
      )}
    </div>
  );
}