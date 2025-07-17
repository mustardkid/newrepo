import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { Play, Upload, Bot, DollarSign, Menu, UserCircle, Eye, Video, Settings, MoreVertical, Sparkles } from "lucide-react";
import AIVideoDetails from "@/components/AIVideoDetails";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["/api/videos/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-deep-gradient flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-deep-gradient">
      {/* Navigation */}
      <nav className="glass-card bg-card-gradient sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Play className="text-accent-pink text-2xl" />
              <h1 className="text-white text-xl font-bold">RideReels</h1>
            </div>
            <div className="hidden md:flex space-x-6">
              <Link href="/" className="text-white hover:text-accent-pink transition-colors">
                Dashboard
              </Link>
              <Link href="/upload" className="text-white hover:text-accent-pink transition-colors">
                Upload
              </Link>
              <Link href="/earnings" className="text-white hover:text-accent-pink transition-colors">
                Earnings
              </Link>
              <Link href="/premium" className="text-white hover:text-accent-pink transition-colors">
                Premium
              </Link>
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <Link href="/admin" className="text-white hover:text-accent-pink transition-colors">
                  Admin
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
                  <UserCircle className="text-white" size={20} />
                  <span className="text-white text-sm">
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </span>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-white hover:text-accent-pink"
              >
                Logout
              </Button>
              <button className="md:hidden text-white">
                <Menu />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Creator Dashboard</h2>
          <p className="text-white/70">Manage your content and track your earnings</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card bg-card-gradient border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Views</p>
                  <p className="text-2xl font-bold text-white">
                    {user?.totalViews?.toLocaleString() || '0'}
                  </p>
                </div>
                <Eye className="text-accent-pink text-xl" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card-gradient border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Earnings</p>
                  <p className="text-2xl font-bold text-white">
                    ${user?.totalEarnings || '0.00'}
                  </p>
                </div>
                <DollarSign className="text-accent-pink text-xl" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card-gradient border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Videos Published</p>
                  <p className="text-2xl font-bold text-white">
                    {user?.videosPublished || 0}
                  </p>
                </div>
                <Video className="text-accent-pink text-xl" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card-gradient border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Processing</p>
                  <p className="text-2xl font-bold text-white">
                    {user?.videosProcessing || 0}
                  </p>
                </div>
                <Settings className="text-accent-pink text-xl animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Videos */}
        <Card className="glass-card bg-card-gradient border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Recent Videos</h3>
              <Link href="/upload">
                <Button className="bg-light-gradient text-gray-900 font-semibold hover-lift transition-all hover:bg-light-gradient/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New
                </Button>
              </Link>
            </div>
            
            {videosLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="space-y-4">
                {videos.map((video: any) => (
                  <div key={video.id} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
                    <div className="w-20 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded object-cover flex items-center justify-center">
                      <Video className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{video.title}</h4>
                      <p className="text-white/70 text-sm">
                        {video.status === 'published' ? `Published • ${video.views} views • $${video.earnings} earned` : 
                         video.status === 'processing' ? 'Processing • AI Enhancement in progress' :
                         video.status === 'pending' ? 'Pending Review' :
                         video.status === 'approved' ? 'Approved • Ready for publishing' :
                         'Under Review'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        video.status === 'published' ? 'bg-green-500 text-white' :
                        video.status === 'processing' ? 'bg-yellow-500 text-white' :
                        video.status === 'approved' ? 'bg-blue-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                      </span>
                      {video.aiEnhanced && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none"
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                AI Enhancement - {video.title}
                              </DialogTitle>
                            </DialogHeader>
                            <AIVideoDetails videoId={video.id} />
                          </DialogContent>
                        </Dialog>
                      )}
                      <button className="text-white hover:text-accent-pink">
                        <MoreVertical />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/70 mb-4">No videos uploaded yet</p>
                <Link href="/upload">
                  <Button className="bg-light-gradient text-gray-900 font-semibold hover-lift transition-all hover:bg-light-gradient/90">
                    Upload Your First Video
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
