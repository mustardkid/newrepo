
import OpenAI from "openai";
import { videoFrameExtractor, type ExtractedFrame } from "./videoFrameExtractor";
import { storage } from "./storage";
import type { Video } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VisualAnalysisResult {
  contentType: string;
  terrainTypes: string[];
  vehicleTypes: string[];
  activityTypes: string[];
  sceneryElements: string[];
  actionLevel: number;
  excitement: number;
  visualQuality: number;
  keyMoments: Array<{
    timestamp: number;
    description: string;
    actionType: string;
    intensity: number;
  }>;
  suggestedTags: string[];
  enhancedDescription: string;
  thumbnailRecommendations: Array<{
    timestamp: number;
    reason: string;
    score: number;
  }>;
}

export class AIVisualAnalyzer {
  async analyzeVideoFrames(video: Video): Promise<VisualAnalysisResult> {
    try {
      console.log(`Starting visual analysis for video ${video.id}: ${video.title}`);
      
      // Get video URL (assuming Cloudflare Stream)
      const videoUrl = this.getVideoStreamUrl(video);
      if (!videoUrl) {
        throw new Error("Video stream URL not available");
      }

      // Extract key frames
      const frames = await videoFrameExtractor.extractKeyFrames(videoUrl, video.id, 12);
      
      if (frames.length === 0) {
        throw new Error("No frames could be extracted from video");
      }

      // Analyze frames with OpenAI Vision
      const analysis = await this.performVisualAnalysis(video, frames);
      
      // Store visual analysis results
      await this.storeVisualAnalysis(video.id, analysis);
      
      // Cleanup temporary frames
      await videoFrameExtractor.cleanupFrames(video.id);
      
      console.log(`Visual analysis completed for video ${video.id}`);
      return analysis;
      
    } catch (error) {
      console.error(`Visual analysis failed for video ${video.id}:`, error);
      await videoFrameExtractor.cleanupFrames(video.id);
      throw error;
    }
  }

  private getVideoStreamUrl(video: Video): string | null {
    if (video.cfStreamId) {
      // Cloudflare Stream URL format
      return `https://customer-${process.env.CF_ACCOUNT_ID}.cloudflarestream.com/${video.cfStreamId}/manifest/video.m3u8`;
    }
    return null;
  }

  private async performVisualAnalysis(video: Video, frames: ExtractedFrame[]): Promise<VisualAnalysisResult> {
    const frameDescriptions = await this.analyzeIndividualFrames(frames);
    const overallAnalysis = await this.synthesizeOverallAnalysis(video, frameDescriptions, frames);
    
    return overallAnalysis;
  }

  private async analyzeIndividualFrames(frames: ExtractedFrame[]): Promise<Array<{
    timestamp: number;
    description: string;
    analysis: any;
  }>> {
    const frameAnalyses = [];
    
    for (const frame of frames) {
      try {
        const analysis = await this.analyzeFrame(frame);
        frameAnalyses.push({
          timestamp: frame.timestamp,
          description: analysis.description,
          analysis: analysis
        });
      } catch (error) {
        console.error(`Failed to analyze frame at ${frame.timestamp}:`, error);
      }
    }
    
    return frameAnalyses;
  }

  private async analyzeFrame(frame: ExtractedFrame): Promise<any> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert UTV/ATV video content analyzer. Analyze this video frame and provide detailed information about:
1. Vehicle types visible (UTV, ATV, side-by-side, etc.)
2. Terrain type (rocky, muddy, sandy, snow, etc.)
3. Activity type (racing, trail riding, jumping, rock crawling, etc.)
4. Scenery elements (mountains, desert, forest, etc.)
5. Action level (1-10 scale)
6. Visual quality assessment
7. Notable features or moments

Respond in JSON format with detailed analysis.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this UTV/ATV video frame taken at ${frame.timestamp} seconds. Provide detailed analysis for content categorization and tagging.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${frame.base64Data}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No analysis returned from OpenAI Vision");
    }

    return JSON.parse(content);
  }

  private async synthesizeOverallAnalysis(
    video: Video,
    frameAnalyses: Array<{ timestamp: number; description: string; analysis: any }>,
    frames: ExtractedFrame[]
  ): Promise<VisualAnalysisResult> {
    const synthesisPrompt = `
Based on the analysis of ${frameAnalyses.length} frames from this UTV/ATV video, provide a comprehensive synthesis:

Video Details:
- Title: ${video.title}
- Description: ${video.description || "No description"}
- Category: ${video.category}

Frame Analyses:
${frameAnalyses.map((fa, i) => `
Frame ${i + 1} (${fa.timestamp}s): ${fa.description}
Analysis: ${JSON.stringify(fa.analysis, null, 2)}
`).join('\n')}

Provide a comprehensive analysis in this JSON format:
{
  "contentType": "primary content category",
  "terrainTypes": ["terrain", "types", "observed"],
  "vehicleTypes": ["vehicle", "types", "seen"],
  "activityTypes": ["activities", "observed"],
  "sceneryElements": ["scenery", "elements"],
  "actionLevel": 1-10,
  "excitement": 1-10,
  "visualQuality": 1-10,
  "keyMoments": [
    {
      "timestamp": 30,
      "description": "Epic jump sequence",
      "actionType": "jump",
      "intensity": 9
    }
  ],
  "suggestedTags": ["relevant", "tags", "for", "discovery"],
  "enhancedDescription": "Compelling description based on visual analysis",
  "thumbnailRecommendations": [
    {
      "timestamp": 45,
      "reason": "High action moment with good visual appeal",
      "score": 9.2
    }
  ]
}

Focus on:
1. Identifying the most engaging visual moments
2. Categorizing content for proper discovery
3. Generating viral-worthy tags and descriptions
4. Recommending optimal thumbnail timestamps
5. Assessing overall video quality and appeal
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert UTV/ATV content strategist and video analyst. Synthesize visual analysis data into actionable insights for content optimization."
        },
        {
          role: "user",
          content: synthesisPrompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error("No synthesis analysis returned from OpenAI");
    }

    return JSON.parse(analysisText);
  }

  private async storeVisualAnalysis(videoId: number, analysis: VisualAnalysisResult): Promise<void> {
    await storage.updateVideo(videoId, {
      aiVisualAnalysis: JSON.stringify(analysis),
      aiVisualProcessingCompleted: new Date(),
    });
  }

  async generateThumbnailRecommendations(video: Video): Promise<Array<{
    timestamp: number;
    score: number;
    reason: string;
    frameUrl?: string;
  }>> {
    try {
      // Extract specific frames for thumbnail analysis
      const frames = await videoFrameExtractor.extractKeyFrames(
        this.getVideoStreamUrl(video)!,
        video.id,
        20 // More frames for better thumbnail selection
      );

      const thumbnailAnalyses = [];
      
      for (const frame of frames) {
        const analysis = await this.analyzeThumbnailPotential(frame);
        thumbnailAnalyses.push({
          timestamp: frame.timestamp,
          score: analysis.score,
          reason: analysis.reason,
          frameUrl: `data:image/jpeg;base64,${frame.base64Data}`
        });
      }

      // Sort by score and return top recommendations
      return thumbnailAnalyses
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
        
    } catch (error) {
      console.error('Thumbnail analysis failed:', error);
      return [];
    }
  }

  private async analyzeThumbnailPotential(frame: ExtractedFrame): Promise<{
    score: number;
    reason: string;
  }> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a thumbnail optimization expert. Rate this frame's potential as a video thumbnail on a scale of 1-10 and explain why."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Rate this frame's thumbnail potential (1-10) considering: visual appeal, action intensity, clarity, composition, and click-worthiness for UTV/ATV content."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${frame.base64Data}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"score": 5, "reason": "No analysis available"}');
    return {
      score: result.score || 5,
      reason: result.reason || "Analysis unavailable"
    };
  }
}

export const aiVisualAnalyzer = new AIVisualAnalyzer();
