import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  Star, 
  Check, 
  Zap, 
  Crown,
  TrendingUp,
  Eye,
  DollarSign,
  Shield
} from 'lucide-react';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Upload unlimited videos',
      'Basic AI enhancement',
      'Standard revenue share (70%)',
      'Community support',
      'Basic analytics'
    ],
    current: true,
    popular: false,
    priceId: null,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: 'month',
    description: 'Enhanced features for serious creators',
    features: [
      'Everything in Free',
      'Priority AI processing',
      'Advanced analytics',
      'Premium revenue multiplier (1.5x)',
      'Priority support',
      'Custom thumbnails',
      'Advanced editing tools'
    ],
    current: false,
    popular: true,
    priceId: 'price_premium_monthly', // This would be your actual Stripe price ID
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$24.99',
    period: 'month',
    description: 'Maximum earning potential',
    features: [
      'Everything in Premium',
      'Instant AI processing',
      'White-label options',
      'Maximum revenue multiplier (2x)',
      '24/7 dedicated support',
      'Custom branding',
      'Advanced tax reporting',
      'API access'
    ],
    current: false,
    popular: false,
    priceId: 'price_pro_monthly', // This would be your actual Stripe price ID
  },
];

function CheckoutForm({ priceId, onSuccess }: { priceId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create subscription
      const response = await apiRequest('POST', '/api/subscriptions/create', { priceId });
      const { clientSecret } = await response.json();

      // Confirm payment
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription Activated",
          description: "Welcome to premium! Your subscription is now active.",
        });
        onSuccess();
      }
    } catch (error: any) {
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
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-white/5 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#ffffff',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        {isProcessing ? 'Processing...' : 'Subscribe Now'}
      </Button>
    </form>
  );
}

export default function PremiumPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Fetch subscription status
  const { data: subscriptionStatus, refetch: refetchSubscription } = useQuery({
    queryKey: ['/api/subscriptions/status'],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 p-8">
          <CardContent className="text-center">
            <Shield className="w-16 h-16 text-white/60 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-white/80 mb-6">Please sign in to manage your subscription</p>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTier = subscriptionStatus?.tier || 'free';
  const isCurrentlyPremium = subscriptionStatus?.isPremium || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Maximize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Earnings</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Unlock premium features and boost your revenue potential with our creator-focused subscription plans
          </p>
        </div>

        {/* Current Status */}
        {isCurrentlyPremium && (
          <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-md border-purple-400/30 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Premium Active</h3>
                    <p className="text-white/80">You're currently on the {currentTier} plan</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  {currentTier.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">50% More</h3>
              <p className="text-white/80">Average revenue increase with Premium</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6 text-center">
              <Eye className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">2x Views</h3>
              <p className="text-white/80">Premium content gets more visibility</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Higher RPM</h3>
              <p className="text-white/80">Premium multiplier on all earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {SUBSCRIPTION_TIERS.map((tier) => (
            <Card 
              key={tier.id}
              className={`relative bg-white/10 backdrop-blur-md border-white/20 ${
                tier.popular ? 'ring-2 ring-purple-400 scale-105' : ''
              } ${currentTier === tier.id ? 'ring-2 ring-green-400' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {currentTier === tier.id && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white">{tier.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-white/60">/{tier.period}</span>
                </div>
                <p className="text-white/80">{tier.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  {currentTier === tier.id ? (
                    <Button 
                      disabled 
                      className="w-full bg-green-600 hover:bg-green-600 cursor-not-allowed"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : tier.priceId ? (
                    <Button 
                      onClick={() => setSelectedTier(tier.id)}
                      className={`w-full ${
                        tier.popular 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                          : 'bg-white/10 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {tier.popular ? <Star className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                      Upgrade to {tier.name}
                    </Button>
                  ) : (
                    <Button 
                      disabled 
                      className="w-full bg-white/10 hover:bg-white/10 cursor-not-allowed"
                    >
                      Current Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Checkout Modal */}
        {selectedTier && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white">
                  Subscribe to {SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <CheckoutForm 
                    priceId={SUBSCRIPTION_TIERS.find(t => t.id === selectedTier)?.priceId!}
                    onSuccess={() => {
                      setSelectedTier(null);
                      refetchSubscription();
                      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                    }}
                  />
                </Elements>
                
                <div className="mt-6 pt-4 border-t border-white/20">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTier(null)}
                    className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ Section */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-white font-semibold mb-2">How does the revenue multiplier work?</h4>
              <p className="text-white/80">Premium subscribers earn 1.5x more per view, and Pro subscribers earn 2x more. This multiplier applies to all your content revenue.</p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-white/80">Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period.</p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-white/80">We accept all major credit cards, debit cards, and digital wallets through our secure Stripe integration.</p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-2">Do you offer refunds?</h4>
              <p className="text-white/80">We offer a 30-day money-back guarantee if you're not satisfied with your premium experience.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}