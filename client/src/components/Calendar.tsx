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
import { Calendar as CalendarIcon, Plus, Clock, MapPin, ChevronLeft, ChevronRight, Users, User, Bell, CheckCircle, Calendar as CalendarViewIcon, List, Sun } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCalendarEventSchema, type InsertCalendarEvent, type CalendarEvent, type User as UserType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfDay, endOfDay, addDays, parseISO } from "date-fns";

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'today' | 'upcoming'>('month');
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
          <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as 'month' | 'week' | 'today' | 'upcoming')} className="w-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today" className="flex items-center space-x-1">
                <Sun className="w-4 h-4" />
                <span>Today</span>
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center space-x-1">
                <List className="w-4 h-4" />
                <span>Upcoming</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center space-x-1">
                <CalendarViewIcon className="w-4 h-4" />
                <span>Week</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>Month</span>
              </TabsTrigger>
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
              <form onSubmit={form.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
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
                {calendarView === 'today' 
                  ? "Today's Schedule"
                  : calendarView === 'upcoming' 
                  ? "Upcoming Events"
                  : calendarView === 'week' 
                  ? `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </span>
            </CardTitle>
            {(calendarView === 'month' || calendarView === 'week') && (
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-8">Loading calendar...</div>
          ) : calendarView === 'today' ? (
            <TodayScheduleView 
              events={calendarEvents} 
              users={users}
              viewMode={viewMode}
              isManagerOrAdmin={isManagerOrAdmin}
              getEventTypeColor={getEventTypeColor}
            />
          ) : calendarView === 'upcoming' ? (
            <UpcomingEventsView 
              events={calendarEvents} 
              users={users}
              viewMode={viewMode}
              isManagerOrAdmin={isManagerOrAdmin}
              getEventTypeColor={getEventTypeColor}
            />
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

      {/* Upcoming Events - only show in month/week view */}
      {(calendarView === 'month' || calendarView === 'week') && (
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
      )}
    </div>
  );
}

// Today's Schedule View Component
interface ScheduleViewProps {
  events: CalendarEvent[];
  users: UserType[];
  viewMode: 'my' | 'team';
  isManagerOrAdmin: boolean;
  getEventTypeColor: (type: string) => string;
}

function TodayScheduleView({ events, users, viewMode, isManagerOrAdmin, getEventTypeColor }: ScheduleViewProps) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  const todayEvents = events
    .filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= todayStart && eventDate <= todayEnd;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  if (todayEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <Sun className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No events scheduled for today</h3>
        <p className="text-gray-500 dark:text-gray-400">Take this time to plan or catch up on other tasks!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Today's Schedule</h2>
          <p className="text-gray-500 dark:text-gray-400">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'}
        </Badge>
      </div>

      <div className="space-y-3">
        {todayEvents.map((event, index) => {
          const eventUser = viewMode === 'team' && isManagerOrAdmin 
            ? users.find(u => u.id === event.userId) 
            : null;
          const eventTime = format(new Date(event.startDate), 'h:mm a');
          const endTime = format(new Date(event.endDate || event.startDate), 'h:mm a');
          const isCurrentEvent = new Date() >= new Date(event.startDate) && new Date() <= new Date(event.endDate || event.startDate);
          
          return (
            <div 
              key={event.id} 
              className={`p-4 rounded-lg border-l-4 ${getEventTypeColor(event.type)} bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow ${
                isCurrentEvent ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="outline" className={`${getEventTypeColor(event.type)} text-white border-0 text-xs`}>
                      {event.type}
                    </Badge>
                    {isCurrentEvent && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Live</span>
                        </div>
                      </Badge>
                    )}
                    {viewMode === 'team' && eventUser && (
                      <Badge variant="secondary" className="text-xs">
                        {eventUser.employeeName?.split(' ')[0] || 'User'}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{event.title}</h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{eventTime} - {endTime}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{event.description}</p>
                  )}
                </div>
                
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {event.status}
                  </Badge>
                  {event.reminderMinutes && (
                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                      <Bell className="w-3 h-3" />
                      <span>{event.reminderMinutes}m reminder</span>
                    </div>
                  )}
                </div>
              </div>
              
              {index < todayEvents.length - 1 && (
                <div className="mt-4 border-b border-gray-100 dark:border-gray-700"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingEventsView({ events, users, viewMode, isManagerOrAdmin, getEventTypeColor }: ScheduleViewProps) {
  const now = new Date();
  const nextWeek = addDays(now, 7);
  
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= now;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 15); // Show next 15 events

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const groups: { [key: string]: CalendarEvent[] } = {};
    events.forEach(event => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  };

  const groupedEvents = groupEventsByDate(upcomingEvents);

  if (upcomingEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No upcoming events</h3>
        <p className="text-gray-500 dark:text-gray-400">Your calendar is clear. Time to schedule something new!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upcoming Events</h2>
          <p className="text-gray-500 dark:text-gray-400">Your scheduled events for the next few weeks</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {upcomingEvents.length} upcoming
        </Badge>
      </div>

      {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => {
        const eventDate = new Date(dateKey);
        const isToday = isSameDay(eventDate, now);
        const isTomorrow = isSameDay(eventDate, addDays(now, 1));
        
        let dateLabel = format(eventDate, 'EEEE, MMMM d');
        if (isToday) dateLabel = 'Today';
        else if (isTomorrow) dateLabel = 'Tomorrow';
        
        return (
          <div key={dateKey} className="space-y-3">
            <div className="flex items-center space-x-3">
              <h3 className={`font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {dateLabel}
              </h3>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              <Badge variant="secondary" className="text-xs">
                {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </Badge>
            </div>
            
            <div className="space-y-2 ml-4">
              {dayEvents.map(event => {
                const eventUser = viewMode === 'team' && isManagerOrAdmin 
                  ? users.find(u => u.id === event.userId) 
                  : null;
                
                return (
                  <div key={event.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={`${getEventTypeColor(event.type)} text-white border-0 text-xs`}>
                          {event.type}
                        </Badge>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {event.title}
                            {viewMode === 'team' && eventUser && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({eventUser.employeeName?.split(' ')[0] || 'User'})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{format(new Date(event.startDate), 'h:mm a')}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}