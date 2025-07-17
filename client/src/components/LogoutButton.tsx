import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function LogoutButton() {
  const { logout } = useAuth();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/logout', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      logout();
      toast({
        title: 'Logged out successfully',
        description: 'You have been signed out of RideReels',
      });
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      // Still logout locally even if server call fails
      logout();
      toast({
        title: 'Logged out',
        description: 'You have been signed out locally',
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
    </Button>
  );
}