import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Upload, Bot, DollarSign, Menu, UserCircle } from "lucide-react";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSignUp = () => {
    window.location.href = "/api/login";
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-deep-gradient">
      {/* Navigation */}
      <nav className="glass-card bg-card-gradient sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Play className="text-accent-pink text-2xl" />
              <h1 className="text-white text-xl font-bold">RideReels</h1>
            </div>
            <div className="hidden md:flex space-x-6">
              <button className="text-white hover:text-accent-pink transition-colors">Home</button>
              <button className="text-white hover:text-accent-pink transition-colors">Features</button>
              <button className="text-white hover:text-accent-pink transition-colors">About</button>
              <button className="text-white hover:text-accent-pink transition-colors">Contact</button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <Button
                  onClick={handleSignIn}
                  variant="ghost"
                  className="text-white hover:text-accent-pink"
                >
                  Sign In
                </Button>
              </div>
              <button className="md:hidden text-white">
                <Menu />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            The <span className="gradient-text">YouTube</span> for UTV/ATV Enthusiasts
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Upload your raw UTV footage and watch AI transform it into viral content. 
            Earn money from every view while connecting with fellow riders worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleSignUp}
              className="bg-light-gradient text-gray-900 px-8 py-4 text-lg font-semibold hover-lift transition-all hover:bg-light-gradient/90"
            >
              Start Creating
            </Button>
            <Button
              variant="outline"
              className="bg-pink-gradient text-white px-8 py-4 text-lg font-semibold hover-lift transition-all border-0 hover:bg-pink-gradient/90"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="glass-card bg-card-gradient border-white/10 hover-lift transition-all">
            <CardContent className="p-8">
              <div className="text-accent-pink text-3xl mb-4">
                <Upload />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Easy Upload</h3>
              <p className="text-white/70">Drag & drop your raw UTV footage. Our AI handles the rest.</p>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card-gradient border-white/10 hover-lift transition-all">
            <CardContent className="p-8">
              <div className="text-accent-pink text-3xl mb-4">
                <Bot />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Enhancement</h3>
              <p className="text-white/70">Automatic editing, music, and optimization for maximum engagement.</p>
            </CardContent>
          </Card>
          <Card className="glass-card bg-card-gradient border-white/10 hover-lift transition-all">
            <CardContent className="p-8">
              <div className="text-accent-pink text-3xl mb-4">
                <DollarSign />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Earn Revenue</h3>
              <p className="text-white/70">Get paid for every view with our transparent revenue sharing.</p>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Section */}
        <div className="max-w-md mx-auto">
          <Card className="glass-card bg-card-gradient border-white/10">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Join RideReels</h3>
                <p className="text-white/70">Start your journey to viral UTV content</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-accent-pink"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-accent-pink"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="border-white/20"
                      />
                      <label htmlFor="remember" className="text-white/70 text-sm">
                        Remember me
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-accent-pink text-sm hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-light-gradient text-gray-900 py-3 font-semibold hover-lift transition-all hover:bg-light-gradient/90"
                  >
                    Sign Up
                  </Button>
                </div>
              </form>
              <div className="mt-6 text-center">
                <p className="text-white/70">
                  Already have an account?{" "}
                  <button
                    onClick={handleSignIn}
                    className="text-accent-pink hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
