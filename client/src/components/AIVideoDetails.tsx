import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Play, 
  Clock, 
  Tag, 
  Zap, 
  Eye, 
  Scissors,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

interface AIVideoDetailsProps {
  videoId: number;
}

export default function AIVideoDetails({ videoId }: AIVideoDetailsProps) {
  const [activeTab, setActiveTab] = useState('status');
  const { toast } = useToast();

  // Fetch AI processing status
  const { data: aiStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/videos', videoId, 'ai-status'],
    refetchInterval: (data) => {
      // Auto-refresh if processing
      return data?.aiProcessingStatus === 'processing' ? 5000 : false;
    },
  });

  // Fetch AI highlights and analysis
  const { data: aiHighlights, isLoading: highlightsLoading } = useQuery({
    queryKey: ['/api/videos', videoId, 'ai-highlights'],
    enabled: aiStatus?.aiProcessingStatus === 'completed',
  });

  // Trigger AI analysis
  const analyzeVideoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/videos/${videoId}/ai-analyze`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "AI Analysis Started",
        description: "Your video is being analyzed for viral optimization.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId, 'ai-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to start AI analysis",
        variant: "destructive",
      });
    },
  });

  // Enhance metadata
  const enhanceMetadataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/videos/${videoId}/enhance-metadata`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Metadata Enhanced",
        description: "Video title, description, and tags have been optimized for better discoverability.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId] });
    },
    onError: (error: any) => {
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance metadata",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = () => {
    switch (aiStatus?.aiProcessingStatus) {
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (statusLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Video Enhancement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Processing Status:</span>
                {getStatusBadge()}
              </div>
              {!aiStatus?.aiProcessingStatus || aiStatus?.aiProcessingStatus === 'failed' ? (
                <Button
                  onClick={() => analyzeVideoMutation.mutate()}
                  disabled={analyzeVideoMutation.isPending}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {analyzeVideoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start AI Analysis
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId, 'ai-status'] })}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>

            {aiStatus?.aiProcessingStatus === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing video content...</span>
                </div>
                <Progress value={undefined} className="animate-pulse" />
                <p className="text-xs text-gray-500">
                  This may take a few minutes depending on video length
                </p>
              </div>
            )}

            {aiStatus?.aiProcessingError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{aiStatus.aiProcessingError}</AlertDescription>
              </Alert>
            )}

            {aiStatus?.aiProcessingStatus === 'completed' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Started:</span>
                    <p className="text-gray-600">
                      {aiStatus.aiProcessingStarted ? new Date(aiStatus.aiProcessingStarted).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Completed:</span>
                    <p className="text-gray-600">
                      {aiStatus.aiProcessingCompleted ? new Date(aiStatus.aiProcessingCompleted).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">AI-Generated Content:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Title</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {aiStatus.aiGeneratedTitle ? '✓ Generated' : '✗ Not available'}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Description</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {aiStatus.aiGeneratedDescription ? '✓ Generated' : '✗ Not available'}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Tags</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {aiStatus.aiGeneratedTags?.length ? `✓ ${aiStatus.aiGeneratedTags.length} tags` : '✗ Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => enhanceMetadataMutation.mutate()}
                  disabled={enhanceMetadataMutation.isPending}
                  className="w-full"
                >
                  {enhanceMetadataMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Apply AI-Enhanced Metadata
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="highlights" className="space-y-4">
            {highlightsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : aiHighlights?.highlights?.length ? (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  AI-Detected Highlights
                </h4>
                <div className="space-y-3">
                  {aiHighlights.highlights.map((highlight: any, index: number) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {formatTimestamp(highlight.start)} - {formatTimestamp(highlight.end)}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {Math.round(highlight.score * 100)}% excitement
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{highlight.description}</p>
                    </Card>
                  ))}
                </div>

                {aiHighlights.editingSuggestions?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Scissors className="h-4 w-4" />
                      Editing Suggestions
                    </h4>
                    <div className="space-y-2">
                      {aiHighlights.editingSuggestions.map((suggestion: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          <span className="text-xs text-gray-600">
                            {formatTimestamp(suggestion.timestamp)}
                          </span>
                          <span className="text-sm">{suggestion.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No highlights detected yet</p>
                <p className="text-sm">AI analysis will identify the most engaging moments</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {highlightsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : aiHighlights?.sceneDetection?.length ? (
              <div className="space-y-4">
                <h4 className="font-medium">Scene Analysis</h4>
                <div className="space-y-2">
                  {aiHighlights.sceneDetection.map((scene: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium">
                        {formatTimestamp(scene.timestamp)}
                      </span>
                      <Badge variant="outline">{scene.sceneType}</Badge>
                      <span className="text-sm text-gray-600">{scene.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scene analysis available yet</p>
                <p className="text-sm">AI will analyze scene transitions and content</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}