import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { insertCustomerSchema, type InsertCustomer } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Create a form schema without createdBy since it's added automatically
const customerFormSchema = insertCustomerSchema.omit({ createdBy: true });
type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CreateCustomerDialog({ 
  open, 
  onOpenChange 
}: CreateCustomerDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch users for assigned agent dropdown
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "super_admin" && open,
  });

  // Fetch leads for Lead ID dropdown
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    enabled: open,
  });
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      merchantCode: "",
      merchantName: "",
      rateChart: "",
      contactPerson: "",
      phoneNumber: "",
      assignedAgent: user?.id || "",
      leadId: undefined,
      productType: "",
      notes: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      console.log("Mutation function called with:", data);
      const customerData = {
        ...data,
        createdBy: user?.id || "",
      };
      console.log("Making API request with:", customerData);
      const result = await apiRequest("POST", "/api/customers", customerData);
      console.log("API request successful:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      // Show specific error messages for better user experience
      const errorMessage = error.response?.data?.message || error.message || "Failed to create customer";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form validation errors:", form.formState.errors);
    createCustomerMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record with merchant information and contact details.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Merchant Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="merchantCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="MC001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="merchantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Company Ltd." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rateChart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Chart *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ISD, Pheripheri, OSD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+880 1700-000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="assignedAgent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Agent *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assigned agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {user && (
                          <SelectItem key={user.id} value={user.id}>
                            {user.employeeName || user.fullName || user.email} (Me)
                          </SelectItem>
                        )}
                        {users?.filter((u: any) => u.id !== user?.id).map((userOption: any) => (
                          <SelectItem key={userOption.id} value={userOption.id}>
                            {userOption.employeeName || userOption.fullName || userOption.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead ID (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                            value={field.value?.toString() || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select related lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Lead</SelectItem>
                        {leads?.map((lead: any) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            Lead #{lead.id} - {lead.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software, Hardware, Service" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about the customer..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createCustomerMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCustomerMutation.isPending}
                onClick={() => {
                  console.log("Submit button clicked");
                  console.log("Form state:", form.formState);
                  console.log("Form errors:", form.formState.errors);
                }}
              >
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}