import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Clock,
  CheckCircle,
  Plus,
  User,
  Building2,
  Filter
} from "lucide-react";

import type { Interaction } from "@shared/schema";

interface ActivityTimelineProps {
  leadId?: number;
  userId?: string;
  activities?: any[];
  leads?: any[];
  showLeadInfo?: boolean;
  onAddActivity?: () => void;
  showFilters?: boolean;
}

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

export default function ActivityTimeline({ 
  leadId, 
  userId, 
  activities: propActivities, 
  leads: propLeads = [], 
  showLeadInfo = true, 
  onAddActivity,
  showFilters = false
}: ActivityTimelineProps) {
  const [selectedLead, setSelectedLead] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [activityType, setActivityType] = useState<string>("all");
  const { data: fetchedActivities = [], isLoading } = useQuery<any[]>({
    queryKey: leadId ? [`/api/leads/${leadId}/interactions`] : [`/api/interactions/user/${userId}`],
    enabled: !propActivities && !!(leadId || userId),
    retry: 1,
  });

  const { data: fetchedLeads = [] } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    enabled: !propLeads.length && !!userId && !leadId, // Only fetch leads when showing user activities
  });

  const activities = propActivities || fetchedActivities;
  const leads = propLeads.length > 0 ? propLeads : fetchedLeads;

  // Filter out any non-interaction data that might have been passed incorrectly
  const baseActivities = activities.filter((item: any) => 
    item && typeof item === 'object' && 'type' in item && 'description' in item
  );

  // Apply filters when showFilters is enabled
  const validActivities = useMemo(() => {
    if (!showFilters) return baseActivities;

    return baseActivities.filter(activity => {
      // Lead filter
      if (selectedLead !== "all" && activity.leadId !== parseInt(selectedLead)) {
        return false;
      }

      // Activity type filter
      if (activityType !== "all" && activity.type !== activityType) {
        return false;
      }

      // Date range filter
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
  }, [baseActivities, selectedLead, activityType, dateRange, showFilters]);

  const getLeadInfo = (leadId: number) => {
    return leads.find((lead: any) => lead.id === leadId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Filter className="w-4 h-4 mr-2" />
              Activity Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead-filter">Filter by Lead</Label>
                <Select value={selectedLead} onValueChange={setSelectedLead}>
                  <SelectTrigger>
                    <SelectValue placeholder="All leads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leads</SelectItem>
                    {leads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id.toString()}>
                        {lead.contactName} - {lead.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-filter">Date Range</Label>
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

              <div className="space-y-2">
                <Label htmlFor="type-filter">Activity Type</Label>
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
      )}

      {/* Activities List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center text-lg">
              <Clock className="w-5 h-5 mr-2" />
              {leadId ? "Lead Activities" : "My Activities"}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {validActivities.length} activities found
              {showFilters && (selectedLead !== "all" || dateRange !== "all" || activityType !== "all") && 
                " (filtered)"
              }
            </p>
          </div>
          {onAddActivity && (
            <Button onClick={onAddActivity} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          )}
        </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {validActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activities recorded yet</p>
              {onAddActivity && (
                <Button 
                  variant="outline" 
                  onClick={onAddActivity}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {validActivities.map((activity: Interaction, index: number) => {
                const IconComponent = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || FileText;
                const colorClass = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.note;
                const leadInfo = !leadId && activity.leadId ? getLeadInfo(activity.leadId) : null;

                return (
                  <div key={activity.id} className="relative">
                    {index !== validActivities.length - 1 && (
                      <div className="absolute left-6 top-12 w-px h-8 bg-gray-200" />
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
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

                        {/* Lead info for user timeline */}
                        {showLeadInfo && leadInfo && (
                          <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
                            <User className="w-3 h-3" />
                            <span>{leadInfo.contactName}</span>
                            <span>•</span>
                            <Building2 className="w-3 h-3" />
                            <span>{leadInfo.company}</span>
                          </div>
                        )}
                        
                        {activity.description && (
                          <div className="bg-gray-50 p-3 rounded-md mb-2">
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">
                              {activity.description}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center space-x-4">
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
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      </Card>
    </div>
  );
}