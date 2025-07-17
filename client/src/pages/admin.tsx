import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { 
  Play, 
  Menu, 
  UserCircle, 
  Users, 
  Video, 
  DollarSign, 
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  BarChart3,
  Crown,
  Shield,
  User,
  Upload,
  Download,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

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

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive",
      });
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch platform statistics
  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/platform-stats'],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  // Fetch all users
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  // Fetch all videos
  const { data: allVideos, isLoading: videosLoading } = useQuery({
    queryKey: ['/api/admin/videos'],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  // Fetch all payouts
  const { data: allPayouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['/api/admin/payouts'],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update video status mutation
  const updateVideoStatusMutation = useMutation({
    mutationFn: async ({ videoId, status }: { videoId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/videos/${videoId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videos'] });
      toast({
        title: "Video Updated",
        description: "Video status has been successfully updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update video status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-deep-gradient flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-deep-gradient">
      {/* Navigation */}
      <nav className="glass-card bg-card-gradient sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Play className="text-accent-pink text-2xl" />
              <h1 className="text-white text-xl font-bold admin-heading">RideReels Admin</h1>
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
              <Link href="/admin" className="text-white text-accent-pink transition-colors">
                Admin
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
                  <Crown className="text-yellow-500" size={20} />
                  <span className="text-white text-sm">Admin</span>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-white hover:text-accent-pink"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 admin-heading">Admin Dashboard</h2>
          <p className="text-white/70 admin-text">Manage platform users, content, and settings</p>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-4 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'videos', label: 'Videos', icon: Video },
              { id: 'payouts', label: 'Payouts', icon: DollarSign },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-accent-pink text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon size={16} />
                <span className="admin-text">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Platform Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card bg-card-gradient border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">
                        {platformStats?.totalUsers || 0}
                      </p>
                    </div>
                    <Users className="text-accent-pink text-xl" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">Total Videos</p>
                      <p className="text-2xl font-bold text-white">
                        {platformStats?.totalVideos || 0}
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
                      <p className="text-white/70 text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold text-white">
                        ${platformStats?.totalRevenue || '0.00'}
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
                      <p className="text-white/70 text-sm">Pending Reviews</p>
                      <p className="text-2xl font-bold text-white">
                        {platformStats?.pendingVideos || 0}
                      </p>
                    </div>
                    <AlertCircle className="text-accent-pink text-xl" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/admin/ai-highlights">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      AI Highlights Review
                    </Button>
                  </Link>
                  <Link href="/notifications">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                      <Mail className="w-4 h-4 mr-2" />
                      Notifications
                    </Button>
                  </Link>
                  <Link href="/email-preview">
                    <Button className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                      <Eye className="w-4 h-4 mr-2" />
                      Email Preview
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <Upload className="text-blue-500" size={20} />
                      <div>
                        <p className="text-white text-sm">New video uploaded</p>
                        <p className="text-white/50 text-xs">User: {user?.email}</p>
                      </div>
                    </div>
                    <span className="text-white/50 text-xs">2 minutes ago</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-500" size={20} />
                      <div>
                        <p className="text-white text-sm">Video approved</p>
                        <p className="text-white/50 text-xs">Administrator action</p>
                      </div>
                    </div>
                    <span className="text-white/50 text-xs">1 hour ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allUsers?.map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <img
                              src={user.profileImageUrl || '/default-avatar.png'}
                              alt={user.firstName || 'User'}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="text-white font-medium">
                                {user.firstName || user.email?.split('@')[0] || 'User'}
                              </p>
                              <p className="text-white/50 text-sm">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="text-white border-white/20">
                              {getRoleIcon(user.role)}
                              <span className="ml-1">{user.role}</span>
                            </Badge>
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => 
                                updateUserRoleMutation.mutate({ userId: user.id, role: newRole })
                              }
                            >
                              <SelectTrigger className="w-32 glass-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Video Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {videosLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allVideos?.map((video: any) => (
                        <div key={video.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                              <Video className="text-white/50" size={20} />
                            </div>
                            <div>
                              <p className="text-white font-medium">{video.title}</p>
                              <p className="text-white/50 text-sm">
                                {video.views} views • {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={`${getStatusColor(video.status)} text-white`}>
                              {video.status}
                            </Badge>
                            <Select
                              value={video.status}
                              onValueChange={(newStatus) => 
                                updateVideoStatusMutation.mutate({ videoId: video.id, status: newStatus })
                              }
                            >
                              <SelectTrigger className="w-32 glass-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Payout Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payoutsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allPayouts?.map((payout: any) => (
                        <div key={payout.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <DollarSign className="text-green-500" size={20} />
                            <div>
                              <p className="text-white font-medium">${payout.amount}</p>
                              <p className="text-white/50 text-sm">
                                User ID: {payout.userId} • {payout.method}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={`${getStatusColor(payout.status)} text-white`}>
                              {payout.status}
                            </Badge>
                            <span className="text-white/50 text-sm">
                              {new Date(payout.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-white text-sm font-medium">Platform Name</Label>
                    <Input
                      value="RideReels"
                      className="glass-input mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <Label className="text-white text-sm font-medium">Revenue Share (Creator %)</Label>
                    <Input
                      value="70"
                      className="glass-input mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <Label className="text-white text-sm font-medium">Minimum Payout Threshold</Label>
                    <Input
                      value="$50.00"
                      className="glass-input mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <Label className="text-white text-sm font-medium">Platform Status</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <CheckCircle className="text-green-500" size={16} />
                      <span className="text-white text-sm">Operational</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}