import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signInWithMicrosoft, handleAuthRedirect } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { Mail, Building2, Shield, User, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const { user, isLoading, firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

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

  const onLogin = async (data: LoginData) => {
    try {
      const response = await apiRequest("POST", "/api/login", data);
      const userData = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      const errorData = error.message.includes('verify your email') ? {
        title: "Email verification required",
        description: "Please check the server console for your verification link and click it to verify your email before logging in.",
        variant: "destructive" as const
      } : {
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive" as const
      };
      
      toast(errorData);
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      const response = await apiRequest("POST", "/api/register", data);
      const userData = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Registration successful",
        description: userData.emailVerificationSent 
          ? "Account created! Please check the server console for your verification link and click it before logging in." 
          : "Welcome to Paperfly CRM!",
      });
      
      // Switch to login tab after successful registration
      if (userData.emailVerificationSent) {
        setActiveTab("login");
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
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
                Sign in with OAuth or create an account to get started
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign In to Your Account</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* OAuth Buttons */}
                    <div className="space-y-3">
                      <Button 
                        onClick={handleGoogleSignIn}
                        variant="outline" 
                        className="w-full h-12 flex items-center justify-center space-x-3 border-2 hover:bg-gray-50"
                      >
                        <Mail className="w-5 h-5 text-red-500" />
                        <span>Continue with Gmail</span>
                      </Button>

                      <Button 
                        onClick={handleMicrosoftSignIn}
                        variant="outline" 
                        className="w-full h-12 flex items-center justify-center space-x-3 border-2 hover:bg-gray-50"
                      >
                        <Building2 className="w-5 h-5 text-blue-500" />
                        <span>Continue with Outlook</span>
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Or sign in with email</span>
                      </div>
                    </div>

                    {/* Email/Password Form */}
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input placeholder="Enter your email" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input type="password" placeholder="Enter your password" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">
                          Sign In
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Your Account</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* OAuth Buttons */}
                    <div className="space-y-3">
                      <Button 
                        onClick={handleGoogleSignIn}
                        variant="outline" 
                        className="w-full h-12 flex items-center justify-center space-x-3 border-2 hover:bg-gray-50"
                      >
                        <Mail className="w-5 h-5 text-red-500" />
                        <span>Sign up with Gmail</span>
                      </Button>

                      <Button 
                        onClick={handleMicrosoftSignIn}
                        variant="outline" 
                        className="w-full h-12 flex items-center justify-center space-x-3 border-2 hover:bg-gray-50"
                      >
                        <Building2 className="w-5 h-5 text-blue-500" />
                        <span>Sign up with Outlook</span>
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">Or create account with email</span>
                      </div>
                    </div>

                    {/* Registration Form */}
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input placeholder="First name" className="pl-10" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input placeholder="Last name" className="pl-10" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input placeholder="Enter your email" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input type="password" placeholder="Create a password" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">
                          Create Account
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Shield className="w-4 h-4" />
                <span>Secure authentication with multiple options</span>
              </div>
            </div>
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