import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import { db } from './db';
import { users, insertUserSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import session from 'express-session';

// Configure Google OAuth Strategy
export function setupGoogleAuth(app: Express) {
  // Check for Google OAuth credentials
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  console.log('Google OAuth Setup:');
  console.log('- Client ID configured:', clientId ? 'Yes' : 'No');
  console.log('- Client Secret configured:', clientSecret ? 'Yes' : 'No');
  console.log('- Client ID (first 10 chars):', clientId?.substring(0, 10) + '...');
  console.log('- Available domains:', process.env.REPLIT_DOMAINS);
  console.log('- Current environment:', process.env.NODE_ENV);
  console.log('- Callback URL will be determined dynamically');
  
  if (!clientId || !clientSecret) {
    console.warn('Google OAuth credentials not configured. Skipping Google authentication setup.');
    return;
  }

  // Session middleware is already configured in index.ts, don't duplicate it

  // Determine the callback URL based on environment
  const getCallbackURL = () => {
    if (process.env.NODE_ENV === 'development') {
      // In Replit development, use the dev domain instead of localhost
      const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
      const devDomain = domains[0];
      if (devDomain) {
        return `https://${devDomain}/auth/google/callback`;
      }
      return 'http://localhost:5000/auth/google/callback';
    }
    
    // For production, use the public domain
    const domains = process.env.REPLIT_DOMAINS?.split(',') || ['ridereels.replit.app'];
    const primaryDomain = domains[0];
    
    // Handle different deployment domains - always use HTTPS for production
    let callbackURL;
    if (primaryDomain.includes('.replit.dev')) {
      callbackURL = `https://${primaryDomain}/auth/google/callback`;
    } else if (primaryDomain.includes('partsnapp.app')) {
      callbackURL = `https://${primaryDomain}/auth/google/callback`;
    } else {
      // Default to the main replit app URL with HTTPS
      callbackURL = `https://ride-reels-platform-mustardkid.replit.app/auth/google/callback`;
    }
    
    console.log('Using callback URL:', callbackURL);
    return callbackURL;
  };

  passport.use(new GoogleStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: getCallbackURL(),
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth callback received');
      console.log('Profile:', JSON.stringify(profile, null, 2));
      
      const email = profile.emails?.[0]?.value;
      if (!email) {
        console.error('No email found in Google profile');
        return done(new Error('No email found in Google profile'));
      }
      
      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (existingUser.length > 0) {
        console.log('Existing user found, updating Google info');
        // User exists, update Google info
        const updatedUser = await db.update(users)
          .set({
            googleId: profile.id,
            profileImageUrl: profile.photos?.[0]?.value || null,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUser[0].id))
          .returning();
        
        return done(null, updatedUser[0]);
      } else {
        // Create new user
        const newUser = await db.insert(users)
          .values({
            googleId: profile.id,
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value || null,
            role: 'user',
            isActive: true,
            totalViews: 0,
            totalEarnings: '0.00',
            pendingEarnings: '0.00',
            videosPublished: 0,
            videosProcessing: 0,
            subscriptionTier: 'free',
            payoutThreshold: '50.00',
            payoutFrequency: 'monthly',
            taxDocumentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return done(null, newUser[0]);
      }
    } catch (error) {
      console.error('Google Auth Error:', error);
      return done(error, null);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user[0] || null);
    } catch (error) {
      done(error, null);
    }
  });

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth routes using authorization code flow
  app.get('/auth/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      accessType: 'offline',
      prompt: 'consent'
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=oauth_failed' }),
    (req, res) => {
      console.log('Google OAuth callback successful');
      console.log('User:', req.user);
      
      // Successful authentication, redirect to dashboard
      const user = req.user as any;
      if (user?.role === 'admin' || user?.role === 'moderator') {
        res.redirect('/?auth=success');
      } else {
        res.redirect('/?auth=success');
      }
    }
  );

  // Logout route
  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });
}

// Middleware to check if user is authenticated
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Middleware to check if user is admin
export const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && (req.user?.role === 'admin' || req.user?.role === 'moderator')) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};