import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Mail, Lock, Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const verifyCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type LoginData = z.infer<typeof loginSchema>;
type VerifyCodeData = z.infer<typeof verifyCodeSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
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
      
      if (response.ok) {
        queryClient.setQueryData(["/api/user"], result.user);
        
        if (!result.user.emailVerified) {
          setVerificationEmail(result.user.email);
          setShowVerification(true);
        } else {
          toast({
            title: "Welcome!",
            description: "You have been logged in successfully.",
          });
        }
      } else {
        throw new Error(result.message || "Login failed");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
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
      
      if (response.ok) {
        queryClient.setQueryData(["/api/user"], result.user);
        
        toast({
          title: "Email verified",
          description: "Welcome to Paperfly CRM!",
        });

        setShowVerification(false);
      } else {
        throw new Error(result.message || "Verification failed");
      }
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
                Sign in to access your sales dashboard
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Sign In</CardTitle>
              </CardHeader>
              <CardContent>
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
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                type="email"
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
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                    <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                      {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Secure Lead Management</h2>
              <p className="text-gray-600 mb-4">
                Paperfly CRM provides comprehensive lead tracking and sales pipeline management
                for your sales team.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Track leads through your sales pipeline</li>
                <li>• Manage customer interactions and notes</li>
                <li>• Set and monitor sales targets</li>
                <li>• Generate detailed analytics and reports</li>
                <li>• Collaborate with your team</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}