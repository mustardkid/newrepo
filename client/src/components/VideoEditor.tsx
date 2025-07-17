import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  Scissors, 
  Zap, 
  Upload, 
  Eye, 
  TrendingUp, 
  Youtube, 
  Music,
  Palette,
  Play,
  Pause,
  Volume2,
  RotateCcw,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import VideoPlayer from './VideoPlayer';

interface Video {
  id: number;
  title: string;
  description: string;
  cfStreamId: string;
  cfReadyToStream: boolean;
  status: string;
  duration: number;
  aiProcessingStatus?: string;
  aiHighlights?: string;
  aiViralPotentialScore?: number;
  aiGeneratedTitle?: string;
  aiGeneratedDescription?: string;
  aiThumbnailRecommendations?: string;
}

interface VideoEditorProps {
  video: Video;
  onClose: () => void;
}

export default function VideoEditor({ video, onClose }: VideoEditorProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'preview' | 'ai' | 'editing' | 'publishing'>('preview');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [editingNotes, setEditingNotes] = useState('');
  const [publishingPlatforms, setPublishingPlatforms] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Only allow admin/moderator access
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'moderator';
  
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
          <p className="text-white/70 mb-6">
            Video editing is only available to administrators. As a creator, you can upload videos and view their status.
          </p>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Parse AI data
  const aiHighlights = video.aiHighlights ? JSON.parse(video.aiHighlights) : [];
  const aiThumbnails = video.aiThumbnailRecommendations ? JSON.parse(video.aiThumbnailRecommendations) : [];

  // Start AI processing
  const startAiProcessingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/videos/${video.id}/ai-process`);
      return response.json();
    },
    onSuccess: () => {
      setAiProcessing(true);
      setAiProgress(0);
      toast({
        title: 'AI Processing Started',
        description: 'AI is analyzing your video for highlights and optimization suggestions.',
      });
      
      // Start polling for progress
      const interval = setInterval(async () => {
        try {
          const response = await apiRequest('GET', `/api/videos/${video.id}/ai-status`);
          const statusData = await response.json();
          
          if (statusData.progress) {
            setAiProgress(statusData.progress);
          }
          
          if (statusData.completed) {
            setAiProcessing(false);
            setAiProgress(100);
            clearInterval(interval);
            queryClient.invalidateQueries({ queryKey: ['/api/videos/my-detailed'] });
            
            toast({
              title: 'AI Processing Complete',
              description: 'Your video has been analyzed and optimized!',
            });
          }
        } catch (error) {
          console.error('Error polling AI status:', error);
        }
      }, 3000);
    },
    onError: (error) => {
      console.error('AI processing error:', error);
      toast({
        title: 'AI Processing Failed',
        description: 'There was an error processing your video. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Send to compilation
  const addToCompilationMutation = useMutation({
    mutationFn: async (highlights: any[]) => {
      const response = await apiRequest('POST', `/api/videos/${video.id}/add-to-compilation`, {
        highlights,
        compilationType: 'short' // or 'highlight_reel'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Added to Compilation',
        description: 'Selected highlights have been added to your compilation queue.',
      });
    }
  });

  // Publish to platform
  const publishToPlatformMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiRequest('POST', `/api/videos/${video.id}/publish`, {
        platform,
        metadata: {
          title: video.aiGeneratedTitle || video.title,
          description: video.aiGeneratedDescription || video.description
        }
      });
      return response.json();
    },
    onSuccess: (data, platform) => {
      toast({
        title: `Published to ${platform}`,
        description: `Your video has been scheduled for publishing to ${platform}.`,
      });
    }
  });

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "Processing...";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getViralPotentialColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl w-full max-w-7xl h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span>Duration: {formatDuration(video.duration)}</span>
                <Badge className={`${video.status === 'approved' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                  {video.status}
                </Badge>
                {video.aiViralPotentialScore && (
                  <span className={`${getViralPotentialColor(video.aiViralPotentialScore)}`}>
                    Viral Potential: {(video.aiViralPotentialScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <Button onClick={onClose} variant="outline" className="text-white border-white">
              Close
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'preview', label: 'Preview', icon: Eye },
            { id: 'ai', label: 'AI Enhancement', icon: Sparkles },
            { id: 'editing', label: 'Editing Tools', icon: Scissors },
            { id: 'publishing', label: 'Publishing', icon: Upload }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-white bg-white/10 border-b-2 border-blue-500'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Video Preview</h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPlayer
                    streamId={video.cfStreamId}
                    title={video.title}
                    className="w-full h-full"
                    controls={true}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Card className="glass-card bg-card-gradient border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Video Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-white/70 text-sm">Title</label>
                      <p className="text-white">{video.title}</p>
                    </div>
                    <div>
                      <label className="text-white/70 text-sm">Description</label>
                      <p className="text-white">{video.description}</p>
                    </div>
                    <div>
                      <label className="text-white/70 text-sm">Duration</label>
                      <p className="text-white">{formatDuration(video.duration)}</p>
                    </div>
                  </CardContent>
                </Card>

                {video.aiViralPotentialScore && (
                  <Card className="glass-card bg-card-gradient border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp size={16} />
                        AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/70">Viral Potential</span>
                          <span className={`font-semibold ${getViralPotentialColor(video.aiViralPotentialScore)}`}>
                            {(video.aiViralPotentialScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={video.aiViralPotentialScore * 100} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">AI Enhancement</h3>
                <p className="text-white/70 mb-6">
                  Use AI to analyze your video, identify highlights, and optimize for viral potential
                </p>
                
                {!video.aiProcessingStatus || video.aiProcessingStatus === 'pending' || video.aiProcessingStatus === 'failed' ? (
                  <Button
                    onClick={() => startAiProcessingMutation.mutate()}
                    disabled={aiProcessing || startAiProcessingMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {aiProcessing ? 'Processing...' : video.aiProcessingStatus === 'failed' ? 'Retry AI Enhancement' : 'Start AI Enhancement'}
                  </Button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI Highlights */}
                    <Card className="glass-card bg-card-gradient border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">AI-Generated Highlights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {aiHighlights.map((highlight: any, index: number) => (
                            <div key={index} className="bg-white/5 p-3 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-white font-medium">{highlight.description}</span>
                                <Badge className="bg-yellow-600">{highlight.score.toFixed(1)}</Badge>
                              </div>
                              <div className="text-sm text-white/70">
                                {formatDuration(highlight.start)} - {formatDuration(highlight.end)}
                              </div>
                              <Button
                                onClick={() => addToCompilationMutation.mutate([highlight])}
                                size="sm"
                                className="mt-2 bg-blue-600 hover:bg-blue-700"
                              >
                                Add to Compilation
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Suggestions */}
                    <Card className="glass-card bg-card-gradient border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">AI Optimization Suggestions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {video.aiGeneratedTitle && (
                          <div>
                            <label className="text-white/70 text-sm">Suggested Title</label>
                            <p className="text-white bg-white/5 p-2 rounded">{video.aiGeneratedTitle}</p>
                          </div>
                        )}
                        {video.aiGeneratedDescription && (
                          <div>
                            <label className="text-white/70 text-sm">Suggested Description</label>
                            <p className="text-white bg-white/5 p-2 rounded">{video.aiGeneratedDescription}</p>
                          </div>
                        )}
                        <div className="pt-4">
                          <Button
                            onClick={() => addToCompilationMutation.mutate(aiHighlights)}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Create Optimized Short
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {aiProcessing && (
                  <Card className="glass-card bg-card-gradient border-white/10 mt-6">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-white mb-2">AI is analyzing your video...</p>
                        <Progress value={aiProgress} className="h-2" />
                        <p className="text-white/70 text-sm mt-2">{aiProgress}% complete</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'editing' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-4">Editing Tools</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="glass-card bg-card-gradient border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Scissors size={16} />
                      Clip Selection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-sm mb-4">
                      Select and trim specific sections of your video
                    </p>
                    <Button 
                      onClick={() => toast({ title: "Clip Editor", description: "Coming soon - Advanced clip editing tools" })}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Open Clip Editor
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-card bg-card-gradient border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Music size={16} />
                      Audio Enhancement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-sm mb-4">
                      Add background music and adjust audio levels
                    </p>
                    <Button 
                      onClick={() => toast({ title: "Audio Tools", description: "Coming soon - Audio enhancement and music addition" })}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Audio Tools
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-card bg-card-gradient border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Palette size={16} />
                      Visual Effects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-sm mb-4">
                      Apply filters, transitions, and color corrections
                    </p>
                    <Button 
                      onClick={() => toast({ title: "Visual Editor", description: "Coming soon - Filters, transitions, and color correction" })}
                      className="w-full bg-pink-600 hover:bg-pink-700"
                    >
                      Visual Editor
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Editing Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add notes about your editing preferences..."
                    className="bg-white/5 border-white/20 text-white placeholder-white/50 min-h-[100px]"
                  />
                  <Button className="mt-4 bg-green-600 hover:bg-green-700">
                    Save Notes
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'publishing' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white mb-4">Publishing Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card bg-card-gradient border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Youtube size={16} />
                      YouTube
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-sm mb-4">
                      Publish as a full video or YouTube Short
                    </p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => publishToPlatformMutation.mutate('youtube')}
                        disabled={publishToPlatformMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {publishToPlatformMutation.isPending ? 'Publishing...' : 'Publish to YouTube'}
                      </Button>
                      <Button
                        onClick={() => publishToPlatformMutation.mutate('youtube_shorts')}
                        disabled={publishToPlatformMutation.isPending}
                        className="w-full bg-red-500 hover:bg-red-600"
                      >
                        {publishToPlatformMutation.isPending ? 'Creating...' : 'Create YouTube Short'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card bg-card-gradient border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Music size={16} />
                      TikTok
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-sm mb-4">
                      Optimize for TikTok's vertical format
                    </p>
                    <Button
                      onClick={() => publishToPlatformMutation.mutate('tiktok')}
                      disabled={publishToPlatformMutation.isPending}
                      className="w-full bg-black hover:bg-gray-800"
                    >
                      {publishToPlatformMutation.isPending ? 'Publishing...' : 'Publish to TikTok'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass-card bg-card-gradient border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Publishing Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">
                    Track your video's publishing progress across platforms
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">YouTube</span>
                      <Badge className="bg-gray-600">Not Published</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">TikTok</span>
                      <Badge className="bg-gray-600">Not Published</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}