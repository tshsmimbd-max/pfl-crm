import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Clock,
  CheckCircle,
  User,
  Building2,
  Filter,
  Download,
  BarChart3,
  TrendingUp
} from "lucide-react";
import type { Interaction, Lead, User as UserType } from "@shared/schema";

interface TeamActivityReportsProps {
  userId?: string;
}

export default function TeamActivityReports({ userId }: TeamActivityReportsProps) {
  const [selectedLead, setSelectedLead] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [activityType, setActivityType] = useState<string>("all");

  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: teamActivities = [], isLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions/team", { userId, leadId: selectedLead, user: selectedUser, dateRange, type: activityType }],
    enabled: !!userId,
  });

  const ACTIVITY_ICONS = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    note: FileText,
  };

  const ACTIVITY_COLORS = {
    call: "bg-blue-100 text-blue-600 border-blue-200",
    email: "bg-green-100 text-green-600 border-green-200", 
    meeting: "bg-purple-100 text-purple-600 border-purple-200",
    note: "bg-orange-100 text-orange-600 border-orange-200",
  };

  // Filter activities based on selected filters
  const filteredActivities = teamActivities.filter(activity => {
    if (selectedLead !== "all" && activity.leadId !== parseInt(selectedLead)) return false;
    if (selectedUser !== "all" && activity.userId !== selectedUser) return false;
    if (activityType !== "all" && activity.type !== activityType) return false;
    
    // Date range filtering
    if (dateRange !== "all" && activity.createdAt) {
      const activityDate = new Date(activity.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      
      switch (dateRange) {
        case "today":
          if (daysDiff > 1) return false;
          break;
        case "week":
          if (daysDiff > 7) return false;
          break;
        case "month":
          if (daysDiff > 30) return false;
          break;
        case "quarter":
          if (daysDiff > 90) return false;
          break;
      }
    }
    
    return true;
  });

  // Generate activity statistics
  const activityStats = {
    total: filteredActivities.length,
    completed: filteredActivities.filter(a => a.completedAt).length,
    byType: filteredActivities.reduce((acc, activity) => {
      if (activity.type) {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    byUser: filteredActivities.reduce((acc, activity) => {
      if (activity.userId) {
        const user = allUsers.find(u => u.id === activity.userId);
        const userName = user ? user.employeeName || user.email : activity.userId;
        if (userName) {
          acc[userName] = (acc[userName] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<string, number>),
  };

  const getLeadInfo = (leadId: number) => {
    return allLeads.find(lead => lead.id === leadId);
  };

  const getUserInfo = (userId: string) => {
    return allUsers.find(user => user.id === userId);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Activity Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Lead</Label>
              <Select value={selectedLead} onValueChange={setSelectedLead}>
                <SelectTrigger>
                  <SelectValue placeholder="All leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All leads</SelectItem>
                  {allLeads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.contactName} - {lead.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Team Member</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.employeeName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="quarter">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold">{activityStats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{activityStats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {activityStats.total > 0 ? Math.round((activityStats.completed / activityStats.total) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold">{Object.keys(activityStats.byUser).length}</p>
              </div>
              <User className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Team Activity Timeline ({filteredActivities.length} activities)
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activities found with the selected filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {filteredActivities.map((activity, index) => {
                  const IconComponent = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || FileText;
                  const colorClass = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.note;
                  const leadInfo = activity.leadId ? getLeadInfo(activity.leadId) : null;
                  const userInfo = activity.userId ? getUserInfo(activity.userId) : null;

                  return (
                    <div key={activity.id} className="relative">
                      {index !== filteredActivities.length - 1 && (
                        <div className="absolute left-6 top-16 w-px h-8 bg-gray-200" />
                      )}
                      
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900 capitalize">
                                {activity.type}
                              </h4>
                              {activity.completedAt && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Lead and User info */}
                          <div className="flex items-center space-x-4 mb-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <User className="w-3 h-3" />
                              <span>{userInfo?.employeeName || userInfo?.email || activity.userId}</span>
                            </div>
                            {leadInfo && (
                              <>
                                <span>•</span>
                                <div className="flex items-center space-x-2">
                                  <Building2 className="w-3 h-3" />
                                  <span>{leadInfo.contactName} - {leadInfo.company}</span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {activity.description && (
                            <div className="bg-gray-50 p-3 rounded-md mb-2">
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                {activity.description}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                            {activity.createdAt && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Created {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                            {activity.completedAt && (
                              <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3" />
                                <span className="font-medium">
                                  Completed {new Date(activity.completedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}