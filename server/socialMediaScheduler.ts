import { storage } from './storage';
import { publishingQueueProcessor } from './publishingQueueProcessor';
import { youtubePublisher } from './youtubePublisher';
import { tiktokPublisher } from './tiktokPublisher';
import { aiVideoProcessor } from './aiVideoProcessor';
import { Video, PlatformPerformance } from '@shared/schema';
import cron from 'node-cron';

export interface SchedulingStrategy {
  platform: string;
  optimalTimes: Array<{
    dayOfWeek: number;
    hour: number;
    score: number;
  }>;
  contentTypes: string[];
  audienceMetrics: {
    peakEngagement: number;
    avgViews: number;
    bestPerformingContentType: string;
  };
}

export class SocialMediaScheduler {
  private analyticsUpdateInterval: NodeJS.Timeout | null = null;
  private performanceTracker: Map<string, PlatformPerformance[]> = new Map();

  constructor() {
    this.initializeScheduledTasks();
    this.startAnalyticsTracking();
  }

  private initializeScheduledTasks() {
    // Update analytics every 4 hours
    cron.schedule('0 */4 * * *', () => {
      this.updatePlatformAnalytics();
    });

    // Calculate optimal posting times daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.calculateOptimalPostingTimes();
    });

    // Process scheduled publications every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.processScheduledPublications();
    });
  }

  private startAnalyticsTracking() {
    // Track analytics every 2 hours
    this.analyticsUpdateInterval = setInterval(() => {
      this.trackPlatformPerformance();
    }, 2 * 60 * 60 * 1000);
  }

  private async updatePlatformAnalytics() {
    try {
      console.log('Updating platform analytics...');
      
      // Get all published videos from the last 30 days
      const recentPublications = await Promise.all([
        storage.getPublicationsByPlatform('youtube'),
        storage.getPublicationsByPlatform('tiktok')
      ]);

      const allPublications = recentPublications.flat();
      
      for (const publication of allPublications) {
        if (!publication.platformVideoId) continue;

        try {
          if (publication.platform === 'youtube') {
            await youtubePublisher.getVideoAnalytics(publication.platformVideoId);
          } else if (publication.platform === 'tiktok') {
            await tiktokPublisher.getVideoAnalytics(publication.platformVideoId);
          }
        } catch (error) {
          console.error(`Failed to update analytics for ${publication.platform} video ${publication.platformVideoId}:`, error);
        }
      }
      
      console.log('Platform analytics updated successfully');
    } catch (error) {
      console.error('Error updating platform analytics:', error);
    }
  }

  private async calculateOptimalPostingTimes() {
    try {
      console.log('Calculating optimal posting times...');
      
      const platforms = ['youtube', 'tiktok'];
      
      for (const platform of platforms) {
        const analytics = await storage.getLatestAnalytics(platform, 30);
        
        if (analytics.length === 0) continue;

        // Group by day of week and hour
        const performanceMap = new Map<string, {
          totalViews: number;
          totalEngagement: number;
          count: number;
        }>();

        for (const analytic of analytics) {
          const fetchedAt = new Date(analytic.fetchedAt);
          const dayOfWeek = fetchedAt.getDay();
          const hourOfDay = fetchedAt.getHours();
          const key = `${dayOfWeek}-${hourOfDay}`;

          const existing = performanceMap.get(key) || {
            totalViews: 0,
            totalEngagement: 0,
            count: 0
          };

          existing.totalViews += analytic.views;
          existing.totalEngagement += Number(analytic.engagement);
          existing.count += 1;

          performanceMap.set(key, existing);
        }

        // Calculate averages and store in database
        for (const [key, data] of performanceMap) {
          const [dayOfWeek, hourOfDay] = key.split('-').map(Number);
          
          await storage.upsertPlatformPerformance({
            platform,
            dayOfWeek,
            hourOfDay,
            avgViews: (data.totalViews / data.count).toString(),
            avgEngagement: (data.totalEngagement / data.count).toString(),
            videoCount: data.count
          });
        }
      }
      
      console.log('Optimal posting times calculated successfully');
    } catch (error) {
      console.error('Error calculating optimal posting times:', error);
    }
  }

  private async processScheduledPublications() {
    try {
      // This is handled by the publishing queue processor
      // We just log the current queue status
      const queueStatus = await publishingQueueProcessor.getQueueStatus();
      
      if (queueStatus.pending > 0) {
        console.log(`Processing ${queueStatus.pending} pending publications...`);
      }
    } catch (error) {
      console.error('Error processing scheduled publications:', error);
    }
  }

  private async trackPlatformPerformance() {
    try {
      const platforms = ['youtube', 'tiktok'];
      
      for (const platform of platforms) {
        const bestTimes = await storage.getBestPerformanceTimes(platform);
        this.performanceTracker.set(platform, bestTimes);
      }
    } catch (error) {
      console.error('Error tracking platform performance:', error);
    }
  }

  async scheduleVideoPublication(
    videoId: number,
    platforms: string[],
    options: {
      immediate?: boolean;
      customSchedule?: Date;
      useOptimalTiming?: boolean;
    } = {}
  ): Promise<void> {
    const video = await storage.getVideo(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    // Generate AI-enhanced content for each platform
    const aiResults = await aiVideoProcessor.analyzeVideo(video);
    
    const publishingConfigs = {
      youtube: {
        title: aiResults.youtubeMetadata.title,
        description: aiResults.youtubeMetadata.description,
        tags: aiResults.youtubeMetadata.tags,
        categoryId: aiResults.youtubeMetadata.category,
        privacy: 'public' as const
      },
      tiktok: {
        title: aiResults.tiktokMetadata.title,
        description: aiResults.tiktokMetadata.description,
        hashtags: aiResults.tiktokMetadata.hashtags,
        privacy: 'public' as const,
        allowDuet: true,
        allowStitch: true
      }
    };

    for (const platform of platforms) {
      let scheduledTime: Date;

      if (options.immediate) {
        scheduledTime = new Date();
      } else if (options.customSchedule) {
        scheduledTime = options.customSchedule;
      } else if (options.useOptimalTiming) {
        scheduledTime = await this.getOptimalPostingTime(platform);
      } else {
        scheduledTime = new Date();
      }

      const config = publishingConfigs[platform as keyof typeof publishingConfigs];
      if (!config) continue;

      await publishingQueueProcessor.addToQueue(videoId, platform, { [platform]: config }, {
        scheduledAt: scheduledTime,
        priority: 1
      });
    }
  }

  async getOptimalPostingTime(platform: string): Promise<Date> {
    const bestTimes = await storage.getBestPerformanceTimes(platform);
    
    if (bestTimes.length === 0) {
      // Fallback to platform-specific defaults
      if (platform === 'youtube') {
        return await youtubePublisher.getOptimalUploadTime();
      } else if (platform === 'tiktok') {
        return await tiktokPublisher.getOptimalUploadTime();
      }
      return new Date();
    }

    // Get the best performing time slot
    const bestTime = bestTimes[0];
    const now = new Date();
    const targetDate = new Date(now);

    // Calculate days until target day of week
    const currentDay = now.getDay();
    const targetDay = bestTime.dayOfWeek;
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;

    if (daysUntilTarget === 0) {
      // Same day - check if target hour has passed
      if (now.getHours() >= bestTime.hourOfDay) {
        // Schedule for next week
        targetDate.setDate(now.getDate() + 7);
      }
    } else {
      targetDate.setDate(now.getDate() + daysUntilTarget);
    }

    targetDate.setHours(bestTime.hourOfDay, 0, 0, 0);
    return targetDate;
  }

  async getSchedulingStrategy(platform: string): Promise<SchedulingStrategy> {
    const bestTimes = await storage.getBestPerformanceTimes(platform);
    const recentAnalytics = await storage.getLatestAnalytics(platform, 30);

    const optimalTimes = bestTimes.map(time => ({
      dayOfWeek: time.dayOfWeek,
      hour: time.hourOfDay,
      score: Number(time.avgEngagement)
    }));

    const avgViews = recentAnalytics.reduce((sum, a) => sum + a.views, 0) / recentAnalytics.length || 0;
    const avgEngagement = recentAnalytics.reduce((sum, a) => sum + Number(a.engagement), 0) / recentAnalytics.length || 0;

    return {
      platform,
      optimalTimes,
      contentTypes: ['action', 'scenic', 'educational', 'entertainment'],
      audienceMetrics: {
        peakEngagement: avgEngagement,
        avgViews,
        bestPerformingContentType: 'action' // This would be calculated from video metadata
      }
    };
  }

  async generateContentCalendar(days: number = 30): Promise<Array<{
    date: Date;
    platform: string;
    contentType: string;
    optimalTime: Date;
    estimatedReach: number;
  }>> {
    const calendar: Array<{
      date: Date;
      platform: string;
      contentType: string;
      optimalTime: Date;
      estimatedReach: number;
    }> = [];

    const platforms = ['youtube', 'tiktok'];
    const contentTypes = ['action', 'scenic', 'educational', 'tutorial'];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      for (const platform of platforms) {
        // Skip weekends for YouTube (lower engagement)
        if (platform === 'youtube' && (date.getDay() === 0 || date.getDay() === 6)) {
          continue;
        }

        const optimalTime = await this.getOptimalPostingTime(platform);
        const strategy = await this.getSchedulingStrategy(platform);
        
        calendar.push({
          date,
          platform,
          contentType: contentTypes[i % contentTypes.length],
          optimalTime,
          estimatedReach: strategy.audienceMetrics.avgViews
        });
      }
    }

    return calendar.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getPublishingInsights(): Promise<{
    totalPublications: number;
    successRate: number;
    avgEngagement: number;
    topPerformingPlatform: string;
    recommendations: string[];
  }> {
    const [youtubeAnalytics, tiktokAnalytics] = await Promise.all([
      storage.getLatestAnalytics('youtube', 30),
      storage.getLatestAnalytics('tiktok', 30)
    ]);

    const allAnalytics = [...youtubeAnalytics, ...tiktokAnalytics];
    const totalPublications = allAnalytics.length;
    
    const avgEngagement = allAnalytics.reduce((sum, a) => sum + Number(a.engagement), 0) / totalPublications || 0;
    
    const platformPerformance = {
      youtube: youtubeAnalytics.reduce((sum, a) => sum + Number(a.engagement), 0) / youtubeAnalytics.length || 0,
      tiktok: tiktokAnalytics.reduce((sum, a) => sum + Number(a.engagement), 0) / tiktokAnalytics.length || 0
    };

    const topPerformingPlatform = Object.entries(platformPerformance)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'youtube';

    const recommendations = [
      `Best performing platform: ${topPerformingPlatform}`,
      'Post consistently during peak engagement hours',
      'Use AI-generated titles and descriptions for better reach',
      'Focus on action-packed content for higher engagement'
    ];

    return {
      totalPublications,
      successRate: 0.85, // This would be calculated from queue success/failure rates
      avgEngagement,
      topPerformingPlatform,
      recommendations
    };
  }

  async pauseScheduling(): Promise<void> {
    await publishingQueueProcessor.pauseProcessing();
    if (this.analyticsUpdateInterval) {
      clearInterval(this.analyticsUpdateInterval);
      this.analyticsUpdateInterval = null;
    }
    console.log('Social media scheduling paused');
  }

  async resumeScheduling(): Promise<void> {
    await publishingQueueProcessor.resumeProcessing();
    this.startAnalyticsTracking();
    console.log('Social media scheduling resumed');
  }
}

export const socialMediaScheduler = new SocialMediaScheduler();