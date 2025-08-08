import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Clock,
  CheckCircle,
  User,
  Building2,
  Search,
  Filter,
  TrendingUp,
  Target,
  Users,
  Activity as ActivityIcon,
  BarChart3,
  Eye,
  Plus,
  MessageSquare,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import type { User as UserType, Interaction, Lead } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import ActivityTimeline from "./ActivityTimeline";
import LeadViewDialog from "./LeadViewDialog";

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

const STAGE_COLORS = {
  prospecting: "bg-blue-100 text-blue-800",
  qualification: "bg-yellow-100 text-yellow-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-orange-100 text-orange-800",
  closed_won: "bg-green-100 text-green-800",
  closed_lost: "bg-red-100 text-red-800",
};

export default function LeadActivityReports() {
  const { user } = useAuth();
  const [selectedLead, setSelectedLead] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState<string>("week");
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: allActivities = [], isLoading: activitiesLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/interactions/all"],
  });

  // Filter leads based on user role
  const accessibleLeads = leads.filter((lead: Lead) => {
    if (user?.role === 'super_admin') return true;
    if (user?.role === 'sales_manager') return true; // Manager can see team leads
    return lead.assignedTo === user?.id || lead.createdBy === user?.id;
  });

  // Filter activities based on selections
  const filteredActivities = allActivities.filter((activity: Interaction) => {
    const lead = leads.find(l => l.id === activity.leadId);
    if (!lead) return false;

    // User access check
    if (user?.role === 'sales_agent') {
      const hasAccess = lead.assignedTo === user.id || lead.createdBy === user.id;
      if (!hasAccess) return false;
    }

    const matchesLead = selectedLead === "all" || activity.leadId?.toString() === selectedLead;
    const matchesType = activityFilter === "all" || activity.type === activityFilter;
    
    // Search in description or lead info
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

    return matchesLead && matchesType && matchesSearch && matchesTime;
  });

  // Generate lead activity summary
  const leadActivitySummary = accessibleLeads.map((lead: Lead) => {
    const leadActivities = allActivities.filter(a => a.leadId === lead.id);
    const recentActivities = leadActivities
      .filter(a => a.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 3);

    return {
      ...lead,
      totalActivities: leadActivities.length,
      activitiesByType: {
        call: leadActivities.filter(a => a.type === 'call').length,
        email: leadActivities.filter(a => a.type === 'email').length,
        meeting: leadActivities.filter(a => a.type === 'meeting').length,
        note: leadActivities.filter(a => a.type === 'note').length,
      },
      recentActivities,
      lastActivity: recentActivities[0] || null,
    };
  });

  const getLeadInfo = (leadId: number | null) => {
    if (!leadId) return null;
    return leads.find((lead: Lead) => lead.id === leadId);
  };

  const formatCurrency = (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `৳${(isNaN(numValue) ? 0 : numValue).toLocaleString()}`;
  };

  const getStageLabel = (stage: string) => {
    return stage.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (leadsLoading || activitiesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Activity Reports</h1>
          <p className="text-gray-600">
            Track and analyze activities across {accessibleLeads.length} leads
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger>
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                {accessibleLeads.map((lead: Lead) => (
                  <SelectItem key={lead.id} value={lead.id.toString()}>
                    {lead.contactName}
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

            <div className="flex items-center text-sm text-gray-600">
              {filteredActivities.length} activities found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "summary" | "detailed")}>
        <TabsList>
          <TabsTrigger value="summary">Lead Summary</TabsTrigger>
          <TabsTrigger value="detailed">Activity Timeline</TabsTrigger>
        </TabsList>

        {/* Lead Summary View */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {leadActivitySummary
              .filter(lead => selectedLead === "all" || lead.id.toString() === selectedLead)
              .map((leadSummary) => (
              <Card key={leadSummary.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{leadSummary.contactName}</h3>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        {leadSummary.company}
                      </p>
                    </div>
                    <Badge className={`text-xs ${STAGE_COLORS[leadSummary.stage as keyof typeof STAGE_COLORS]}`}>
                      {getStageLabel(leadSummary.stage)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Lead Value */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Lead Value</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(leadSummary.value)}
                    </span>
                  </div>

                  {/* Activity Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Activities</span>
                      <Badge variant="secondary">{leadSummary.totalActivities}</Badge>
                    </div>
                    
                    {leadSummary.totalActivities > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>{leadSummary.activitiesByType.call} calls</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-green-600" />
                          <span>{leadSummary.activitiesByType.email} emails</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-600" />
                          <span>{leadSummary.activitiesByType.meeting} meetings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-orange-600" />
                          <span>{leadSummary.activitiesByType.note} notes</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Last Activity */}
                  {leadSummary.lastActivity ? (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-1">Last Activity</p>
                      <div className="flex items-center gap-2">
                        {leadSummary.lastActivity.type === 'call' && <Phone className="w-3 h-3 text-blue-600" />}
                        {leadSummary.lastActivity.type === 'email' && <Mail className="w-3 h-3 text-green-600" />}
                        {leadSummary.lastActivity.type === 'meeting' && <Calendar className="w-3 h-3 text-purple-600" />}
                        {leadSummary.lastActivity.type === 'note' && <FileText className="w-3 h-3 text-orange-600" />}
                        <span className="text-xs font-medium capitalize">{leadSummary.lastActivity.type}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(leadSummary.lastActivity.createdAt || ""), "MMM d")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t text-center">
                      <p className="text-xs text-gray-500">No activities yet</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedLeadForView(leadSummary)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLead(leadSummary.id.toString())}
                    >
                      <ActivityIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {leadActivitySummary.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-600">You don't have any leads assigned to you yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Detailed Activity Timeline */}
        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="w-5 h-5" />
                Activity Timeline
                <Badge variant="secondary">{filteredActivities.length} activities</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ActivityIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No activities found</h3>
                    <p>Try adjusting your filters to see more activities</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredActivities.map((activity: Interaction, index: number) => {
                      const IconComponent = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || FileText;
                      const colorClass = ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.note;
                      const leadInfo = getLeadInfo(activity.leadId);

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

                              {/* Lead info */}
                              {leadInfo && (
                                <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">{leadInfo.contactName}</span>
                                  <span>•</span>
                                  <Building2 className="w-3 h-3" />
                                  <span>{leadInfo.company}</span>
                                  <span>•</span>
                                  <DollarSign className="w-3 h-3" />
                                  <span>{formatCurrency(leadInfo.value)}</span>
                                </div>
                              )}
                              
                              {activity.description && (
                                <p className="text-gray-600 text-sm mb-2">
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
        </TabsContent>
      </Tabs>

      {/* Lead View Dialog */}
      <LeadViewDialog
        lead={selectedLeadForView}
        open={!!selectedLeadForView}
        onOpenChange={(open) => !open && setSelectedLeadForView(null)}
      />
    </div>
  );
}