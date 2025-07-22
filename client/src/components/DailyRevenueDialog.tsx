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
import { Save, X, DollarSign, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface DailyRevenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DailyRevenueDialog({ open, onOpenChange }: DailyRevenueDialogProps) {
  const { toast } = useToast();

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const form = useForm<InsertDailyRevenue>({
    resolver: zodResolver(insertDailyRevenueSchema),
    defaultValues: {
      customerId: undefined,
      date: format(new Date(), "yyyy-MM-dd"),
      revenue: 0,
      orders: 1,
      description: "",
    },
  });

  const createRevenueMutation = useMutation({
    mutationFn: async (data: InsertDailyRevenue) => {
      await apiRequest("POST", "/api/daily-revenue", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Success",
        description: "Daily revenue entry created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create daily revenue entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDailyRevenue) => {
    createRevenueMutation.mutate(data);
  };

  const formatCurrency = (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `৳${(isNaN(numValue) ? 0 : numValue).toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Add Daily Revenue
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.contactName} - {customer.company}
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
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orders"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Orders *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of the revenue entry..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRevenueMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {createRevenueMutation.isPending ? "Saving..." : "Save Revenue"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}