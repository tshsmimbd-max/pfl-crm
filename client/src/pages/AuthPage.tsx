import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { Mail, Lock, User, Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const verifyCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type VerifyCodeData = z.infer<typeof verifyCodeSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

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
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const verifyForm = useForm<VerifyCodeData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const onLogin = async (data: LoginData) => {
    try {
      const response = await apiRequest("POST", "/api/login", data);
      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Login failed";

      if (errorMessage.includes("verify")) {
        setVerificationEmail(data.email);
        setShowVerification(true);
        toast({
          title: "Email verification required",
          description:
            "Please verify your email first. Check the email for your verification code.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      const response = await apiRequest("POST", "/api/register", data);
      const result = await response.json();

      toast({
        title: "Registration successful",
        description:
          "Please check the server console for your verification code.",
      });

      setVerificationEmail(data.email);
      setShowVerification(true);
      registerForm.reset();
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const onVerifyCode = async (data: VerifyCodeData) => {
    try {
      const response = await apiRequest("POST", "/api/verify-code", {
        email: verificationEmail,
        code: data.code,
      });
      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Email verified",
        description: "Welcome to Paperfly CRM!",
      });

      setShowVerification(false);
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
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

  if (showVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Verify Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              We've sent a verification code to {verificationEmail}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Enter Verification Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...verifyForm}>
                <form
                  onSubmit={verifyForm.handleSubmit(onVerifyCode)}
                  className="space-y-4"
                >
                  <FormField
                    control={verifyForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter 6-digit code"
                            className="text-center text-lg tracking-widest"
                            maxLength={6}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Verify Email
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowVerification(false)}
                  >
                    Back to Login
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
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
                Sign in to your account or create a new one
              </p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign In to Your Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit(onLogin)}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input
                                    placeholder="Enter your email"
                                    className="pl-10"
                                    {...field}
                                  />
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
                                  <Input
                                    type="password"
                                    placeholder="Enter your password"
                                    className="pl-10"
                                    {...field}
                                  />
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
                  <CardContent>
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit(onRegister)}
                        className="space-y-4"
                      >
                        <FormField
                          control={registerForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input
                                    placeholder="Enter your full name"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input
                                    placeholder="Enter your email"
                                    className="pl-10"
                                    {...field}
                                  />
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
                                  <Input
                                    type="password"
                                    placeholder="Create a password"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <Input
                                    type="password"
                                    placeholder="Confirm your password"
                                    className="pl-10"
                                    {...field}
                                  />
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
                <span>Secure authentication with email verification</span>
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
                    <p className="text-white/80 text-sm">
                      Track and manage leads through your sales pipeline with
                      drag-and-drop interface
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Sales Analytics</h4>
                    <p className="text-white/80 text-sm">
                      Get insights into your sales performance and team
                      productivity with detailed reports
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Activity Tracking</h4>
                    <p className="text-white/80 text-sm">
                      Log interactions, calls, meetings, and follow-ups with
                      detailed timeline
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Team Collaboration</h4>
                    <p className="text-white/80 text-sm">
                      Work together seamlessly with role-based access and user
                      management
                    </p>
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
