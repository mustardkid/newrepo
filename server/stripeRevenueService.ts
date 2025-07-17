import Stripe from 'stripe';
import { storage } from './storage';
import { emailService } from './emailService';
import type { User, Video, Payout, RevenueTransaction, VideoView } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Revenue sharing configuration
const REVENUE_SHARE_CONFIG = {
  platform: 0.30, // 30% platform fee
  creator: 0.70,   // 70% creator share
  premiumMultiplier: 1.5, // Premium views earn 50% more
  baseRevenuePerView: 0.005, // $0.005 per view
  minimumPayoutThreshold: 50.00, // $50 minimum payout
};

export class StripeRevenueService {
  
  // 1. Video view tracking and revenue calculation
  async trackVideoView(videoId: number, userId?: string, viewerIp?: string, viewDuration?: number): Promise<void> {
    try {
      const video = await storage.getVideo(videoId);
      if (!video) throw new Error('Video not found');

      const user = await storage.getUser(video.userId);
      if (!user) throw new Error('Video creator not found');

      // Check if user has premium subscription
      const isPremiumViewer = userId ? await this.isUserPremium(userId) : false;
      
      // Calculate revenue based on view quality and premium status
      const baseRevenue = REVENUE_SHARE_CONFIG.baseRevenuePerView;
      const premiumMultiplier = isPremiumViewer ? REVENUE_SHARE_CONFIG.premiumMultiplier : 1;
      const completionBonus = viewDuration ? Math.min(viewDuration / (video.duration || 1), 1) : 1;
      
      const totalRevenue = baseRevenue * premiumMultiplier * completionBonus;
      const creatorShare = totalRevenue * REVENUE_SHARE_CONFIG.creator;
      const platformShare = totalRevenue * REVENUE_SHARE_CONFIG.platform;

      // Record the view
      await storage.createVideoView({
        videoId,
        userId,
        viewerIp,
        viewDuration,
        completionRate: viewDuration ? (viewDuration / (video.duration || 1)) * 100 : 100,
        revenue: totalRevenue.toFixed(4),
      });

      // Update video view count and earnings
      await storage.updateVideo(videoId, {
        views: (video.views || 0) + 1,
        earnings: (parseFloat(video.earnings || '0') + creatorShare).toFixed(2),
      });

      // Record revenue transaction
      await storage.createRevenueTransaction({
        userId: video.userId,
        videoId,
        type: isPremiumViewer ? 'premium_view' : 'view',
        amount: totalRevenue.toFixed(2),
        platformShare: platformShare.toFixed(2),
        creatorShare: creatorShare.toFixed(2),
        description: `${isPremiumViewer ? 'Premium ' : ''}Video view revenue`,
        metadata: JSON.stringify({
          viewDuration,
          completionRate: completionBonus * 100,
          viewerIp,
        }),
      });

      // Update user earnings
      await storage.updateUserStats(video.userId, {
        totalEarnings: (parseFloat(user.totalEarnings || '0') + creatorShare).toFixed(2),
        pendingEarnings: (parseFloat(user.pendingEarnings || '0') + creatorShare).toFixed(2),
      });

      // Check if payout threshold is met
      const updatedUser = await storage.getUser(video.userId);
      if (updatedUser && parseFloat(updatedUser.pendingEarnings || '0') >= parseFloat(updatedUser.payoutThreshold || '50')) {
        await this.scheduleAutomaticPayout(updatedUser);
      }

    } catch (error) {
      console.error('Error tracking video view:', error);
    }
  }

  // 2. Automatic payout processing
  async scheduleAutomaticPayout(user: User): Promise<void> {
    try {
      const pendingAmount = parseFloat(user.pendingEarnings || '0');
      const threshold = parseFloat(user.payoutThreshold || '50');
      
      if (pendingAmount < threshold) {
        return; // Not enough earnings for payout
      }

      // Ensure user has Stripe Connect account
      if (!user.stripeAccountId) {
        await this.createStripeConnectAccount(user);
      }

      const platformFee = pendingAmount * REVENUE_SHARE_CONFIG.platform;
      const netAmount = pendingAmount - platformFee;

      // Create payout record
      const payout = await storage.createPayout({
        userId: user.id,
        amount: pendingAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        status: 'pending',
        scheduledDate: new Date(),
      });

      // Process Stripe transfer
      await this.processStripeTransfer(payout, user);

    } catch (error) {
      console.error('Error scheduling payout:', error);
    }
  }

  // 3. Stripe Connect account creation
  async createStripeConnectAccount(user: User): Promise<string> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: user.firstName || undefined,
          last_name: user.lastName || undefined,
          email: user.email || undefined,
        },
      });

      // Update user with Stripe account ID
      await storage.updateUser(user.id, {
        stripeAccountId: account.id,
      });

      return account.id;
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw error;
    }
  }

  // 4. Process Stripe transfers
  async processStripeTransfer(payout: Payout, user: User): Promise<void> {
    try {
      if (!user.stripeAccountId) {
        throw new Error('User does not have a Stripe Connect account');
      }

      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(payout.netAmount) * 100), // Convert to cents
        currency: 'usd',
        destination: user.stripeAccountId,
        description: `RideReels payout for ${user.firstName} ${user.lastName}`,
        metadata: {
          payout_id: payout.id.toString(),
          user_id: user.id,
        },
      });

      // Update payout with transfer ID
      await storage.updatePayout(payout.id, {
        stripeTransferId: transfer.id,
        status: 'processing',
      });

      // Update user pending earnings
      await storage.updateUser(user.id, {
        pendingEarnings: '0.00',
      });

      // Send notification email
      await emailService.notifyPaymentProcessing(user, {
        ...payout,
        stripeTransferId: transfer.id,
        status: 'processing',
      });

    } catch (error) {
      console.error('Error processing Stripe transfer:', error);
      
      // Update payout with failure
      await storage.updatePayout(payout.id, {
        status: 'failed',
        failureReason: error.message,
      });
    }
  }

  // 5. Premium subscription management
  async createPremiumSubscription(userId: string, priceId: string): Promise<{ clientSecret: string; subscriptionId: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) throw new Error('User not found');

      let customerId = user.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            user_id: userId,
          },
        });
        customerId = customer.id;
        
        await storage.updateUser(userId, {
          stripeCustomerId: customerId,
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Save subscription to database
      await storage.createSubscription({
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        tier: priceId.includes('pro') ? 'pro' : 'premium',
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });

      const paymentIntent = subscription.latest_invoice?.payment_intent as Stripe.PaymentIntent;
      
      return {
        clientSecret: paymentIntent.client_secret!,
        subscriptionId: subscription.id,
      };

    } catch (error) {
      console.error('Error creating premium subscription:', error);
      throw error;
    }
  }

  // 6. Check if user has premium subscription
  async isUserPremium(userId: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user?.subscriptionStatus === 'active' && user?.subscriptionTier !== 'free';
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  // 7. Generate earnings report
  async generateEarningsReport(userId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const user = await storage.getUser(userId);
      if (!user) throw new Error('User not found');

      const transactions = await storage.getRevenueTransactionsByUserAndDateRange(userId, startDate, endDate);
      const payouts = await storage.getPayoutsByUserAndDateRange(userId, startDate, endDate);

      const summary = {
        totalEarnings: transactions.reduce((sum, tx) => sum + parseFloat(tx.creatorShare), 0),
        totalViews: transactions.filter(tx => tx.type === 'view' || tx.type === 'premium_view').length,
        premiumViews: transactions.filter(tx => tx.type === 'premium_view').length,
        totalPayouts: payouts.reduce((sum, payout) => sum + parseFloat(payout.netAmount), 0),
        pendingEarnings: parseFloat(user.pendingEarnings || '0'),
        breakdown: {
          viewRevenue: transactions.filter(tx => tx.type === 'view').reduce((sum, tx) => sum + parseFloat(tx.creatorShare), 0),
          premiumViewRevenue: transactions.filter(tx => tx.type === 'premium_view').reduce((sum, tx) => sum + parseFloat(tx.creatorShare), 0),
          subscriptionRevenue: transactions.filter(tx => tx.type === 'subscription').reduce((sum, tx) => sum + parseFloat(tx.creatorShare), 0),
        },
      };

      return {
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        },
        period: {
          start: startDate,
          end: endDate,
        },
        summary,
        transactions: transactions.map(tx => ({
          date: tx.createdAt,
          type: tx.type,
          amount: tx.creatorShare,
          videoTitle: tx.videoId ? 'Video Title' : null, // Would need to join with video
          description: tx.description,
        })),
        payouts: payouts.map(payout => ({
          date: payout.createdAt,
          amount: payout.netAmount,
          status: payout.status,
          method: payout.method,
        })),
      };

    } catch (error) {
      console.error('Error generating earnings report:', error);
      throw error;
    }
  }

  // 8. Handle Stripe webhooks
  async handleStripeWebhook(payload: string, signature: string): Promise<void> {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured');
      }

      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);

      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleSubscriptionPaymentSuccess(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleSubscriptionPaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;
        case 'transfer.paid':
          await this.handleTransferPaid(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(event.data.object as Stripe.Transfer);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  // 9. Tax document generation
  async generateTaxDocument(userId: string, taxYear: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) throw new Error('User not found');

      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31);

      const transactions = await storage.getRevenueTransactionsByUserAndDateRange(userId, startDate, endDate);
      const totalEarnings = transactions.reduce((sum, tx) => sum + parseFloat(tx.creatorShare), 0);

      if (totalEarnings >= 600) { // IRS threshold for 1099-NEC
        const taxDoc = await storage.createTaxDocument({
          userId,
          taxYear,
          documentType: '1099-NEC',
          totalEarnings: totalEarnings.toFixed(2),
          status: 'pending',
        });

        // Generate PDF document (would integrate with PDF service)
        // const documentUrl = await this.generateTaxPDF(taxDoc);
        
        // await storage.updateTaxDocument(taxDoc.id, {
        //   documentUrl,
        //   status: 'generated',
        // });
      }

    } catch (error) {
      console.error('Error generating tax document:', error);
      throw error;
    }
  }

  // Webhook handlers
  private async handleSubscriptionPaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await storage.getSubscriptionByStripeId(invoice.subscription as string);
    if (subscription) {
      await storage.updateSubscription(subscription.id, {
        status: 'active',
      });
      
      await storage.updateUser(subscription.userId, {
        subscriptionStatus: 'active',
      });
    }
  }

  private async handleSubscriptionPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await storage.getSubscriptionByStripeId(invoice.subscription as string);
    if (subscription) {
      await storage.updateSubscription(subscription.id, {
        status: 'past_due',
      });
      
      await storage.updateUser(subscription.userId, {
        subscriptionStatus: 'past_due',
      });
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await storage.getSubscriptionByStripeId(stripeSubscription.id);
    if (subscription) {
      await storage.updateSubscription(subscription.id, {
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      });
    }
  }

  private async handleSubscriptionCanceled(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await storage.getSubscriptionByStripeId(stripeSubscription.id);
    if (subscription) {
      await storage.updateSubscription(subscription.id, {
        status: 'canceled',
      });
      
      await storage.updateUser(subscription.userId, {
        subscriptionStatus: 'canceled',
        subscriptionTier: 'free',
      });
    }
  }

  private async handleTransferPaid(transfer: Stripe.Transfer): Promise<void> {
    const payout = await storage.getPayoutByStripeTransferId(transfer.id);
    if (payout) {
      await storage.updatePayout(payout.id, {
        status: 'completed',
        processedDate: new Date(),
      });

      const user = await storage.getUser(payout.userId);
      if (user) {
        await emailService.notifyPaymentCompleted(user, {
          ...payout,
          status: 'completed',
          processedDate: new Date(),
        });
      }
    }
  }

  private async handleTransferFailed(transfer: Stripe.Transfer): Promise<void> {
    const payout = await storage.getPayoutByStripeTransferId(transfer.id);
    if (payout) {
      await storage.updatePayout(payout.id, {
        status: 'failed',
        failureReason: 'Stripe transfer failed',
      });

      // Add failed amount back to pending earnings
      const user = await storage.getUser(payout.userId);
      if (user) {
        await storage.updateUser(user.id, {
          pendingEarnings: (parseFloat(user.pendingEarnings || '0') + parseFloat(payout.amount)).toFixed(2),
        });
      }
    }
  }
}

export const stripeRevenueService = new StripeRevenueService();