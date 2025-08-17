import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDailyRevenueSchema, type InsertDailyRevenue } from "@shared/schema";
import { z } from "zod";
import { Save, X, DollarSign, ShoppingCart, Users, Calendar, Upload } from "lucide-react";
import { format } from "date-fns";
import BulkRevenueUpload from "./BulkRevenueUpload";

interface SuperAdminRevenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SuperAdminRevenueDialogWithUploadProps {
  singleEntryOpen: boolean;
  onSingleEntryOpenChange: (open: boolean) => void;
  bulkUploadOpen: boolean;
  onBulkUploadOpenChange: (open: boolean) => void;
}

// Form schema for revenue entry
const revenueFormSchema = z.object({
  assignedUser: z.string().min(1, "Please select a user"),
  merchantCode: z.string().min(1, "Please select a merchant"),
  date: z.string(),
  revenue: z.number().min(1, "Revenue must be greater than 0"),
  orders: z.number().min(1, "Orders must be at least 1"),
  description: z.string().optional(),
});

type RevenueFormData = z.infer<typeof revenueFormSchema>;

function SingleRevenueDialog({ open, onOpenChange }: SuperAdminRevenueDialogProps) {
  const { toast } = useToast();

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users/assignment"],
    enabled: open,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueFormSchema),
    defaultValues: {
      assignedUser: "",
      merchantCode: "",
      date: format(new Date(), "yyyy-MM-dd"),
      revenue: 0,
      orders: 1,
      description: "",
    },
  });

  const createRevenueMutation = useMutation({
    mutationFn: async (data: RevenueFormData) => {
      const revenueData = {
        assignedUser: data.assignedUser,
        merchantCode: data.merchantCode,
        revenue: data.revenue,
        orders: data.orders,
        description: data.description || "",
        date: data.date,
      };
      console.log("Creating revenue entry:", revenueData);
      return await apiRequest("POST", "/api/daily-revenue", revenueData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/team-performance"] });
      onOpenChange(false);
      form.reset();
      
      toast({
        title: "Revenue Entry Created",
        description: `Revenue entry added successfully. Summary email sent to assigned user.`,
      });
    },
    onError: (error: any) => {
      console.error("Revenue creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create revenue entry",
        variant: "destructive",
      });
    },
  });

  const selectedUser = form.watch("assignedUser");
  const selectedMerchantCode = form.watch("merchantCode");

  // Get available merchant codes for selected user
  const availableMerchants = customers.filter(customer => 
    selectedUser ? customer.assignedAgent === selectedUser : true
  );

  // Get selected customer details
  const selectedCustomer = customers.find(customer => 
    customer.merchantCode === selectedMerchantCode
  );

  const onSubmit = (data: RevenueFormData) => {
    console.log("Form submission:", data);
    createRevenueMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Add Daily Revenue Entry
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Assigned User */}
            <FormField
              control={form.control}
              name="assignedUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assigned User
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset merchant code when user changes
                      form.setValue("merchantCode", "");
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.employeeName || user.fullName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Merchant Code */}
            <FormField
              control={form.control}
              name="merchantCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant Code</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select merchant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableMerchants.map((customer: any) => (
                        <SelectItem key={customer.merchantCode || customer.id} value={customer.merchantCode || customer.id.toString()}>
                          {customer.contactName} - {customer.company} {customer.merchantCode ? `(${customer.merchantCode})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="font-medium">{selectedCustomer.company}</div>
                <div className="text-muted-foreground">
                  Contact: {selectedCustomer.contactName}
                </div>
                <div className="text-muted-foreground">
                  Email: {selectedCustomer.email}
                </div>
              </div>
            )}

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Revenue */}
              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Revenue (৳)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Orders */}
              <FormField
                control={form.control}
                name="orders"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Today's Orders
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this revenue entry..."
                      className="resize-none"
                      rows={3}
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={createRevenueMutation.isPending}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {createRevenueMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminRevenueWithUpload({ 
  singleEntryOpen, 
  onSingleEntryOpenChange, 
  bulkUploadOpen, 
  onBulkUploadOpenChange 
}: SuperAdminRevenueDialogWithUploadProps) {
  return (
    <>
      <SingleRevenueDialog open={singleEntryOpen} onOpenChange={onSingleEntryOpenChange} />
      <BulkRevenueUpload open={bulkUploadOpen} onOpenChange={onBulkUploadOpenChange} />
    </>
  );
}

export default SuperAdminRevenueDialog;