import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SimpleAuth } from '@/components/SimpleAuth';
import { useLocation } from 'wouter';

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleAuthSuccess = (user: any) => {
    console.log('Auth success, user:', user);
    // Redirect to home (/) which will route to the appropriate dashboard
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-2xl font-bold text-white">RideReels</span>
          </div>
          <div className="flex items-center space-x-4">
            <GoogleSignInButton onSuccess={handleAuthSuccess} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold text-white mb-6">
              The YouTube for
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                UTV/ATV Enthusiasts
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Upload your raw UTV footage and let our AI transform it into viral content. 
              Share the thrill, earn revenue, and join the ultimate off-road community.
            </p>
            <div className="flex flex-col items-center gap-6">
              <SimpleAuth onAuthSuccess={handleAuthSuccess} />
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">Or sign in with Google:</p>
                <GoogleSignInButton onSuccess={handleAuthSuccess} />
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle className="text-white">AI-Powered Enhancement</CardTitle>
                <CardDescription className="text-gray-300">
                  Our advanced AI analyzes your footage to create viral-worthy content with optimal pacing, effects, and engagement.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <CardTitle className="text-white">Revenue Sharing</CardTitle>
                <CardDescription className="text-gray-300">
                  Earn money from your adventures. Get paid when your content performs well across our platform and social media.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <CardTitle className="text-white">Community Driven</CardTitle>
                <CardDescription className="text-gray-300">
                  Connect with fellow riders, share experiences, and discover the best trails and adventures worldwide.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How It Works */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Upload Raw Footage</h3>
                <p className="text-gray-300">Upload your UTV/ATV adventures directly from your phone or camera</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Enhancement</h3>
                <p className="text-gray-300">Our AI analyzes and enhances your content for maximum engagement</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Earn & Share</h3>
                <p className="text-gray-300">Your content goes live and you earn revenue from views and engagement</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white text-3xl">Ready to Start Your Journey?</CardTitle>
                <CardDescription className="text-gray-300 text-lg">
                  Join thousands of riders already earning from their adventures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <SimpleAuth onAuthSuccess={handleAuthSuccess} />
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-2">Or sign in with Google:</p>
                    <GoogleSignInButton onSuccess={handleAuthSuccess} />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4 text-center">
                  Free to join • No credit card required • Start earning today
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-8 mt-16">
        <div className="max-w-7xl mx-auto border-t border-white/20 pt-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 RideReels. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}