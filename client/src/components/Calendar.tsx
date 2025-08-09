import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Plus, Clock, MapPin, ChevronLeft, ChevronRight, Users, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCalendarEventSchema, type InsertCalendarEvent, type CalendarEvent, type User as UserType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const { toast } = useToast();

  // Role-based access
  const isManagerOrAdmin = user?.role === 'super_admin' || user?.role === 'sales_manager';

  // Get leads for event association
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Get users for team view (managers and admins only)
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: isManagerOrAdmin,
  });

  // Get calendar events based on view mode
  const { data: calendarEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events", viewMode],
    queryFn: async () => {
      if (viewMode === 'team' && isManagerOrAdmin) {
        // For managers/admins in team view, get all team events
        const response = await fetch('/api/calendar-events/team');
        if (!response.ok) throw new Error('Failed to fetch team events');
        return response.json();
      } else {
        // For personal view or agents, get only user's events
        const response = await fetch('/api/calendar-events');
        if (!response.ok) throw new Error('Failed to fetch events');
        return response.json();
      }
    },
  });

  // Form for creating new events
  const form = useForm<InsertCalendarEvent>({
    resolver: zodResolver(insertCalendarEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      type: "meeting",
      leadId: undefined,
      location: "",
      isAllDay: false,
      reminderMinutes: 15,
      status: "scheduled",
      userId: user?.id,
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: InsertCalendarEvent) => {
      const eventData = {
        ...data,
        userId: user?.id,
      };
      console.log("Creating event with data:", eventData);
      const response = await apiRequest("POST", "/api/calendar-events", eventData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      refetchEvents();
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Event scheduled successfully",
      });
    },
    onError: (error: any) => {
      console.error("Failed to create event:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to schedule event. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Calendar navigation
  const navigateCalendar = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (calendarView === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
      } else {
        newDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      }
      return newDate;
    });
  };

  // Generate calendar days based on view
  const generateCalendarDays = () => {
    if (calendarView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  };
  
  const calendarDays = generateCalendarDays();

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return calendarEvents.filter((event: CalendarEvent) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, day);
    });
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500';
      case 'call': return 'bg-green-500';
      case 'task': return 'bg-orange-500';
      case 'reminder': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">Schedule and manage your upcoming events</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Calendar View Selector */}
          <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as 'month' | 'week')} className="w-auto">
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode Selector for Managers/Admins */}
          {isManagerOrAdmin && (
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'my' | 'team')} className="w-auto">
              <TabsList>
                <TabsTrigger value="my" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>My Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Team Calendar</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Event</DialogTitle>
              <DialogDescription>
                Create a new event in your calendar. You can optionally associate it with a lead.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                console.log("Form submitted with data:", data);
                console.log("Form validation errors:", form.formState.errors);
                console.log("Form valid?", form.formState.isValid);
                console.log("User ID:", user?.id);
                if (Object.keys(form.formState.errors).length > 0) {
                  console.error("Form has validation errors, not submitting");
                  return;
                }
                createEventMutation.mutate(data);
              })} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title" {...field} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value instanceof Date 
                              ? field.value.toISOString().slice(0, 16) 
                              : field.value
                            }
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value instanceof Date 
                              ? field.value.toISOString().slice(0, 16) 
                              : field.value
                            }
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
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
                      <FormLabel>Related Lead (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                        value={field.value ? field.value.toString() : "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a lead (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No lead</SelectItem>
                          {(leads as any[]).map((lead: any) => (
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
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location or meeting link" {...field} value={field.value || ""} />
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
                        <Textarea placeholder="Enter event description" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createEventMutation.isPending} className="w-full">
                  {createEventMutation.isPending ? "Scheduling..." : "Schedule Event"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5" />
              <span>
                {calendarView === 'week' 
                  ? `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateCalendar('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateCalendar('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-8">Loading calendar...</div>
          ) : (
            <div className={`grid gap-1 ${calendarView === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = calendarView === 'week' || isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                const dayHeight = calendarView === 'week' ? 'min-h-[200px]' : 'min-h-[100px]';
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`${dayHeight} p-1 border border-gray-200 dark:border-gray-700 ${
                      isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                    } ${isDayToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isDayToday ? 'text-blue-600 dark:text-blue-400' : 
                      isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {calendarView === 'week' ? format(day, 'EEE d') : format(day, 'd')}
                    </div>
                    
                    {/* Events for this day */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, calendarView === 'week' ? 8 : 3).map(event => {
                        const eventUser = viewMode === 'team' && isManagerOrAdmin 
                          ? users.find(u => u.id === event.userId) 
                          : null;
                        return (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                            title={`${event.title} - ${format(new Date(event.startDate), 'HH:mm')}${eventUser ? ` (${eventUser.employeeName || eventUser.email})` : ''}`}
                          >
                            {calendarView === 'week' && (
                              <div className="font-medium">{format(new Date(event.startDate), 'HH:mm')}</div>
                            )}
                            {viewMode === 'team' && eventUser ? `${eventUser.employeeName?.split(' ')[0] || 'User'}: ` : ''}{event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > (calendarView === 'week' ? 8 : 3) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayEvents.length - (calendarView === 'week' ? 8 : 3)} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-4">Loading events...</div>
          ) : calendarEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No upcoming events scheduled
            </div>
          ) : (
            <div className="space-y-3">
              {calendarEvents
                .filter((event: CalendarEvent) => new Date(event.startDate) >= new Date())
                .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 5)
                .map((event: CalendarEvent) => {
                  const eventUser = viewMode === 'team' && isManagerOrAdmin 
                    ? users.find(u => u.id === event.userId) 
                    : null;
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={`${getEventTypeColor(event.type)} text-white border-0`}>
                          {event.type}
                        </Badge>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {event.title}
                            {viewMode === 'team' && eventUser && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({eventUser.employeeName || eventUser.email})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(event.startDate), 'MMM d, yyyy h:mm a')}</span>
                            {event.location && (
                              <>
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{event.status}</Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}