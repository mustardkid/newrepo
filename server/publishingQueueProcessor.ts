import { storage } from './storage';
import { youtubePublisher } from './youtubePublisher';
import { tiktokPublisher } from './tiktokPublisher';
import { emailService } from './emailService';
import { Video, PublishingQueue } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export interface PublishingConfig {
  youtube?: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacy: 'private' | 'unlisted' | 'public';
    scheduledPublishTime?: string;
  };
  tiktok?: {
    title: string;
    description: string;
    hashtags: string[];
    privacy: 'public' | 'friends' | 'private';
    allowDuet: boolean;
    allowStitch: boolean;
    scheduledPublishTime?: string;
  };
}

export class PublishingQueueProcessor {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly rateLimits = {
    youtube: {
      maxPerHour: 10,
      maxPerDay: 100,
      currentHour: 0,
      currentDay: 0,
      lastReset: new Date()
    },
    tiktok: {
      maxPerHour: 5,
      maxPerDay: 50,
      currentHour: 0,
      currentDay: 0,
      lastReset: new Date()
    }
  };

  constructor() {
    this.startProcessing();
  }

  private startProcessing() {
    // Process queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 30000);
  }

  private stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private resetRateLimits() {
    const now = new Date();
    
    Object.keys(this.rateLimits).forEach(platform => {
      const rateLimit = this.rateLimits[platform as keyof typeof this.rateLimits];
      const hoursSinceReset = (now.getTime() - rateLimit.lastReset.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceReset >= 24) {
        rateLimit.currentDay = 0;
        rateLimit.currentHour = 0;
        rateLimit.lastReset = now;
      } else if (hoursSinceReset >= 1) {
        rateLimit.currentHour = 0;
      }
    });
  }

  private canProcess(platform: string): boolean {
    this.resetRateLimits();
    
    const rateLimit = this.rateLimits[platform as keyof typeof this.rateLimits];
    if (!rateLimit) return false;
    
    return rateLimit.currentHour < rateLimit.maxPerHour && 
           rateLimit.currentDay < rateLimit.maxPerDay;
  }

  private incrementRateLimit(platform: string) {
    const rateLimit = this.rateLimits[platform as keyof typeof this.rateLimits];
    if (rateLimit) {
      rateLimit.currentHour++;
      rateLimit.currentDay++;
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // Get next item from queue
      const queueItem = await storage.getNextQueueItem();
      if (!queueItem) {
        this.isProcessing = false;
        return;
      }

      // Check if it's time to process (for scheduled items)
      if (queueItem.scheduledAt && queueItem.scheduledAt > new Date()) {
        this.isProcessing = false;
        return;
      }

      // Check rate limits
      if (!this.canProcess(queueItem.platform)) {
        console.log(`Rate limit reached for ${queueItem.platform}, skipping...`);
        this.isProcessing = false;
        return;
      }

      // Get video details
      const video = await storage.getVideo(queueItem.videoId);
      if (!video) {
        await storage.updateQueueItem(queueItem.id, {
          status: 'failed',
          error: 'Video not found',
          processedAt: new Date()
        });
        this.isProcessing = false;
        return;
      }

      // Mark as processing
      await storage.updateQueueItem(queueItem.id, {
        status: 'processing',
        processedAt: new Date()
      });

      // Process the upload
      await this.processUpload(queueItem, video);

    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processUpload(queueItem: PublishingQueue, video: Video) {
    try {
      const config: PublishingConfig = JSON.parse(queueItem.metadata || '{}');
      const videoFilePath = await this.getVideoFilePath(video);

      if (!videoFilePath || !fs.existsSync(videoFilePath)) {
        throw new Error('Video file not found');
      }

      let result;
      
      if (queueItem.platform === 'youtube' && config.youtube) {
        result = await youtubePublisher.uploadVideo(video, videoFilePath, config.youtube);
      } else if (queueItem.platform === 'tiktok' && config.tiktok) {
        result = await tiktokPublisher.uploadVideo(video, videoFilePath, config.tiktok);
      } else {
        throw new Error(`Unsupported platform: ${queueItem.platform}`);
      }

      // Increment rate limit counter
      this.incrementRateLimit(queueItem.platform);

      // Mark as completed
      await storage.updateQueueItem(queueItem.id, {
        status: 'completed',
        processedAt: new Date()
      });

      // Send success notification
      const user = await storage.getUser(video.userId);
      if (user) {
        await emailService.notifyVideoPublished(user, video);
      }

      console.log(`Successfully published video ${video.id} to ${queueItem.platform}`);

    } catch (error) {
      console.error(`Failed to publish video ${video.id} to ${queueItem.platform}:`, error);
      
      // Handle retries
      const retryCount = queueItem.retryCount + 1;
      
      if (retryCount <= queueItem.maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, retryCount) * 60 * 1000; // 2^n minutes
        const retryTime = new Date(Date.now() + retryDelay);
        
        await storage.updateQueueItem(queueItem.id, {
          status: 'pending',
          retryCount,
          lastRetryAt: new Date(),
          scheduledAt: retryTime,
          error: error.message
        });
        
        console.log(`Scheduled retry ${retryCount}/${queueItem.maxRetries} for video ${video.id} at ${retryTime}`);
      } else {
        // Max retries reached, mark as failed
        await storage.updateQueueItem(queueItem.id, {
          status: 'failed',
          error: error.message,
          processedAt: new Date()
        });
        
        console.log(`Max retries reached for video ${video.id} on ${queueItem.platform}`);
      }
    }
  }

  private async getVideoFilePath(video: Video): Promise<string | null> {
    // This would typically get the path from your video storage system
    // For now, we'll assume videos are stored in a temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    const possibleExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
    
    for (const ext of possibleExtensions) {
      const filePath = path.join(tempDir, `${video.id}${ext}`);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    
    return null;
  }

  async addToQueue(
    videoId: number,
    platform: string,
    config: PublishingConfig,
    options: {
      priority?: number;
      scheduledAt?: Date;
      maxRetries?: number;
    } = {}
  ): Promise<PublishingQueue> {
    const queueItem = await storage.addToPublishingQueue({
      videoId,
      platform,
      priority: options.priority || 1,
      scheduledAt: options.scheduledAt || null,
      maxRetries: options.maxRetries || 3,
      metadata: JSON.stringify(config)
    });

    console.log(`Added video ${videoId} to ${platform} publishing queue`);
    return queueItem;
  }

  async scheduleOptimalPublishing(
    videoId: number,
    platforms: string[],
    config: PublishingConfig
  ): Promise<PublishingQueue[]> {
    const queueItems: PublishingQueue[] = [];

    for (const platform of platforms) {
      let optimalTime: Date;
      
      if (platform === 'youtube') {
        optimalTime = await youtubePublisher.getOptimalUploadTime();
      } else if (platform === 'tiktok') {
        optimalTime = await tiktokPublisher.getOptimalUploadTime();
      } else {
        // Default to immediate publishing for unknown platforms
        optimalTime = new Date();
      }

      const queueItem = await this.addToQueue(videoId, platform, config, {
        scheduledAt: optimalTime,
        priority: 1
      });

      queueItems.push(queueItem);
    }

    return queueItems;
  }

  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    rateLimits: typeof this.rateLimits;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      storage.getPublishingQueueByStatus('pending'),
      storage.getPublishingQueueByStatus('processing'),
      storage.getPublishingQueueByStatus('completed'),
      storage.getPublishingQueueByStatus('failed')
    ]);

    return {
      pending: pending.length,
      processing: processing.length,
      completed: completed.length,
      failed: failed.length,
      rateLimits: this.rateLimits
    };
  }

  async retryFailedItems(): Promise<number> {
    const failedItems = await storage.getPublishingQueueByStatus('failed');
    let retriedCount = 0;

    for (const item of failedItems) {
      if (item.retryCount < item.maxRetries) {
        await storage.updateQueueItem(item.id, {
          status: 'pending',
          retryCount: item.retryCount + 1,
          scheduledAt: new Date(),
          error: null
        });
        retriedCount++;
      }
    }

    return retriedCount;
  }

  async pauseProcessing(): Promise<void> {
    this.stopProcessing();
    console.log('Publishing queue processing paused');
  }

  async resumeProcessing(): Promise<void> {
    if (!this.processingInterval) {
      this.startProcessing();
      console.log('Publishing queue processing resumed');
    }
  }

  async clearQueue(): Promise<void> {
    // This would delete all pending items from the queue
    // Implementation depends on your specific requirements
    console.log('Queue clearing not implemented - use with caution');
  }
}

export const publishingQueueProcessor = new PublishingQueueProcessor();