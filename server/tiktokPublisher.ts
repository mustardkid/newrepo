import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { storage } from './storage';
import { Video } from '@shared/schema';

export interface TikTokUploadResult {
  videoId: string;
  shareUrl: string;
  embedUrl: string;
  publishedAt: string;
}

export interface TikTokAnalytics {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  playTime: number;
  profileViews: number;
  fetchedAt: Date;
}

export class TikTokPublisher {
  private accessToken: string;
  private baseUrl = 'https://open-api.tiktok.com';

  constructor() {
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN || '';
  }

  async uploadVideo(video: Video, filePath: string, options: {
    title: string;
    description: string;
    hashtags: string[];
    privacy: 'public' | 'friends' | 'private';
    allowDuet: boolean;
    allowStitch: boolean;
    scheduledPublishTime?: string;
  }): Promise<TikTokUploadResult> {
    try {
      // Step 1: Initialize upload
      const initResponse = await this.initializeUpload();
      const { upload_url, publish_id } = initResponse;

      // Step 2: Upload video file
      await this.uploadVideoFile(upload_url, filePath);

      // Step 3: Publish video
      const publishResponse = await this.publishVideo(publish_id, options);

      // Create publication record
      await storage.createPublication({
        videoId: video.id,
        platform: 'tiktok',
        platformVideoId: publishResponse.video_id,
        publishedAt: new Date(),
        title: options.title,
        description: options.description,
        url: publishResponse.share_url,
        status: 'published',
        metadata: JSON.stringify({
          hashtags: options.hashtags,
          privacy: options.privacy,
          allowDuet: options.allowDuet,
          allowStitch: options.allowStitch
        })
      });

      return {
        videoId: publishResponse.video_id,
        shareUrl: publishResponse.share_url,
        embedUrl: publishResponse.embed_url,
        publishedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('TikTok upload failed:', error);
      
      // Log publication failure
      await storage.createPublication({
        videoId: video.id,
        platform: 'tiktok',
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

  private async initializeUpload(): Promise<{ upload_url: string; publish_id: string }> {
    const response = await axios.post(
      `${this.baseUrl}/v2/post/publish/inbox/video/init/`,
      {
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: await this.getVideoSize()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error?.code !== 'ok') {
      throw new Error(`TikTok init upload failed: ${response.data.error?.message}`);
    }

    return response.data.data;
  }

  private async uploadVideoFile(uploadUrl: string, filePath: string): Promise<void> {
    const formData = new FormData();
    formData.append('video', fs.createReadStream(filePath));

    await axios.put(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      }
    });
  }

  private async publishVideo(publishId: string, options: any): Promise<any> {
    const caption = this.buildCaption(options.title, options.description, options.hashtags);
    
    const response = await axios.post(
      `${this.baseUrl}/v2/post/publish/video/init/`,
      {
        post_info: {
          title: options.title,
          description: caption,
          privacy_level: options.privacy.toUpperCase(),
          disable_duet: !options.allowDuet,
          disable_stitch: !options.allowStitch,
          video_cover_timestamp_ms: 1000 // Use frame at 1 second as cover
        },
        source_info: {
          source: 'FILE_UPLOAD',
          publish_id: publishId
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error?.code !== 'ok') {
      throw new Error(`TikTok publish failed: ${response.data.error?.message}`);
    }

    return response.data.data;
  }

  async getVideoAnalytics(tiktokVideoId: string, days: number = 30): Promise<TikTokAnalytics> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/research/video/query/`,
        {
          params: {
            fields: 'id,video_description,create_time,region_code,share_count,view_count,like_count,comment_count,music_id,hashtag_names,username,effect_ids,playlist_id,voice_to_text',
            max_count: 1,
            cursor: 0,
            search_id: tiktokVideoId
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          }
        }
      );

      const videoData = response.data.data?.videos?.[0];
      if (!videoData) {
        throw new Error('Video not found in TikTok analytics');
      }

      const analytics: TikTokAnalytics = {
        videoId: tiktokVideoId,
        views: videoData.view_count || 0,
        likes: videoData.like_count || 0,
        comments: videoData.comment_count || 0,
        shares: videoData.share_count || 0,
        playTime: 0, // TikTok doesn't provide play time in basic API
        profileViews: 0, // Not available in basic API
        fetchedAt: new Date()
      };

      // Store analytics data
      await storage.createPlatformAnalytics({
        publicationId: await this.getPublicationId(tiktokVideoId, 'tiktok'),
        platform: 'tiktok',
        views: analytics.views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        revenue: 0, // TikTok Creator Fund revenue not available via API
        engagement: (analytics.likes + analytics.comments + analytics.shares) / Math.max(analytics.views, 1),
        watchTime: analytics.playTime,
        fetchedAt: analytics.fetchedAt,
        metadata: JSON.stringify({
          hashtags: videoData.hashtag_names || [],
          music_id: videoData.music_id,
          effects: videoData.effect_ids || []
        })
      });

      return analytics;
    } catch (error) {
      console.error('Failed to fetch TikTok analytics:', error);
      throw error;
    }
  }

  private buildCaption(title: string, description: string, hashtags: string[]): string {
    let caption = '';
    
    if (title) {
      caption += `${title}\n\n`;
    }
    
    if (description) {
      caption += `${description}\n\n`;
    }
    
    // Add hashtags
    const formattedHashtags = hashtags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    ).join(' ');
    
    caption += formattedHashtags;
    
    // Standard UTV/ATV hashtags
    const standardTags = [
      '#UTV', '#ATV', '#OffRoad', '#Adventure', '#Extreme', 
      '#TrailRiding', '#SideBySide', '#RideReels', '#OffRoadLife', '#ATVLife'
    ];
    
    caption += ' ' + standardTags.join(' ');
    
    // Ensure caption is under TikTok's limit (2200 characters)
    return caption.substring(0, 2200);
  }

  async generateOptimizedHashtags(video: Video, highlights: any[]): Promise<string[]> {
    const baseHashtags = ['UTV', 'ATV', 'OffRoad', 'Adventure', 'RideReels'];
    const generatedHashtags = [...baseHashtags];

    // Add content-specific hashtags based on highlights
    if (highlights.some(h => h.clipType === 'action')) {
      generatedHashtags.push('Extreme', 'Adrenaline', 'ActionSports');
    }

    if (highlights.some(h => h.clipType === 'scenic')) {
      generatedHashtags.push('Nature', 'Scenic', 'BeautifulViews');
    }

    // Add terrain-specific hashtags
    if (video.description?.toLowerCase().includes('mud')) {
      generatedHashtags.push('MudBogging', 'MudLife');
    }

    if (video.description?.toLowerCase().includes('rock')) {
      generatedHashtags.push('RockCrawling', 'RockClimbing');
    }

    if (video.description?.toLowerCase().includes('desert')) {
      generatedHashtags.push('DesertRacing', 'DesertLife');
    }

    // Add trending UTV/ATV hashtags
    const trendingHashtags = [
      'SideBySideLife', 'ATVRiding', 'OffRoadAdventure', 'TrailLife', 
      'UTVLife', 'DirtLife', 'BackcountryExploring', 'OffRoadFun'
    ];

    // Randomly add some trending hashtags
    const shuffled = trendingHashtags.sort(() => 0.5 - Math.random());
    generatedHashtags.push(...shuffled.slice(0, 3));

    // Limit to 30 hashtags (TikTok best practice)
    return generatedHashtags.slice(0, 30);
  }

  async getOptimalUploadTime(): Promise<Date> {
    // TikTok optimal posting times (EST):
    // - Tuesday through Thursday: 6 AM, 10 AM, 7 PM to 9 PM
    // - Friday and weekends: 9 AM, 12 PM, 5 PM
    
    const now = new Date();
    const currentDay = now.getDay();
    
    let targetDate = new Date(now);
    
    // Schedule for next optimal time slot
    if (currentDay >= 2 && currentDay <= 4) { // Tuesday-Thursday
      targetDate.setDate(now.getDate() + 1);
      targetDate.setUTCHours(23, 0, 0, 0); // 7 PM EST = 23:00 UTC
    } else {
      // Weekend or Monday - schedule for Tuesday
      const daysUntilTuesday = currentDay === 0 ? 2 : currentDay === 1 ? 1 : 7 - currentDay + 2;
      targetDate.setDate(now.getDate() + daysUntilTuesday);
      targetDate.setUTCHours(14, 0, 0, 0); // 10 AM EST = 14:00 UTC
    }
    
    return targetDate;
  }

  private async getVideoSize(): Promise<number> {
    // This would be calculated based on the actual video file
    // For now, return a reasonable default
    return 50 * 1024 * 1024; // 50MB
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

  async deleteVideo(tiktokVideoId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/v2/post/publish/video/delete/`,
        {
          video_id: tiktokVideoId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update publication status
      const publicationId = await this.getPublicationId(tiktokVideoId, 'tiktok');
      if (publicationId) {
        await storage.updatePublication(publicationId, {
          status: 'deleted',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to delete TikTok video:', error);
      throw error;
    }
  }
}

export const tiktokPublisher = new TikTokPublisher();