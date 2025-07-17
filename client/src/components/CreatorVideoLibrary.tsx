import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SimpleVideoPlayer from "./SimpleVideoPlayer";
import { Eye, Clock, DollarSign } from "lucide-react";
import { Video } from "@shared/schema";

interface CreatorVideoLibraryProps {
  videos: Video[];
  onVideoSelect: (video: Video) => void;
}

export function CreatorVideoLibrary({ videos, onVideoSelect }: CreatorVideoLibraryProps) {
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "Processing...";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'approved': return 'bg-blue-500';
      case 'pending': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'draft': return 'Upload complete - awaiting review';
      case 'processing': return 'Video is being processed';
      case 'approved': return 'Selected for editing - admin reviewing';
      case 'published': return 'Published and earning revenue';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Video Preview */}
                <div className="flex-shrink-0 w-48 h-32 bg-gray-800 rounded-lg overflow-hidden">
                  {video.cfStreamId ? (
                    <SimpleVideoPlayer
                      video={video}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50">
                      <Eye className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{video.title}</h3>
                      <p className="text-white/70 text-sm line-clamp-2">{video.description}</p>
                    </div>
                    <Badge className={`${getStatusColor(video.status)} text-white`}>
                      {video.status === 'approved' ? 'Selected' : video.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                    <span>•</span>
                    <span>Uploaded {new Date(video.createdAt).toLocaleDateString()}</span>
                    {video.publishedAt && (
                      <>
                        <span>•</span>
                        <span>Published {new Date(video.publishedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 mb-4">
                    <p className="text-white/80 text-sm">{getStatusMessage(video.status)}</p>
                  </div>

                  {video.status === 'published' && (
                    <div className="flex items-center gap-2 text-green-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Earning revenue share</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <Button
                  onClick={() => onVideoSelect(video)}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                
                {video.status === 'published' && (
                  <div className="text-sm text-white/60">
                    Revenue sharing active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12">
          <Eye className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No videos uploaded yet</h3>
          <p className="text-white/60">
            Upload your first UTV/ATV video to get started
          </p>
        </div>
      )}
    </div>
  );
}