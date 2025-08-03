import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, Phone, Mail, FileText, TrendingUp, Filter, Search } from "lucide-react";
import ActivityTimeline from "@/components/ActivityTimeline";
import AddActivityDialog from "@/components/AddActivityDialog";
import { useQuery } from "@tanstack/react-query";
import type { Interaction, Lead } from "@shared/schema";

export default function Activities() {
  const { user } = useAuth();
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string>("all");
  const [activityType, setActivityType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/interactions/all"],
    enabled: !!user?.id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Filter activities based on selections
  const filteredActivities = (activities as Interaction[]).filter((activity) => {
    // Lead filter
    if (selectedLead !== "all" && activity.leadId?.toString() !== selectedLead) {
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
      const dayInMs = 24 * 60 * 60 * 1000;
      
      switch (dateRange) {
        case "today":
          if (activityDate.toDateString() !== now.toDateString()) return false;
          break;
        case "week":
          if (now.getTime() - activityDate.getTime() > 7 * dayInMs) return false;
          break;
        case "month":
          if (now.getTime() - activityDate.getTime() > 30 * dayInMs) return false;
          break;
      }
    }
    
    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        activity.subject?.toLowerCase().includes(term) ||
        activity.description?.toLowerCase().includes(term) ||
        activity.type?.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  // Calculate activity stats from filtered activities
  const stats = {
    total: filteredActivities.length,
    calls: filteredActivities.filter((a) => a.type === 'call').length,
    emails: filteredActivities.filter((a) => a.type === 'email').length,
    meetings: filteredActivities.filter((a) => a.type === 'meeting').length,
    notes: filteredActivities.filter((a) => a.type === 'note').length,
    scheduled: filteredActivities.filter((a) => a.scheduledAt && !a.completedAt).length,
    completed: filteredActivities.filter((a) => a.completedAt).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Activities</h1>
          <p className="text-gray-600 mt-1">Track and manage your sales activities</p>
        </div>
        <Button onClick={() => setAddActivityOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Phone Calls</p>
                <p className="text-2xl font-bold text-gray-900">{stats.calls}</p>
              </div>
              <Phone className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails</p>
                <p className="text-2xl font-bold text-gray-900">{stats.emails}</p>
              </div>
              <Mail className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meetings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.meetings}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Activity Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="lead-filter">Lead</Label>
              <Select value={selectedLead} onValueChange={setSelectedLead}>
                <SelectTrigger>
                  <SelectValue placeholder="All Leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  {(leads as Lead[]).map((lead) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.contactName} - {lead.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="type-filter">Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Phone Calls</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="note">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-filter">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="search">Search Activities</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search subject, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedLead("all");
                  setActivityType("all");
                  setDateRange("all");
                  setSearchTerm("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Section */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="lead-specific">Lead-Specific View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityTimeline
                activities={filteredActivities}
                leads={leads as Lead[]}
                showLeadInfo={true}
                onAddActivity={() => setAddActivityOpen(true)}
              />
            </div>
            
            <div className="space-y-4">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium">Scheduled</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{stats.scheduled}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{stats.completed}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium">Notes</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{stats.notes}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Leads */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(leads as Lead[]).slice(0, 5).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                           onClick={() => setSelectedLead(lead.id.toString())}>
                        <div>
                          <p className="font-medium text-sm">{lead.contactName}</p>
                          <p className="text-xs text-gray-500">{lead.company}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">৳{lead.value.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 capitalize">{lead.stage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="lead-specific" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedLead !== "all" ? (
              <>
                <ActivityTimeline
                  leadId={parseInt(selectedLead)}
                  activities={filteredActivities.filter(a => a.leadId?.toString() === selectedLead)}
                  leads={leads as Lead[]}
                  showLeadInfo={false}
                  onAddActivity={() => setAddActivityOpen(true)}
                />
                <div>
                  {(() => {
                    const lead = (leads as Lead[]).find(l => l.id.toString() === selectedLead);
                    return lead ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>Lead Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h3 className="font-semibold text-lg">{lead.contactName}</h3>
                            <p className="text-gray-600">{lead.company}</p>
                            <p className="text-sm text-gray-500">{lead.email}</p>
                            {lead.phone && <p className="text-sm text-gray-500">{lead.phone}</p>}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Value:</span>
                            <span className="font-semibold">৳{lead.value.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Stage:</span>
                            <span className="capitalize">{lead.stage}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Source:</span>
                            <span>{lead.leadSource}</span>
                          </div>
                          {lead.notes && (
                            <div>
                              <span className="text-sm font-medium">Notes:</span>
                              <p className="text-sm text-gray-600 mt-1">{lead.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : null;
                  })()}
                </div>
              </>
            ) : (
              <div className="col-span-2 flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a lead from the filter to view lead-specific activities</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>



      {/* Add Activity Dialog */}
      <AddActivityDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
      />
    </div>
  );
}