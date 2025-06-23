import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Phone, 
  Mail, 
  Video, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  User
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInteractionSchema, type InsertInteraction, type Interaction, type Lead } from "@shared/schema";

interface ActivityTimelineProps {
  leadId?: number;
}

const ACTIVITY_TYPES = [
  { value: "call", label: "Phone Call", icon: Phone, color: "text-blue-600" },
  { value: "email", label: "Email", icon: Mail, color: "text-green-600" },
  { value: "meeting", label: "Meeting", icon: Video, color: "text-purple-600" },
  { value: "note", label: "Note", icon: MessageSquare, color: "text-gray-600" },
  { value: "follow-up", label: "Follow-up", icon: Calendar, color: "text-orange-600" },
];

export default function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: leadId ? ["/api/interactions", leadId] : ["/api/interactions"],
    queryFn: async () => {
      const url = leadId ? `/api/interactions?leadId=${leadId}` : "/api/interactions";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch interactions");
      return response.json();
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  const form = useForm<InsertInteraction>({
    resolver: zodResolver(insertInteractionSchema),
    defaultValues: {
      leadId: leadId || 0,
      type: "call",
      description: "",
      notes: "",
      outcome: "",
      nextAction: "",
      scheduledAt: new Date().toISOString().slice(0, 16),
    },
  });

  const createInteractionMutation = useMutation({
    mutationFn: async (data: InsertInteraction) => {
      const response = await apiRequest("POST", "/api/interactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      form.reset();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Activity added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInteraction) => {
    createInteractionMutation.mutate({
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    });
  };

  const getActivityIcon = (type: string) => {
    const activityType = ACTIVITY_TYPES.find(t => t.value === type);
    const IconComponent = activityType?.icon || MessageSquare;
    return <IconComponent className={`w-4 h-4 ${activityType?.color || 'text-gray-600'}`} />;
  };

  const getActivityLabel = (type: string) => {
    return ACTIVITY_TYPES.find(t => t.value === type)?.label || type;
  };

  const getLeadName = (leadId: number) => {
    const lead = leads.find((l: Lead) => l.id === leadId);
    return lead ? `${lead.contactName} - ${lead.company}` : `Lead #${leadId}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case 'positive':
      case 'success':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
      case 'failed':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <ArrowRight className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          <p className="text-sm text-gray-600">Track all interactions and activities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {!leadId && (
                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead</FormLabel>
                        <FormControl>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a lead" />
                            </SelectTrigger>
                            <SelectContent>
                              {leads.map((lead: Lead) => (
                                <SelectItem key={lead.id} value={lead.id.toString()}>
                                  {lead.contactName} - {lead.company}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
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
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the activity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detailed notes about the interaction" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action</FormLabel>
                      <FormControl>
                        <Input placeholder="What's the next step?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInteractionMutation.isPending}>
                    {createInteractionMutation.isPending ? "Adding..." : "Add Activity"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {interactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No activities recorded yet</p>
                <p className="text-sm text-gray-500">Add your first activity to start tracking interactions</p>
              </CardContent>
            </Card>
          ) : (
            interactions.map((interaction: Interaction, index: number) => {
              const { date, time } = formatDateTime(interaction.scheduledAt);
              const isLast = index === interactions.length - 1;

              return (
                <div key={interaction.id} className="relative">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 bg-white border-2 border-gray-200 rounded-full">
                        {getActivityIcon(interaction.type)}
                      </div>
                      {!isLast && (
                        <div className="w-px h-16 bg-gray-200 mx-auto mt-2"></div>
                      )}
                    </div>

                    <Card className="flex-1">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {getActivityLabel(interaction.type)}
                              </Badge>
                              {interaction.outcome && (
                                <div className="flex items-center space-x-1">
                                  {getOutcomeIcon(interaction.outcome)}
                                  <span className="text-xs text-gray-600 capitalize">
                                    {interaction.outcome}
                                  </span>
                                </div>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 mt-1">
                              {interaction.description}
                            </h4>
                            {!leadId && (
                              <p className="text-sm text-gray-600 flex items-center mt-1">
                                <User className="w-3 h-3 mr-1" />
                                {getLeadName(interaction.leadId)}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <div>{date}</div>
                            <div>{time}</div>
                          </div>
                        </div>

                        {interaction.notes && (
                          <p className="text-sm text-gray-700 mb-2">
                            {interaction.notes}
                          </p>
                        )}

                        {interaction.nextAction && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-md">
                            <p className="text-xs font-medium text-blue-900 mb-1">Next Action:</p>
                            <p className="text-xs text-blue-800">{interaction.nextAction}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}