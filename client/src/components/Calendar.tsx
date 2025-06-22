import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Plus, Clock, Users, Video, Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInteractionSchema, type InsertInteraction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const { toast } = useToast();

  const { data: leads } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: interactions } = useQuery({
    queryKey: ["/api/interactions"],
  });

  const form = useForm<InsertInteraction>({
    resolver: zodResolver(insertInteractionSchema),
    defaultValues: {
      leadId: undefined,
      type: "meeting",
      subject: "",
      description: "",
      scheduledAt: new Date(),
    },
  });

  const createInteractionMutation = useMutation({
    mutationFn: async (data: InsertInteraction) => {
      await apiRequest("POST", "/api/interactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInteraction) => {
    createInteractionMutation.mutate(data);
  };

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call":
        return Phone;
      case "email":
        return Users;
      case "meeting":
        return Video;
      default:
        return Clock;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-800";
      case "email":
        return "bg-green-100 text-green-800";
      case "meeting":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Mock interactions for demo (in real app, filter actual interactions by date)
  const getInteractionsForDate = (date: Date) => {
    // This would filter actual interactions by date
    return [
      {
        id: 1,
        type: "meeting",
        subject: "Product Demo with TechCorp",
        scheduledAt: new Date(date.setHours(10, 0)),
        leadId: 1,
      },
      {
        id: 2,
        type: "call",
        subject: "Follow-up call with DataFlow",
        scheduledAt: new Date(date.setHours(14, 30)),
        leadId: 2,
      },
    ];
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const dayInteractions = getInteractionsForDate(new Date(date));

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
            isToday ? "bg-primary-50" : ""
          } ${isSelected ? "bg-primary-100" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium ${isToday ? "text-primary-600" : "text-gray-900"}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {dayInteractions.slice(0, 2).map((interaction, index) => {
              const Icon = getInteractionIcon(interaction.type);
              return (
                <div
                  key={index}
                  className={`text-xs px-2 py-1 rounded truncate ${getInteractionColor(interaction.type)}`}
                >
                  <Icon className="w-3 h-3 inline mr-1" />
                  {interaction.subject}
                </div>
              );
            })}
            {dayInteractions.length > 2 && (
              <div className="text-xs text-gray-500">+{dayInteractions.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const todayInteractions = getInteractionsForDate(new Date());
  const upcomingInteractions = [
    ...todayInteractions,
    ...getInteractionsForDate(new Date(Date.now() + 86400000)), // Tomorrow
  ].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">Schedule and manage your meetings</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
              >
                Day
              </Button>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600 hover:bg-primary-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Meeting subject" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="meeting">Meeting</SelectItem>
                                <SelectItem value="call">Phone Call</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="note">Note</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="leadId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Lead</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select lead" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {leads?.map((lead) => (
                                <SelectItem key={lead.id} value={lead.id.toString()}>
                                  {lead.name} - {lead.company}
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
                      name="scheduledAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date & Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
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
                            <Textarea
                              placeholder="Meeting description or agenda"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createInteractionMutation.isPending}>
                        {createInteractionMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 bg-white">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0">
                {renderCalendarGrid()}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 bg-gray-50 border-l border-gray-200">
            <div className="p-6">
              {/* Today's Schedule */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {todayInteractions.length > 0 ? (
                    <div className="space-y-3">
                      {todayInteractions.map((interaction, index) => {
                        const Icon = getInteractionIcon(interaction.type);
                        const lead = leads?.find(l => l.id === interaction.leadId);
                        
                        return (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getInteractionColor(interaction.type)}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{interaction.subject}</p>
                              <p className="text-xs text-gray-600">{lead?.company}</p>
                              <p className="text-xs text-gray-500">{formatTime(interaction.scheduledAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No meetings scheduled for today</p>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingInteractions.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingInteractions.slice(0, 5).map((interaction, index) => {
                        const Icon = getInteractionIcon(interaction.type);
                        const lead = leads?.find(l => l.id === interaction.leadId);
                        const isToday = interaction.scheduledAt.toDateString() === new Date().toDateString();
                        
                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getInteractionColor(interaction.type)}`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{interaction.subject}</p>
                              <p className="text-xs text-gray-600">{lead?.company}</p>
                              <p className="text-xs text-gray-500">
                                {isToday ? "Today" : interaction.scheduledAt.toLocaleDateString()} at {formatTime(interaction.scheduledAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
