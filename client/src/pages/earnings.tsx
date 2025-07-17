import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  DollarSign, 
  Eye, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Download,
  Settings,
  Star,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function EarningsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch earnings report
  const { data: earningsReport, isLoading: reportLoading } = useQuery({
    queryKey: ['/api/earnings/report', selectedPeriod],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      const response = await apiRequest('GET', `/api/earnings/report?${params}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch subscription status
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscriptions/status'],
    enabled: isAuthenticated,
  });

  // Fetch revenue transactions
  const { data: transactions } = useQuery({
    queryKey: ['/api/revenue/transactions'],
    enabled: isAuthenticated,
  });

  // Fetch payout history
  const { data: payoutHistory } = useQuery({
    queryKey: ['/api/payouts/history'],
    enabled: isAuthenticated,
  });

  // Trigger payout mutation
  const triggerPayoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/payouts/trigger');
    },
    onSuccess: () => {
      toast({
        title: "Payout Triggered",
        description: "Your payout has been scheduled for processing.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payouts/history'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to trigger payout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update payout preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: { payoutThreshold?: string; payoutFrequency?: string }) => {
      await apiRequest('PATCH', '/api/payouts/preferences', preferences);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your payout preferences have been saved.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const getPayoutProgress = () => {
    if (!user?.pendingEarnings || !user?.payoutThreshold) return 0;
    return Math.min((parseFloat(user.pendingEarnings) / parseFloat(user.payoutThreshold)) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Creator Earnings</h1>
          <p className="text-white/80">Track your revenue, manage payouts, and optimize your earnings</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Earnings</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(user?.totalEarnings || 0)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Pending Earnings</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(user?.pendingEarnings || 0)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Views</p>
                  <p className="text-2xl font-bold text-white">{user?.totalViews?.toLocaleString() || 0}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Subscription</p>
                  <Badge 
                    variant={subscriptionStatus?.isPremium ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {subscriptionStatus?.tier || 'Free'}
                  </Badge>
                </div>
                <Star className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Progress */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payout Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-white/80">
                <span>Progress to next payout</span>
                <span>{formatCurrency(user?.pendingEarnings || 0)} / {formatCurrency(user?.payoutThreshold || 50)}</span>
              </div>
              <Progress value={getPayoutProgress()} className="h-2" />
              <div className="flex justify-between items-center">
                <p className="text-sm text-white/60">
                  {getPayoutProgress() >= 100 ? "Ready for payout!" : `${formatCurrency((parseFloat(user?.payoutThreshold || '50') - parseFloat(user?.pendingEarnings || '0')).toFixed(2))} until next payout`}
                </p>
                <Button 
                  onClick={() => triggerPayoutMutation.mutate()}
                  disabled={getPayoutProgress() < 100 || triggerPayoutMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {triggerPayoutMutation.isPending ? "Processing..." : "Request Payout"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur-md border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/20">Transactions</TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-white/20">Payouts</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/20">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Period Selector */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Earnings Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/80">Time Period</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Last 7 days</SelectItem>
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                          <SelectItem value="365">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {reportLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
                        <p className="text-white/60 mt-2">Loading report...</p>
                      </div>
                    ) : earningsReport ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-white/60 text-sm">Total Earnings</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(earningsReport.summary.totalEarnings)}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Total Views</p>
                            <p className="text-xl font-bold text-white">{earningsReport.summary.totalViews.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-white/60 text-sm">Premium Views</p>
                            <p className="text-lg font-semibold text-white">{earningsReport.summary.premiumViews.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Total Payouts</p>
                            <p className="text-lg font-semibold text-white">{formatCurrency(earningsReport.summary.totalPayouts)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
                        <p className="text-white/60">No data available for this period</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {earningsReport ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80">Standard Views</span>
                        <span className="text-white font-semibold">{formatCurrency(earningsReport.summary.breakdown.viewRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/80">Premium Views</span>
                        <span className="text-white font-semibold">{formatCurrency(earningsReport.summary.breakdown.premiumViewRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/80">Subscriptions</span>
                        <span className="text-white font-semibold">{formatCurrency(earningsReport.summary.breakdown.subscriptionRevenue)}</span>
                      </div>
                      <div className="border-t border-white/20 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Total</span>
                          <span className="text-white font-bold text-lg">{formatCurrency(earningsReport.summary.totalEarnings)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto" />
                      <p className="text-white/60 mt-2">Loading breakdown...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.slice(0, 10).map((transaction: any) => (
                      <div key={transaction.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-white/60 text-sm">{format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatCurrency(transaction.creatorShare)}</p>
                          <Badge variant="outline" className="text-xs">
                            {transaction.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No transactions found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                {payoutHistory && payoutHistory.length > 0 ? (
                  <div className="space-y-4">
                    {payoutHistory.map((payout: any) => (
                      <div key={payout.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">Payout #{payout.id}</p>
                          <p className="text-white/60 text-sm">{format(new Date(payout.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatCurrency(payout.netAmount)}</p>
                          <Badge 
                            variant={payout.status === 'completed' ? 'default' : payout.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {payout.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No payouts yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Payout Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-white/80">Payout Threshold</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      min="25"
                      max="500"
                      defaultValue={user?.payoutThreshold || '50.00'}
                      className="bg-white/10 border-white/20 text-white"
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value >= 25 && value <= 500) {
                          updatePreferencesMutation.mutate({ payoutThreshold: value.toFixed(2) });
                        }
                      }}
                    />
                    <p className="text-white/60 text-sm mt-1">Minimum amount before automatic payout ($25 - $500)</p>
                  </div>
                  
                  <div>
                    <Label className="text-white/80">Payout Frequency</Label>
                    <Select 
                      defaultValue={user?.payoutFrequency || 'monthly'}
                      onValueChange={(value) => updatePreferencesMutation.mutate({ payoutFrequency: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-white/60 text-sm mt-1">How often you want to receive payouts</p>
                  </div>

                  <div className="p-4 bg-blue-500/20 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Revenue Split Information</h4>
                    <p className="text-white/80 text-sm">
                      RideReels operates on a 70/30 revenue split. You receive 70% of all revenue generated from your content,
                      while 30% goes to platform maintenance and development.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}