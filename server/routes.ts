import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Firebase auth removed - using Google OAuth + simple tokens only
import { requireAuth, requireAdmin } from "./authMiddleware";
import { setupGoogleAuth } from "./googleAuth";
import passport from "passport";
import { insertVideoSchema, insertPayoutSchema, insertPlatformSettingsSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { aiVideoProcessor } from "./aiVideoProcessor";
import { emailService } from "./emailService";
import { stripeRevenueService } from "./stripeRevenueService";
import { cloudflareStreamService } from "./cloudflareStream";
import { publishingQueueProcessor } from "./publishingQueueProcessor";
import { socialMediaScheduler } from "./socialMediaScheduler";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Admin middleware is now imported from authMiddleware

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Google OAuth
  setupGoogleAuth(app);
  
  // Google OAuth routes
  app.get('/auth/google', (req, res, next) => {
    console.log('Starting Google OAuth flow');
    console.log('Client ID available:', process.env.GOOGLE_CLIENT_ID ? 'Yes' : 'No');
    console.log('Client Secret available:', process.env.GOOGLE_CLIENT_SECRET ? 'Yes' : 'No');
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials not configured');
      return res.status(500).send('Google OAuth not configured');
    }
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      failureRedirect: '/?error=oauth_init_failed'
    })(req, res, next);
  });
  
  app.get('/auth/google/callback', 
    (req, res, next) => {
      console.log('Google OAuth callback received');
      console.log('Query params:', req.query);
      
      if (req.query.error) {
        console.error('Google OAuth error:', req.query.error);
        return res.redirect(`/?error=${req.query.error}`);
      }
      
      next();
    },
    passport.authenticate('google', { 
      failureRedirect: '/?error=auth_failed',
      failureFlash: false 
    }),
    (req, res) => {
      // Successful authentication, redirect to home
      console.log('Google OAuth callback successful');
      console.log('User:', req.user);
      
      // For iframe/new tab scenarios, send a message to parent window
      res.send(`
        <html>
          <script>
            // Try to communicate with parent window (for iframe scenarios)
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth_success' }, '*');
                window.close();
              } else {
                // Direct redirect for normal flow
                window.location.href = '/';
              }
            } catch (e) {
              console.log('Unable to communicate with parent, redirecting directly');
              window.location.href = '/';
            }
          </script>
          <body>
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
              <h2>Authentication Successful!</h2>
              <p>Redirecting you back to RideReels...</p>
              <p>If you're not redirected automatically, <a href="/">click here</a>.</p>
            </div>
          </body>
        </html>
      `);
    }
  );

  // Logout endpoint
  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid');
        // Redirect to home page instead of JSON response
        res.redirect('/');
      });
    });
  });
  
  // Health check endpoint - moved to server/index.ts for correct routing

  // Simple email signup route (temporary workaround)
  app.post('/api/auth/simple-signup', async (req, res) => {
    try {
      const { email, displayName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Create or get user with email
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user with email as ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        user = await storage.upsertUser({
          id: userId,
          email: email,
          firstName: displayName || email.split('@')[0],
          lastName: '',
          profileImageUrl: null,
          role: 'user'
        });
      }
      
      // Set role to admin if it's the specific email
      if (email === 'mustardkid@gmail.com') {
        await storage.updateUser(user.id, { role: 'admin' });
        user.role = 'admin';
      }
      
      res.json({
        ...user,
        token: user.id // Return user ID as token for simple auth
      });
    } catch (error) {
      console.error("Error creating simple user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Google OAuth token exchange route
  app.post('/api/auth/google/token', async (req, res) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: 'No credential provided' });
      }
      
      // For now, redirect to passport OAuth flow
      return res.json({ 
        message: 'Use /auth/google endpoint for OAuth flow',
        redirectUrl: '/auth/google'
      });
    } catch (error) {
      console.error('Google token exchange error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Firebase Auth sync route
  app.post('/api/auth/sync', async (req, res) => {
    try {
      const { firebaseUid, email, displayName, photoURL } = req.body;
      
      // Sync user with our database
      const user = await storage.upsertUser({
        id: firebaseUid,
        email: email,
        firstName: displayName?.split(' ')[0] || 'User',
        lastName: displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: photoURL,
        firebaseUid: firebaseUid,
        role: 'user'
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

  // Google OAuth credential verification route
  app.post('/api/auth/google/token', async (req, res) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: 'No credential provided' });
      }

      // Verify Google credential token
      const decoded = jwt.decode(credential, { complete: true });
      
      if (!decoded || !decoded.payload) {
        return res.status(400).json({ message: 'Invalid credential token' });
      }

      const { email, name, picture, sub: googleId } = decoded.payload;
      
      if (!email) {
        return res.status(400).json({ message: 'Email not provided by Google' });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // Update existing user with Google info
        user = await storage.updateUser(user.id, {
          googleId: googleId,
          profileImageUrl: picture || user.profileImageUrl,
          updatedAt: new Date()
        });
      } else {
        // Create new user
        const userId = `google_${googleId}`;
        user = await storage.upsertUser({
          id: userId,
          email: email,
          firstName: name?.split(' ')[0] || 'User',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: picture,
          googleId: googleId,
          role: 'user'
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error verifying Google credential:", error);
      res.status(500).json({ message: "Failed to verify Google credential" });
    }
  });

  // Hybrid auth middleware - supports Google OAuth, Firebase, and simple tokens
  const verifyToken = async (req: any, res: any, next: any) => {
    // Try Google OAuth session first (if passport is configured)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log('Authenticated via Google OAuth session');
      return next();
    }
    
    // Try session-based auth (check for session user)
    if (req.session && req.session.user) {
      console.log('Authenticated via session');
      req.user = req.session.user;
      return next();
    }
    
    // Try simple user token
    const userToken = req.headers['x-user-token'] as string;
    if (userToken) {
      try {
        const user = await storage.getUser(userToken);
        if (user) {
          console.log('Authenticated via x-user-token');
          req.user = user;
          return next();
        }
      } catch (error) {
        console.error('Simple token verification failed:', error);
      }
    }
    
    const firebaseToken = req.headers['authorization']?.replace('Bearer ', '');
    
    // Try Firebase token
    if (firebaseToken) {
      console.log('Trying Firebase token verification');
      return requireAuth(req, res, next);
    }
    
    return res.status(401).json({ message: "No valid token provided" });
  };

  // Simple login page endpoint
  app.get('/api/login', (req: any, res) => {
    res.send(`
      <html>
        <head>
          <title>RideReels - Login</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .login-container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
              width: 100%;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              margin-bottom: 30px;
            }
            .auth-button {
              display: inline-block;
              background: #4285f4;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 5px;
              text-decoration: none;
              margin: 10px;
              font-size: 16px;
              cursor: pointer;
              transition: background 0.3s;
            }
            .auth-button:hover {
              background: #357ae8;
            }
            .simple-auth {
              background: #34a853;
            }
            .simple-auth:hover {
              background: #2e7d32;
            }
          </style>
        </head>
        <body>
          <div class="login-container">
            <div class="logo">🏔️ RideReels</div>
            <h2>Welcome Back!</h2>
            <p>Choose your preferred login method:</p>
            
            <a href="/auth/google" class="auth-button">
              🔐 Login with Google
            </a>
            
            <br>
            
            <a href="/?auth=simple" class="auth-button simple-auth">
              📧 Login with Email
            </a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              New to RideReels? <a href="/" style="color: #667eea;">Get started here</a>
            </p>
          </div>
        </body>
      </html>
    `);
  });

  // Auth routes - support Google OAuth, Firebase, and simple auth
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Try Google OAuth session first
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        return res.json(req.user);
      }
      
      // Try simple token
      const simpleToken = req.headers['x-user-token'] || req.headers['authorization']?.replace('Bearer ', '');
      if (simpleToken) {
        const user = await storage.getUser(simpleToken);
        if (user) {
          return res.json(user);
        }
      }
      
      // Fallback to Firebase token
      return requireAuth(req, res, () => {
        res.json(req.user);
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route for hybrid authentication
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      // Clear any server-side session data if needed
      if (req.session) {
        req.session.destroy(() => {
          // For simple auth, just return success - client will clear localStorage
          // For Firebase auth, the client will handle Firebase signOut
          res.json({ message: "Logged out successfully" });
        });
      } else {
        // No session to clear, just return success
        res.json({ message: "Logged out successfully" });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // User routes
  app.get('/api/users/profile', verifyToken, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Cloudflare Stream upload routes
  app.post('/api/videos/upload-url', verifyToken, async (req: any, res) => {
    try {
      const { fileName, maxDurationSeconds = 7200, title, description, category } = req.body;
      const userId = req.user.id;
      
      // Create upload URL with Cloudflare Stream (increased limits)
      const uploadResponse = await cloudflareStreamService.createUploadUrl(fileName, maxDurationSeconds);
      
      if (!uploadResponse.success) {
        return res.status(500).json({ message: 'Failed to create upload URL', errors: uploadResponse.errors });
      }
      
      // Create video record in database with user-provided metadata
      const videoData = insertVideoSchema.parse({
        userId,
        title: title || fileName || 'Untitled Video',
        description: description || '',
        category: category || 'utv',
        status: 'uploading',
        fileName,
        cfStreamId: uploadResponse.result.uid,
        cfUploadUrl: uploadResponse.result.uploadURL,
        cfProcessingStatus: 'uploading',
        cfReadyToStream: false,
      });
      
      const video = await storage.createVideo(videoData);
      
      // Update user processing count
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUserStats(userId, {
          videosProcessing: user.videosProcessing + 1,
        });
      }
      
      res.json({
        video,
        uploadUrl: uploadResponse.result.uploadURL,
        streamId: uploadResponse.result.uid
      });
    } catch (error) {
      console.error('Error creating upload URL:', error);
      res.status(500).json({ message: 'Failed to create upload URL' });
    }
  });

  // Video routes
  app.post('/api/videos', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videoData = insertVideoSchema.parse({
        ...req.body,
        userId,
      });
      
      const video = await storage.createVideo(videoData);
      
      // Update user processing count
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUserStats(userId, {
          videosProcessing: user.videosProcessing + 1,
        });
      }
      
      res.json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  // Cloudflare Stream webhook handler
  app.post('/api/videos/webhook/cloudflare', async (req, res) => {
    try {
      const payload = req.body;
      
      // Process webhook payload
      await cloudflareStreamService.processWebhook(payload);
      
      // Update video status in database
      if (payload.uid) {
        const video = await storage.getVideoByStreamId(payload.uid);
        if (video) {
          const updates: any = {
            cfProcessingStatus: payload.status?.state || 'unknown',
            cfReadyToStream: payload.status?.state === 'ready',
          };
          
          if (payload.status?.state === 'ready') {
            updates.status = 'processing'; // Ready for AI processing
            updates.duration = payload.duration || 0;
            updates.thumbnailUrl = cloudflareStreamService.getThumbnailUrl(payload.uid);
          } else if (payload.status?.state === 'error') {
            updates.status = 'failed';
            updates.cfErrorMessage = payload.status?.errorReasonText || 'Unknown error';
          }
          
          await storage.updateVideo(video.id, updates);
          
          // Send notification email
          const user = await storage.getUser(video.userId);
          if (user) {
            if (payload.status?.state === 'ready') {
              await emailService.notifyVideoProcessingStarted(user, video);
            }
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error processing Cloudflare webhook:', error);
      res.status(500).json({ message: 'Failed to process webhook' });
    }
  });

  // Get video status
  // Get video stream URL
  app.get('/api/videos/:id/stream', verifyToken, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Check if user owns this video or is admin
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (video.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      if (!video.cfStreamId) {
        return res.status(400).json({ message: 'Video has no stream ID' });
      }
      
      // Generate stream URLs
      const streamUrl = cloudflareStreamService.getStreamUrl(video.cfStreamId);
      const thumbnailUrl = cloudflareStreamService.getThumbnailUrl(video.cfStreamId);
      const iframeUrl = cloudflareStreamService.getIframeUrl(video.cfStreamId);
      
      res.json({
        streamUrl,
        thumbnailUrl,
        iframe: iframeUrl,
        streamId: video.cfStreamId,
        readyToStream: video.cfReadyToStream,
        processingStatus: video.cfProcessingStatus
      });
    } catch (error) {
      console.error('Error fetching video stream:', error);
      res.status(500).json({ message: 'Failed to fetch video stream' });
    }
  });

  app.get('/api/videos/:id/status', verifyToken, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Check if user owns this video or is admin
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (video.userId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Get latest status from Cloudflare if available
      if (video.cfStreamId && !video.cfReadyToStream) {
        try {
          const streamDetails = await cloudflareStreamService.getVideoDetails(video.cfStreamId);
          if (streamDetails.success) {
            const isReady = streamDetails.result.readyToStream;
            const processingStatus = streamDetails.result.status.state;
            
            // Update local database with latest status
            const updateData: any = {
              cfProcessingStatus: processingStatus,
              cfReadyToStream: isReady,
            };
            
            if (streamDetails.result.duration) {
              updateData.duration = Math.round(streamDetails.result.duration);
            }
            
            if (streamDetails.result.thumbnail) {
              updateData.thumbnailUrl = streamDetails.result.thumbnail;
            }
            
            // Update video status based on processing completion
            if (isReady) {
              updateData.status = 'ready'; // Ready for editing/publishing
            } else if (processingStatus === 'error') {
              updateData.status = 'rejected';
              updateData.cfErrorMessage = streamDetails.result.status.errorReasonText;
            } else {
              updateData.status = 'processing';
            }
            
            await storage.updateVideo(videoId, updateData);
            
            // If video just became ready, trigger AI enhancement
            if (isReady && !video.cfReadyToStream) {
              console.log(`Video ${videoId} is now ready, triggering AI enhancement...`);
              
              // Trigger AI enhancement in background
              setImmediate(async () => {
                try {
                  const aiVideoProcessor = await import('./aiVideoProcessor');
                  const aiResults = await aiVideoProcessor.aiVideoProcessor.analyzeVideo({
                    id: videoId,
                    title: video.title,
                    description: video.description,
                    duration: updateData.duration || 0,
                    fileName: video.fileName,
                    cfStreamId: video.cfStreamId,
                  });
                  
                  await storage.updateVideo(videoId, {
                    aiProcessingStatus: 'completed',
                    aiGeneratedTitle: aiResults.generatedTitle,
                    aiGeneratedDescription: aiResults.generatedDescription,
                    aiGeneratedTags: aiResults.generatedTags,
                    aiHighlights: JSON.stringify(aiResults.highlights),
                    aiContentAnalysis: JSON.stringify(aiResults.contentAnalysis),
                    aiYoutubeMetadata: JSON.stringify(aiResults.youtubeMetadata),
                    aiTiktokMetadata: JSON.stringify(aiResults.tiktokMetadata),
                    aiProcessingCompleted: new Date(),
                  });
                  
                  console.log(`AI enhancement completed for video ${videoId}`);
                } catch (aiError) {
                  console.error(`AI enhancement failed for video ${videoId}:`, aiError);
                  await storage.updateVideo(videoId, {
                    aiProcessingStatus: 'failed',
                    aiProcessingError: aiError.message,
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error('Error fetching video details from Cloudflare:', error);
        }
      }
      
      // Return updated video
      const updatedVideo = await storage.getVideo(videoId);
      res.json({
        ...updatedVideo,
        streamUrls: video.cfStreamId ? {
          hls: cloudflareStreamService.getStreamUrl(video.cfStreamId),
          iframe: cloudflareStreamService.getIframeUrl(video.cfStreamId),
          watch: cloudflareStreamService.getWatchUrl(video.cfStreamId),
          thumbnail: cloudflareStreamService.getThumbnailUrl(video.cfStreamId),
        } : null
      });
    } catch (error) {
      console.error('Error fetching video status:', error);
      res.status(500).json({ message: 'Failed to fetch video status' });
    }
  });

  app.get('/api/videos/my', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videos = await storage.getVideosByUser(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Get user's videos with detailed AI processing information
  app.get('/api/videos/my-detailed', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videos = await storage.getVideosByUserDetailed(userId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching detailed user videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Get user notifications
  app.get('/api/notifications', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.post('/api/notifications/:id/read', verifyToken, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.markNotificationAsRead(notificationId, userId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Get earnings projection
  app.get('/api/earnings/projection', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projection = await storage.getEarningsProjection(userId);
      res.json(projection);
    } catch (error) {
      console.error("Error fetching earnings projection:", error);
      res.status(500).json({ message: "Failed to fetch earnings projection" });
    }
  });

  // Update user profile
  app.post('/api/profile/update', verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      
      await storage.updateUserProfile(userId, profileData);
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch('/api/videos/:id', verifyToken, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Check if user owns the video or is admin
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !user?.role.includes('admin')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedVideo = await storage.updateVideo(videoId, req.body);
      res.json(updatedVideo);
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  // Cloudflare Stream video upload endpoint
  app.post("/api/videos/upload", verifyToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videoData = insertVideoSchema.parse(req.body);
      
      // Check if Cloudflare configuration is set up
      if (!process.env.CF_STREAM_TOKEN) {
        throw new Error("Cloudflare Stream token not configured. Please set CF_STREAM_TOKEN environment variable.");
      }
      
      // For now, we'll use a placeholder account ID - this needs to be replaced with actual account ID
      const accountId = process.env.CF_ACCOUNT_ID || "YOUR_ACCOUNT_ID";
      
      if (accountId === "YOUR_ACCOUNT_ID") {
        throw new Error("Cloudflare Account ID not configured. Please set CF_ACCOUNT_ID environment variable or update the code with your account ID.");
      }
      
      // Generate Cloudflare Stream upload URL
      const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CF_STREAM_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 1 hour max
          expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          meta: {
            title: videoData.title,
            description: videoData.description,
          },
        }),
      });
      
      if (!cfResponse.ok) {
        const errorText = await cfResponse.text();
        console.error("Cloudflare API error:", cfResponse.status, errorText);
        throw new Error(`Cloudflare API error: ${cfResponse.statusText} - ${errorText}`);
      }
      
      const cfData = await cfResponse.json();
      
      // Create video record in database
      const video = await storage.createVideo({
        ...videoData,
        userId,
        cfStreamId: cfData.result.uid,
        cfUploadUrl: cfData.result.uploadURL,
        cfProcessingStatus: "uploading",
        status: "processing",
      });

      // Send upload confirmation email
      const user = await storage.getUser(userId);
      if (user) {
        try {
          await emailService.notifyVideoUploadReceived(user, video);
        } catch (error) {
          console.error("Failed to send upload confirmation email:", error);
        }
      }
      
      res.json({
        video,
        uploadUrl: cfData.result.uploadURL,
        streamId: cfData.result.uid,
      });
    } catch (error: any) {
      console.error("Video upload error:", error);
      res.status(500).json({ message: "Failed to create upload URL", error: error.message });
    }
  });

  // Cloudflare Stream webhook handler
  app.post("/api/webhooks/cloudflare", async (req, res) => {
    try {
      const { uid, status, meta, errors } = req.body;
      
      // Find video by Cloudflare Stream ID
      const videos = await storage.getVideosByStatus("processing");
      const video = videos.find(v => v.cfStreamId === uid);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      let updateData: any = {
        cfProcessingStatus: status,
        updatedAt: new Date(),
      };
      
      if (status === "ready") {
        updateData.cfReadyToStream = true;
        updateData.status = "ready";
        updateData.duration = meta?.duration || 180; // Default 3 minutes if not provided
        updateData.thumbnailUrl = `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`;
        
        // Update user stats
        const user = await storage.getUser(video.userId);
        if (user) {
          await storage.updateUserStats(video.userId, {
            videosProcessing: user.videosProcessing - 1,
            videosPublished: user.videosPublished + 1,
          });

          // Send processing started email
          try {
            await emailService.notifyVideoProcessingStarted(user, video);
          } catch (error) {
            console.error("Failed to send processing started email:", error);
          }
        }
        
        // Start AI processing if enabled
        if (video.aiEnhanced) {
          setTimeout(async () => {
            try {
              await aiVideoProcessor.analyzeVideo(video);
              
              // Send AI enhancement completed email
              const updatedVideo = await storage.getVideo(video.id);
              if (user && updatedVideo) {
                try {
                  await emailService.notifyAIEnhancementCompleted(user, updatedVideo);
                } catch (error) {
                  console.error("Failed to send AI enhancement completed email:", error);
                }
              }
            } catch (error) {
              console.error("AI processing failed:", error);
            }
          }, 5000); // Start AI processing 5 seconds after video is ready
        }
      } else if (status === "error") {
        updateData.status = "rejected";
        updateData.cfErrorMessage = errors?.join(", ") || "Processing failed";
        
        // Update user stats
        const user = await storage.getUser(video.userId);
        if (user) {
          await storage.updateUserStats(video.userId, {
            videosProcessing: user.videosProcessing - 1,
          });
        }
      }
      
      await storage.updateVideo(video.id, updateData);
      
      res.json({ message: "Webhook processed successfully" });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Failed to process webhook", error: error.message });
    }
  });

  // Get video processing status
  app.get("/api/videos/:id/status", verifyToken, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // If video is still processing, try to get updated status from Cloudflare
      let currentStatus = video.cfProcessingStatus;
      let readyToStream = video.cfReadyToStream;
      
      if (video.cfStreamId && !video.cfReadyToStream) {
        try {
          const details = await cloudflareStreamService.getVideoDetails(video.cfStreamId);
          if (details.success) {
            currentStatus = details.result.status.state;
            readyToStream = details.result.readyToStream;
            
            // Update database if status changed
            if (currentStatus !== video.cfProcessingStatus || readyToStream !== video.cfReadyToStream) {
              const updateData: any = {
                cfProcessingStatus: currentStatus,
                cfReadyToStream: readyToStream,
                duration: details.result.duration,
                thumbnailUrl: details.result.thumbnail
              };
              
              // If video is ready, update overall status
              if (readyToStream && currentStatus === 'ready') {
                updateData.status = 'approved';
              }
              
              await storage.updateVideo(video.id, updateData);
            }
          }
        } catch (error) {
          console.error('Error checking Cloudflare status:', error);
        }
      }
      
      res.json({
        id: video.id,
        status: video.status,
        cfProcessingStatus: currentStatus,
        cfReadyToStream: readyToStream,
        cfErrorMessage: video.cfErrorMessage,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
      });
    } catch (error: any) {
      console.error("Status check error:", error);
      res.status(500).json({ message: "Failed to get video status", error: error.message });
    }
  });

  // Video upload test endpoint
  app.post('/api/test/video-upload', verifyToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { videoUploadTest } = await import('./videoUploadTest');
      const result = await videoUploadTest.testCompleteVideoFlow();
      
      res.json(result);
    } catch (error) {
      console.error('Error running video upload test:', error);
      res.status(500).json({ message: 'Test failed', error: error.message });
    }
  });

  // Admin routes
  app.get('/api/admin/platform-stats', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ message: 'Failed to fetch platform stats' });
    }
  });

  // Admin routes for testing
  app.get('/api/admin/videos', requireAdmin, async (req: any, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching admin videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/admin/users/:id/status', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;
      
      const user = await storage.updateUserStatus(userId, isActive);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.get('/api/admin/videos', requireAdmin, async (req: any, res) => {
    try {
      const { status } = req.query;
      const videos = status 
        ? await storage.getVideosByStatus(status as string)
        : await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Get AI processed videos for admin review
  app.get('/api/admin/ai-processed-videos', requireAdmin, async (req: any, res) => {
    try {
      const videos = await storage.getAIProcessedVideos();
      res.json(videos);
    } catch (error) {
      console.error('Failed to fetch AI processed videos:', error);
      res.status(500).json({ message: "Failed to fetch AI processed videos" });
    }
  });

  // Approve AI highlight
  app.post('/api/admin/videos/:videoId/highlights/:highlightIndex/approve', requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const highlightIndex = parseInt(req.params.highlightIndex);
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Update highlight approval status
      const highlights = JSON.parse(video.aiHighlights || '[]');
      if (highlights[highlightIndex]) {
        highlights[highlightIndex].approved = true;
        await storage.updateVideo(videoId, { 
          aiHighlights: JSON.stringify(highlights) 
        });
      }

      res.json({ message: "Highlight approved successfully" });
    } catch (error) {
      console.error('Failed to approve highlight:', error);
      res.status(500).json({ message: "Failed to approve highlight" });
    }
  });

  // Publish video with AI enhancements
  app.post('/api/admin/videos/:videoId/publish', requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      
      const video = await storage.updateVideo(videoId, { 
        status: 'published',
        publishedAt: new Date()
      });

      // Update user stats
      const user = await storage.getUser(video.userId);
      if (user) {
        await storage.updateUserStats(video.userId, {
          videosPublished: user.videosPublished + 1,
          videosProcessing: Math.max(0, user.videosProcessing - 1),
        });

        // Send notification
        try {
          await emailService.notifyVideoPublished(user, video);
        } catch (error) {
          console.error("Failed to send video published email:", error);
        }
      }

      res.json({ message: "Video published successfully" });
    } catch (error) {
      console.error('Failed to publish video:', error);
      res.status(500).json({ message: "Failed to publish video" });
    }
  });

  app.patch('/api/admin/videos/:id/status', requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['pending', 'processing', 'approved', 'rejected', 'published'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const video = await storage.updateVideo(videoId, { status });
      
      // Update user stats and send notifications
      if (status === 'published') {
        const user = await storage.getUser(video.userId);
        if (user) {
          await storage.updateUserStats(video.userId, {
            videosPublished: user.videosPublished + 1,
            videosProcessing: Math.max(0, user.videosProcessing - 1),
          });

          // Send video published notification
          try {
            await emailService.notifyVideoPublished(user, video);
          } catch (error) {
            console.error("Failed to send video published email:", error);
          }
        }
      }

      // Send admin notification for pending videos
      if (status === 'pending') {
        const user = await storage.getUser(video.userId);
        if (user) {
          // Get admin email from platform settings or use default
          const adminEmail = "admin@ridereels.com"; // Replace with actual admin email or fetch from settings
          try {
            await emailService.notifyAdminNewVideoReview(adminEmail, video, user);
          } catch (error) {
            console.error("Failed to send admin review notification:", error);
          }
        }
      }
      
      res.json(video);
    } catch (error) {
      console.error("Error updating video status:", error);
      res.status(500).json({ message: "Failed to update video status" });
    }
  });

  app.get('/api/admin/payouts', requireAdmin, async (req: any, res) => {
    try {
      const payouts = await storage.getAllPayouts();
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  app.post('/api/admin/payouts', requireAdmin, async (req: any, res) => {
    try {
      const payoutData = insertPayoutSchema.parse(req.body);
      const payout = await storage.createPayout(payoutData);

      // Send payment processing notification
      const user = await storage.getUser(payout.userId);
      if (user) {
        try {
          await emailService.notifyPaymentProcessing(user, payout);
        } catch (error) {
          console.error("Failed to send payment processing email:", error);
        }
      }

      res.json(payout);
    } catch (error) {
      console.error("Error creating payout:", error);
      res.status(500).json({ message: "Failed to create payout" });
    }
  });

  app.patch('/api/admin/payouts/:id', requireAdmin, async (req: any, res) => {
    try {
      const payoutId = parseInt(req.params.id);
      const updates = req.body;
      
      const payout = await storage.updatePayout(payoutId, updates);
      
      // Send payment completed notification if status changed to completed
      if (updates.status === 'completed') {
        const user = await storage.getUser(payout.userId);
        if (user) {
          try {
            await emailService.notifyPaymentCompleted(user, payout);
          } catch (error) {
            console.error("Failed to send payment completed email:", error);
          }
        }
      }

      res.json(payout);
    } catch (error) {
      console.error("Error updating payout:", error);
      res.status(500).json({ message: "Failed to update payout" });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = req.user;
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  app.get('/api/admin/settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      res.status(500).json({ message: "Failed to fetch platform settings" });
    }
  });

  app.post('/api/admin/settings', requireAdmin, async (req: any, res) => {
    try {
      const settingData = insertPlatformSettingsSchema.parse(req.body);
      const setting = await storage.upsertPlatformSetting(settingData);
      res.json(setting);
    } catch (error) {
      console.error("Error updating platform setting:", error);
      res.status(500).json({ message: "Failed to update platform setting" });
    }
  });

  // Payout routes for users
  app.get('/api/payouts/my', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const payouts = await storage.getPayoutsByUser(userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching user payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  // AI Processing Routes
  app.post('/api/videos/:id/ai-analyze', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Start AI analysis
      const analysis = await aiVideoProcessor.analyzeVideo(video);
      res.json(analysis);
    } catch (error: any) {
      console.error("AI analysis error:", error);
      res.status(500).json({ message: "AI analysis failed", error: error.message });
    }
  });

  app.get('/api/videos/:id/ai-status', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json({
        aiProcessingStatus: video.aiProcessingStatus,
        aiProcessingStarted: video.aiProcessingStarted,
        aiProcessingCompleted: video.aiProcessingCompleted,
        aiProcessingError: video.aiProcessingError,
        aiGeneratedTitle: video.aiGeneratedTitle,
        aiGeneratedDescription: video.aiGeneratedDescription,
        aiGeneratedTags: video.aiGeneratedTags,
        hasAiHighlights: !!video.aiHighlights,
        hasAiSceneDetection: !!video.aiSceneDetection,
        hasAiEditingSuggestions: !!video.aiEditingSuggestions,
      });
    } catch (error: any) {
      console.error("AI status error:", error);
      res.status(500).json({ message: "Failed to get AI status", error: error.message });
    }
  });

  app.get('/api/videos/:id/ai-highlights', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const highlights = video.aiHighlights ? JSON.parse(video.aiHighlights) : [];
      const sceneDetection = video.aiSceneDetection ? JSON.parse(video.aiSceneDetection) : [];
      const editingSuggestions = video.aiEditingSuggestions ? JSON.parse(video.aiEditingSuggestions) : [];
      const visualAnalysis = video.aiVisualAnalysis ? JSON.parse(video.aiVisualAnalysis) : null;
      
      res.json({
        highlights,
        sceneDetection,
        editingSuggestions,
        visualAnalysis,
      });
    } catch (error: any) {
      console.error("AI highlights error:", error);
      res.status(500).json({ message: "Failed to get AI highlights", error: error.message });
    }
  });

  app.post('/api/videos/:id/visual-analyze', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Start visual analysis
      const analysis = await aiVisualAnalyzer.analyzeVideoFrames(video);
      res.json(analysis);
    } catch (error: any) {
      console.error("Visual analysis error:", error);
      res.status(500).json({ message: "Visual analysis failed", error: error.message });
    }
  });

  app.get('/api/videos/:id/thumbnail-recommendations', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const recommendations = await aiVisualAnalyzer.generateThumbnailRecommendations(video);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Thumbnail recommendations error:", error);
      res.status(500).json({ message: "Failed to get thumbnail recommendations", error: error.message });
    }
  });

  app.post('/api/videos/:id/enhance-metadata', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const enhanced = await aiVideoProcessor.enhanceVideoMetadata(video);
      
      // Update video with enhanced metadata
      const updatedVideo = await storage.updateVideo(videoId, {
        title: enhanced.title,
        description: enhanced.description,
        tags: enhanced.tags,
      });
      
      res.json(updatedVideo);
    } catch (error: any) {
      console.error("Metadata enhancement error:", error);
      res.status(500).json({ message: "Failed to enhance metadata", error: error.message });
    }
  });

  app.post('/api/videos/:id/generate-summary', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Check if user owns the video or is admin
      const user = await storage.getUser(userId);
      if (video.userId !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const summary = await aiVideoProcessor.generateVideoSummary(video);
      res.json({ summary });
    } catch (error: any) {
      console.error("Summary generation error:", error);
      res.status(500).json({ message: "Failed to generate summary", error: error.message });
    }
  });

  // Revenue milestone tracking endpoint
  app.post('/api/users/:id/check-milestones', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentEarnings = parseFloat(user.totalEarnings || '0');
      const milestones = [50, 100, 250, 500, 1000, 2500, 5000, 10000]; // Revenue milestones in dollars
      
      let reachedMilestones = [];
      for (const milestone of milestones) {
        if (currentEarnings >= milestone) {
          reachedMilestones.push(milestone);
        }
      }

      // Check if user just reached a new milestone (simplified logic for demo)
      const lastMilestone = reachedMilestones[reachedMilestones.length - 1];
      if (lastMilestone && currentEarnings >= lastMilestone) {
        try {
          await emailService.notifyRevenueMilestone(user, lastMilestone);
        } catch (error) {
          console.error("Failed to send milestone notification:", error);
        }
      }

      res.json({ 
        currentEarnings,
        reachedMilestones,
        nextMilestone: milestones.find(m => m > currentEarnings) || null
      });
    } catch (error: any) {
      console.error("Milestone check error:", error);
      res.status(500).json({ message: "Failed to check milestones", error: error.message });
    }
  });

  // Weekly digest endpoint
  app.post('/api/admin/send-weekly-digest', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getPlatformStats();
      
      // Enhanced stats for weekly digest
      const enhancedStats = {
        ...stats,
        newVideosThisWeek: 0, // This would need proper date filtering in a real implementation
        newUsersThisWeek: 0,
        revenueThisWeek: '0.00',
      };

      const adminEmail = req.body.adminEmail || "admin@ridereels.com";
      
      const success = await emailService.sendWeeklyDigest(adminEmail, enhancedStats);
      
      if (success) {
        res.json({ message: "Weekly digest sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send weekly digest" });
      }
    } catch (error: any) {
      console.error("Weekly digest error:", error);
      res.status(500).json({ message: "Failed to send weekly digest", error: error.message });
    }
  });

  // Demo notification endpoint (no auth required for demonstration)
  app.post('/api/demo/notifications', async (req, res) => {
    try {
      const { type, email } = req.body;
      
      // Mock user and video data for demonstration
      const mockUser = {
        id: "demo-user",
        email: email || "demo@ridereels.com",
        firstName: "Demo",
        lastName: "User",
        totalEarnings: "125.50",
        videosPublished: 3,
        videosProcessing: 1,
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockVideo = {
        id: 1,
        title: "Epic Desert Trail Ride",
        description: "Amazing UTV adventure through sand dunes",
        userId: "demo-user",
        filename: "desert-ride.mp4",
        status: "published",
        views: 1250,
        earnings: "25.75",
        processingProgress: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockPayout = {
        id: 1,
        userId: "demo-user",
        amount: "125.50",
        status: "completed",
        stripePaymentId: "pi_demo123",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let success = false;
      let message = "";

      switch (type) {
        case "upload_received":
          success = await emailService.notifyVideoUploadReceived(mockUser, mockVideo);
          message = "Video upload received notification sent";
          break;
        case "processing_started":
          success = await emailService.notifyVideoProcessingStarted(mockUser, mockVideo);
          message = "Video processing started notification sent";
          break;
        case "video_processed":
          success = await emailService.notifyVideoProcessed(mockUser, mockVideo);
          message = "Video processed notification sent";
          break;
        case "ai_completed":
          const mockAIResults = {
            highlights: [
              { start: 30, end: 45, description: "Spectacular jump over rocky terrain", score: 9.2 },
              { start: 120, end: 140, description: "High-speed chase through narrow canyon", score: 8.8 }
            ],
            generatedTitle: "Epic Desert Trail Ride - Jaw-Dropping UTV Adventure",
            generatedDescription: "Experience the thrill of desert racing with stunning jumps and high-speed action through challenging terrain.",
            contentAnalysis: {
              excitement: 9.1,
              actionLevel: 8.5,
              scenery: ["desert", "canyon", "rocky terrain"],
              vehicles: ["UTV", "side-by-side"],
              terrain: ["sand dunes", "rocky trails"],
              mood: "adventurous"
            }
          };
          success = await emailService.notifyAIEnhancementCompleted(mockUser, mockVideo, mockAIResults);
          message = "AI enhancement completed notification sent";
          break;
        case "video_published":
          success = await emailService.notifyVideoPublished(mockUser, mockVideo);
          message = "Video published notification sent";
          break;
        case "milestone_reached":
          success = await emailService.notifyRevenueMilestone(mockUser, 100);
          message = "Revenue milestone notification sent";
          break;
        case "payment_processing":
          success = await emailService.notifyPaymentProcessing(mockUser, mockPayout);
          message = "Payment processing notification sent";
          break;
        case "payment_completed":
          success = await emailService.notifyPaymentCompleted(mockUser, mockPayout);
          message = "Payment completed notification sent";
          break;
        case "admin_review":
          success = await emailService.notifyAdminNewVideoReview(email || "admin@ridereels.com", mockVideo, mockUser);
          message = "Admin review notification sent";
          break;
        case "weekly_digest":
          const mockStats = {
            totalUsers: 1247,
            totalVideos: 3892,
            totalRevenue: "45,230.75",
            pendingVideos: 23,
            processingVideos: 8,
            pendingPayouts: "2,850.30",
            weeklyNewUsers: 89,
            weeklyNewVideos: 156,
            weeklyRevenue: "3,420.50",
            topCreators: [
              { name: "Trail Blazer Mike", earnings: "485.20", videos: 12 },
              { name: "Desert Queen Sarah", earnings: "392.75", videos: 8 },
              { name: "Canyon Crusher Dave", earnings: "298.40", videos: 6 }
            ]
          };
          success = await emailService.sendWeeklyDigest(email || "admin@ridereels.com", mockStats);
          message = "Weekly digest notification sent";
          break;
        default:
          return res.status(400).json({ error: "Invalid notification type" });
      }

      if (success) {
        res.json({ success: true, message });
      } else {
        res.status(500).json({ error: "Failed to send notification" });
      }
    } catch (error) {
      console.error('Demo notification error:', error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // =====================================
  // STRIPE REVENUE SHARING SYSTEM
  // =====================================

  // Video view tracking endpoint
  app.post('/api/videos/:id/view', async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub; // Optional - for logged-in users
      const { viewDuration } = req.body;
      const viewerIp = req.ip;

      await stripeRevenueService.trackVideoView(videoId, userId, viewerIp, viewDuration);
      
      res.json({ message: "View tracked successfully" });
    } catch (error: any) {
      console.error("Error tracking view:", error);
      res.status(500).json({ message: "Failed to track view", error: error.message });
    }
  });

  // Premium subscription creation
  app.post('/api/subscriptions/create', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { priceId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }

      const result = await stripeRevenueService.createPremiumSubscription(userId, priceId);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription", error: error.message });
    }
  });

  // Get user subscription status
  app.get('/api/subscriptions/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isPremium = await stripeRevenueService.isUserPremium(userId);
      const user = await storage.getUser(userId);
      
      res.json({
        isPremium,
        tier: user?.subscriptionTier || 'free',
        status: user?.subscriptionStatus || 'none'
      });
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status", error: error.message });
    }
  });

  // Get earnings report
  app.get('/api/earnings/report', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const report = await stripeRevenueService.generateEarningsReport(userId, start, end);
      
      res.json(report);
    } catch (error: any) {
      console.error("Error generating earnings report:", error);
      res.status(500).json({ message: "Failed to generate earnings report", error: error.message });
    }
  });

  // Get user revenue transactions
  app.get('/api/revenue/transactions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await storage.getRevenueTransactionsByUser(userId);
      
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching revenue transactions:", error);
      res.status(500).json({ message: "Failed to fetch revenue transactions", error: error.message });
    }
  });

  // Manually trigger payout (for testing)
  app.post('/api/payouts/trigger', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await stripeRevenueService.scheduleAutomaticPayout(user);
      
      res.json({ message: "Payout scheduled successfully" });
    } catch (error: any) {
      console.error("Error triggering payout:", error);
      res.status(500).json({ message: "Failed to trigger payout", error: error.message });
    }
  });

  // Get user payout history
  app.get('/api/payouts/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const payouts = await storage.getPayoutsByUser(userId);
      
      res.json(payouts);
    } catch (error: any) {
      console.error("Error fetching payout history:", error);
      res.status(500).json({ message: "Failed to fetch payout history", error: error.message });
    }
  });

  // Update payout preferences
  app.patch('/api/payouts/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { payoutThreshold, payoutFrequency } = req.body;
      
      const updates: any = {};
      if (payoutThreshold !== undefined) updates.payoutThreshold = payoutThreshold;
      if (payoutFrequency !== undefined) updates.payoutFrequency = payoutFrequency;
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating payout preferences:", error);
      res.status(500).json({ message: "Failed to update payout preferences", error: error.message });
    }
  });

  // Generate tax documents
  app.post('/api/tax/generate/:year', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taxYear = parseInt(req.params.year);
      
      await stripeRevenueService.generateTaxDocument(userId, taxYear);
      
      res.json({ message: "Tax document generation started" });
    } catch (error: any) {
      console.error("Error generating tax document:", error);
      res.status(500).json({ message: "Failed to generate tax document", error: error.message });
    }
  });

  // Get tax documents
  app.get('/api/tax/documents', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documents = await storage.getTaxDocumentsByUser(userId);
      
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching tax documents:", error);
      res.status(500).json({ message: "Failed to fetch tax documents", error: error.message });
    }
  });

  // Stripe webhook endpoint
  app.post('/api/webhooks/stripe', async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    let payload: string;

    try {
      payload = req.body;
      await stripeRevenueService.handleStripeWebhook(payload, signature);
      
      res.json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ message: "Webhook error", error: error.message });
    }
  });

  // =====================================
  // ADMIN REVENUE MANAGEMENT
  // =====================================

  // Get platform revenue stats
  app.get('/api/admin/revenue/stats', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getPlatformStats();
      
      // Get additional revenue metrics
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const monthlyTransactions = await storage.getRevenueTransactionsByUserAndDateRange(
        '', // This would need to be adjusted for admin view
        firstDayOfMonth,
        currentMonth
      );
      
      const monthlyRevenue = monthlyTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      
      res.json({
        ...stats,
        monthlyRevenue: monthlyRevenue.toFixed(2),
        averageRevenuePerUser: stats.totalUsers > 0 ? (parseFloat(stats.totalRevenue) / stats.totalUsers).toFixed(2) : '0.00',
      });
    } catch (error: any) {
      console.error("Error fetching revenue stats:", error);
      res.status(500).json({ message: "Failed to fetch revenue stats", error: error.message });
    }
  });

  // Get all payouts (admin)
  app.get('/api/admin/payouts', requireAdmin, async (req: any, res) => {
    try {
      const payouts = await storage.getAllPayouts();
      
      // Get user details for each payout
      const payoutsWithUsers = await Promise.all(
        payouts.map(async (payout) => {
          const user = await storage.getUser(payout.userId);
          return {
            ...payout,
            user: user ? {
              name: `${user.firstName} ${user.lastName}`,
              email: user.email
            } : null
          };
        })
      );
      
      res.json(payoutsWithUsers);
    } catch (error: any) {
      console.error("Error fetching admin payouts:", error);
      res.status(500).json({ message: "Failed to fetch admin payouts", error: error.message });
    }
  });

  // Update payout status (admin)
  app.patch('/api/admin/payouts/:id/status', requireAdmin, async (req: any, res) => {
    try {
      const payoutId = parseInt(req.params.id);
      const { status, failureReason } = req.body;
      
      const updates: any = { status };
      if (failureReason) updates.failureReason = failureReason;
      if (status === 'completed') updates.processedDate = new Date();
      
      const updatedPayout = await storage.updatePayout(payoutId, updates);
      
      res.json(updatedPayout);
    } catch (error: any) {
      console.error("Error updating payout status:", error);
      res.status(500).json({ message: "Failed to update payout status", error: error.message });
    }
  });

  // Publishing and Social Media Routes
  
  // Schedule video for publishing
  app.post('/api/videos/:videoId/schedule-publish', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const { platforms, immediate, customSchedule, useOptimalTiming } = req.body;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Verify user owns the video
      if (video.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await socialMediaScheduler.scheduleVideoPublication(videoId, platforms, {
        immediate,
        customSchedule: customSchedule ? new Date(customSchedule) : undefined,
        useOptimalTiming
      });
      
      res.json({ message: "Video scheduled for publishing successfully" });
    } catch (error) {
      console.error('Failed to schedule video publishing:', error);
      res.status(500).json({ message: "Failed to schedule video publishing" });
    }
  });

  // Get publishing queue status
  app.get('/api/publishing/queue/status', requireAuth, async (req: any, res) => {
    try {
      const status = await publishingQueueProcessor.getQueueStatus();
      res.json(status);
    } catch (error) {
      console.error('Failed to get queue status:', error);
      res.status(500).json({ message: "Failed to get queue status" });
    }
  });

  // Get video publications
  app.get('/api/videos/:videoId/publications', requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const publications = await storage.getPublicationsByVideo(videoId);
      res.json(publications);
    } catch (error) {
      console.error('Failed to get publications:', error);
      res.status(500).json({ message: "Failed to get publications" });
    }
  });

  // Get platform analytics
  app.get('/api/analytics/platform/:platform', requireAuth, async (req: any, res) => {
    try {
      const platform = req.params.platform;
      const days = parseInt(req.query.days) || 30;
      const analytics = await storage.getLatestAnalytics(platform, days);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get platform analytics:', error);
      res.status(500).json({ message: "Failed to get platform analytics" });
    }
  });

  // Get optimal posting times
  app.get('/api/scheduling/optimal-times/:platform', requireAuth, async (req: any, res) => {
    try {
      const platform = req.params.platform;
      const optimalTime = await socialMediaScheduler.getOptimalPostingTime(platform);
      const strategy = await socialMediaScheduler.getSchedulingStrategy(platform);
      
      res.json({
        nextOptimalTime: optimalTime,
        strategy
      });
    } catch (error) {
      console.error('Failed to get optimal posting times:', error);
      res.status(500).json({ message: "Failed to get optimal posting times" });
    }
  });

  // Get content calendar
  app.get('/api/scheduling/calendar', requireAuth, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const calendar = await socialMediaScheduler.generateContentCalendar(days);
      res.json(calendar);
    } catch (error) {
      console.error('Failed to generate content calendar:', error);
      res.status(500).json({ message: "Failed to generate content calendar" });
    }
  });

  // Get publishing insights
  app.get('/api/publishing/insights', requireAuth, async (req: any, res) => {
    try {
      const insights = await socialMediaScheduler.getPublishingInsights();
      res.json(insights);
    } catch (error) {
      console.error('Failed to get publishing insights:', error);
      res.status(500).json({ message: "Failed to get publishing insights" });
    }
  });

  // Admin publishing management routes
  app.get('/api/admin/publishing/queue', requireAdmin, async (req: any, res) => {
    try {
      const { status } = req.query;
      const queueItems = status 
        ? await storage.getPublishingQueueByStatus(status as string)
        : await storage.getPublishingQueueByStatus('pending');
      res.json(queueItems);
    } catch (error) {
      console.error('Failed to get publishing queue:', error);
      res.status(500).json({ message: "Failed to get publishing queue" });
    }
  });

  app.post('/api/admin/publishing/retry-failed', requireAdmin, async (req: any, res) => {
    try {
      const retriedCount = await publishingQueueProcessor.retryFailedItems();
      res.json({ message: `Retried ${retriedCount} failed items` });
    } catch (error) {
      console.error('Failed to retry failed items:', error);
      res.status(500).json({ message: "Failed to retry failed items" });
    }
  });

  app.post('/api/admin/publishing/pause', requireAdmin, async (req: any, res) => {
    try {
      await socialMediaScheduler.pauseScheduling();
      res.json({ message: "Publishing paused successfully" });
    } catch (error) {
      console.error('Failed to pause publishing:', error);
      res.status(500).json({ message: "Failed to pause publishing" });
    }
  });

  app.post('/api/admin/publishing/resume', requireAdmin, async (req: any, res) => {
    try {
      await socialMediaScheduler.resumeScheduling();
      res.json({ message: "Publishing resumed successfully" });
    } catch (error) {
      console.error('Failed to resume publishing:', error);
      res.status(500).json({ message: "Failed to resume publishing" });
    }
  });

  // Get platform performance data
  app.get('/api/admin/analytics/performance/:platform', requireAdmin, async (req: any, res) => {
    try {
      const platform = req.params.platform;
      const bestTimes = await storage.getBestPerformanceTimes(platform);
      res.json(bestTimes);
    } catch (error) {
      console.error('Failed to get platform performance:', error);
      res.status(500).json({ message: "Failed to get platform performance" });
    }
  });

  const httpServer = createServer(app);
  // Get video stream URL for secure playback
  app.get("/api/videos/:id/stream", requireAuth, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      if (!video.cfStreamId) {
        return res.status(404).json({ error: "Video stream not available" });
      }
      
      // Return stream URLs
      res.json({
        streamUrl: cloudflareStreamService.getStreamUrl(video.cfStreamId),
        thumbnailUrl: cloudflareStreamService.getThumbnailUrl(video.cfStreamId),
        iframeUrl: cloudflareStreamService.getIframeUrl(video.cfStreamId),
        watchUrl: cloudflareStreamService.getWatchUrl(video.cfStreamId)
      });
    } catch (error) {
      console.error("Error fetching video stream:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // AI Video Processing endpoints (ADMIN ONLY)
  app.post("/api/videos/:id/ai-process", requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Update video status to processing
      await storage.updateVideo(videoId, {
        aiProcessingStatus: 'processing'
      });
      
      // Mock AI processing for demo purposes
      setTimeout(async () => {
        try {
          const mockAnalysis = {
            highlights: [
              { start: 10, end: 25, description: "Exciting jump sequence", score: 0.92, clipType: 'action' },
              { start: 45, end: 60, description: "Scenic mountain view", score: 0.78, clipType: 'scenic' },
              { start: 120, end: 135, description: "Technical trail section", score: 0.85, clipType: 'action' }
            ],
            contentAnalysis: { overallViralPotential: 0.84 },
            generatedTitle: `Epic ${video.title} - Viral Potential!`,
            generatedDescription: `AI-enhanced version of ${video.description}. Perfect for social media sharing!`,
            thumbnailRecommendations: [
              { timestamp: 15, score: 0.9, reason: "Peak action moment" },
              { timestamp: 50, score: 0.85, reason: "Beautiful scenery" }
            ]
          };
          
          await storage.updateVideo(videoId, {
            aiProcessingStatus: 'completed',
            aiHighlights: JSON.stringify(mockAnalysis.highlights),
            aiViralPotentialScore: mockAnalysis.contentAnalysis.overallViralPotential,
            aiGeneratedTitle: mockAnalysis.generatedTitle,
            aiGeneratedDescription: mockAnalysis.generatedDescription,
            aiThumbnailRecommendations: JSON.stringify(mockAnalysis.thumbnailRecommendations)
          });
          
          console.log(`AI processing completed for video ${videoId}`);
        } catch (error) {
          console.error("AI processing error:", error);
          await storage.updateVideo(videoId, {
            aiProcessingStatus: 'failed'
          });
        }
      }, 3000); // 3 second mock processing time
      
      res.json({ success: true, message: "AI processing started" });
    } catch (error) {
      console.error("Error starting AI processing:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get AI processing status
  app.get("/api/videos/:id/ai-status", requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      let progress = 0;
      if (video.aiProcessingStatus === 'processing') {
        // Simulate progressive completion
        progress = Math.min(95, Math.floor(Math.random() * 30) + 30);
      } else if (video.aiProcessingStatus === 'completed') {
        progress = 100;
      }
      
      res.json({
        status: video.aiProcessingStatus || 'pending',
        progress,
        completed: video.aiProcessingStatus === 'completed'
      });
    } catch (error) {
      console.error("Error fetching AI status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add video to compilation
  app.post("/api/videos/:id/add-to-compilation", requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { highlights, compilationType } = req.body;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Mock compilation creation for demo
      const mockCompilation = {
        id: `comp_${videoId}_${Date.now()}`,
        title: `${video.title} - Highlights`,
        duration: highlights.reduce((sum: number, h: any) => sum + (h.end - h.start), 0),
        clips: highlights.map((h: any, i: number) => ({
          id: `clip_${i}`,
          start: h.start,
          end: h.end,
          description: h.description
        }))
      };
      
      // Store compilation data
      await storage.updateVideo(videoId, {
        aiCompilations: JSON.stringify([mockCompilation])
      });
      
      res.json({ success: true, compilation: mockCompilation });
    } catch (error) {
      console.error("Error adding to compilation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Publish video to platform (ADMIN ONLY)
  app.post("/api/videos/:id/publish", requireAdmin, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { platform, metadata } = req.body;
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Mock publishing for demo
      console.log(`Publishing video ${videoId} to ${platform}:`, metadata);
      
      // Update video with publish status 
      const existingPlatforms = video.publishedPlatforms ? JSON.parse(video.publishedPlatforms) : [];
      const updatedPlatforms = [...existingPlatforms, platform];
      
      await storage.updateVideo(videoId, {
        publishedAt: new Date(),
        publishedPlatforms: JSON.stringify(updatedPlatforms)
      });
      
      res.json({ success: true, message: `Video scheduled for ${platform}` });
    } catch (error) {
      console.error("Error publishing video:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Additional missing endpoints for full flow testing
  app.post('/api/admin/send-test-notification', requireAdmin, async (req: any, res) => {
    try {
      const { type, recipient } = req.body;
      
      if (!type || !recipient) {
        return res.status(400).json({ message: "Type and recipient are required" });
      }
      
      const user = await storage.getUserByEmail(recipient);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let result;
      switch (type) {
        case 'video_processed':
          result = await emailService.notifyVideoProcessed(user, { 
            title: 'Test Video',
            description: 'This is a test notification'
          });
          break;
        case 'video_published':
          result = await emailService.notifyVideoPublished(user, { 
            title: 'Test Video',
            description: 'This is a test notification'
          });
          break;
        case 'earnings_milestone':
          result = await emailService.notifyEarningsMilestone(user, { 
            amount: 50.00,
            milestone: 'first_payout'
          });
          break;
        default:
          return res.status(400).json({ message: "Invalid notification type" });
      }
      
      res.json({ message: "Test notification sent successfully", result });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  app.post('/api/create-payment-intent', verifyToken, async (req: any, res) => {
    try {
      const { amount, currency = 'usd' } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Platform statistics endpoint
  app.get('/api/stats/platform', verifyToken, async (req: any, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  // Trending videos endpoint
  app.get('/api/videos/trending/:timeframe?', verifyToken, async (req: any, res) => {
    try {
      const timeframe = req.params.timeframe || 'week';
      const trendingVideos = await storage.getTrendingVideos(timeframe);
      res.json(trendingVideos);
    } catch (error) {
      console.error("Error fetching trending videos:", error);
      res.status(500).json({ message: "Failed to fetch trending videos" });
    }
  });

  // Active competitions endpoint
  app.get('/api/competitions/active', verifyToken, async (req: any, res) => {
    try {
      const competitions = await storage.getActiveCompetitions();
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching active competitions:", error);
      res.status(500).json({ message: "Failed to fetch active competitions" });
    }
  });

  // Leaderboard endpoint
  app.get('/api/leaderboard/:timeframe?', verifyToken, async (req: any, res) => {
    try {
      const timeframe = req.params.timeframe || 'week';
      const leaderboard = await storage.getLeaderboard(timeframe);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Recent videos endpoint
  app.get('/api/videos/recent', verifyToken, async (req: any, res) => {
    try {
      const recentVideos = await storage.getRecentVideos();
      res.json(recentVideos);
    } catch (error) {
      console.error("Error fetching recent videos:", error);
      res.status(500).json({ message: "Failed to fetch recent videos" });
    }
  });

  // Bulk actions for admin video management
  app.post("/api/admin/videos/bulk-action", requireAdmin, async (req, res) => {
    try {
      const { action, videoIds } = req.body;
      
      if (!action || !Array.isArray(videoIds) || videoIds.length === 0) {
        return res.status(400).json({ message: "Invalid bulk action request" });
      }

      const results = [];
      for (const videoId of videoIds) {
        try {
          let updateData: any = {};
          
          switch (action) {
            case 'approve':
              updateData.status = 'approved';
              break;
            case 'reject':
              updateData.status = 'rejected';
              break;
            case 'delete':
              await storage.deleteVideo(videoId);
              results.push({ videoId, success: true, action: 'deleted' });
              continue;
            default:
              results.push({ videoId, success: false, error: 'Invalid action' });
              continue;
          }

          await storage.updateVideo(videoId, updateData);
          results.push({ videoId, success: true, action });
        } catch (error: any) {
          results.push({ videoId, success: false, error: error.message });
        }
      }

      res.json({ results });
    } catch (error: any) {
      console.error("Error processing bulk action:", error);
      res.status(500).json({ message: "Failed to process bulk action" });
    }
  });

  // Get AI processed videos for admin review
  app.get("/api/admin/ai-processed-videos", requireAdmin, async (req, res) => {
    try {
      const videos = await storage.getAIProcessedVideos();
      res.json(videos);
    } catch (error: any) {
      console.error("Error fetching AI processed videos:", error);
      res.status(500).json({ message: "Failed to fetch AI processed videos" });
    }
  });

  // Approve specific AI highlight
  app.post("/api/admin/videos/:id/highlights/:index/approve", requireAdmin, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const highlightIndex = parseInt(req.params.index);
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Parse existing highlights
      let highlights = [];
      try {
        highlights = JSON.parse(video.aiHighlights || '[]');
      } catch (e) {
        highlights = [];
      }

      if (highlightIndex >= highlights.length) {
        return res.status(404).json({ message: "Highlight not found" });
      }

      // Mark highlight as approved
      highlights[highlightIndex].approved = true;
      
      await storage.updateVideo(videoId, {
        aiHighlights: JSON.stringify(highlights),
        updatedAt: new Date()
      });

      res.json({ message: "Highlight approved successfully" });
    } catch (error: any) {
      console.error("Error approving highlight:", error);
      res.status(500).json({ message: "Failed to approve highlight" });
    }
  });

  return httpServer;
}
