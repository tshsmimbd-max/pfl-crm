import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Clock,
  CheckCircle,
  User as UserIcon,
  Building2,
  Search,
  Filter,
  TrendingUp,
  Target,
  Users,
  Activity as ActivityIcon
} from "lucide-react";
import { format } from "date-fns";
import type { User, Interaction } from "@shared/schema";

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

export default function AgentActivityManagement() {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("week");

  const { data: teamReport = [], isLoading: reportLoading } = useQuery<any[]>({
    queryKey: ["/api/interactions/team-report"],
  });

  const { data: allActivities = [], isLoading: activitiesLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions/all"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["/api/leads"],
  });

  // Filter activities based on selections
  const filteredActivities = allActivities.filter((activity: Interaction) => {
    const matchesAgent = selectedAgent === "all" || activity.userId === selectedAgent;
    const matchesType = activityFilter === "all" || activity.type === activityFilter;
    
    // Search in description or lead info
    const lead = leads.find((l: any) => l.id === activity.leadId);
    const searchText = `${activity.description || ""} ${lead?.contactName || ""} ${lead?.company || ""}`.toLowerCase();
    const matchesSearch = searchTerm === "" || searchText.includes(searchTerm.toLowerCase());

    // Time filter
    const now = Date.now();
    const activityTime = new Date(activity.createdAt || "").getTime();
    let matchesTime = true;
    
    switch (timeFilter) {
      case "today":
        matchesTime = (now - activityTime) < 24 * 60 * 60 * 1000;
        break;
      case "week":
        matchesTime = (now - activityTime) < 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        matchesTime = (now - activityTime) < 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return matchesAgent && matchesType && matchesSearch && matchesTime;
  });

  const getAgentStats = (userId: string) => {
    const userReport = teamReport.find((r: any) => r.user.id === userId);
    return userReport ? userReport.stats : null;
  };

  const getLeadInfo = (leadId: number | null) => {
    if (!leadId) return null;
    return leads.find((lead: any) => lead.id === leadId);
  };

  if (reportLoading || activitiesLoading || usersLoading || leadsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="lg:w-1/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Team Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {teamReport.map((report: any) => (
                  <div key={report.user.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{report.user.name}</h4>
                        <p className="text-sm text-gray-500 capitalize">{report.user.role.replace('_', ' ')}</p>
                      </div>
                      <Badge variant={report.stats.totalActivities > 20 ? "default" : "secondary"}>
                        {report.stats.totalActivities} activities
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span>{report.stats.activitiesByType.call} calls</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-green-600" />
                        <span>{report.stats.activitiesByType.email} emails</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>{report.stats.activitiesByType.meeting} meetings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <span>{report.stats.activitiesByType.note} notes</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Assigned Leads:</span>
                        <span className="font-medium">{report.stats.assignedLeads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Leads:</span>
                        <span className="font-medium text-green-600">{report.stats.activeLeads}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => setSelectedAgent(report.user.id)}
                    >
                      View Activities
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:w-2/3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="w-5 h-5" />
              Agent Activity Feed
            </CardTitle>
            
            {/* Filters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {users.filter((u) => u.role === 'sales_agent').map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.employeeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] px-6">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activities found for the selected filters</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {filteredActivities.map((activity: Interaction, index: number) => {
                    const IconComponent = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || FileText;
                    const colorClass = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.note;
                    const leadInfo = getLeadInfo(activity.leadId);
                    const userInfo = users.find((u) => u.id === activity.userId);
                    const stats = getAgentStats(activity.userId || '');

                    return (
                      <div key={activity.id} className="relative">
                        {index !== filteredActivities.length - 1 && (
                          <div className="absolute left-6 top-16 w-px h-8 bg-gray-200" />
                        )}
                        
                        <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
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
                              <span className="text-xs text-gray-500">
                                {format(new Date(activity.createdAt || ""), "MMM d, h:mm a")}
                              </span>
                            </div>

                            {/* Agent info */}
                            {userInfo && (
                              <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
                                <UserIcon className="w-3 h-3" />
                                <span className="font-medium">{userInfo.employeeName}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {userInfo.role.replace('_', ' ')}
                                </Badge>
                              </div>
                            )}

                            {/* Lead info */}
                            {leadInfo && (
                              <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
                                <UserIcon className="w-3 h-3" />
                                <span>{leadInfo.contactName}</span>
                                <span>•</span>
                                <Building2 className="w-3 h-3" />
                                <span>{leadInfo.company}</span>
                              </div>
                            )}
                            
                            {activity.description && (
                              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              {activity.completedAt && (
                                <span className="text-green-600 font-medium">
                                  Completed: {format(new Date(activity.completedAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              )}
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
    </div>
  );
}