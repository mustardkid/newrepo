import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';
import { ArrowLeft, Play, Eye, ThumbsUp, ThumbsDown, Star, Clock, Zap, TrendingUp, Youtube, Video, AlertTriangle, CheckCircle, XCircle, Filter, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { analyzeContent, shouldBlockContent, shouldRequireReview, getSeverityColor, getSeverityBadgeColor, ContentAnalysis } from '@/lib/contentFilter';
import { Checkbox } from '@/components/ui/checkbox';

interface AIHighlight {
  start: number;
  end: number;
  description: string;
  score: number;
  motionLevel: number;
  excitementLevel: number;
  clipType: 'action' | 'scenic' | 'transition' | 'climax';
  thumbnailTimestamp?: number;
  contentAnalysis?: ContentAnalysis;
}

interface VideoWithAI {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  cfStreamId: string;
  aiProcessingStatus: string;
  aiViralPotentialScore: number;
  aiHighlights: string;
  aiYoutubeMetadata: string;
  aiTiktokMetadata: string;
  aiThumbnailRecommendations: string;
  aiCompiledHighlights: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  contentAnalysis?: ContentAnalysis;
}

export default function AIHighlightsImproved() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState<VideoWithAI | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<AIHighlight | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set());
  const [filterLevel, setFilterLevel] = useState<'all' | 'flagged' | 'clean'>('all');
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  const { data: aiVideos, isLoading, error } = useQuery({
    queryKey: ['/api/admin/ai-processed-videos'],
    retry: false,
  });

  // Process videos with content analysis
  const processedVideos = React.useMemo(() => {
    if (!aiVideos) return [];
    
    return aiVideos.map((video: VideoWithAI) => {
      const titleAnalysis = analyzeContent(video.title);
      const descriptionAnalysis = analyzeContent(video.description);
      
      // Parse AI highlights if available
      let highlights: AIHighlight[] = [];
      try {
        if (video.aiHighlights) {
          const parsed = JSON.parse(video.aiHighlights);
          highlights = parsed.map((highlight: AIHighlight) => ({
            ...highlight,
            contentAnalysis: analyzeContent(highlight.description)
          }));
        }
      } catch (e) {
        console.error('Error parsing AI highlights:', e);
      }

      return {
        ...video,
        contentAnalysis: {
          containsProfanity: titleAnalysis.containsProfanity || descriptionAnalysis.containsProfanity,
          containsHateSpeech: titleAnalysis.containsHateSpeech || descriptionAnalysis.containsHateSpeech,
          severityLevel: titleAnalysis.severityLevel > descriptionAnalysis.severityLevel 
            ? titleAnalysis.severityLevel 
            : descriptionAnalysis.severityLevel,
          flaggedWords: [...titleAnalysis.flaggedWords, ...descriptionAnalysis.flaggedWords],
          cleanedText: titleAnalysis.cleanedText,
          confidence: Math.min(titleAnalysis.confidence, descriptionAnalysis.confidence)
        },
        processedHighlights: highlights
      };
    });
  }, [aiVideos]);

  // Filter videos based on content filter
  const filteredVideos = React.useMemo(() => {
    if (!processedVideos) return [];
    
    switch (filterLevel) {
      case 'flagged':
        return processedVideos.filter(video => 
          video.contentAnalysis?.containsProfanity || 
          video.contentAnalysis?.containsHateSpeech
        );
      case 'clean':
        return processedVideos.filter(video => 
          !video.contentAnalysis?.containsProfanity && 
          !video.contentAnalysis?.containsHateSpeech
        );
      default:
        return processedVideos;
    }
  }, [processedVideos, filterLevel]);

  const approveHighlightMutation = useMutation({
    mutationFn: async ({ videoId, highlightIndex }: { videoId: number; highlightIndex: number }) => {
      await apiRequest('POST', `/api/admin/videos/${videoId}/highlights/${highlightIndex}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Highlight approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-processed-videos'] });
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
        description: "Failed to approve highlight",
        variant: "destructive",
      });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, videoIds }: { action: string; videoIds: number[] }) => {
      await apiRequest('POST', `/api/admin/videos/bulk-action`, { action, videoIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Bulk action completed successfully`,
      });
      setSelectedVideos(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-processed-videos'] });
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
        description: "Failed to complete bulk action",
        variant: "destructive",
      });
    },
  });

  const handleBulkAction = (action: 'approve' | 'reject' | 'delete') => {
    if (selectedVideos.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select videos to perform bulk action",
        variant: "destructive",
      });
      return;
    }

    bulkActionMutation.mutate({ 
      action, 
      videoIds: Array.from(selectedVideos) 
    });
  };

  const toggleVideoSelection = (videoId: number) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const selectAllVideos = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredVideos.map(v => v.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-deep-gradient flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-deep-gradient flex items-center justify-center">
        <Card className="glass-card bg-card-gradient border-white/10 p-8 max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Videos</h2>
            <p className="text-white/70 mb-4">Unable to load AI processed videos. Please try again.</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-processed-videos'] })}
              className="bg-accent-pink hover:bg-accent-pink/80"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-gradient">
      {/* Header */}
      <div className="bg-card-gradient backdrop-blur-lg border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">AI Highlights Review</h1>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-white/70" />
                <select 
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  className="glass-input text-sm"
                >
                  <option value="all">All Videos</option>
                  <option value="flagged">Flagged Content</option>
                  <option value="clean">Clean Content</option>
                </select>
              </div>
              
              {/* Bulk Actions */}
              {selectedVideos.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-white/70 text-sm">
                    {selectedVideos.size} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="glass-input"
                      onClick={() => handleBulkAction('approve')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Selected
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="glass-input text-red-400 hover:bg-red-500 hover:text-white"
                      onClick={() => handleBulkAction('reject')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Video List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Card 
              key={video.id} 
              className={`glass-card bg-card-gradient border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer ${
                selectedVideos.has(video.id) ? 'ring-2 ring-accent-pink' : ''
              }`}
              onClick={() => setSelectedVideo(video)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      checked={selectedVideos.has(video.id)}
                      onCheckedChange={() => toggleVideoSelection(video.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="border-white/30"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-white line-clamp-2">
                        {video.contentAnalysis?.cleanedText || video.title}
                      </CardTitle>
                      <p className="text-white/60 text-sm mt-1">
                        By {video.user.firstName} {video.user.lastName}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white/70 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Video Thumbnail */}
                <div className="aspect-video bg-black/20 rounded-lg mb-4 relative overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Content Analysis Badges */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {video.contentAnalysis?.containsProfanity && (
                      <Badge className={`${getSeverityBadgeColor(video.contentAnalysis.severityLevel)} text-white text-xs`}>
                        {video.contentAnalysis.severityLevel.toUpperCase()}
                      </Badge>
                    )}
                    {video.contentAnalysis?.containsHateSpeech && (
                      <Badge className="bg-red-600 text-white text-xs">
                        HATE SPEECH
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/70 text-sm">
                      {video.aiViralPotentialScore || 0}%
                    </span>
                  </div>
                </div>

                {/* Video Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-white font-semibold">
                      {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                    </div>
                    <div className="text-white/50 text-xs">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">
                      {video.processedHighlights?.length || 0}
                    </div>
                    <div className="text-white/50 text-xs">Highlights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">
                      {video.status}
                    </div>
                    <div className="text-white/50 text-xs">Status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle approve action
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle reject action
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Videos Found</h3>
            <p className="text-white/60">
              {filterLevel === 'flagged' 
                ? 'No flagged content found' 
                : filterLevel === 'clean' 
                  ? 'No clean content found' 
                  : 'No AI processed videos available'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}