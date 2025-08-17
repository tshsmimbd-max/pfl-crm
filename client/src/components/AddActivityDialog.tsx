import React from "react";
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
import { insertInteractionSchema, type InsertInteraction } from "@shared/schema";
import { CalendarIcon, Save, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: number;
}

const ACTIVITY_TYPES = [
  { value: "call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
];

export default function AddActivityDialog({ open, onOpenChange, leadId }: AddActivityDialogProps) {
  const { toast } = useToast();

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
    enabled: open && !leadId,
  });

  const form = useForm<InsertInteraction>({
    resolver: zodResolver(insertInteractionSchema),
    defaultValues: {
      leadId: leadId || undefined,
      type: "note",
      description: "",
      completedAt: new Date(), // Default to current time for completed activity
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: InsertInteraction) => {
      return await apiRequest("POST", "/api/interactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions/all"] });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/interactions`] });
      }
      onOpenChange(false);
      form.reset();
      toast({
        title: "Success",
        description: "Activity added successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Activity creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add activity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInteraction) => {
    // Convert Date objects to ISO strings for API submission
    const formattedData: any = {
      ...data,
      completedAt: data.completedAt instanceof Date ? data.completedAt.toISOString() : data.completedAt,
    };
    // Remove any undefined fields to prevent validation errors
    Object.keys(formattedData).forEach(key => {
      if (formattedData[key] === undefined) {
        delete formattedData[key];
      }
    });
    createActivityMutation.mutate(formattedData);
  };

  const watchType = form.watch("type");
  const isSchedulable = watchType === "call" || watchType === "meeting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="activity-dialog-description">
        <DialogHeader>
          <DialogTitle>Add Completed Activity</DialogTitle>
        </DialogHeader>
        <div id="activity-dialog-description" className="sr-only">
          Record a completed interaction or action for this lead (call made, email sent, meeting held, etc.)
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!leadId && (
                <FormField
                  control={form.control}
                  name="leadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(leads) && leads.map((lead: any) => (
                            <SelectItem key={lead.id} value={lead.id.toString()}>
                              {lead.contactName} - {lead.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      placeholder="Enter activity details..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="completedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Date & Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, -1) : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined;
                        field.onChange(date);
                      }}
                      max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={createActivityMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}