import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Shield } from "lucide-react";

// Schema for requesting password reset
const requestResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Schema for resetting password with code
const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RequestResetData = z.infer<typeof requestResetSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetDialog({ open, onOpenChange }: PasswordResetDialogProps) {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const requestForm = useForm<RequestResetData>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (data: RequestResetData) => {
      await apiRequest("POST", "/api/request-password-reset", data);
    },
    onSuccess: () => {
      setEmail(requestForm.getValues().email);
      resetForm.setValue('email', requestForm.getValues().email);
      setStep('reset');
      toast({
        title: "Reset Code Sent",
        description: "Check your email for a 6-digit reset code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset code",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      await apiRequest("POST", "/api/reset-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: "Your password has been reset successfully. You can now log in with your new password.",
      });
      onOpenChange(false);
      // Reset form state
      setStep('request');
      setEmail('');
      requestForm.reset();
      resetForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Invalid or expired reset code",
        variant: "destructive",
      });
    },
  });

  const handleRequestReset = (data: RequestResetData) => {
    requestResetMutation.mutate(data);
  };

  const handleResetPassword = (data: ResetPasswordData) => {
    resetPasswordMutation.mutate(data);
  };

  const handleBackToRequest = () => {
    setStep('request');
    setEmail('');
    resetForm.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'request' ? (
              <>
                <Mail className="h-5 w-5" />
                Reset Password
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                Enter Reset Code
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'request' 
              ? "Enter your email address to receive a password reset code."
              : "Enter the 6-digit code sent to your email and your new password."
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'request' ? (
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
              <FormField
                control={requestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={requestResetMutation.isPending}
                >
                  {requestResetMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Reset Code
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" disabled {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reset Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter new password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm new password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBackToRequest}
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Reset Password
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}