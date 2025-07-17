import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VideoUpload from "@/components/VideoUpload";
import { CreatorVideoLibrary } from "@/components/CreatorVideoLibrary";
import { CreatorVideoViewer } from "@/components/CreatorVideoViewer";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { LogoutButton } from "@/components/LogoutButton";
import { 
  Upload, 
  Video, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Eye,
  CheckCircle,
  AlertCircle,
  Settings,
  Users,
  BarChart3,
  Mail,
  Shield
} from "lucide-react";
import { Video as VideoType } from "@shared/schema";
import { Link } from "wouter";

export default function CreatorDashboard() {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const { user } = useAuth();

  // Fetch user's videos
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['/api/videos/my-detailed']
  });

  // Fetch earnings projection
  const { data: earnings } = useQuery({
    queryKey: ['/api/earnings/projection']
  });

  const getStatusStats = () => {
    const stats = {
      total: videos.length,
      processing: videos.filter((v: VideoType) => v.status === 'processing').length,
      selected: videos.filter((v: VideoType) => v.status === 'approved').length,
      published: videos.filter((v: VideoType) => v.status === 'published').length,
      pending: videos.filter((v: VideoType) => v.status === 'draft').length
    };
    return stats;
  };

  const stats = getStatusStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {(user as any)?.role === 'admin' ? 'Admin Dashboard' : 'Creator Dashboard'}
              </h1>
              <p className="text-white/70">
                {(user as any)?.role === 'admin' 
                  ? 'Full administrator access to all platform features'
                  : 'Upload your UTV/ATV videos and track their progress through our enhancement pipeline'
                }
              </p>
            </div>
            
            {/* Admin Quick Access Menu */}
            {(user as any)?.role === 'admin' && (
              <div className="flex flex-wrap gap-2">
                <Link to="/admin">
                  <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
                <Link to="/admin/ai-highlights">
                  <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    AI Highlights
                  </Button>
                </Link>
                <Link to="/email-preview">
                  <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <Mail className="w-4 h-4 mr-2" />
                    Email System
                  </Button>
                </Link>
                <Link to="/publishing">
                  <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <Shield className="w-4 h-4 mr-2" />
                    Publishing
                  </Button>
                </Link>
              </div>
            )}
            
            {/* Logout Button */}
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Videos</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Video className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Processing</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.processing}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Selected</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.selected}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Published</p>
                  <p className="text-2xl font-bold text-green-400">{stats.published}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 text-sm mb-4">
                Share your UTV/ATV adventures with our community
              </p>
              <Button 
                onClick={() => setShowUpload(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Video
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 text-sm mb-2">
                Projected earnings from published videos
              </p>
              <p className="text-2xl font-bold text-green-400 mb-4">
                ${earnings?.projectedEarnings || '0.00'}
              </p>
              <div className="text-sm text-white/60">
                {stats.published} videos earning revenue
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-white font-semibold">1.</span>
                  <span>Upload your raw UTV/ATV footage</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white font-semibold">2.</span>
                  <span>Our team reviews and selects videos</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white font-semibold">3.</span>
                  <span>AI enhances selected videos</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white font-semibold">4.</span>
                  <span>Published videos earn you 60% revenue share</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Updates */}
        {stats.pending > 0 && (
          <Card className="bg-orange-500/10 border-orange-500/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Pending Review</span>
              </div>
              <p className="text-white/80 text-sm mt-1">
                You have {stats.pending} video{stats.pending > 1 ? 's' : ''} awaiting admin review
              </p>
            </CardContent>
          </Card>
        )}

        {/* Video Library */}
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Your Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreatorVideoLibrary 
              videos={videos}
              onVideoSelect={setSelectedVideo}
            />
          </CardContent>
        </Card>

        {/* Modals */}
        {showUpload && (
          <VideoUpload 
            onClose={() => setShowUpload(false)}
            onVideoUploaded={() => {
              setShowUpload(false);
              // Refresh videos list
              window.location.reload();
            }}
          />
        )}

        {selectedVideo && (
          <CreatorVideoViewer 
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </div>
    </div>
  );
}