import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  TrendingUp, 
  Trophy, 
  Eye, 
  Heart, 
  Share2, 
  Search,
  Filter,
  Users,
  Star,
  Clock,
  MapPin,
  Calendar,
  Award
} from 'lucide-react';
import { Link } from 'wouter';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  // Fetch platform statistics
  const { data: platformStats } = useQuery({
    queryKey: ["/api/stats/platform"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch trending videos
  const { data: trendingVideos } = useQuery({
    queryKey: ["/api/videos/trending", selectedTimeframe],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch competitions
  const { data: competitions } = useQuery({
    queryKey: ["/api/competitions/active"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["/api/leaderboard", selectedTimeframe],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch recent videos
  const { data: recentVideos } = useQuery({
    queryKey: ["/api/videos/recent"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to RideReels</h1>
          <p className="text-white/70 mb-6">Please sign in to access your dashboard</p>
          <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Link href="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold text-white">RideReels</span>
              </div>
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-white hover:text-blue-400 transition-colors">Home</Link>
                <Link href="/discover" className="text-white/70 hover:text-blue-400 transition-colors">Discover</Link>
                <Link href="/competitions" className="text-white/70 hover:text-blue-400 transition-colors">Competitions</Link>
                <Link href="/leaderboard" className="text-white/70 hover:text-blue-400 transition-colors">Leaderboard</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search videos, creators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 w-64"
                />
              </div>
              <Link href="/upload">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                  Upload Video
                </Button>
              </Link>
              <Link href="/creator-dashboard">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Creator'}!
          </h1>
          <p className="text-white/70 text-lg">
            Discover trending content, join competitions, and track your progress
          </p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Videos</p>
                  <p className="text-2xl font-bold text-white">
                    {platformStats?.totalVideos || '2,847'}
                  </p>
                </div>
                <Play className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Active Creators</p>
                  <p className="text-2xl font-bold text-white">
                    {platformStats?.activeCreators || '1,234'}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Views</p>
                  <p className="text-2xl font-bold text-white">
                    {platformStats?.totalViews || '12.5M'}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Active Competitions</p>
                  <p className="text-2xl font-bold text-white">
                    {competitions?.length || '8'}
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="trending" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/10 border-white/20">
              <TabsTrigger value="trending" className="data-[state=active]:bg-white/20">
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="competitions" className="data-[state=active]:bg-white/20">
                <Trophy className="w-4 h-4 mr-2" />
                Competitions
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white/20">
                <Award className="w-4 h-4 mr-2" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-white/20">
                <Clock className="w-4 h-4 mr-2" />
                Recent
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center space-x-2">
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Trending Videos */}
          <TabsContent value="trending" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(trendingVideos || mockTrendingVideos).map((video: any, index: number) => (
                <Card key={video.id || index} className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden hover:bg-white/15 transition-all cursor-pointer">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white/70" />
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-red-500 text-white">
                        #{index + 1} Trending
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {video.duration || '3:42'}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">
                      {video.title || `Epic UTV Adventure #${index + 1}`}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-white/70 mb-2">
                      <span>{video.creatorName || 'Adventure Rider'}</span>
                      <span>{video.uploadedAt || '2 hours ago'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{video.views || '12.5K'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{video.likes || '847'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">+{video.trendingScore || '95'}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Competitions */}
          <TabsContent value="competitions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(competitions || mockCompetitions).map((competition: any, index: number) => (
                <Card key={competition.id || index} className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center">
                        <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                        {competition.title || `UTV Championship ${index + 1}`}
                      </CardTitle>
                      <Badge className="bg-green-500 text-white">
                        {competition.status || 'Active'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-white/70">
                      {competition.description || 'Show off your best UTV skills and compete for amazing prizes!'}
                    </p>
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Ends: {competition.endDate || 'Dec 31, 2024'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{competition.participants || '156'} participants</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">Prize Pool</span>
                        <span className="text-yellow-400 font-semibold">${competition.prizePool || '5,000'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">Your Rank</span>
                        <span className="text-white">#{competition.userRank || (index + 12)}</span>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                      Join Competition
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-400" />
                  Top Creators This {selectedTimeframe}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(leaderboard || mockLeaderboard).map((creator: any, index: number) => (
                    <div key={creator.id || index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-600 text-black' :
                          'bg-white/20 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{creator.name || `Creator ${index + 1}`}</p>
                          <p className="text-white/70 text-sm">{creator.location || 'Unknown Location'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{creator.points || (1000 - index * 100)} pts</div>
                        <div className="text-white/70 text-sm">{creator.videos || (12 - index)} videos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Videos */}
          <TabsContent value="recent" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(recentVideos || mockRecentVideos).map((video: any, index: number) => (
                <Card key={video.id || index} className="bg-white/10 border-white/20 backdrop-blur-sm overflow-hidden">
                  <div className="aspect-video bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/70" />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
                      {video.title || `Recent Adventure ${index + 1}`}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>{video.creatorName || 'Creator'}</span>
                      <span>{video.uploadedAt || '1 hour ago'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Mock data for demonstration
const mockTrendingVideos = [
  {
    id: 1,
    title: "Epic Desert Rock Crawling Adventure",
    creatorName: "Desert Rider",
    views: "15.2K",
    likes: "1.2K",
    duration: "4:32",
    trendingScore: "98",
    uploadedAt: "2 hours ago"
  },
  {
    id: 2,
    title: "Extreme Mountain Trail Challenge",
    creatorName: "Mountain Explorer",
    views: "12.8K",
    likes: "965",
    duration: "6:15",
    trendingScore: "94",
    uploadedAt: "4 hours ago"
  },
  {
    id: 3,
    title: "UTV Mudding Mayhem",
    creatorName: "Mud Master",
    views: "10.5K",
    likes: "847",
    duration: "3:42",
    trendingScore: "89",
    uploadedAt: "6 hours ago"
  }
];

const mockCompetitions = [
  {
    id: 1,
    title: "Winter UTV Championship",
    description: "Show off your winter riding skills in challenging snowy conditions",
    prizePool: "10,000",
    participants: "234",
    endDate: "Jan 31, 2025",
    userRank: "15"
  },
  {
    id: 2,
    title: "Best Jump Competition",
    description: "Submit your most impressive UTV jump footage",
    prizePool: "5,000",
    participants: "156",
    endDate: "Feb 15, 2025",
    userRank: "23"
  }
];

const mockLeaderboard = [
  { id: 1, name: "TrailBlazer Pro", location: "Utah", points: "2,450", videos: "18" },
  { id: 2, name: "Desert Storm", location: "Arizona", points: "2,120", videos: "15" },
  { id: 3, name: "Mountain King", location: "Colorado", points: "1,890", videos: "12" },
  { id: 4, name: "Mud Runner", location: "Texas", points: "1,670", videos: "10" },
  { id: 5, name: "Rock Crawler", location: "Nevada", points: "1,450", videos: "8" }
];

const mockRecentVideos = [
  { id: 1, title: "Morning Trail Ride", creatorName: "EarlyBird", uploadedAt: "30 min ago" },
  { id: 2, title: "Sunset Adventure", creatorName: "GoldenHour", uploadedAt: "45 min ago" },
  { id: 3, title: "Creek Crossing", creatorName: "WaterRider", uploadedAt: "1 hour ago" },
  { id: 4, title: "Rocky Ascent", creatorName: "Climber", uploadedAt: "2 hours ago" }
];