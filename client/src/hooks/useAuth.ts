import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', { credentials: 'include' });
        if (response.status === 401) return null;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Auth query error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 30000, // Cache for 30 seconds to prevent rapid refetches
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
