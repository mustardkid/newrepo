import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Video, Eye, Upload as UploadIcon, Play, Menu, UserCircle } from "lucide-react";
import VideoUpload from "@/components/VideoUpload";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useEffect } from "react";

export default function UploadPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to upload videos.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleUploadComplete = (video: any) => {
    toast({
      title: "Upload Successful!",
      description: `Your video "${video.title}" has been processed and is ready to view.`,
    });
  };

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

      {/* Upload Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Upload Your UTV Adventure</h2>
            <p className="text-white/70">Share your footage and let AI transform it into viral content</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Form - Takes 2 columns */}
            <div className="lg:col-span-2">
              <VideoUpload onUploadComplete={handleUploadComplete} />
            </div>

            {/* Features Sidebar */}
            <div className="space-y-6">
              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    AI Enhancement Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Auto Highlight Detection</p>
                      <p className="text-gray-400 text-sm">AI finds the most exciting moments in your footage</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Dynamic Editing</p>
                      <p className="text-gray-400 text-sm">Automatic cuts, transitions, and pacing optimization</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Sound Enhancement</p>
                      <p className="text-gray-400 text-sm">Audio leveling and background music matching</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Viral Optimization</p>
                      <p className="text-gray-400 text-sm">Format and style optimized for social media</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Video className="h-5 w-5 text-green-400" />
                    Revenue Sharing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Earn money from your content with our creator revenue sharing program.
                  </p>
                  <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Your Share</span>
                      <span className="text-2xl font-bold text-green-400">70%</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      Of all ad revenue generated by your enhanced videos
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <UploadIcon className="h-5 w-5 text-blue-400" />
                    Upload Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-white mb-1">Best Practices:</p>
                    <ul className="space-y-1 text-gray-400">
                      <li>• Use 1080p or higher resolution</li>
                      <li>• Keep videos under 10 minutes</li>
                      <li>• Include action-packed moments</li>
                      <li>• Add descriptive titles and tags</li>
                    </ul>
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
