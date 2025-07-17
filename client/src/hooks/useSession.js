
// useSession.js
import { useState, useEffect } from 'react';

export const useSession = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Replace this with your actual API call to get the current user session
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        
        const data = await response.json();
        setSession(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  // If you need a function to refresh the session
  const refreshSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        throw new Error('Failed to refresh session');
      }
      const data = await response.json();
      setSession(data);
    } catch (err) {
      setError(err.message);
      console.error('Error refreshing session:', err);
    } finally {
      setLoading(false);
    }
  };

  return { session, loading, error, refreshSession };
};

export default useSession;
