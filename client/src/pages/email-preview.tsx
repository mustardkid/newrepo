import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Play, TrendingUp, DollarSign, Users, CheckCircle, Clock, Star, Award } from 'lucide-react';

const emailTemplates = {
  upload_received: {
    subject: "Video Upload Received - RideReels",
    title: "Your Video Has Been Uploaded! 🎬",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
              🎬 RideReels
            </div>
          </div>
          
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Video Upload Successful!</h2>
          
          <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #667eea; margin-top: 0;">Epic Desert Trail Ride</h3>
            <p style="color: #666; margin-bottom: 10px;">Your UTV adventure footage has been successfully uploaded to RideReels.</p>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 15px;">
              <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">Processing Started</span>
              <span style="color: #666; font-size: 14px;">AI enhancement in progress...</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View Upload Status
            </a>
          </div>
          
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 14px;">
            We'll notify you when your video is ready for review and publishing.
          </p>
        </div>
      </div>
    `
  },
  
  ai_completed: {
    subject: "AI Enhancement Complete - Your Video is Ready! 🚀",
    title: "AI Enhancement Complete! 🤖",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
              🤖 RideReels AI
            </div>
          </div>
          
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Your Video Has Been Enhanced!</h2>
          
          <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #667eea; margin-top: 0;">Epic Desert Trail Ride - Jaw-Dropping UTV Adventure</h3>
            <p style="color: #666; margin-bottom: 15px;">Our AI has analyzed your footage and created viral-optimized content!</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <strong style="color: #667eea;">🎯 Highlights Found:</strong>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">2 epic moments detected</p>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <strong style="color: #667eea;">⭐ Excitement Score:</strong>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">9.1/10 - Viral potential!</p>
              </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e8f4ff; border-radius: 6px; border-left: 4px solid #667eea;">
              <strong style="color: #667eea;">Top Highlight:</strong>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">Spectacular jump over rocky terrain (0:30-0:45)</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              Review Enhanced Video
            </a>
          </div>
        </div>
      </div>
    `
  },
  
  milestone_reached: {
    subject: "Congratulations! Revenue Milestone Reached 🎉",
    title: "Milestone Achievement! 🏆",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px; border-radius: 12px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: linear-gradient(45deg, #f093fb, #f5576c); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
              🏆 RideReels
            </div>
          </div>
          
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">You've Reached $100 in Earnings!</h2>
          
          <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 48px; font-weight: bold; color: #f5576c; margin-bottom: 10px;">$100</div>
            <p style="color: #666; margin-bottom: 15px;">Total earnings from your UTV content</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <strong style="color: #f5576c;">📹 Videos Published:</strong>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">3 videos</p>
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <strong style="color: #f5576c;">👀 Total Views:</strong>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">12,450 views</p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: linear-gradient(45deg, #f093fb, #f5576c); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View Earnings Dashboard
            </a>
          </div>
          
          <p style="color: #666; text-align: center; margin-top: 20px; font-size: 14px;">
            Keep creating amazing content! Your next milestone is $250.
          </p>
        </div>
      </div>
    `
  },
  
  weekly_digest: {
    subject: "RideReels Weekly Platform Digest - Admin Report",
    title: "Weekly Platform Report 📊",
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
              📊 RideReels Admin
            </div>
          </div>
          
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Weekly Platform Summary</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8f9ff; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">1,247</div>
              <p style="color: #666; margin: 5px 0;">Total Users</p>
            </div>
            <div style="background: #f8f9ff; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">3,892</div>
              <p style="color: #666; margin: 5px 0;">Total Videos</p>
            </div>
            <div style="background: #f8f9ff; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">$45,231</div>
              <p style="color: #666; margin: 5px 0;">Total Revenue</p>
            </div>
            <div style="background: #f8f9ff; padding: 15px; border-radius: 6px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">89</div>
              <p style="color: #666; margin: 5px 0;">New Users</p>
            </div>
          </div>
          
          <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #f5576c; margin-top: 0;">🚨 Attention Required</h3>
            <ul style="color: #666; margin: 10px 0; padding-left: 20px;">
              <li>23 videos pending review</li>
              <li>8 videos currently processing</li>
              <li>$2,850 in pending payouts</li>
            </ul>
          </div>
          
          <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #22c55e; margin-top: 0;">🏆 Top Creators This Week</h3>
            <div style="space-y: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span style="color: #666;">Trail Blazer Mike</span>
                <span style="color: #22c55e; font-weight: bold;">$485.20</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span style="color: #666;">Desert Queen Sarah</span>
                <span style="color: #22c55e; font-weight: bold;">$392.75</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span style="color: #666;">Canyon Crusher Dave</span>
                <span style="color: #22c55e; font-weight: bold;">$298.40</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View Full Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  }
};

export default function EmailPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState('upload_received');
  
  return (
    <div className="min-h-screen bg-deep-gradient p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center space-x-2 mb-6">
          <Mail className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Email Template Preview
          </h1>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Preview of the professional email templates used in the RideReels notification system.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selector */}
          <div className="lg:col-span-1">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant={selectedTemplate === 'upload_received' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedTemplate('upload_received')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload Received
                </Button>
                <Button
                  variant={selectedTemplate === 'ai_completed' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedTemplate('ai_completed')}
                >
                  <Star className="h-4 w-4 mr-2" />
                  AI Enhancement
                </Button>
                <Button
                  variant={selectedTemplate === 'milestone_reached' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedTemplate('milestone_reached')}
                >
                  <Award className="h-4 w-4 mr-2" />
                  Milestone Reached
                </Button>
                <Button
                  variant={selectedTemplate === 'weekly_digest' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedTemplate('weekly_digest')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Weekly Digest
                </Button>
              </CardContent>
            </Card>

            {/* Template Features */}
            <Card className="glass-card bg-card-gradient border-white/10 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Template Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Badge variant="secondary">Responsive Design</Badge>
                  <Badge variant="secondary">Professional Branding</Badge>
                  <Badge variant="secondary">Action Buttons</Badge>
                  <Badge variant="secondary">Rich Content</Badge>
                </div>
                <div className="text-sm text-gray-300">
                  <p>All templates include:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• RideReels branded styling</li>
                    <li>• Mobile-responsive layout</li>
                    <li>• Clear call-to-action buttons</li>
                    <li>• Professional color scheme</li>
                    <li>• Plain text fallbacks</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Preview */}
          <div className="lg:col-span-2">
            <Card className="glass-card bg-card-gradient border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>{emailTemplates[selectedTemplate].title}</span>
                  <Badge variant="outline" className="text-white border-white/20">
                    {emailTemplates[selectedTemplate].subject}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-4 min-h-96">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: emailTemplates[selectedTemplate].content 
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Demo Status */}
        <Card className="glass-card bg-card-gradient border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Demo Status</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            <p className="mb-4">
              The notification system is fully functional and ready to send emails. 
              The demo endpoint at <code className="bg-white/10 px-2 py-1 rounded">/api/demo/notifications</code> 
              is configured to test all email templates with realistic data.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">System Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">SendGrid API Key Required</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}