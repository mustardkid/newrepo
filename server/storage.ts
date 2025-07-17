import {
  users,
  videos,
  payouts,
  platformSettings,
  videoViews,
  subscriptions,
  revenueTransactions,
  taxDocuments,
  notifications,
  publications,
  publishingQueue,
  platformAnalytics,
  platformPerformance,
  type User,
  type UpsertUser,
  type Video,
  type InsertVideo,
  type Payout,
  type InsertPayout,
  type PlatformSettings,
  type InsertPlatformSettings,
  type InsertVideoView,
  type VideoView,
  type InsertSubscription,
  type Subscription,
  type InsertRevenueTransaction,
  type RevenueTransaction,
  type InsertTaxDocument,
  type TaxDocument,
  type InsertNotification,
  type Notification,
  type InsertPublication,
  type Publication,
  type InsertPublishingQueue,
  type PublishingQueue,
  type InsertPlatformAnalytics,
  type PlatformAnalytics,
  type InsertPlatformPerformance,
  type PlatformPerformance,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sum, and, gte, lte, isNotNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: these are mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserStatus(id: string, isActive: boolean): Promise<User>;
  updateUserStats(id: string, stats: Partial<Pick<User, 'totalViews' | 'totalEarnings' | 'videosPublished' | 'videosProcessing'>>): Promise<User>;
  
  // Video operations
  createVideo(video: InsertVideo): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideosByUser(userId: string): Promise<Video[]>;
  getVideosByUserDetailed(userId: string): Promise<Video[]>;
  getAllVideos(): Promise<Video[]>;
  getVideosByStatus(status: string): Promise<Video[]>;
  getVideoByStreamId(streamId: string): Promise<Video | undefined>;
  updateVideo(id: number, updates: Partial<Video>): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number, userId: string): Promise<void>;
  
  // Profile operations
  updateUserProfile(userId: string, profileData: any): Promise<User>;
  
  // Earnings operations
  getEarningsProjection(userId: string): Promise<any>;
  
  // Payout operations
  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayoutsByUser(userId: string): Promise<Payout[]>;
  getAllPayouts(): Promise<Payout[]>;
  updatePayout(id: number, updates: Partial<Payout>): Promise<Payout>;
  
  // Platform settings
  getPlatformSetting(key: string): Promise<PlatformSettings | undefined>;
  upsertPlatformSetting(setting: InsertPlatformSettings): Promise<PlatformSettings>;
  getAllPlatformSettings(): Promise<PlatformSettings[]>;
  
  // Analytics
  getPlatformStats(): Promise<{
    totalUsers: number;
    totalVideos: number;
    totalRevenue: string;
    pendingVideos: number;
    processingVideos: number;
    pendingPayouts: string;
  }>;

  // Revenue tracking operations
  createVideoView(view: InsertVideoView): Promise<VideoView>;
  getVideoViewsByVideo(videoId: number): Promise<VideoView[]>;
  getVideoViewsByUser(userId: string): Promise<VideoView[]>;
  
  createRevenueTransaction(transaction: InsertRevenueTransaction): Promise<RevenueTransaction>;
  getRevenueTransactionsByUser(userId: string): Promise<RevenueTransaction[]>;
  getRevenueTransactionsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<RevenueTransaction[]>;
  
  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscriptionByUser(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription>;
  
  // Enhanced payout operations
  getPayoutsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<Payout[]>;
  getPayoutByStripeTransferId(stripeTransferId: string): Promise<Payout | undefined>;
  
  // Publishing operations
  createPublication(publication: InsertPublication): Promise<Publication>;
  getPublicationsByVideo(videoId: number): Promise<Publication[]>;
  getPublicationsByPlatform(platform: string): Promise<Publication[]>;
  getPublicationsByPlatformVideoId(platformVideoId: string, platform: string): Promise<Publication[]>;
  updatePublication(id: number, updates: Partial<Publication>): Promise<Publication>;
  deletePublication(id: number): Promise<void>;
  
  // Publishing queue operations
  addToPublishingQueue(queueItem: InsertPublishingQueue): Promise<PublishingQueue>;
  getPublishingQueueByStatus(status: string): Promise<PublishingQueue[]>;
  getNextQueueItem(): Promise<PublishingQueue | undefined>;
  updateQueueItem(id: number, updates: Partial<PublishingQueue>): Promise<PublishingQueue>;
  deleteQueueItem(id: number): Promise<void>;
  
  // Analytics operations
  createPlatformAnalytics(analytics: InsertPlatformAnalytics): Promise<PlatformAnalytics>;
  getPlatformAnalyticsByPublication(publicationId: number): Promise<PlatformAnalytics[]>;
  getLatestAnalytics(platform: string, days: number): Promise<PlatformAnalytics[]>;
  
  // Performance tracking
  upsertPlatformPerformance(performance: InsertPlatformPerformance): Promise<PlatformPerformance>;
  getBestPerformanceTimes(platform: string): Promise<PlatformPerformance[]>;
  
  // Tax compliance operations
  createTaxDocument(document: InsertTaxDocument): Promise<TaxDocument>;
  getTaxDocumentsByUser(userId: string): Promise<TaxDocument[]>;
  getTaxDocumentsByYear(taxYear: number): Promise<TaxDocument[]>;
  updateTaxDocument(id: number, updates: Partial<TaxDocument>): Promise<TaxDocument>;
  
  // User operations extensions
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // AI processing operations
  getAIProcessedVideos(): Promise<any[]>;
  getPayout(id: number): Promise<Payout | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: these are mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStats(id: string, stats: Partial<Pick<User, 'totalViews' | 'totalEarnings' | 'videosPublished' | 'videosProcessing'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Video operations
  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async getVideosByUser(userId: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.userId, userId)).orderBy(desc(videos.createdAt));
  }

  async getVideosByUserDetailed(userId: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.userId, userId)).orderBy(desc(videos.createdAt));
  }

  async getAllVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getAIProcessedVideos(): Promise<any[]> {
    return await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        cfStreamId: videos.cfStreamId,
        aiProcessingStatus: videos.aiProcessingStatus,
        aiViralPotentialScore: videos.aiViralPotentialScore,
        aiHighlights: videos.aiHighlights,
        aiYoutubeMetadata: videos.aiYoutubeMetadata,
        aiTiktokMetadata: videos.aiTiktokMetadata,
        aiThumbnailRecommendations: videos.aiThumbnailRecommendations,
        aiCompiledHighlights: videos.aiCompiledHighlights,
        status: videos.status,
        createdAt: videos.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(
        and(
          isNotNull(videos.aiHighlights),
          eq(videos.aiProcessingStatus, 'completed')
        )
      )
      .orderBy(desc(videos.createdAt));
  }

  async getVideosByStatus(status: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.status, status)).orderBy(desc(videos.createdAt));
  }

  async getVideoByStreamId(streamId: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.cfStreamId, streamId));
    return video;
  }

  async updateVideo(id: number, updates: Partial<Video>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  // Profile operations
  async updateUserProfile(userId: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Earnings operations
  async getEarningsProjection(userId: string): Promise<any> {
    const userVideos = await db.select().from(videos).where(eq(videos.userId, userId));
    
    // Calculate basic projection based on videos and AI scores
    const totalVideos = userVideos.length;
    const publishedVideos = userVideos.filter(v => v.status === 'published').length;
    const avgViralScore = userVideos.reduce((sum, v) => sum + (Number(v.aiViralPotentialScore) || 0), 0) / totalVideos || 0;
    const projectedEarnings = publishedVideos * 50 * (1 + avgViralScore); // Base $50 per video with viral multiplier
    
    return {
      totalVideos,
      publishedVideos,
      avgViralScore,
      projectedMonthlyEarnings: projectedEarnings,
      projectedAnnualEarnings: projectedEarnings * 12,
    };
  }

  // Payout operations
  async createPayout(payout: InsertPayout): Promise<Payout> {
    const [newPayout] = await db.insert(payouts).values(payout).returning();
    return newPayout;
  }

  async getPayoutsByUser(userId: string): Promise<Payout[]> {
    return await db.select().from(payouts).where(eq(payouts.userId, userId)).orderBy(desc(payouts.createdAt));
  }

  async getAllPayouts(): Promise<Payout[]> {
    return await db.select().from(payouts).orderBy(desc(payouts.createdAt));
  }

  async updatePayout(id: number, updates: Partial<Payout>): Promise<Payout> {
    const [payout] = await db
      .update(payouts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payouts.id, id))
      .returning();
    return payout;
  }

  // Platform settings
  async getPlatformSetting(key: string): Promise<PlatformSettings | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting;
  }

  async upsertPlatformSetting(setting: InsertPlatformSettings): Promise<PlatformSettings> {
    const [newSetting] = await db
      .insert(platformSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          ...setting,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newSetting;
  }

  async getAllPlatformSettings(): Promise<PlatformSettings[]> {
    return await db.select().from(platformSettings);
  }

  // Analytics
  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalVideos: number;
    totalRevenue: string;
    pendingVideos: number;
    processingVideos: number;
    pendingPayouts: string;
  }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [videoCount] = await db.select({ count: count() }).from(videos);
    const [revenueSum] = await db.select({ total: sum(users.totalEarnings) }).from(users);
    const [pendingVideos] = await db.select({ count: count() }).from(videos).where(eq(videos.status, 'pending'));
    const [processingVideos] = await db.select({ count: count() }).from(videos).where(eq(videos.status, 'processing'));
    const [pendingPayouts] = await db.select({ total: sum(payouts.amount) }).from(payouts).where(eq(payouts.status, 'pending'));

    return {
      totalUsers: userCount.count,
      totalVideos: videoCount.count,
      totalRevenue: revenueSum.total || '0.00',
      pendingVideos: pendingVideos.count,
      processingVideos: processingVideos.count,
      pendingPayouts: pendingPayouts.total || '0.00',
    };
  }

  // Revenue tracking operations
  async createVideoView(view: InsertVideoView): Promise<VideoView> {
    const [createdView] = await db.insert(videoViews).values(view).returning();
    return createdView;
  }

  async getVideoViewsByVideo(videoId: number): Promise<VideoView[]> {
    return await db.select().from(videoViews).where(eq(videoViews.videoId, videoId));
  }

  async getVideoViewsByUser(userId: string): Promise<VideoView[]> {
    return await db.select().from(videoViews).where(eq(videoViews.userId, userId));
  }

  async createRevenueTransaction(transaction: InsertRevenueTransaction): Promise<RevenueTransaction> {
    const [createdTransaction] = await db.insert(revenueTransactions).values(transaction).returning();
    return createdTransaction;
  }

  async getRevenueTransactionsByUser(userId: string): Promise<RevenueTransaction[]> {
    return await db.select().from(revenueTransactions).where(eq(revenueTransactions.userId, userId)).orderBy(desc(revenueTransactions.createdAt));
  }

  async getRevenueTransactionsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<RevenueTransaction[]> {
    return await db.select().from(revenueTransactions)
      .where(
        and(
          eq(revenueTransactions.userId, userId),
          gte(revenueTransactions.createdAt, startDate),
          lte(revenueTransactions.createdAt, endDate)
        )
      )
      .orderBy(desc(revenueTransactions.createdAt));
  }

  // Subscription operations
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [createdSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return createdSubscription;
  }

  async getSubscriptionByUser(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async updateSubscription(id: number, updates: Partial<Subscription>): Promise<Subscription> {
    const [updatedSubscription] = await db.update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updatedSubscription;
  }

  // Enhanced payout operations
  async getPayoutsByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<Payout[]> {
    return await db.select().from(payouts)
      .where(
        and(
          eq(payouts.userId, userId),
          gte(payouts.createdAt, startDate),
          lte(payouts.createdAt, endDate)
        )
      )
      .orderBy(desc(payouts.createdAt));
  }

  async getPayoutByStripeTransferId(stripeTransferId: string): Promise<Payout | undefined> {
    const [payout] = await db.select().from(payouts).where(eq(payouts.stripeTransferId, stripeTransferId));
    return payout;
  }

  // Tax compliance operations
  async createTaxDocument(document: InsertTaxDocument): Promise<TaxDocument> {
    const [createdDocument] = await db.insert(taxDocuments).values(document).returning();
    return createdDocument;
  }

  async getTaxDocumentsByUser(userId: string): Promise<TaxDocument[]> {
    return await db.select().from(taxDocuments).where(eq(taxDocuments.userId, userId)).orderBy(desc(taxDocuments.taxYear));
  }

  async getTaxDocumentsByYear(taxYear: number): Promise<TaxDocument[]> {
    return await db.select().from(taxDocuments).where(eq(taxDocuments.taxYear, taxYear));
  }

  async updateTaxDocument(id: number, updates: Partial<TaxDocument>): Promise<TaxDocument> {
    const [updatedDocument] = await db.update(taxDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taxDocuments.id, id))
      .returning();
    return updatedDocument;
  }

  // User operations extensions
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Additional payout operations
  async getPayout(id: number): Promise<Payout | undefined> {
    const [payout] = await db.select().from(payouts).where(eq(payouts.id, id));
    return payout;
  }

  // Publishing operations
  async createPublication(publication: InsertPublication): Promise<Publication> {
    const [newPublication] = await db.insert(publications).values(publication).returning();
    return newPublication;
  }

  async getPublicationsByVideo(videoId: number): Promise<Publication[]> {
    return await db.select().from(publications).where(eq(publications.videoId, videoId)).orderBy(desc(publications.createdAt));
  }

  async getPublicationsByPlatform(platform: string): Promise<Publication[]> {
    return await db.select().from(publications).where(eq(publications.platform, platform)).orderBy(desc(publications.createdAt));
  }

  async getPublicationsByPlatformVideoId(platformVideoId: string, platform: string): Promise<Publication[]> {
    return await db.select().from(publications).where(
      and(eq(publications.platformVideoId, platformVideoId), eq(publications.platform, platform))
    );
  }

  async updatePublication(id: number, updates: Partial<Publication>): Promise<Publication> {
    const [publication] = await db
      .update(publications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(publications.id, id))
      .returning();
    return publication;
  }

  async deletePublication(id: number): Promise<void> {
    await db.delete(publications).where(eq(publications.id, id));
  }

  // Publishing queue operations
  async addToPublishingQueue(queueItem: InsertPublishingQueue): Promise<PublishingQueue> {
    const [newQueueItem] = await db.insert(publishingQueue).values(queueItem).returning();
    return newQueueItem;
  }

  async getPublishingQueueByStatus(status: string): Promise<PublishingQueue[]> {
    return await db.select().from(publishingQueue).where(eq(publishingQueue.status, status)).orderBy(publishingQueue.priority, publishingQueue.createdAt);
  }

  async getNextQueueItem(): Promise<PublishingQueue | undefined> {
    const [queueItem] = await db
      .select()
      .from(publishingQueue)
      .where(eq(publishingQueue.status, 'pending'))
      .orderBy(publishingQueue.priority, publishingQueue.createdAt)
      .limit(1);
    return queueItem;
  }

  async updateQueueItem(id: number, updates: Partial<PublishingQueue>): Promise<PublishingQueue> {
    const [queueItem] = await db
      .update(publishingQueue)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(publishingQueue.id, id))
      .returning();
    return queueItem;
  }

  async deleteQueueItem(id: number): Promise<void> {
    await db.delete(publishingQueue).where(eq(publishingQueue.id, id));
  }

  // Analytics operations
  async createPlatformAnalytics(analytics: InsertPlatformAnalytics): Promise<PlatformAnalytics> {
    const [newAnalytics] = await db.insert(platformAnalytics).values(analytics).returning();
    return newAnalytics;
  }

  async getPlatformAnalyticsByPublication(publicationId: number): Promise<PlatformAnalytics[]> {
    return await db.select().from(platformAnalytics).where(eq(platformAnalytics.publicationId, publicationId)).orderBy(desc(platformAnalytics.fetchedAt));
  }

  async getLatestAnalytics(platform: string, days: number): Promise<PlatformAnalytics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select()
      .from(platformAnalytics)
      .where(
        and(
          eq(platformAnalytics.platform, platform),
          gte(platformAnalytics.fetchedAt, cutoffDate)
        )
      )
      .orderBy(desc(platformAnalytics.fetchedAt));
  }

  // Performance tracking
  async upsertPlatformPerformance(performance: InsertPlatformPerformance): Promise<PlatformPerformance> {
    const [newPerformance] = await db
      .insert(platformPerformance)
      .values(performance)
      .onConflictDoUpdate({
        target: [platformPerformance.platform, platformPerformance.dayOfWeek, platformPerformance.hourOfDay],
        set: {
          ...performance,
          lastCalculated: new Date(),
        },
      })
      .returning();
    return newPerformance;
  }

  async getBestPerformanceTimes(platform: string): Promise<PlatformPerformance[]> {
    return await db
      .select()
      .from(platformPerformance)
      .where(eq(platformPerformance.platform, platform))
      .orderBy(desc(platformPerformance.avgEngagement), desc(platformPerformance.avgViews))
      .limit(10);
  }

  // Get platform statistics
  async getPlatformStats(): Promise<any> {
    const totalVideos = await db.select().from(videos);
    const allUsers = await db.select().from(users);
    const activeCreators = allUsers.filter(user => user.role === 'user' && user.videosPublished > 0);
    
    const totalViews = totalVideos.reduce((sum, video) => sum + (video.views || 0), 0);
    
    return {
      totalVideos: totalVideos.length,
      activeCreators: activeCreators.length,
      totalViews: totalViews > 1000000 ? `${(totalViews / 1000000).toFixed(1)}M` : `${(totalViews / 1000).toFixed(1)}K`,
      totalEarnings: totalVideos.reduce((sum, video) => sum + parseFloat(video.earnings || '0'), 0).toFixed(2)
    };
  }

  // Get trending videos
  async getTrendingVideos(timeframe: string = 'week'): Promise<any[]> {
    const allVideos = await db.select().from(videos);
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeframe) {
      case 'day':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return allVideos
      .filter(video => new Date(video.createdAt) >= cutoffDate)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(video => ({
        ...video,
        trendingScore: Math.floor(Math.random() * 20) + 80, // 80-100% trending score
        creatorName: video.creatorName || 'Unknown Creator'
      }));
  }

  // Get active competitions
  async getActiveCompetitions(): Promise<any[]> {
    // For now, return mock data until competitions are implemented
    return [
      {
        id: 1,
        title: "Winter UTV Championship",
        description: "Show off your winter riding skills in challenging snowy conditions",
        prizePool: 10000,
        participants: 234,
        endDate: new Date('2025-01-31'),
        status: 'active'
      },
      {
        id: 2,
        title: "Best Jump Competition",
        description: "Submit your most impressive UTV jump footage",
        prizePool: 5000,
        participants: 156,
        endDate: new Date('2025-02-15'),
        status: 'active'
      }
    ];
  }

  // Get leaderboard
  async getLeaderboard(timeframe: string = 'week'): Promise<any[]> {
    const allUsers = await db.select().from(users);
    const allVideos = await db.select().from(videos);
    
    const leaderboard = allUsers
      .filter(user => user.role === 'user')
      .map(user => {
        const userVideos = allVideos.filter(video => video.userId === user.id);
        const totalViews = userVideos.reduce((sum, video) => sum + (video.views || 0), 0);
        const totalEarnings = userVideos.reduce((sum, video) => sum + parseFloat(video.earnings || '0'), 0);
        
        return {
          id: user.id,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'Unknown',
          location: user.location || 'Unknown Location',
          points: Math.floor(totalViews * 0.1 + totalEarnings * 10),
          videos: userVideos.length,
          totalViews,
          totalEarnings
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
    
    return leaderboard;
  }

  // Get recent videos
  async getRecentVideos(): Promise<any[]> {
    const allVideos = await db.select().from(videos);
    return allVideos
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
      .map(video => ({
        ...video,
        creatorName: video.creatorName || 'Unknown Creator',
        uploadedAt: this.formatTimeAgo(new Date(video.createdAt))
      }));
  }

  // Helper method to format time ago
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  // Get AI processed videos for admin review
  async getAIProcessedVideos(): Promise<any[]> {
    const allVideos = await db.select().from(videos);
    const allUsers = await db.select().from(users);
    
    const aiProcessedVideos = allVideos
      .filter(video => video.aiProcessingStatus === 'completed' || video.aiHighlights)
      .map(video => {
        const user = allUsers.find(u => u.id === video.userId);
        return {
          ...video,
          user: user ? {
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || ''
          } : {
            id: video.userId,
            firstName: 'Unknown',
            lastName: 'User',
            email: 'unknown@example.com'
          }
        };
      });
    
    return aiProcessedVideos;
  }

  // Delete video method
  async deleteVideo(videoId: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, videoId));
  }
}

export const storage = new DatabaseStorage();
