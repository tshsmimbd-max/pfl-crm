import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA4_DmNyn0egbuGyS98CZlHBYnU1-DvORk",
  authDomain: "paperflycrm.firebaseapp.com",
  projectId: "paperflycrm",
  storageBucket: "paperflycrm.firebasestorage.app",
  appId: "1:347441158621:web:6f7f939c6de3a36190fe34",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Configure providers
googleProvider.addScope('email');
googleProvider.addScope('profile');

microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');

// Auth functions
export const signInWithGoogle = () => {
  return signInWithRedirect(auth, googleProvider);
};

export const signInWithMicrosoft = () => {
  return signInWithRedirect(auth, microsoftProvider);
};

export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error("Auth redirect error:", error);
    throw error;
  }
};

export const signOutUser = () => {
  return signOut(auth);
};

export default app;