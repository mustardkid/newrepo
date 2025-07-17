import OpenAI from "openai";
import crypto from "crypto";
import { storage } from "./storage";
import { aiVisualAnalyzer, type VisualAnalysisResult } from "./aiVisualAnalyzer";
import { VideoFrameExtractor } from "./videoFrameExtractor";
import { cloudflareStreamService } from "./cloudflareStream";
import type { Video } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const frameExtractor = new VideoFrameExtractor();

export interface AIAnalysisResult {
  highlights: Array<{ 
    start: number; 
    end: number; 
    description: string; 
    score: number;
    motionLevel: number;
    excitementLevel: number;
    clipType: 'action' | 'scenic' | 'transition' | 'climax';
    thumbnailTimestamp?: number;
  }>;
  sceneTransitions: Array<{ 
    timestamp: number; 
    sceneType: string; 
    description: string;
    motionIntensity: number;
    visualComplexity: number;
  }>;
  contentAnalysis: {
    actionLevel: number;
    scenery: string[];
    vehicles: string[];
    terrain: string[];
    mood: string;
    excitement: number;
    visualQuality: number;
    audioQuality: number;
    overallViralPotential: number;
  };
  editingSuggestions: Array<{
    type: 'cut' | 'highlight' | 'music' | 'transition' | 'slowmotion' | 'speedup';
    timestamp: number;
    description: string;
    priority: number;
    confidence: number;
  }>;
  generatedTitle: string;
  generatedDescription: string;
  generatedTags: string[];
  youtubeMetadata: {
    title: string;
    description: string;
    tags: string[];
    category: string;
    thumbnailTimestamp: number;
  };
  tiktokMetadata: {
    title: string;
    description: string;
    hashtags: string[];
    duration: number;
    bestMoments: number[];
  };
  visualAnalysis?: VisualAnalysisResult;
  thumbnailRecommendations: Array<{
    timestamp: number;
    score: number;
    reason: string;
    visualElements: string[];
    emotionalImpact: number;
  }>;
  compiledHighlights?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
    title: string;
    description: string;
    score: number;
    transitions: Array<{
      type: 'fade' | 'cut' | 'dissolve' | 'wipe';
      duration: number;
    }>;
  }>;
}

export class AIVideoProcessor {
  async analyzeVideo(video: Video): Promise<AIAnalysisResult> {
    try {
      console.log(`Starting comprehensive AI analysis for video ${video.id}: ${video.title}`);
      
      // Update status to processing
      await storage.updateVideo(video.id, {
        aiProcessingStatus: "processing",
        aiProcessingStarted: new Date(),
      });

      // Get video stream URL for frame extraction
      const videoUrl = cloudflareStreamService.getStreamUrl(video.cfStreamId!);
      
      // Step 1: Extract frames for visual analysis
      const [keyFrames, motionFrames] = await Promise.all([
        frameExtractor.extractKeyFrames(videoUrl, video.id, 12),
        frameExtractor.extractMotionFrames(videoUrl, video.id, 0.3)
      ]);

      // Step 2: Perform comprehensive analysis
      const [textAnalysis, visualAnalysis, motionAnalysis] = await Promise.all([
        this.performVideoAnalysis(video),
        this.performVisualFrameAnalysis(keyFrames, video),
        this.performMotionAnalysis(motionFrames, video)
      ]);

      // Step 3: Combine all analyses for enhanced results
      const combinedAnalysis = await this.combineAllAnalyses(textAnalysis, visualAnalysis, motionAnalysis);
      
      // Step 4: Generate highlight compilations
      const compiledHighlights = await this.generateHighlightCompilations(combinedAnalysis.highlights);
      combinedAnalysis.compiledHighlights = compiledHighlights;

      // Step 5: Update video with comprehensive AI results
      await storage.updateVideo(video.id, {
        aiProcessingStatus: "completed",
        aiProcessingCompleted: new Date(),
        aiGeneratedTitle: combinedAnalysis.generatedTitle,
        aiGeneratedDescription: combinedAnalysis.generatedDescription,
        aiGeneratedTags: combinedAnalysis.generatedTags,
        aiHighlights: JSON.stringify(combinedAnalysis.highlights),
        aiSceneDetection: JSON.stringify(combinedAnalysis.sceneTransitions),
        aiContentAnalysis: JSON.stringify(combinedAnalysis.contentAnalysis),
        aiEditingSuggestions: JSON.stringify(combinedAnalysis.editingSuggestions),
        aiVisualAnalysis: JSON.stringify(combinedAnalysis.visualAnalysis),
        aiYoutubeMetadata: JSON.stringify(combinedAnalysis.youtubeMetadata),
        aiTiktokMetadata: JSON.stringify(combinedAnalysis.tiktokMetadata),
        aiThumbnailRecommendations: JSON.stringify(combinedAnalysis.thumbnailRecommendations),
        aiCompiledHighlights: JSON.stringify(combinedAnalysis.compiledHighlights),
      });

      // Clean up temporary frames
      await frameExtractor.cleanupFrames(video.id);

      console.log(`Comprehensive AI analysis completed for video ${video.id}`);
      return combinedAnalysis;
    } catch (error) {
      console.error(`AI analysis failed for video ${video.id}:`, error);
      
      await storage.updateVideo(video.id, {
        aiProcessingStatus: "failed",
        aiProcessingError: error instanceof Error ? error.message : "Unknown error",
      });
      
      // Clean up frames on error
      await frameExtractor.cleanupFrames(video.id);
      
      throw error;
    }
  }

  private async performVisualFrameAnalysis(frames: any[], video: Video): Promise<AIAnalysisResult> {
    const frameAnalysisPrompt = `
    Analyze these UTV/ATV video frames for exciting moments, motion, and viral potential.
    
    Video Context:
    - Title: ${video.title}
    - Category: ${video.category}
    - Duration: ${video.duration ? Math.round(video.duration / 60) : "Unknown"} minutes
    
    For each frame, identify:
    1. Action level and excitement
    2. Vehicle types and terrain
    3. Motion intensity and visual complexity
    4. Potential highlight moments
    5. Thumbnail worthiness
    
    Provide comprehensive analysis in JSON format with enhanced structure for viral optimization.
    `;

    const content = [
      {
        type: "text" as const,
        text: frameAnalysisPrompt
      },
      ...frames.map(frame => ({
        type: "image_url" as const,
        image_url: {
          url: `data:image/jpeg;base64,${frame.base64Data}`
        }
      }))
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert video analyst specializing in UTV/ATV content optimization for viral social media. Analyze frames to identify exciting moments, motion patterns, and viral potential. Respond only with valid JSON."
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async performMotionAnalysis(motionFrames: any[], video: Video): Promise<AIAnalysisResult> {
    const motionAnalysisPrompt = `
    Analyze these high-motion frames from a UTV/ATV video to identify the most exciting action sequences.
    
    Video Context:
    - Title: ${video.title}
    - Category: ${video.category}
    - Duration: ${video.duration ? Math.round(video.duration / 60) : "Unknown"} minutes
    
    Focus on:
    1. Identifying peak action moments (jumps, crashes, turns)
    2. Motion intensity and excitement levels
    3. Optimal clip start/end times for highlights
    4. Transition points between action sequences
    5. Viral potential of each motion sequence
    
    Provide detailed analysis in JSON format optimized for social media virality.
    `;

    const content = [
      {
        type: "text" as const,
        text: motionAnalysisPrompt
      },
      ...motionFrames.map(frame => ({
        type: "image_url" as const,
        image_url: {
          url: `data:image/jpeg;base64,${frame.base64Data}`
        }
      }))
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert at identifying exciting action moments in UTV/ATV videos. Focus on motion analysis, excitement detection, and viral moment identification. Respond only with valid JSON."
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async performVideoAnalysis(video: Video): Promise<AIAnalysisResult> {
    const prompt = `
    Analyze this UTV/ATV video for content optimization and viral potential:
    
    Video Details:
    - Title: ${video.title}
    - Description: ${video.description || "No description provided"}
    - Category: ${video.category}
    - Duration: ${video.duration ? Math.round(video.duration / 60) : "Unknown"} minutes
    - Tags: ${video.tags?.join(", ") || "None"}
    
    Generate comprehensive metadata optimization for YouTube and TikTok:
    
    {
      "highlights": [
        {
          "start": 30,
          "end": 45,
          "description": "Epic jump over rocks",
          "score": 0.95,
          "motionLevel": 0.9,
          "excitementLevel": 0.95,
          "clipType": "action",
          "thumbnailTimestamp": 37
        }
      ],
      "sceneTransitions": [
        {
          "timestamp": 60,
          "sceneType": "action",
          "description": "Transition to muddy terrain",
          "motionIntensity": 0.8,
          "visualComplexity": 0.7
        }
      ],
      "contentAnalysis": {
        "actionLevel": 0.8,
        "scenery": ["mountains", "forest", "rocks"],
        "vehicles": ["UTV", "ATV"],
        "terrain": ["rocky", "muddy", "steep"],
        "mood": "adventurous",
        "excitement": 0.9,
        "visualQuality": 0.85,
        "audioQuality": 0.8,
        "overallViralPotential": 0.9
      },
      "editingSuggestions": [
        {
          "type": "slowmotion",
          "timestamp": 35,
          "description": "Slow motion for dramatic jump effect",
          "priority": 9,
          "confidence": 0.9
        }
      ],
      "youtubeMetadata": {
        "title": "INSANE UTV Jump Over Rocky Terrain! 🚙💨",
        "description": "Epic UTV adventure with massive jumps...",
        "tags": ["UTV", "offroad", "adventure", "extreme"],
        "category": "Sports",
        "thumbnailTimestamp": 37
      },
      "tiktokMetadata": {
        "title": "This UTV jump is INSANE! 🤯",
        "description": "Epic off-road adventure",
        "hashtags": ["#UTV", "#offroad", "#extreme", "#adventure"],
        "duration": 15,
        "bestMoments": [37, 45, 52]
      },
      "thumbnailRecommendations": [
        {
          "timestamp": 37,
          "score": 0.95,
          "reason": "Peak action moment with dramatic jump",
          "visualElements": ["UTV mid-air", "dramatic lighting", "terrain"],
          "emotionalImpact": 0.9
        }
      ]
    }
    
    Focus on viral optimization, excitement detection, and social media best practices.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert video content optimizer specializing in UTV/ATV content for viral social media success. Generate comprehensive metadata and optimization suggestions. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async combineAllAnalyses(textAnalysis: AIAnalysisResult, visualAnalysis: AIAnalysisResult, motionAnalysis: AIAnalysisResult): Promise<AIAnalysisResult> {
    // Merge highlights from all analyses with enhanced scoring
    const allHighlights = [
      ...(textAnalysis.highlights || []),
      ...(visualAnalysis.highlights || []),
      ...(motionAnalysis.highlights || [])
    ];

    // Deduplicate and enhance highlights
    const enhancedHighlights = this.mergeAndEnhanceHighlights(allHighlights);

    // Combine scene transitions with motion data
    const enhancedSceneTransitions = this.mergeSceneTransitions(
      textAnalysis.sceneTransitions || [],
      visualAnalysis.sceneTransitions || [],
      motionAnalysis.sceneTransitions || []
    );

    // Enhance content analysis with visual and motion data
    const enhancedContentAnalysis = {
      ...textAnalysis.contentAnalysis,
      visualQuality: visualAnalysis.contentAnalysis?.visualQuality || 0.7,
      audioQuality: textAnalysis.contentAnalysis?.audioQuality || 0.8,
      overallViralPotential: this.calculateViralPotential(enhancedHighlights, enhancedSceneTransitions)
    };

    // Combine and prioritize editing suggestions
    const combinedEditingSuggestions = this.combineEditingSuggestions(
      textAnalysis.editingSuggestions || [],
      visualAnalysis.editingSuggestions || [],
      motionAnalysis.editingSuggestions || []
    );

    // Generate enhanced thumbnail recommendations
    const enhancedThumbnailRecommendations = this.generateThumbnailRecommendations(
      enhancedHighlights,
      visualAnalysis.thumbnailRecommendations || [],
      motionAnalysis.thumbnailRecommendations || []
    );

    return {
      highlights: enhancedHighlights,
      sceneTransitions: enhancedSceneTransitions,
      contentAnalysis: enhancedContentAnalysis,
      editingSuggestions: combinedEditingSuggestions,
      generatedTitle: textAnalysis.generatedTitle || "Epic UTV Adventure",
      generatedDescription: textAnalysis.generatedDescription || "Amazing off-road adventure",
      generatedTags: textAnalysis.generatedTags || ["UTV", "offroad", "adventure"],
      youtubeMetadata: textAnalysis.youtubeMetadata || {
        title: "Epic UTV Adventure",
        description: "Amazing off-road adventure",
        tags: ["UTV", "offroad", "adventure"],
        category: "Sports",
        thumbnailTimestamp: 0
      },
      tiktokMetadata: textAnalysis.tiktokMetadata || {
        title: "Epic UTV Adventure",
        description: "Amazing off-road adventure",
        hashtags: ["#UTV", "#offroad", "#adventure"],
        duration: 15,
        bestMoments: []
      },
      thumbnailRecommendations: enhancedThumbnailRecommendations,
      visualAnalysis: visualAnalysis.visualAnalysis
    };
  }

  private mergeAndEnhanceHighlights(highlights: any[]): any[] {
    // Group highlights by similar timestamps (within 5 seconds)
    const groupedHighlights = new Map<number, any[]>();
    
    highlights.forEach(highlight => {
      const timeGroup = Math.floor(highlight.start / 5) * 5;
      if (!groupedHighlights.has(timeGroup)) {
        groupedHighlights.set(timeGroup, []);
      }
      groupedHighlights.get(timeGroup)!.push(highlight);
    });

    // Merge similar highlights and enhance with combined data
    const enhancedHighlights: any[] = [];
    
    groupedHighlights.forEach((group, timeGroup) => {
      if (group.length === 1) {
        enhancedHighlights.push(group[0]);
      } else {
        // Merge multiple highlights at similar timestamps
        const merged = {
          start: Math.min(...group.map(h => h.start)),
          end: Math.max(...group.map(h => h.end)),
          description: group.map(h => h.description).join(' + '),
          score: Math.max(...group.map(h => h.score || 0.5)),
          motionLevel: Math.max(...group.map(h => h.motionLevel || 0.5)),
          excitementLevel: Math.max(...group.map(h => h.excitementLevel || 0.5)),
          clipType: group.find(h => h.clipType === 'action')?.clipType || group[0].clipType || 'action',
          thumbnailTimestamp: group.reduce((best, current) => 
            (current.score || 0) > (best.score || 0) ? current : best
          ).thumbnailTimestamp || group[0].start
        };
        enhancedHighlights.push(merged);
      }
    });

    // Sort by score and return top highlights
    return enhancedHighlights
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);
  }

  private mergeSceneTransitions(textTransitions: any[], visualTransitions: any[], motionTransitions: any[]): any[] {
    const allTransitions = [...textTransitions, ...visualTransitions, ...motionTransitions];
    
    // Group by similar timestamps
    const groupedTransitions = new Map<number, any[]>();
    
    allTransitions.forEach(transition => {
      const timeGroup = Math.floor(transition.timestamp / 10) * 10;
      if (!groupedTransitions.has(timeGroup)) {
        groupedTransitions.set(timeGroup, []);
      }
      groupedTransitions.get(timeGroup)!.push(transition);
    });

    // Merge and enhance transitions
    const enhancedTransitions: any[] = [];
    
    groupedTransitions.forEach((group, timeGroup) => {
      const merged = {
        timestamp: group.reduce((sum, t) => sum + t.timestamp, 0) / group.length,
        sceneType: group.find(t => t.sceneType === 'action')?.sceneType || group[0].sceneType,
        description: group.map(t => t.description).join(' + '),
        motionIntensity: Math.max(...group.map(t => t.motionIntensity || 0.5)),
        visualComplexity: Math.max(...group.map(t => t.visualComplexity || 0.5))
      };
      enhancedTransitions.push(merged);
    });

    return enhancedTransitions.sort((a, b) => a.timestamp - b.timestamp);
  }

  private combineEditingSuggestions(textSuggestions: any[], visualSuggestions: any[], motionSuggestions: any[]): any[] {
    const allSuggestions = [...textSuggestions, ...visualSuggestions, ...motionSuggestions];
    
    // Remove duplicates and prioritize
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => 
        Math.abs(s.timestamp - suggestion.timestamp) < 2 && s.type === suggestion.type
      )
    );

    return uniqueSuggestions
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 10);
  }

  private generateThumbnailRecommendations(highlights: any[], visualThumbnails: any[], motionThumbnails: any[]): any[] {
    const allThumbnails = [...visualThumbnails, ...motionThumbnails];
    
    // Add thumbnails from highlights
    highlights.forEach(highlight => {
      if (highlight.thumbnailTimestamp) {
        allThumbnails.push({
          timestamp: highlight.thumbnailTimestamp,
          score: highlight.score || 0.5,
          reason: `Peak moment: ${highlight.description}`,
          visualElements: [highlight.clipType, "action"],
          emotionalImpact: highlight.excitementLevel || 0.5
        });
      }
    });

    // Remove duplicates and sort by score
    const uniqueThumbnails = allThumbnails.filter((thumbnail, index, self) => 
      index === self.findIndex(t => Math.abs(t.timestamp - thumbnail.timestamp) < 3)
    );

    return uniqueThumbnails
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  }

  private calculateViralPotential(highlights: any[], sceneTransitions: any[]): number {
    const highlightScore = highlights.reduce((sum, h) => sum + (h.score || 0), 0) / highlights.length;
    const motionScore = highlights.reduce((sum, h) => sum + (h.motionLevel || 0), 0) / highlights.length;
    const excitementScore = highlights.reduce((sum, h) => sum + (h.excitementLevel || 0), 0) / highlights.length;
    const transitionScore = sceneTransitions.reduce((sum, t) => sum + (t.motionIntensity || 0), 0) / sceneTransitions.length;

    return (highlightScore * 0.3 + motionScore * 0.25 + excitementScore * 0.25 + transitionScore * 0.2);
  }

  async generateHighlightCompilations(highlights: any[]): Promise<any[]> {
    const compilations: any[] = [];
    
    // Sort highlights by score and group by type
    const sortedHighlights = highlights.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Create different compilation types
    const compilationTypes = [
      { name: 'Best Action Moments', filter: (h: any) => h.clipType === 'action', maxDuration: 30 },
      { name: 'Epic Highlights', filter: (h: any) => h.score > 0.8, maxDuration: 45 },
      { name: 'Quick Teaser', filter: (h: any) => h.excitementLevel > 0.7, maxDuration: 15 }
    ];

    for (const type of compilationTypes) {
      const filteredHighlights = sortedHighlights.filter(type.filter);
      
      if (filteredHighlights.length > 0) {
        const compilation = await this.createHighlightCompilation(
          filteredHighlights,
          type.name,
          type.maxDuration
        );
        compilations.push(compilation);
      }
    }

    return compilations;
  }

  private async createHighlightCompilation(highlights: any[], title: string, maxDuration: number): Promise<any> {
    let totalDuration = 0;
    const selectedHighlights: any[] = [];
    
    for (const highlight of highlights) {
      const clipDuration = highlight.end - highlight.start;
      if (totalDuration + clipDuration <= maxDuration) {
        selectedHighlights.push(highlight);
        totalDuration += clipDuration;
      }
    }

    // Generate transitions between clips
    const transitions = selectedHighlights.map((_, index) => {
      if (index === selectedHighlights.length - 1) return null;
      
      return {
        type: this.selectTransitionType(selectedHighlights[index], selectedHighlights[index + 1]),
        duration: 0.5
      };
    }).filter(Boolean);

    return {
      id: crypto.randomUUID(),
      title,
      description: `${selectedHighlights.length} epic moments in ${totalDuration}s`,
      highlights: selectedHighlights,
      totalDuration,
      transitions,
      score: selectedHighlights.reduce((sum, h) => sum + (h.score || 0), 0) / selectedHighlights.length
    };
  }

  private selectTransitionType(currentClip: any, nextClip: any): string {
    if (currentClip.clipType === 'action' && nextClip.clipType === 'action') {
      return 'cut';
    } else if (currentClip.excitementLevel > 0.8 && nextClip.excitementLevel > 0.8) {
      return 'fade';
    } else {
      return 'dissolve';
    }
  }

  // Additional utility methods for enhanced video processing
  async generateVideoSummary(video: Video): Promise<string> {
    const analysis = await this.analyzeVideo(video);
    return `${analysis.contentAnalysis.mood} UTV adventure with ${analysis.highlights.length} epic moments including ${analysis.contentAnalysis.terrain.join(', ')} terrain.`;
  }

  async suggestOptimalCuts(video: Video): Promise<Array<{ start: number; end: number; reason: string }>> {
    const analysis = await this.analyzeVideo(video);
    
    return analysis.highlights.map(highlight => ({
      start: highlight.start,
      end: highlight.end,
      reason: highlight.description
    }));
  }

  async enhanceVideoMetadata(video: Video): Promise<{ title: string; description: string; tags: string[] }> {
    const analysis = await this.analyzeVideo(video);
    
    return {
      title: analysis.generatedTitle,
      description: analysis.generatedDescription,
      tags: analysis.generatedTags
    };
  }
}

export const aiVideoProcessor = new AIVideoProcessor();