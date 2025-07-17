import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
// logout function is now available from useAuth hook
import { Link, useLocation } from "wouter";
import VideoUpload from "@/components/VideoUpload";
import VideoLibrary from "@/components/VideoLibrary";
import VideoPlayer from "@/components/VideoPlayer";
import VideoEditor from "@/components/VideoEditor";
import { 
  Play, Upload, Bot, DollarSign, Menu, UserCircle, Eye, Video, Settings, Bell, 
  Clock, CheckCircle, AlertCircle, TrendingUp, Target, User, MapPin, 
  Wrench, Award, Star, Calendar, BarChart, PieChart, Zap, Sparkles,
  MessageSquare, PlayCircle, Edit3, Save, X, Plus, Trash2, ExternalLink, 
  ChevronDown, LogOut, Home, CreditCard, Crown
} from "lucide-react";

export default function EnhancedDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedVideoForEdit, setSelectedVideoForEdit] = useState<any>(null);
  const [profileData, setProfileData] = useState({
    biography: '',
    ridingStyle: '',
    experienceLevel: '',
    location: '',
    equipment: '[]',
    socialLinks: '[]'
  });

  // Fetch user's videos with detailed processing information
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["/api/videos/my-detailed"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch user notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch earnings projections
  const { data: earningsProjection, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/earnings/projection"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged Out',
        description: 'Successfully logged out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout Failed',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/profile/update", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Mark notification as read
  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Initialize profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        biography: user.biography || '',
        ridingStyle: user.ridingStyle || '',
        experienceLevel: user.experienceLevel || '',
        location: user.location || '',
        equipment: user.equipment || '[]',
        socialLinks: user.socialLinks || '[]'
      });
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/api/login", 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-deep-gradient flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
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

  const getProcessingProgress = (video: any) => {
    if (video.status === 'published') return 100;
    if (video.status === 'approved' || video.cfReadyToStream) return 100;
    if (video.cfProcessingStatus === 'ready') return 100;
    if (video.cfProcessingStatus === 'inprogress') return 60;
    if (video.status === 'processing') return 40;
    if (video.status === 'uploading') return 20;
    return 0;
  };

  const calculateEarningsProjection = (highlights: any[]) => {
    if (!highlights || highlights.length === 0) return 0;
    
    const averageViralScore = highlights.reduce((sum, h) => sum + (h.score || 0), 0) / highlights.length;
    const baseEarnings = 50; // Base earnings per video
    const multiplier = 1 + (averageViralScore * 2); // Viral score multiplier
    return baseEarnings * multiplier;
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
            
            {/* Main Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                <Home size={16} />
                Dashboard
              </Link>
              <Button
                onClick={() => setShowUploadDialog(true)}
                variant="ghost"
                className="text-white hover:text-accent-pink transition-colors flex items-center gap-2"
              >
                <Upload size={16} />
                Upload
              </Button>
              <Link href="/earnings" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                <CreditCard size={16} />
                Earnings
              </Link>
              <Link href="/publishing" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                <BarChart size={16} />
                Publishing
              </Link>
              <Link href="/premium" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                <Crown size={16} />
                Premium
              </Link>
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <>
                  <Link href="/admin" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                    <Settings size={16} />
                    Admin Panel
                  </Link>
                  <Link href="/admin/ai-highlights" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                    <BarChart size={16} />
                    AI Highlights
                  </Link>
                  <Link href="/email-preview" className="text-white hover:text-accent-pink transition-colors flex items-center gap-2">
                    <MessageSquare size={16} />
                    Email System
                  </Link>
                </>
              )}
            </div>

            {/* Right Navigation */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell - Clickable */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('notifications')}
                  className="text-white hover:text-accent-pink p-2"
                >
                  <Bell size={20} />
                  {notifications && notifications.filter((n: any) => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.filter((n: any) => !n.isRead).length}
                    </span>
                  )}
                </Button>
              </div>

              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-2 text-white hover:bg-white/20"
                  >
                    <UserCircle size={20} />
                    <span className="text-sm">
                      {user?.firstName || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card-gradient border-white/20">
                  <DropdownMenuItem onClick={() => setActiveTab('profile')} className="text-white hover:bg-white/10">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('notifications')} className="text-white hover:bg-white/10">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings')} className="text-white hover:bg-white/10">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-white hover:bg-white/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {(user?.role === 'admin' || user?.role === 'moderator') ? (
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Administrator Dashboard
                  </span>
                ) : (
                  'Enhanced Creator Dashboard'
                )}
              </h2>
              <p className="text-white/70">
                {(user?.role === 'admin' || user?.role === 'moderator') 
                  ? 'Full platform management and advanced analytics' 
                  : 'Advanced content management and performance tracking'
                }
              </p>
            </div>
            
            {/* Admin Quick Actions */}
            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <div className="flex flex-wrap gap-2">
                <Link to="/admin">
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
                <Link to="/admin/ai-highlights">
                  <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <BarChart className="w-4 h-4 mr-2" />
                    AI Highlights
                  </Button>
                </Link>
                <Link to="/email-preview">
                  <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Email System
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white/10 rounded-xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-accent-pink data-[state=active]:text-white">
              <BarChart className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-accent-pink data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="previews" className="data-[state=active]:bg-accent-pink data-[state=active]:text-white">
              <PlayCircle className="w-4 h-4 mr-2" />
              Previews
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-accent-pink data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-accent-pink data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-accent-pink data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-6">
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
              
              <Card className="glass-card bg-card-gradient border-white/10 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setActiveTab('previews')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">Videos Published</p>
                      <p className="text-2xl font-bold text-white">
                        {videos?.filter((v: any) => v.status === 'published').length || 0}
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
                      <p className="text-white/70 text-sm">Viral Score</p>
                      <p className="text-2xl font-bold text-white">
                        {videos && videos.length > 0 ? 
                          (videos.reduce((sum: number, v: any) => sum + (v.aiViralPotentialScore || 0), 0) / videos.length).toFixed(2) : 
                          '0.00'
                        }
                      </p>
                    </div>
                    <TrendingUp className="text-accent-pink text-xl" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">
                    Upload new UTV/ATV content for AI enhancement
                  </p>
                  <Button 
                    onClick={() => setShowUploadDialog(true)}
                    className="w-full bg-accent-pink hover:bg-accent-pink/80 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Now
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">
                    View earnings and manage payouts
                  </p>
                  <Button 
                    onClick={() => setLocation('/earnings')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    View Earnings
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">
                    {notifications?.filter((n: any) => !n.isRead).length || 0} unread notifications
                  </p>
                  <Button 
                    onClick={() => setActiveTab('notifications')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Notifications Preview */}
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    notifications.slice(0, 3).map((notification: any) => (
                      <div key={notification.id} className={`flex items-center space-x-3 p-3 rounded-lg ${
                        notification.isRead ? 'bg-white/5' : 'bg-accent-pink/10'
                      }`}>
                        <div className="flex-shrink-0">
                          {notification.type === 'clip_selected' && <Sparkles className="text-yellow-500" size={20} />}
                          {notification.type === 'video_published' && <Video className="text-green-500" size={20} />}
                          {notification.type === 'earnings_milestone' && <Target className="text-blue-500" size={20} />}
                          {notification.type === 'payout_processed' && <DollarSign className="text-green-500" size={20} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white text-sm font-medium">{notification.title}</h4>
                          <p className="text-white/70 text-xs">{notification.message}</p>
                        </div>
                        <div className="text-white/50 text-xs">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/50">
                      No notifications yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Submission Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Detailed Submission Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {videosLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : videos && videos.length > 0 ? (
                    videos.map((video: any) => (
                      <div key={video.id} className="bg-white/5 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-white text-lg font-semibold">{video.title}</h3>
                            <p className="text-white/70 text-sm">{video.description}</p>
                          </div>
                          <Badge className={`${getStatusColor(video.status)} text-white`}>
                            {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white/70 text-sm">Processing Progress</span>
                            <span className="text-white/70 text-sm">{getProcessingProgress(video).toFixed(0)}%</span>
                          </div>
                          <Progress value={getProcessingProgress(video)} className="h-2" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <Upload className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                            <p className="text-white text-sm">Uploaded</p>
                            <p className="text-white/70 text-xs">
                              {new Date(video.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <Bot className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                            <p className="text-white text-sm">AI Processing</p>
                            <p className="text-white/70 text-xs">
                              {video.aiProcessingStatus === 'completed' ? 'Complete' : 
                               video.aiProcessingStatus === 'processing' ? 'In Progress' : 
                               video.aiProcessingStatus === 'failed' ? 'Failed' : 'Pending'}
                            </p>
                          </div>
                          
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            {video.aiViralPotentialScore && (
                              <>
                                <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
                                <p className="text-white text-sm">Viral Score</p>
                                <p className="text-white/70 text-xs">
                                  {(video.aiViralPotentialScore * 100).toFixed(0)}%
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {video.aiProcessingError && (
                          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <p className="text-red-400 text-sm">Processing Error</p>
                            </div>
                            <p className="text-red-300 text-xs mt-1">{video.aiProcessingError}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Video className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <p className="text-white/70 mb-4">No videos uploaded yet</p>
                      <Link href="/upload">
                        <Button className="bg-light-gradient text-gray-900 font-semibold hover-lift transition-all">
                          Upload Your First Video
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Library & Previews Tab */}
          <TabsContent value="previews" className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Video Library & Previews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {videosLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : videos && videos.length > 0 ? (
                    videos.map((video: any) => {
                      const highlights = JSON.parse(video.aiHighlights || '[]');
                      const streamUrl = video.cfStreamId ? `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${video.cfStreamId}/manifest/video.m3u8` : null;
                      const thumbnailUrl = video.cfStreamId ? `https://customer-eyuarig5yvnak9in.cloudflarestream.com/${video.cfStreamId}/thumbnails/thumbnail.jpg` : null;
                      
                      return (
                        <div key={video.id} className="bg-white/5 rounded-lg p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Video Preview */}
                            <div className="lg:col-span-1">
                              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                                {video.cfStreamId && video.cfReadyToStream ? (
                                  <VideoPlayer
                                    streamId={video.cfStreamId}
                                    title={video.title}
                                    className="w-full h-full"
                                    controls={true}
                                    poster={thumbnailUrl}
                                    onError={(error) => {
                                      console.error('Video playback error:', error);
                                    }}
                                  />
                                ) : video.cfStreamId ? (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                    {thumbnailUrl ? (
                                      <img 
                                        src={thumbnailUrl} 
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="text-white text-center">
                                        <Video className="w-12 h-12 mx-auto mb-2" />
                                        <p className="text-sm">Processing video...</p>
                                        <p className="text-xs text-white/60 mt-1">
                                          Status: {video.cfProcessingStatus || 'pending'}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                    <div className="text-white text-center">
                                      <Upload className="w-12 h-12 mx-auto mb-2" />
                                      <p className="text-sm">Awaiting upload...</p>
                                      <p className="text-xs text-white/60 mt-1">No stream ID found</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Video Details */}
                            <div className="lg:col-span-2">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="text-white text-lg font-semibold">{video.title}</h3>
                                  <p className="text-white/70 text-sm">{video.description}</p>
                                  <p className="text-white/50 text-xs mt-2">
                                    Uploaded {new Date(video.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={`${getStatusColor(video.status)} text-white`}>
                                    {video.status === 'approved' ? 'Ready to Edit' : video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                                  </Badge>
                                  <Button
                                    onClick={() => setSelectedVideoForEdit(video)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Edit
                                  </Button>
                                </div>
                              </div>

                              {/* Processing Status */}
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-white/70 text-sm">Processing Progress</span>
                                  <span className="text-white/70 text-sm">{getProcessingProgress(video).toFixed(0)}%</span>
                                </div>
                                <Progress value={getProcessingProgress(video)} className="h-2" />
                              </div>

                              {/* AI Enhancement Status */}
                              {video.aiProcessingStatus === 'completed' && highlights.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-white font-medium mb-2">AI Enhancement Results</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <Sparkles className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                                      <p className="text-white text-sm">{highlights.length}</p>
                                      <p className="text-white/70 text-xs">Highlights</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
                                      <p className="text-white text-sm">{(video.aiViralPotentialScore * 100).toFixed(0)}%</p>
                                      <p className="text-white/70 text-xs">Viral Score</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <Bot className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                                      <p className="text-white text-sm">{highlights.filter((h: any) => h.clipType === 'action').length}</p>
                                      <p className="text-white/70 text-xs">Action Clips</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <Eye className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                                      <p className="text-white text-sm">{highlights.filter((h: any) => h.clipType === 'scenic').length}</p>
                                      <p className="text-white/70 text-xs">Scenic Clips</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Distribution Status */}
                              <div className="mb-4">
                                <h4 className="text-white font-medium mb-2">Distribution Status</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-white/10 rounded-lg p-3 text-center">
                                    <div className="w-8 h-8 bg-red-600 rounded mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">YT</span>
                                    </div>
                                    <p className="text-white/70 text-xs">
                                      {video.status === 'published' ? 'Published' : 'Pending'}
                                    </p>
                                  </div>
                                  <div className="bg-white/10 rounded-lg p-3 text-center">
                                    <div className="w-8 h-8 bg-black rounded mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">TT</span>
                                    </div>
                                    <p className="text-white/70 text-xs">
                                      {highlights.length > 0 ? 'Ready' : 'Pending'}
                                    </p>
                                  </div>
                                  <div className="bg-white/10 rounded-lg p-3 text-center">
                                    <div className="w-8 h-8 bg-blue-600 rounded mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">FB</span>
                                    </div>
                                    <p className="text-white/70 text-xs">
                                      {video.status === 'published' ? 'Queued' : 'Pending'}
                                    </p>
                                  </div>
                                  <div className="bg-white/10 rounded-lg p-3 text-center">
                                    <div className="w-8 h-8 bg-black rounded mx-auto mb-2 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">X</span>
                                    </div>
                                    <p className="text-white/70 text-xs">
                                      {highlights.filter((h: any) => h.clipType === 'action').length > 0 ? 'Ready' : 'Pending'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Compilation Status */}
                              {highlights.length > 0 && (
                                <div className="bg-accent-pink/10 rounded-lg p-4 border border-accent-pink/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-accent-pink" />
                                    <h4 className="text-white font-medium">Compilation Status</h4>
                                  </div>
                                  <p className="text-white/70 text-sm">
                                    {highlights.filter((h: any) => h.score > 0.7).length} clips selected for compilation • 
                                    {highlights.filter((h: any) => h.clipType === 'action').length} action sequences • 
                                    {highlights.filter((h: any) => h.clipType === 'scenic').length} scenic moments
                                  </p>
                                  <div className="mt-3 flex gap-2">
                                    <Badge className="bg-green-500 text-white">
                                      {highlights.filter((h: any) => h.score > 0.8).length} Premium Clips
                                    </Badge>
                                    <Badge className="bg-blue-500 text-white">
                                      {highlights.filter((h: any) => h.clipType === 'action').length} Action Shorts
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <PlayCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <p className="text-white/70 mb-4">No videos uploaded yet</p>
                      <Button 
                        onClick={() => setShowUploadDialog(true)}
                        className="bg-accent-pink hover:bg-accent-pink/80 text-white"
                      >
                        Upload Your First Video
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Projection Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Earnings Projection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        ${videos && videos.length > 0 ? 
                          videos.reduce((sum: number, v: any) => {
                            const highlights = JSON.parse(v.aiHighlights || '[]');
                            return sum + calculateEarningsProjection(highlights);
                          }, 0).toFixed(2) : 
                          '0.00'
                        }
                      </p>
                      <p className="text-white/70 text-sm">Projected Monthly Earnings</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">Base Rate</span>
                        <span className="text-white text-sm">$0.05 per view</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">Viral Bonus</span>
                        <span className="text-white text-sm">Up to 3x multiplier</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">Creator Share</span>
                        <span className="text-white text-sm">70%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {videos && videos.length > 0 ? (
                      videos.map((video: any) => {
                        const highlights = JSON.parse(video.aiHighlights || '[]');
                        const projection = calculateEarningsProjection(highlights);
                        
                        return (
                          <div key={video.id} className="border-l-4 border-accent-pink pl-4 py-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-white text-sm font-medium">{video.title}</h4>
                                <p className="text-white/70 text-xs">{highlights.length} highlights</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white text-sm font-medium">
                                  ${projection.toFixed(2)}
                                </p>
                                <p className="text-white/70 text-xs">projected</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-white/70 text-sm">No videos for projection</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    notifications.map((notification: any) => (
                      <div key={notification.id} className={`flex items-start space-x-3 p-4 rounded-lg border-l-4 ${
                        notification.isRead ? 'bg-white/5 border-white/20' : 'bg-accent-pink/10 border-accent-pink'
                      }`}>
                        <div className="flex-shrink-0 mt-1">
                          {notification.type === 'clip_selected' && <Sparkles className="text-yellow-500" size={20} />}
                          {notification.type === 'video_published' && <Video className="text-green-500" size={20} />}
                          {notification.type === 'earnings_milestone' && <Target className="text-blue-500" size={20} />}
                          {notification.type === 'payout_processed' && <DollarSign className="text-green-500" size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-white font-medium">{notification.title}</h4>
                              <p className="text-white/70 text-sm mt-1">{notification.message}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white/50 text-xs">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                              {!notification.isRead && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markNotificationReadMutation.mutate(notification.id)}
                                  className="text-accent-pink hover:text-accent-pink/80 text-xs mt-1"
                                >
                                  Mark as Read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Bell className="w-16 h-16 text-white/30 mx-auto mb-4" />
                      <p className="text-white/70 mb-2">No notifications yet</p>
                      <p className="text-white/50 text-sm">You'll see updates about clip selections and earnings here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Enhancement Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Creator Profile
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="ml-auto text-white hover:text-accent-pink"
                  >
                    {isEditingProfile ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Biography</Label>
                        <Textarea
                          value={profileData.biography}
                          onChange={(e) => setProfileData({...profileData, biography: e.target.value})}
                          placeholder="Tell us about yourself and your riding journey..."
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">Riding Style</Label>
                          <Select value={profileData.ridingStyle} onValueChange={(value) => setProfileData({...profileData, ridingStyle: value})}>
                            <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trail">Trail Riding</SelectItem>
                              <SelectItem value="rock_crawling">Rock Crawling</SelectItem>
                              <SelectItem value="mud_bogging">Mud Bogging</SelectItem>
                              <SelectItem value="racing">Racing</SelectItem>
                              <SelectItem value="scenic">Scenic Tours</SelectItem>
                              <SelectItem value="freestyle">Freestyle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-white">Experience Level</Label>
                          <Select value={profileData.experienceLevel} onValueChange={(value) => setProfileData({...profileData, experienceLevel: value})}>
                            <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-white">Location</Label>
                        <Input
                          value={profileData.location}
                          onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                          placeholder="e.g., Colorado, USA"
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveProfile}
                          disabled={updateProfileMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Profile
                        </Button>
                        <Button 
                          onClick={() => setIsEditingProfile(false)}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-white font-medium mb-2">Biography</h3>
                        <p className="text-white/70">
                          {user?.biography || "No biography added yet. Click edit to add your story!"}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-white text-sm">Riding Style</span>
                          </div>
                          <p className="text-white/70 text-sm">
                            {user?.ridingStyle?.replace('_', ' ') || 'Not specified'}
                          </p>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-blue-500" />
                            <span className="text-white text-sm">Experience</span>
                          </div>
                          <p className="text-white/70 text-sm">
                            {user?.experienceLevel || 'Not specified'}
                          </p>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            <span className="text-white text-sm">Location</span>
                          </div>
                          <p className="text-white/70 text-sm">
                            {user?.location || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl bg-card-gradient border-white/20" aria-describedby="upload-description">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Video
            </DialogTitle>
          </DialogHeader>
          <div id="upload-description" className="mt-4">
            <VideoUpload onUploadComplete={() => {
              setShowUploadDialog(false);
              queryClient.invalidateQueries({ queryKey: ["/api/videos/my-detailed"] });
              toast({ title: "Upload started", description: "Your video is being processed" });
            }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Editor Modal */}
      {selectedVideoForEdit && (
        <VideoEditor
          video={selectedVideoForEdit}
          onClose={() => setSelectedVideoForEdit(null)}
        />
      )}
    </div>
  );
}