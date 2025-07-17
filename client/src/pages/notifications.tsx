import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Mail, Users, TrendingUp, DollarSign, Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { toast } = useToast();
  const [adminEmail, setAdminEmail] = useState('admin@ridereels.com');

  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  // Send weekly digest mutation
  const sendDigestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/admin/send-weekly-digest', { adminEmail });
    },
    onSuccess: () => {
      toast({
        title: "Weekly Digest Sent",
        description: `Weekly digest has been sent to ${adminEmail}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Digest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check milestones mutation
  const checkMilestonesMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/users/${userId}/check-milestones`);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Milestone Check Complete",
        description: `Current earnings: $${data.currentEarnings}. Next milestone: $${data.nextMilestone || 'None'}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Milestone Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Bell className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Notification System
        </h1>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400">
        Test and manage the comprehensive email notification system for RideReels platform.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform Stats Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Platform Statistics</span>
            </CardTitle>
            <CardDescription>Current platform performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Total Users</span>
                  </span>
                  <span className="font-semibold">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Total Videos</span>
                  </span>
                  <span className="font-semibold">{stats.totalVideos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Revenue</span>
                  </span>
                  <span className="font-semibold">${stats.totalRevenue}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-orange-600 dark:text-orange-400">
                  <span>Pending Videos</span>
                  <span className="font-semibold">{stats.pendingVideos}</span>
                </div>
                <div className="flex justify-between text-blue-600 dark:text-blue-400">
                  <span>Processing Videos</span>
                  <span className="font-semibold">{stats.processingVideos}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Pending Payouts</span>
                  <span className="font-semibold">${stats.pendingPayouts}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Failed to load stats</p>
            )}
          </CardContent>
        </Card>

        {/* Weekly Digest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Weekly Digest</span>
            </CardTitle>
            <CardDescription>Send weekly platform summary to administrators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@ridereels.com"
              />
            </div>
            <Button 
              onClick={() => sendDigestMutation.mutate()}
              disabled={sendDigestMutation.isPending}
              className="w-full"
            >
              {sendDigestMutation.isPending ? 'Sending...' : 'Send Weekly Digest'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notification Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Types</CardTitle>
          <CardDescription>Comprehensive notification system covering all platform activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-600 dark:text-blue-400">Video Processing</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>✅ Upload received confirmation</li>
                <li>⚙️ Processing started notification</li>
                <li>🤖 AI enhancement completed</li>
                <li>🚀 Video published successfully</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-green-600 dark:text-green-400">Creator Earnings</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>🎉 Revenue milestone reached</li>
                <li>💳 Payment processing started</li>
                <li>✅ Payment completed confirmation</li>
                <li>📊 Earnings summary updates</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-600 dark:text-purple-400">Admin Notifications</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>📋 New video review required</li>
                <li>📊 Weekly platform digest</li>
                <li>⚠️ System alerts and issues</li>
                <li>📈 Performance summaries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Template Features */}
      <Card>
        <CardHeader>
          <CardTitle>Email Template Features</CardTitle>
          <CardDescription>Professional, branded email templates with platform styling</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Design Features</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>🎨 Branded RideReels styling with gradient backgrounds</li>
                <li>📱 Mobile-responsive design</li>
                <li>🖼️ Rich HTML formatting with icons</li>
                <li>📄 Plain text fallbacks for all emails</li>
                <li>🔗 Action buttons and direct links</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Content Features</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>📊 Dynamic stats and metrics</li>
                <li>🎯 Personalized user content</li>
                <li>📈 Progress tracking and milestones</li>
                <li>⚡ AI enhancement details</li>
                <li>💰 Revenue and payout information</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}