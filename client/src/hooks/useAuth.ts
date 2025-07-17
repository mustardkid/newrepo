import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const userToken = localStorage.getItem('userToken');
      
      // Always try to check for session-based auth (Google OAuth) first
      const headers: HeadersInit = {
        ...(userToken ? { "x-user-token": userToken } : {}),
      };
      
      const res = await fetch("/api/auth/user", {
        credentials: "include",
        headers
      });
      
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
    retry: false,
    enabled: true, // Always enabled to check for session-based auth
  });

  const login = (userData: any) => {
    if (userData.id) {
      // For simple auth, store user info in localStorage
      localStorage.setItem('userToken', userData.id);
      localStorage.setItem('userEmail', userData.email);
      
      // Force reload the page to update the UI
      window.location.reload();
    }
  };

  const logout = () => {
    // Clear all authentication tokens
    localStorage.removeItem('userToken');
    localStorage.removeItem('userEmail');
    
    // Reload page to update UI
    window.location.reload();
  };

  return {
    user,
    isAuthenticated: !!user, // Check session/token auth
    isLoading,
    login,
    logout,
  };
}
