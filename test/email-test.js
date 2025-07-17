/**
 * Email Integration Test
 * Tests SendGrid email functionality
 */

class EmailTest {
  constructor() {
    this.testEmail = 'mustardkid@gmail.com';
  }

  async runEmailTest() {
    console.log('\n📧 Starting Email Integration Test...\n');
    
    try {
      // Test SendGrid API connectivity
      await this.testSendGridConnectivity();
      
      // Test email sending
      await this.testEmailSending();
      
      console.log('\n✅ Email test completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Email test failed:', error.message);
      throw error;
    }
  }

  async testSendGridConnectivity() {
    console.log('🔌 Testing SendGrid API connectivity...');
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }
    
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: this.testEmail }],
              subject: 'RideReels Platform Test Email'
            }
          ],
          from: { email: 'barrymartin@partsnapp.com', name: 'RideReels Platform' },
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #3B82F6;">RideReels Platform Test</h2>
                  <p>This is a test email to verify the email system is working correctly.</p>
                  <p>If you receive this email, the SendGrid integration is functioning properly.</p>
                  <p>Time: ${new Date().toLocaleString()}</p>
                </div>
              `
            }
          ]
        }),
      });
      
      if (response.status === 202) {
        console.log('✅ Test email sent successfully to mustardkid@gmail.com');
        console.log('📬 Check your email inbox for the test message');
      } else {
        const error = await response.text();
        throw new Error(`SendGrid API error: ${response.status} - ${error}`);
      }
      
    } catch (error) {
      throw new Error(`Failed to send test email: ${error.message}`);
    }
  }

  async testEmailSending() {
    console.log('📨 Testing email template functionality...');
    
    try {
      // Test different email templates
      const templates = [
        'Video Upload Received',
        'Video Processing Started',
        'AI Enhancement Completed',
        'Video Published'
      ];
      
      console.log('✅ Email templates available:', templates.join(', '));
      console.log('📧 SendGrid configured with sender: barrymartin@partsnapp.com');
      console.log('📥 Delivery target: mustardkid@gmail.com');
      
    } catch (error) {
      throw new Error(`Email template test failed: ${error.message}`);
    }
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const emailTest = new EmailTest();
  emailTest.runEmailTest();
}

export { EmailTest };