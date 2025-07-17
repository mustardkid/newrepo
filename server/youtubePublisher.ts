import { google } from 'googleapis';
import fs from 'fs';
import { storage } from './storage';
import { Video } from '@shared/schema';

export interface YouTubeUploadResult {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewUrl: string;
}

export interface YouTubeAnalytics {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeMinutes: number;
  subscribersGained: number;
  revenue: number;
  cpm: number;
  ctr: number;
  avgViewDuration: number;
  fetchedAt: Date;
}

export class YouTubePublisher {
  private youtube: any;
  private analytics: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Initialize OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
      );

      // Set refresh token if available
      if (process.env.YOUTUBE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
        });
      }

      this.youtube = google.youtube({ version: 'v3', auth: this.auth });
      this.analytics = google.youtubeAnalytics({ version: 'v2', auth: this.auth });
    } catch (error) {
      console.error('Failed to initialize YouTube auth:', error);
    }
  }

  async uploadVideo(video: Video, filePath: string, options: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacy: 'private' | 'unlisted' | 'public';
    scheduledPublishTime?: string;
  }): Promise<YouTubeUploadResult> {
    try {
      // Prepare video metadata
      const videoMetadata = {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags,
          categoryId: options.categoryId,
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: options.privacy,
          publishAt: options.scheduledPublishTime || undefined,
          selfDeclaredMadeForKids: false
        }
      };

      // Upload video
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          body: fs.createReadStream(filePath)
        }
      });

      const uploadedVideo = response.data;

      // Create publication record
      await storage.createPublication({
        videoId: video.id,
        platform: 'youtube',
        platformVideoId: uploadedVideo.id,
        publishedAt: new Date(),
        title: options.title,
        description: options.description,
        url: `https://www.youtube.com/watch?v=${uploadedVideo.id}`,
        status: 'published',
        metadata: JSON.stringify({
          categoryId: options.categoryId,
          tags: options.tags,
          privacy: options.privacy
        })
      });

      return {
        videoId: uploadedVideo.id,
        title: uploadedVideo.snippet.title,
        description: uploadedVideo.snippet.description,
        publishedAt: uploadedVideo.snippet.publishedAt,
        thumbnailUrl: uploadedVideo.snippet.thumbnails?.default?.url || '',
        viewUrl: `https://www.youtube.com/watch?v=${uploadedVideo.id}`
      };

    } catch (error) {
      console.error('YouTube upload failed:', error);
      
      // Log publication failure
      await storage.createPublication({
        videoId: video.id,
        platform: 'youtube',
        platformVideoId: null,
        publishedAt: null,
        title: options.title,
        description: options.description,
        url: null,
        status: 'failed',
        error: error.message,
        metadata: JSON.stringify(options)
      });

      throw error;
    }
  }

  async getVideoAnalytics(youtubeVideoId: string, days: number = 30): Promise<YouTubeAnalytics> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await this.analytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,likes,comments,shares,estimatedMinutesWatched,subscribersGained,estimatedRevenue,cpm,ctr,averageViewDuration',
        dimensions: 'video',
        filters: `video==${youtubeVideoId}`
      });

      const data = response.data.rows?.[0] || [];
      
      const analytics: YouTubeAnalytics = {
        videoId: youtubeVideoId,
        views: parseInt(data[1]) || 0,
        likes: parseInt(data[2]) || 0,
        comments: parseInt(data[3]) || 0,
        shares: parseInt(data[4]) || 0,
        watchTimeMinutes: parseInt(data[5]) || 0,
        subscribersGained: parseInt(data[6]) || 0,
        revenue: parseFloat(data[7]) || 0,
        cpm: parseFloat(data[8]) || 0,
        ctr: parseFloat(data[9]) || 0,
        avgViewDuration: parseFloat(data[10]) || 0,
        fetchedAt: new Date()
      };

      // Store analytics data
      await storage.createPlatformAnalytics({
        publicationId: await this.getPublicationId(youtubeVideoId, 'youtube'),
        platform: 'youtube',
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        revenue: analytics.revenue,
        engagement: analytics.ctr,
        watchTime: analytics.watchTimeMinutes,
        fetchedAt: analytics.fetchedAt,
        metadata: JSON.stringify({
          cpm: analytics.cpm,
          avgViewDuration: analytics.avgViewDuration,
          subscribersGained: analytics.subscribersGained
        })
      });

      return analytics;
    } catch (error) {
      console.error('Failed to fetch YouTube analytics:', error);
      throw error;
    }
  }

  async updateVideoMetadata(youtubeVideoId: string, updates: {
    title?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
  }): Promise<void> {
    try {
      const updateData: any = {
        id: youtubeVideoId,
        snippet: {}
      };

      if (updates.title) updateData.snippet.title = updates.title;
      if (updates.description) updateData.snippet.description = updates.description;
      if (updates.tags) updateData.snippet.tags = updates.tags;
      if (updates.categoryId) updateData.snippet.categoryId = updates.categoryId;

      await this.youtube.videos.update({
        part: ['snippet'],
        requestBody: updateData
      });

    } catch (error) {
      console.error('Failed to update YouTube video metadata:', error);
      throw error;
    }
  }

  async deleteVideo(youtubeVideoId: string): Promise<void> {
    try {
      await this.youtube.videos.delete({
        id: youtubeVideoId
      });

      // Update publication status
      const publicationId = await this.getPublicationId(youtubeVideoId, 'youtube');
      if (publicationId) {
        await storage.updatePublication(publicationId, {
          status: 'deleted',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to delete YouTube video:', error);
      throw error;
    }
  }

  private async getPublicationId(platformVideoId: string, platform: string): Promise<number | null> {
    try {
      const publications = await storage.getPublicationsByPlatformVideoId(platformVideoId, platform);
      return publications[0]?.id || null;
    } catch (error) {
      console.error('Failed to get publication ID:', error);
      return null;
    }
  }

  async generateOptimizedTitle(video: Video, highlights: any[]): Promise<string> {
    const keywords = [
      'UTV', 'ATV', 'Off-Road', 'Adventure', 'Extreme', 'Trail Riding',
      'Rock Crawling', 'Mud Bogging', 'Desert Racing', 'Side by Side'
    ];

    const actionWords = ['Epic', 'Insane', 'Ultimate', 'Extreme', 'Amazing', 'Incredible'];
    
    // Analyze highlights for content type
    const hasAction = highlights.some(h => h.clipType === 'action');
    const hasScenic = highlights.some(h => h.clipType === 'scenic');
    
    let title = '';
    
    if (hasAction) {
      const actionWord = actionWords[Math.floor(Math.random() * actionWords.length)];
      title = `${actionWord} UTV ${hasScenic ? 'Adventure' : 'Action'}`;
    } else if (hasScenic) {
      title = 'Beautiful UTV Trail Adventure';
    } else {
      title = 'UTV Off-Road Experience';
    }

    // Add location if available
    if (video.location) {
      title += ` in ${video.location}`;
    }

    // Ensure title is under 100 characters for YouTube
    return title.substring(0, 97) + (title.length > 97 ? '...' : '');
  }

  async generateOptimizedDescription(video: Video, highlights: any[]): Promise<string> {
    const baseDescription = video.description || '';
    
    let description = `${baseDescription}\n\n`;
    
    // Add highlight information
    if (highlights.length > 0) {
      description += '🎥 Video Highlights:\n';
      highlights.slice(0, 3).forEach((highlight, index) => {
        description += `${index + 1}. ${highlight.description} (${highlight.start}s - ${highlight.end}s)\n`;
      });
      description += '\n';
    }

    // Add standard tags and CTAs
    description += `
🏁 Subscribe for more epic UTV adventures!
👍 Like this video if you enjoyed the ride!
💬 Comment your favorite moment below!

#UTV #ATV #OffRoad #Adventure #Extreme #TrailRiding #SideBySide #RideReels

🎬 Powered by RideReels - The Ultimate UTV Content Platform
📱 Upload your own UTV adventures at RideReels.com

🔔 Turn on notifications to never miss an adventure!
`;

    return description;
  }

  async getOptimalUploadTime(): Promise<Date> {
    // Based on YouTube analytics, optimal upload times are typically:
    // - Tuesday through Thursday
    // - 2 PM to 4 PM EST (19:00 to 21:00 UTC)
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let targetDate = new Date(now);
    
    // If it's Friday, Saturday, Sunday, or Monday, schedule for Tuesday
    if (currentDay >= 5 || currentDay <= 1) {
      const daysUntilTuesday = currentDay === 0 ? 2 : currentDay === 1 ? 1 : 7 - currentDay + 2;
      targetDate.setDate(now.getDate() + daysUntilTuesday);
    }
    // If it's already Tuesday-Thursday, schedule for the next day
    else {
      targetDate.setDate(now.getDate() + 1);
    }
    
    // Set time to 3 PM EST (20:00 UTC)
    targetDate.setUTCHours(20, 0, 0, 0);
    
    return targetDate;
  }
}

export const youtubePublisher = new YouTubePublisher();