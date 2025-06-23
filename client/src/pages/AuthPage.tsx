import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signInWithMicrosoft, handleAuthRedirect } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Mail, Building2, Shield } from "lucide-react";

export default function AuthPage() {
  const { toast } = useToast();
  const { user, isLoading, firebaseUser } = useAuth();

  // Handle redirect result on page load
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await handleAuthRedirect();
        if (result?.user) {
          toast({
            title: "Login successful",
            description: `Welcome, ${result.user.displayName || result.user.email}!`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Login failed",
          description: error.message || "Authentication failed",
          variant: "destructive",
        });
      }
    };

    handleRedirect();
  }, [toast]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      await signInWithMicrosoft();
    } catch (error: any) {
      toast({
        title: "Login failed", 
        description: error.message || "Failed to sign in with Microsoft",
        variant: "destructive",
      });
    }
  };

  // Redirect if already authenticated
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Auth Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Welcome to Paperfly CRM
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in with your Gmail or Outlook account to get started
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Choose Your Sign-In Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleGoogleSignIn}
                  variant="outline" 
                  className="w-full h-12 flex items-center justify-center space-x-3 border-2 hover:bg-gray-50"
                >
                  <Mail className="w-5 h-5 text-red-500" />
                  <span>Continue with Gmail</span>
                </Button>

                <Separator className="my-4" />

                <Button 
                  onClick={handleMicrosoftSignIn}
                  variant="outline" 
                  className="w-full h-12 flex items-center justify-center space-x-3 border-2 hover:bg-gray-50"
                >
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <span>Continue with Outlook</span>
                </Button>

                <div className="mt-6 text-center">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>Secure authentication powered by Firebase</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-8 text-white lg:flex lg:flex-col lg:justify-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">
                Transform Your Sales Process
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Lead Management</h4>
                    <p className="text-white/80 text-sm">Track and manage leads through your sales pipeline with drag-and-drop interface</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Sales Analytics</h4>
                    <p className="text-white/80 text-sm">Get insights into your sales performance and team productivity with detailed reports</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Activity Tracking</h4>
                    <p className="text-white/80 text-sm">Log interactions, calls, meetings, and follow-ups with detailed timeline</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Team Collaboration</h4>
                    <p className="text-white/80 text-sm">Work together seamlessly with role-based access and user management</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}