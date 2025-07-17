import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SimpleVideoPlayer from "./SimpleVideoPlayer";
import { X, Clock, Calendar, DollarSign, Eye } from "lucide-react";
import { Video } from "@shared/schema";

interface CreatorVideoViewerProps {
  video: Video;
  onClose: () => void;
}

export function CreatorVideoViewer({ video, onClose }: CreatorVideoViewerProps) {
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
      case 'draft': return 'Your video has been uploaded successfully and is awaiting review by our admin team.';
      case 'processing': return 'Your video is currently being processed. This usually takes a few minutes.';
      case 'approved': return 'Great news! Your video has been selected for editing and will be enhanced by our team.';
      case 'published': return 'Your video is now published and earning revenue share. You can track your earnings in the dashboard.';
      default: return `Status: ${status}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(video.duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Uploaded {new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
                <Badge className={`${getStatusColor(video.status)} text-white`}>
                  {video.status === 'approved' ? 'Selected' : video.status}
                </Badge>
              </div>
            </div>
            <Button onClick={onClose} variant="outline" className="text-white border-white">
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    {video.cfStreamId ? (
                      <SimpleVideoPlayer
                        video={video}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        <Eye className="w-16 h-16" />
                        <span className="ml-4">Video processing...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card className="bg-white/5 border-white/10 mt-4">
                <CardHeader>
                  <CardTitle className="text-white">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80">{video.description}</p>
                </CardContent>
              </Card>
            </div>

            {/* Video Info */}
            <div className="space-y-4">
              {/* Status */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className={`${getStatusColor(video.status)} text-white`}>
                      {video.status === 'approved' ? 'Selected for Enhancement' : video.status}
                    </Badge>
                    <p className="text-white/80 text-sm">
                      {getStatusMessage(video.status)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Info */}
              {video.status === 'published' && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70">Status:</span>
                        <span className="text-green-400">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Share:</span>
                        <span className="text-white">60%</span>
                      </div>
                      <p className="text-white/60 text-sm mt-3">
                        Your video is earning revenue share. Check your dashboard for detailed earnings.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Technical Info */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Technical Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Duration:</span>
                      <span className="text-white">{formatDuration(video.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Uploaded:</span>
                      <span className="text-white">{new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                    {video.publishedAt && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Published:</span>
                        <span className="text-white">{new Date(video.publishedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}