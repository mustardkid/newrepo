import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // 'user', 'admin', 'moderator'
  isActive: boolean("is_active").notNull().default(true),
  totalViews: integer("total_views").notNull().default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  pendingEarnings: decimal("pending_earnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  videosPublished: integer("videos_published").notNull().default(0),
  videosProcessing: integer("videos_processing").notNull().default(0),
  
  // Stripe revenue sharing fields
  stripeAccountId: varchar("stripe_account_id"), // Stripe Connect account for payouts
  stripeCustomerId: varchar("stripe_customer_id"), // For premium subscriptions
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // 'active', 'canceled', 'past_due', 'unpaid'
  subscriptionTier: varchar("subscription_tier").default("free"), // 'free', 'premium', 'pro'
  
  // Payout preferences
  payoutThreshold: decimal("payout_threshold", { precision: 10, scale: 2 }).notNull().default("50.00"),
  payoutFrequency: varchar("payout_frequency").notNull().default("monthly"), // 'weekly', 'monthly', 'quarterly'
  
  // Tax compliance
  taxId: varchar("tax_id"), // SSN/EIN for tax reporting
  taxAddress: text("tax_address"), // JSON string for tax address
  taxDocumentStatus: varchar("tax_document_status").default("pending"), // 'pending', 'submitted', 'approved', 'rejected'
  
  // Firebase Authentication
  firebaseUid: varchar("firebase_uid").unique(), // Firebase UID for authentication
  
  // Google OAuth
  googleId: varchar("google_id").unique(), // Google OAuth ID
  
  // Creator Profile Enhancement
  biography: text("biography"),
  equipment: text("equipment"), // JSON string of equipment details
  ridingStyle: varchar("riding_style"), // 'trail', 'rock_crawling', 'mud_bogging', 'racing', 'scenic', 'freestyle'
  experienceLevel: varchar("experience_level"), // 'beginner', 'intermediate', 'advanced', 'expert', 'professional'
  location: varchar("location"), // General location for content context
  socialLinks: text("social_links"), // JSON string of social media links
  
  // Notification preferences
  notificationPreferences: text("notification_preferences"), // JSON string of notification settings
  lastNotificationRead: timestamp("last_notification_read"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  tags: text("tags").array(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'approved', 'rejected', 'published'
  fileName: varchar("file_name"),
  fileSize: integer("file_size"),
  duration: integer("duration"), // in seconds
  thumbnailUrl: varchar("thumbnail_url"),
  views: integer("views").notNull().default(0),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  aiEnhanced: boolean("ai_enhanced").notNull().default(false),
  autoThumbnail: boolean("auto_thumbnail").notNull().default(false),
  // Cloudflare Stream fields
  cfStreamId: varchar("cf_stream_id").unique(),
  cfUploadUrl: varchar("cf_upload_url"),
  cfReadyToStream: boolean("cf_ready_to_stream").default(false),
  cfProcessingStatus: varchar("cf_processing_status"), // uploading, processing, ready, error
  cfErrorMessage: text("cf_error_message"),
  
  // AI Enhancement fields
  aiProcessingStatus: varchar("ai_processing_status"), // pending, processing, completed, failed
  aiGeneratedTitle: varchar("ai_generated_title"),
  aiGeneratedDescription: text("ai_generated_description"),
  aiGeneratedTags: text("ai_generated_tags").array(),
  aiHighlights: text("ai_highlights"), // JSON string of highlight timestamps
  aiSceneDetection: text("ai_scene_detection"), // JSON string of scene transitions
  aiContentAnalysis: text("ai_content_analysis"), // JSON string of content analysis
  aiEditingSuggestions: text("ai_editing_suggestions"), // JSON string of editing recommendations
  aiVisualAnalysis: text("ai_visual_analysis"), // JSON string of visual analysis results
  aiVisualProcessingCompleted: timestamp("ai_visual_processing_completed"),
  aiEnhancedVideoUrl: varchar("ai_enhanced_video_url"),
  aiProcessingStarted: timestamp("ai_processing_started"),
  aiProcessingCompleted: timestamp("ai_processing_completed"),
  aiProcessingError: text("ai_processing_error"),
  // Enhanced AI fields for comprehensive processing
  aiYoutubeMetadata: text("ai_youtube_metadata"), // JSON string of YouTube optimization data
  aiTiktokMetadata: text("ai_tiktok_metadata"), // JSON string of TikTok optimization data
  aiThumbnailRecommendations: text("ai_thumbnail_recommendations"), // JSON string of thumbnail suggestions
  aiCompiledHighlights: text("ai_compiled_highlights"), // JSON string of compiled highlight compilations
  aiMotionAnalysis: text("ai_motion_analysis"), // JSON string of motion detection results
  aiFrameExtractionCompleted: timestamp("ai_frame_extraction_completed"),
  aiViralPotentialScore: decimal("ai_viral_potential_score", { precision: 3, scale: 2 }), // 0.00-1.00
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  method: varchar("method").notNull().default("stripe"), // 'stripe', 'paypal', 'bank_transfer'
  stripeTransferId: varchar("stripe_transfer_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  failureReason: text("failure_reason"),
  scheduledDate: timestamp("scheduled_date"),
  processedDate: timestamp("processed_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video views tracking for revenue calculation
export const videoViews = pgTable("video_views", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  userId: varchar("user_id").references(() => users.id), // null for anonymous views
  viewerIp: varchar("viewer_ip"),
  viewDuration: integer("view_duration"), // seconds watched
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }), // percentage watched
  revenue: decimal("revenue", { precision: 10, scale: 4 }).notNull().default("0.0000"), // revenue per view
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeSubscriptionId: varchar("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  stripePriceId: varchar("stripe_price_id").notNull(),
  tier: varchar("tier").notNull(), // 'premium', 'pro'
  status: varchar("status").notNull(), // 'active', 'canceled', 'past_due', 'unpaid'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Revenue transactions for detailed tracking
export const revenueTransactions = pgTable("revenue_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  videoId: integer("video_id").references(() => videos.id),
  type: varchar("type").notNull(), // 'view', 'subscription', 'tip', 'premium_view'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformShare: decimal("platform_share", { precision: 10, scale: 2 }).notNull(),
  creatorShare: decimal("creator_share", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax documents for compliance
export const taxDocuments = pgTable("tax_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taxYear: integer("tax_year").notNull(),
  documentType: varchar("document_type").notNull(), // '1099-NEC', 'W-9', 'W-8BEN'
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).notNull(),
  taxWithheld: decimal("tax_withheld", { precision: 10, scale: 2 }).default("0.00"),
  documentUrl: varchar("document_url"),
  sentDate: timestamp("sent_date"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'generated', 'sent'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'clip_selected', 'video_published', 'earnings_milestone', 'payout_processed', 'system_update'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string for additional notification data
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  payouts: many(payouts),
  subscriptions: many(subscriptions),
  revenueTransactions: many(revenueTransactions),
  taxDocuments: many(taxDocuments),
  notifications: many(notifications),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  views: many(videoViews),
  revenueTransactions: many(revenueTransactions),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  user: one(users, {
    fields: [payouts.userId],
    references: [users.id],
  }),
}));

export const videoViewsRelations = relations(videoViews, ({ one }) => ({
  video: one(videos, {
    fields: [videoViews.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [videoViews.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const revenueTransactionsRelations = relations(revenueTransactions, ({ one }) => ({
  user: one(users, {
    fields: [revenueTransactions.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [revenueTransactions.videoId],
    references: [videos.id],
  }),
}));

export const taxDocumentsRelations = relations(taxDocuments, ({ one }) => ({
  user: one(users, {
    fields: [taxDocuments.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  userId: true, // Server sets this based on authenticated user
  createdAt: true,
  updatedAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertVideoViewSchema = createInsertSchema(videoViews).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevenueTransactionSchema = createInsertSchema(revenueTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertTaxDocumentSchema = createInsertSchema(taxDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertVideoView = z.infer<typeof insertVideoViewSchema>;
export type VideoView = typeof videoViews.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertRevenueTransaction = z.infer<typeof insertRevenueTransactionSchema>;
export type RevenueTransaction = typeof revenueTransactions.$inferSelect;
export type InsertTaxDocument = z.infer<typeof insertTaxDocumentSchema>;
export type TaxDocument = typeof taxDocuments.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Publications table - tracks video publishing across platforms
export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id).notNull(),
  platform: varchar("platform").notNull(), // 'youtube', 'tiktok', 'facebook', 'twitter'
  platformVideoId: varchar("platform_video_id"), // Platform-specific video ID
  publishedAt: timestamp("published_at"),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url"), // Platform-specific URL
  status: varchar("status").notNull().default("pending"), // 'pending', 'published', 'failed', 'deleted'
  error: text("error"), // Error message if publishing failed
  metadata: text("metadata"), // JSON string for platform-specific data
  scheduledFor: timestamp("scheduled_for"), // When to publish (for scheduling)
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Publishing queue for managing uploads and retries
export const publishingQueue = pgTable("publishing_queue", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id).notNull(),
  platform: varchar("platform").notNull(),
  priority: integer("priority").notNull().default(1), // 1 = highest, 5 = lowest
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  scheduledAt: timestamp("scheduled_at"),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  metadata: text("metadata"), // JSON string for upload options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform analytics tracking
export const platformAnalytics = pgTable("platform_analytics", {
  id: serial("id").primaryKey(),
  publicationId: integer("publication_id").references(() => publications.id).notNull(),
  platform: varchar("platform").notNull(),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  revenue: decimal("revenue", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  engagement: decimal("engagement", { precision: 5, scale: 4 }).notNull().default("0.0000"), // CTR or engagement rate
  watchTime: integer("watch_time").notNull().default(0), // in minutes
  fetchedAt: timestamp("fetched_at").notNull(),
  metadata: text("metadata"), // JSON string for platform-specific analytics
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform performance tracking for optimal scheduling
export const platformPerformance = pgTable("platform_performance", {
  id: serial("id").primaryKey(),
  platform: varchar("platform").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  hourOfDay: integer("hour_of_day").notNull(), // 0-23 UTC
  avgViews: decimal("avg_views", { precision: 10, scale: 2 }).notNull().default("0.00"),
  avgEngagement: decimal("avg_engagement", { precision: 5, scale: 4 }).notNull().default("0.0000"),
  videoCount: integer("video_count").notNull().default(0),
  lastCalculated: timestamp("last_calculated").defaultNow(),
});

// Add relations for new tables
export const publicationsRelations = relations(publications, ({ one, many }) => ({
  video: one(videos, {
    fields: [publications.videoId],
    references: [videos.id],
  }),
  analytics: many(platformAnalytics),
}));

export const publishingQueueRelations = relations(publishingQueue, ({ one }) => ({
  video: one(videos, {
    fields: [publishingQueue.videoId],
    references: [videos.id],
  }),
}));

export const platformAnalyticsRelations = relations(platformAnalytics, ({ one }) => ({
  publication: one(publications, {
    fields: [platformAnalytics.publicationId],
    references: [publications.id],
  }),
}));

// Insert schemas for new tables
export const insertPublicationSchema = createInsertSchema(publications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPublishingQueueSchema = createInsertSchema(publishingQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformAnalyticsSchema = createInsertSchema(platformAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformPerformanceSchema = createInsertSchema(platformPerformance).omit({
  id: true,
  lastCalculated: true,
});

// Types for new tables
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type Publication = typeof publications.$inferSelect;

export type InsertPublishingQueue = z.infer<typeof insertPublishingQueueSchema>;
export type PublishingQueue = typeof publishingQueue.$inferSelect;

export type InsertPlatformAnalytics = z.infer<typeof insertPlatformAnalyticsSchema>;
export type PlatformAnalytics = typeof platformAnalytics.$inferSelect;

export type InsertPlatformPerformance = z.infer<typeof insertPlatformPerformanceSchema>;
export type PlatformPerformance = typeof platformPerformance.$inferSelect;
