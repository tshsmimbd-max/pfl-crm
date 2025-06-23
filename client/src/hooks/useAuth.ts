import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync Firebase user with backend
  const { data: backendUser, isLoading: isLoadingBackend } = useQuery({
    queryKey: ["/api/user", firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      
      try {
        // Get Firebase ID token
        const idToken = await firebaseUser.getIdToken();
        
        // Send to backend for verification and user creation/sync
        const response = await apiRequest("POST", "/api/auth/firebase", {
          idToken,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        
        return response.json();
      } catch (error) {
        console.error("Backend auth sync error:", error);
        return null;
      }
    },
    enabled: !!firebaseUser,
    retry: false,
  });

  // Also check for traditional auth if no Firebase user
  const { data: traditionalUser, isLoading: isLoadingTraditional } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', { credentials: 'include' });
        if (response.status === 401) return null;
        return response.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !firebaseUser && !isLoadingAuth,
    retry: false,
  });

  const finalUser = backendUser || traditionalUser;
  const finalLoading = isLoadingAuth || isLoadingBackend || isLoadingTraditional;

  return {
    user: finalUser,
    firebaseUser,
    isLoading: finalLoading,
    isAuthenticated: !!finalUser,
  };
}
