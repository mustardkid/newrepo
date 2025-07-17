import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, BarChart3, Play, Pause, Youtube, TrendingUp, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  rateLimits: {
    youtube: {
      maxPerHour: number;
      maxPerDay: number;
      currentHour: number;
      currentDay: number;
    };
    tiktok: {
      maxPerHour: number;
      maxPerDay: number;
      currentHour: number;
      currentDay: number;
    };
  };
}

interface Publication {
  id: number;
  videoId: number;
  platform: string;
  platformVideoId: string;
  publishedAt: string;
  title: string;
  url: string;
  status: string;
}

interface PlatformAnalytics {
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  fetchedAt: string;
}

interface ContentCalendarItem {
  date: string;
  platform: string;
  contentType: string;
  optimalTime: string;
  estimatedReach: number;
}

export default function PublishingDashboard() {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishingOptions, setPublishingOptions] = useState({
    immediate: false,
    useOptimalTiming: true,
    customSchedule: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  // Fetch queue status
  const { data: queueStatus } = useQuery<QueueStatus>({
    queryKey: ['/api/publishing/queue/status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch publishing insights
  const { data: insights } = useQuery({
    queryKey: ['/api/publishing/insights'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch user's videos
  const { data: videos } = useQuery({
    queryKey: ['/api/videos/my-detailed']
  });

  // Fetch content calendar
  const { data: calendar } = useQuery<ContentCalendarItem[]>({
    queryKey: ['/api/scheduling/calendar'],
    select: (data) => data?.slice(0, 14) || [] // Next 14 days
  });

  // Fetch platform analytics
  const { data: youtubeAnalytics } = useQuery<PlatformAnalytics[]>({
    queryKey: ['/api/analytics/platform/youtube'],
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const { data: tiktokAnalytics } = useQuery<PlatformAnalytics[]>({
    queryKey: ['/api/analytics/platform/tiktok'],
    refetchInterval: 300000
  });

  // Schedule publishing mutation
  const schedulePublishing = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/videos/' + data.videoId + '/schedule-publish', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publishing/queue/status'] });
      setSelectedVideo(null);
      setSelectedPlatforms([]);
    }
  });

  // Retry failed items mutation
  const retryFailedItems = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/publishing/retry-failed', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publishing/queue/status'] });
    }
  });

  const handleSchedulePublishing = () => {
    if (!selectedVideo || selectedPlatforms.length === 0) return;

    schedulePublishing.mutate({
      videoId: selectedVideo,
      platforms: selectedPlatforms,
      ...publishingOptions
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Publishing Dashboard</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Play className="mr-2 h-4 w-4" />
              Schedule Publishing
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Schedule Video Publishing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="video-select">Select Video</Label>
                <Select value={selectedVideo?.toString()} onValueChange={(value) => setSelectedVideo(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a video to publish" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos?.map((video: any) => (
                      <SelectItem key={video.id} value={video.id.toString()}>
                        {video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Select Platforms</Label>
                <div className="flex gap-4 mt-2">
                  {['youtube', 'tiktok'].map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform}
                        checked={selectedPlatforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlatforms([...selectedPlatforms, platform]);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                          }
                        }}
                      />
                      <Label htmlFor={platform} className="capitalize flex items-center gap-2">
                        {platform === 'youtube' && <Youtube className="h-4 w-4" />}
                        {platform === 'tiktok' && <TrendingUp className="h-4 w-4" />}
                        {platform}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Publishing Options</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="immediate"
                      checked={publishingOptions.immediate}
                      onCheckedChange={(checked) => setPublishingOptions({...publishingOptions, immediate: checked})}
                    />
                    <Label htmlFor="immediate">Publish immediately</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="optimal"
                      checked={publishingOptions.useOptimalTiming}
                      onCheckedChange={(checked) => setPublishingOptions({...publishingOptions, useOptimalTiming: checked})}
                    />
                    <Label htmlFor="optimal">Use optimal timing (recommended)</Label>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSchedulePublishing}
                disabled={!selectedVideo || selectedPlatforms.length === 0 || schedulePublishing.isPending}
                className="w-full"
              >
                {schedulePublishing.isPending ? 'Scheduling...' : 'Schedule Publishing'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Publications</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStatus?.pending || 0}</div>
                <p className="text-xs text-muted-foreground">Waiting to be published</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStatus?.processing || 0}</div>
                <p className="text-xs text-muted-foreground">Currently uploading</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStatus?.completed || 0}</div>
                <p className="text-xs text-muted-foreground">Successfully published</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Items</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{queueStatus?.failed || 0}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      YouTube
                    </span>
                    <Badge variant="outline">
                      {queueStatus?.rateLimits?.youtube?.currentHour || 0}/{queueStatus?.rateLimits?.youtube?.maxPerHour || 10} per hour
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{
                        width: `${((queueStatus?.rateLimits?.youtube?.currentHour || 0) / (queueStatus?.rateLimits?.youtube?.maxPerHour || 10)) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      TikTok
                    </span>
                    <Badge variant="outline">
                      {queueStatus?.rateLimits?.tiktok?.currentHour || 0}/{queueStatus?.rateLimits?.tiktok?.maxPerHour || 5} per hour
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{
                        width: `${((queueStatus?.rateLimits?.tiktok?.currentHour || 0) / (queueStatus?.rateLimits?.tiktok?.maxPerHour || 5)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publishing Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-bold">{((insights?.successRate || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Engagement</span>
                    <span className="font-bold">{((insights?.avgEngagement || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Platform</span>
                    <Badge className="capitalize">{insights?.topPerformingPlatform || 'YouTube'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Publications</span>
                    <span className="font-bold">{insights?.totalPublications || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Publishing Queue</h2>
            <Button 
              variant="outline" 
              onClick={() => retryFailedItems.mutate()}
              disabled={retryFailedItems.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Failed Items
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Queue Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{queueStatus?.pending || 0}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{queueStatus?.processing || 0}</div>
                    <div className="text-sm text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{queueStatus?.completed || 0}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{queueStatus?.failed || 0}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5" />
                  YouTube Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {youtubeAnalytics?.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{item.views.toLocaleString()} views</div>
                        <div className="text-sm text-muted-foreground">{formatDate(item.fetchedAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{item.likes} likes</div>
                        <div className="text-sm text-muted-foreground">{(Number(item.engagement) * 100).toFixed(1)}% engagement</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  TikTok Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tiktokAnalytics?.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{item.views.toLocaleString()} views</div>
                        <div className="text-sm text-muted-foreground">{formatDate(item.fetchedAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{item.likes} likes</div>
                        <div className="text-sm text-muted-foreground">{(Number(item.engagement) * 100).toFixed(1)}% engagement</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Content Calendar (Next 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calendar?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">{formatDate(item.date)}</div>
                      <Badge variant="outline" className="capitalize">
                        {item.platform}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {item.contentType}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDate(item.optimalTime)}</div>
                      <div className="text-sm text-muted-foreground">
                        Est. {item.estimatedReach.toLocaleString()} reach
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}