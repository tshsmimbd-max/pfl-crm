import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Target, User, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Notification } from "@shared/schema";

export default function NotificationSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
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
    },
  });

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const port = window.location.port || (protocol === "wss:" ? "443" : "80");
    const wsUrl = `${protocol}//${window.location.hostname}:${port}/ws`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected for notifications");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          // Show toast notification
          toast({
            title: data.notification.title,
            description: data.notification.message,
          });
          
          // Refresh notifications
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, [toast]);

  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData);
    }
  }, [notificationsData]);

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleViewDetails = (notification: Notification) => {
    // Mark as read first
    handleMarkAsRead(notification.id);
    
    // Navigate to appropriate page based on notification type
    if (notification.type === "target_assigned") {
      setLocation("/targets");
    } else if (notification.type === "lead_update") {
      setLocation("/leads");
    } else if (notification.type === "target_reminder") {
      setLocation("/analytics");
    }
    
    // Close notification panel
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "target_assigned":
        return Target;
      case "target_reminder":
        return AlertCircle;
      case "lead_update":
        return User;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "target_assigned":
        return "bg-primary-100 text-primary-700";
      case "target_reminder":
        return "bg-warning-100 text-warning-700";
      case "lead_update":
        return "bg-success-100 text-success-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const recentNotifications = notifications.slice(0, 5);

  // Auto-show notification for new important notifications
  useEffect(() => {
    const importantUnread = unreadNotifications.filter(n => 
      n.type === "target_assigned" && 
      new Date().getTime() - new Date(n.createdAt).getTime() < 60000 // Less than 1 minute old
    );

    if (importantUnread.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [unreadNotifications, isOpen]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* Notification Toggle Button (if needed in header) */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount?.count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">{unreadCount.count}</span>
            </span>
          )}
        </Button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed top-4 right-4 z-50 w-96">
          <Card className="shadow-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount?.count > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount.count} new
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {recentNotifications.length > 0 ? (
                <div className="space-y-0">
                  {recentNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const isUnread = !notification.read;

                    return (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          isUnread ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 cursor-pointer" onClick={() => handleViewDetails(notification)}>
                                <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"} text-gray-900`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                {isUnread && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              )}
            </CardContent>
            {notifications.length > 5 && (
              <div className="p-4 border-t border-gray-200 text-center">
                <Button variant="link" size="sm" className="text-primary-600">
                  View all notifications
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Target Assignment Notification (Special Case) */}
      {unreadNotifications.some(n => n.type === "target_assigned") && (
        <div className="fixed top-20 right-4 z-50 w-80">
          {unreadNotifications
            .filter(n => n.type === "target_assigned")
            .slice(0, 1)
            .map((notification) => (
              <Card key={notification.id} className="shadow-lg border-l-4 border-l-warning-500 bg-warning-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-warning-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-warning-800">{notification.title}</p>
                      <p className="text-sm text-warning-700 mt-1">{notification.message}</p>
                      <div className="flex space-x-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-warning-700 border-warning-200 hover:bg-warning-100"
                          onClick={() => handleViewDetails(notification)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-warning-600 hover:text-warning-700"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </>
  );
}
