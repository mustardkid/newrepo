import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// GoogleOAuthProvider removed - using session-based auth
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import LandingPage from "@/pages/LandingPage";
import Home from "@/pages/Home";
import Dashboard from "@/pages/dashboard";
import EnhancedDashboard from "@/pages/enhanced-dashboard";
import CreatorDashboard from "@/pages/creator-dashboard";
import Upload from "@/pages/upload";
import Admin from "@/pages/admin";
import AIHighlights from "@/pages/ai-highlights";
import Notifications from "@/pages/notifications";
import EmailPreview from "@/pages/email-preview";
import Earnings from "@/pages/earnings";
import Premium from "@/pages/premium";
import PublishingDashboard from "@/pages/PublishingDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/public" component={LandingPage} />
      
      {/* Main route based on authentication */}
      <Route path="/" component={() => {
        if (!isAuthenticated) {
          return <LandingPage />;
        }
        
        // For authenticated users, show appropriate dashboard
        const userRole = (user as any)?.role;
        if (userRole === 'admin' || userRole === 'moderator') {
          return <EnhancedDashboard />;
        } else {
          return <CreatorDashboard />;
        }
      }} />
      
      {/* Protected routes - require authentication */}
      {isAuthenticated ? (
        <>
          <Route path="/dashboard" component={CreatorDashboard} />
          <Route path="/upload" component={Upload} />
          <Route path="/earnings" component={Earnings} />
          
          {/* Admin-only routes */}
          {(user as any)?.role === 'admin' || (user as any)?.role === 'moderator' ? (
            <>
              <Route path="/admin" component={Admin} />
              <Route path="/admin/ai-highlights" component={AIHighlights} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/email-preview" component={EmailPreview} />
              <Route path="/premium" component={Premium} />
              <Route path="/publishing" component={PublishingDashboard} />
            </>
          ) : null}
        </>
      ) : null}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
