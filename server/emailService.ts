import { MailService } from '@sendgrid/mail';
import type { User, Video, Payout } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'barrymartin@partsnapp.com'; // Using your verified sender email
const PLATFORM_NAME = 'RideReels';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private getBaseTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${PLATFORM_NAME}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px; }
            .content { padding: 40px 30px; }
            .content h2 { color: #333; margin-top: 0; margin-bottom: 20px; font-size: 24px; }
            .content p { color: #666; line-height: 1.6; margin-bottom: 16px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .stats { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .stats-item { display: inline-block; margin: 0 15px 10px 0; }
            .stats-label { color: #666; font-size: 12px; text-transform: uppercase; }
            .stats-value { color: #333; font-size: 18px; font-weight: bold; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 12px; }
            .footer a { color: #667eea; text-decoration: none; }
            .highlight { background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div style="padding: 20px;">
            <div class="container">
                <div class="header">
                    <h1>🏁 ${PLATFORM_NAME}</h1>
                    <p>The Ultimate UTV/ATV Content Platform</p>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    <p>© 2025 ${PLATFORM_NAME}. The premier platform for UTV/ATV enthusiasts.</p>
                    <p>
                        <a href="#">Dashboard</a> | 
                        <a href="#">Upload Videos</a> | 
                        <a href="#">Support</a> | 
                        <a href="#">Unsubscribe</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  // Video Processing Notifications
  createVideoUploadReceivedTemplate(user: User, video: Video): EmailTemplate {
    const content = `
      <h2>🎬 Video Upload Received!</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Great news! We've successfully received your video upload and it's now in our processing queue.</p>
      
      <div class="highlight">
        <strong>Video Details:</strong><br>
        📹 <strong>Title:</strong> ${video.title}<br>
        🏷️ <strong>Category:</strong> ${video.category}<br>
        ⚡ <strong>AI Enhancement:</strong> ${video.aiEnhanced ? 'Enabled' : 'Disabled'}<br>
        📅 <strong>Uploaded:</strong> ${new Date(video.createdAt!).toLocaleDateString()}
      </div>

      <p>Your video is currently being processed and optimized for the best viewing experience. ${video.aiEnhanced ? 'Our AI will analyze your content to create viral-ready highlights and optimize metadata.' : ''}</p>
      
      <p>You'll receive another notification once processing is complete. This usually takes 5-15 minutes depending on video length.</p>
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/dashboard" class="button">
        View Dashboard
      </a>
    `;

    return {
      subject: `🎬 Video Upload Received - ${video.title}`,
      html: this.getBaseTemplate(content),
      text: `Video Upload Received!\n\nHi ${user.firstName || 'Creator'},\n\nWe've received your video "${video.title}" and it's being processed. You'll get another notification when it's ready.\n\nThanks for using ${PLATFORM_NAME}!`
    };
  }

  createVideoProcessingStartedTemplate(user: User, video: Video): EmailTemplate {
    const content = `
      <h2>⚙️ Video Processing Started</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Your video is now being processed by our advanced video optimization system!</p>
      
      <div class="highlight">
        <strong>Processing Details:</strong><br>
        📹 <strong>Video:</strong> ${video.title}<br>
        🔄 <strong>Status:</strong> Processing<br>
        ⚡ <strong>AI Enhancement:</strong> ${video.aiEnhanced ? 'Active - Analyzing for viral potential' : 'Standard processing'}<br>
        ⏱️ <strong>Started:</strong> ${new Date().toLocaleString()}
      </div>

      ${video.aiEnhanced ? `
      <p><strong>AI Enhancement in Progress:</strong></p>
      <ul>
        <li>🎯 Detecting highlight moments</li>
        <li>🎬 Analyzing scene transitions</li>
        <li>📝 Generating viral-ready titles and descriptions</li>
        <li>🏷️ Creating optimal tags for discoverability</li>
        <li>✂️ Suggesting editing improvements</li>
      </ul>
      ` : ''}

      <p>We're optimizing your content for maximum engagement and discoverability. You'll be notified as soon as processing is complete!</p>
    `;

    return {
      subject: `⚙️ Processing Started - ${video.title}`,
      html: this.getBaseTemplate(content),
      text: `Video Processing Started!\n\nYour video "${video.title}" is now being processed. ${video.aiEnhanced ? 'AI enhancement is analyzing your content for viral potential.' : ''}\n\nYou'll be notified when complete!`
    };
  }

  createAIEnhancementCompletedTemplate(user: User, video: Video, aiResults?: any): EmailTemplate {
    const content = `
      <h2>🤖 AI Enhancement Completed!</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Exciting news! Our AI has finished analyzing your video and generated optimization recommendations.</p>
      
      <div class="highlight">
        <strong>AI Analysis Results:</strong><br>
        📹 <strong>Video:</strong> ${video.title}<br>
        ✅ <strong>AI Status:</strong> Analysis Complete<br>
        🎯 <strong>Highlights Detected:</strong> ${aiResults?.highlights?.length || 0}<br>
        🎬 <strong>Scene Transitions:</strong> ${aiResults?.sceneTransitions?.length || 0}<br>
        📝 <strong>Title Generated:</strong> ${video.aiGeneratedTitle ? '✅' : '❌'}<br>
        🏷️ <strong>Tags Generated:</strong> ${video.aiGeneratedTags?.length || 0}
      </div>

      ${video.aiGeneratedTitle ? `
      <p><strong>🎯 AI-Generated Title:</strong><br>
      "${video.aiGeneratedTitle}"</p>
      ` : ''}

      ${video.aiGeneratedDescription ? `
      <p><strong>📝 AI-Generated Description:</strong><br>
      ${video.aiGeneratedDescription.substring(0, 200)}${video.aiGeneratedDescription.length > 200 ? '...' : ''}</p>
      ` : ''}

      <p>Your video is now ready for final review and publishing. Visit your dashboard to review the AI recommendations and publish your content!</p>
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/dashboard" class="button">
        Review AI Results
      </a>
    `;

    return {
      subject: `🤖 AI Enhancement Complete - ${video.title}`,
      html: this.getBaseTemplate(content),
      text: `AI Enhancement Complete!\n\nYour video "${video.title}" has been analyzed by our AI. ${aiResults?.highlights?.length || 0} highlights detected and optimization recommendations are ready.\n\nReview the results in your dashboard!`
    };
  }

  createVideoPublishedTemplate(user: User, video: Video): EmailTemplate {
    const content = `
      <h2>🚀 Video Published Successfully!</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Congratulations! Your video is now live and ready to earn you revenue!</p>
      
      <div class="highlight">
        <strong>Published Video:</strong><br>
        📹 <strong>Title:</strong> ${video.title}<br>
        🏷️ <strong>Category:</strong> ${video.category}<br>
        📅 <strong>Published:</strong> ${new Date().toLocaleDateString()}<br>
        👁️ <strong>Views:</strong> ${video.views || 0}<br>
        💰 <strong>Earnings:</strong> $${video.earnings || '0.00'}
      </div>

      <p>Your content is now discoverable on our platform and will start generating views and revenue. Here's what happens next:</p>
      
      <ul>
        <li>🔍 Your video will appear in search results and category feeds</li>
        <li>📊 Analytics and earnings will update in real-time</li>
        <li>💰 Revenue sharing begins immediately with each view</li>
        <li>📈 Track performance in your creator dashboard</li>
      </ul>

      <p>Keep creating amazing UTV/ATV content to grow your audience and earnings!</p>
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/dashboard" class="button">
        View Analytics
      </a>
    `;

    return {
      subject: `🚀 Video Published - ${video.title}`,
      html: this.getBaseTemplate(content),
      text: `Video Published!\n\nYour video "${video.title}" is now live and earning revenue! Check your dashboard for analytics and earnings updates.\n\nKeep creating amazing content!`
    };
  }

  // Creator Earnings Notifications
  createRevenueMilestoneTemplate(user: User, milestone: number, currentEarnings: string): EmailTemplate {
    const content = `
      <h2>🎉 Revenue Milestone Achieved!</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Congratulations! You've reached a significant earnings milestone on ${PLATFORM_NAME}!</p>
      
      <div class="highlight">
        <strong>🏆 Milestone Achievement:</strong><br>
        💰 <strong>Milestone:</strong> $${milestone}<br>
        📊 <strong>Total Earnings:</strong> $${currentEarnings}<br>
        📹 <strong>Videos Published:</strong> ${user.videosPublished || 0}<br>
        👁️ <strong>Total Views:</strong> ${user.totalViews?.toLocaleString() || '0'}
      </div>

      <p>Your content is resonating with the UTV/ATV community! Here's what this means:</p>
      
      <ul>
        <li>💵 Earnings are automatically tracked and ready for payout</li>
        <li>📈 Your content is performing exceptionally well</li>
        <li>🌟 You're building a strong creator reputation</li>
        <li>🚀 Keep creating to reach the next milestone!</li>
      </ul>

      <p>Thank you for being a valued creator on our platform. Your content makes the UTV/ATV community more exciting!</p>
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/dashboard" class="button">
        View Earnings
      </a>
    `;

    return {
      subject: `🎉 Milestone Reached - $${milestone} Earned!`,
      html: this.getBaseTemplate(content),
      text: `Milestone Achieved!\n\nCongratulations! You've earned $${milestone} on ${PLATFORM_NAME}. Your current total is $${currentEarnings}.\n\nKeep creating amazing content!`
    };
  }

  createPaymentProcessingTemplate(user: User, payout: Payout): EmailTemplate {
    const content = `
      <h2>💳 Payment Processing</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Great news! Your payout request is now being processed.</p>
      
      <div class="highlight">
        <strong>Payment Details:</strong><br>
        💰 <strong>Amount:</strong> $${payout.amount}<br>
        🏦 <strong>Method:</strong> ${payout.method.charAt(0).toUpperCase() + payout.method.slice(1)}<br>
        📅 <strong>Requested:</strong> ${new Date(payout.createdAt!).toLocaleDateString()}<br>
        🔄 <strong>Status:</strong> Processing<br>
        📋 <strong>Transaction ID:</strong> ${payout.transactionId || 'Pending'}
      </div>

      <p>Your payment is being processed by our payment partner. Here's what to expect:</p>
      
      <ul>
        <li>⏱️ Processing typically takes 3-5 business days</li>
        <li>📧 You'll receive confirmation once payment is complete</li>
        <li>🔍 Track status anytime in your dashboard</li>
        <li>❓ Contact support if you have any questions</li>
      </ul>

      <p>Thank you for your patience. We appreciate your content creation on ${PLATFORM_NAME}!</p>
    `;

    return {
      subject: `💳 Payment Processing - $${payout.amount}`,
      html: this.getBaseTemplate(content),
      text: `Payment Processing\n\nYour payout of $${payout.amount} is being processed via ${payout.method}. Processing takes 3-5 business days.\n\nYou'll receive confirmation once complete!`
    };
  }

  createPaymentCompletedTemplate(user: User, payout: Payout): EmailTemplate {
    const content = `
      <h2>✅ Payment Completed!</h2>
      <p>Hi ${user.firstName || 'Creator'},</p>
      <p>Excellent news! Your payment has been successfully processed and sent.</p>
      
      <div class="highlight">
        <strong>Payment Completed:</strong><br>
        💰 <strong>Amount:</strong> $${payout.amount}<br>
        🏦 <strong>Method:</strong> ${payout.method.charAt(0).toUpperCase() + payout.method.slice(1)}<br>
        📅 <strong>Completed:</strong> ${new Date().toLocaleDateString()}<br>
        ✅ <strong>Status:</strong> Completed<br>
        📋 <strong>Transaction ID:</strong> ${payout.transactionId}
      </div>

      <p>Your earnings have been successfully transferred! Here's what this means:</p>
      
      <ul>
        <li>💵 Payment has been sent to your ${payout.method} account</li>
        <li>📧 You should receive a confirmation from your payment provider</li>
        <li>📊 This payout is recorded in your earnings history</li>
        <li>🚀 Keep creating to earn more!</li>
      </ul>

      <p>Thank you for being a valued creator on ${PLATFORM_NAME}. Keep producing amazing UTV/ATV content!</p>
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/dashboard" class="button">
        View Earnings History
      </a>
    `;

    return {
      subject: `✅ Payment Complete - $${payout.amount}`,
      html: this.getBaseTemplate(content),
      text: `Payment Complete!\n\nYour payout of $${payout.amount} has been successfully processed via ${payout.method}. Transaction ID: ${payout.transactionId}\n\nKeep creating amazing content!`
    };
  }

  // Admin Notifications
  createNewVideoReviewTemplate(adminEmail: string, video: Video, user: User): EmailTemplate {
    const content = `
      <h2>📋 New Video Requiring Review</h2>
      <p>Hi Admin,</p>
      <p>A new video has been uploaded and requires review before publishing.</p>
      
      <div class="highlight">
        <strong>Video Details:</strong><br>
        📹 <strong>Title:</strong> ${video.title}<br>
        👤 <strong>Creator:</strong> ${user.firstName || user.email} (${user.email})<br>
        🏷️ <strong>Category:</strong> ${video.category}<br>
        📅 <strong>Uploaded:</strong> ${new Date(video.createdAt!).toLocaleDateString()}<br>
        ⚡ <strong>AI Enhanced:</strong> ${video.aiEnhanced ? 'Yes' : 'No'}<br>
        🔄 <strong>Status:</strong> ${video.status}
      </div>

      ${video.description ? `
      <p><strong>Description:</strong><br>
      ${video.description}</p>
      ` : ''}

      ${video.tags?.length ? `
      <p><strong>Tags:</strong> ${video.tags.join(', ')}</p>
      ` : ''}

      <p>Please review this content for:</p>
      <ul>
        <li>🎯 Content quality and relevance</li>
        <li>🛡️ Community guidelines compliance</li>
        <li>🏷️ Appropriate categorization</li>
        <li>📝 Metadata accuracy</li>
      </ul>
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/admin" class="button">
        Review Video
      </a>
    `;

    return {
      subject: `📋 New Video Review Required - ${video.title}`,
      html: this.getBaseTemplate(content),
      text: `New Video Review Required\n\nVideo: "${video.title}" by ${user.email}\nCategory: ${video.category}\nUploaded: ${new Date(video.createdAt!).toLocaleDateString()}\n\nPlease review in the admin panel.`
    };
  }

  createWeeklyDigestTemplate(adminEmail: string, stats: any): EmailTemplate {
    const content = `
      <h2>📊 Weekly Platform Digest</h2>
      <p>Hi Admin,</p>
      <p>Here's your weekly summary of ${PLATFORM_NAME} platform activity.</p>
      
      <div class="stats">
        <div class="stats-item">
          <div class="stats-label">Total Users</div>
          <div class="stats-value">${stats.totalUsers}</div>
        </div>
        <div class="stats-item">
          <div class="stats-label">Total Videos</div>
          <div class="stats-value">${stats.totalVideos}</div>
        </div>
        <div class="stats-item">
          <div class="stats-label">Total Revenue</div>
          <div class="stats-value">$${stats.totalRevenue}</div>
        </div>
        <div class="stats-item">
          <div class="stats-label">Pending Videos</div>
          <div class="stats-value">${stats.pendingVideos}</div>
        </div>
        <div class="stats-item">
          <div class="stats-label">Processing Videos</div>
          <div class="stats-value">${stats.processingVideos}</div>
        </div>
        <div class="stats-item">
          <div class="stats-label">Pending Payouts</div>
          <div class="stats-value">$${stats.pendingPayouts}</div>
        </div>
      </div>

      <h3>📈 Week Highlights</h3>
      <ul>
        <li>🎬 ${stats.newVideosThisWeek || 0} new videos uploaded</li>
        <li>👥 ${stats.newUsersThisWeek || 0} new creators joined</li>
        <li>💰 $${stats.revenueThisWeek || '0.00'} generated this week</li>
        <li>📋 ${stats.pendingVideos} videos awaiting review</li>
      </ul>

      <h3>⚠️ Action Items</h3>
      ${stats.pendingVideos > 0 ? `<li>Review ${stats.pendingVideos} pending videos</li>` : ''}
      ${parseFloat(stats.pendingPayouts) > 0 ? `<li>Process $${stats.pendingPayouts} in pending payouts</li>` : ''}
      
      <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://your-domain.com'}/admin" class="button">
        Admin Dashboard
      </a>
    `;

    return {
      subject: `📊 Weekly Platform Digest - ${new Date().toLocaleDateString()}`,
      html: this.getBaseTemplate(content),
      text: `Weekly Platform Digest\n\nUsers: ${stats.totalUsers}\nVideos: ${stats.totalVideos}\nRevenue: $${stats.totalRevenue}\nPending Reviews: ${stats.pendingVideos}\n\nCheck the admin dashboard for details.`
    };
  }

  // Send Email Method
  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      await mailService.send({
        to,
        from: FROM_EMAIL,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      console.log(`Email sent successfully to ${to}: ${template.subject}`);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  // Convenience methods for common notifications
  async notifyVideoUploadReceived(user: User, video: Video): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createVideoUploadReceivedTemplate(user, video);
    return this.sendEmail(user.email, template);
  }

  async notifyVideoProcessingStarted(user: User, video: Video): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createVideoProcessingStartedTemplate(user, video);
    return this.sendEmail(user.email, template);
  }

  async notifyAIEnhancementCompleted(user: User, video: Video, aiResults?: any): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createAIEnhancementCompletedTemplate(user, video, aiResults);
    return this.sendEmail(user.email, template);
  }

  async notifyVideoPublished(user: User, video: Video): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createVideoPublishedTemplate(user, video);
    return this.sendEmail(user.email, template);
  }

  async notifyRevenueMilestone(user: User, milestone: number): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createRevenueMilestoneTemplate(user, milestone, user.totalEarnings || '0.00');
    return this.sendEmail(user.email, template);
  }

  async notifyPaymentProcessing(user: User, payout: Payout): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createPaymentProcessingTemplate(user, payout);
    return this.sendEmail(user.email, template);
  }

  async notifyPaymentCompleted(user: User, payout: Payout): Promise<boolean> {
    if (!user.email) return false;
    const template = this.createPaymentCompletedTemplate(user, payout);
    return this.sendEmail(user.email, template);
  }

  async notifyAdminNewVideoReview(adminEmail: string, video: Video, user: User): Promise<boolean> {
    const template = this.createNewVideoReviewTemplate(adminEmail, video, user);
    return this.sendEmail(adminEmail, template);
  }

  async sendWeeklyDigest(adminEmail: string, stats: any): Promise<boolean> {
    const template = this.createWeeklyDigestTemplate(adminEmail, stats);
    return this.sendEmail(adminEmail, template);
  }
}

export const emailService = new EmailService();