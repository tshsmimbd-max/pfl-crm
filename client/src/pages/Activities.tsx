import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Phone, Mail, FileText, TrendingUp } from "lucide-react";
import ActivityTimeline from "@/components/ActivityTimeline";
import AddActivityDialog from "@/components/AddActivityDialog";
import { useQuery } from "@tanstack/react-query";

export default function Activities() {
  const { user } = useAuth();
  const [addActivityOpen, setAddActivityOpen] = useState(false);

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/interactions/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Calculate activity stats
  const stats = {
    total: activities.length,
    calls: activities.filter((a: any) => a.type === 'call').length,
    emails: activities.filter((a: any) => a.type === 'email').length,
    meetings: activities.filter((a: any) => a.type === 'meeting').length,
    notes: activities.filter((a: any) => a.type === 'note').length,
    scheduled: activities.filter((a: any) => a.scheduledAt && !a.completedAt).length,
    completed: activities.filter((a: any) => a.completedAt).length,
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

      {/* Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityTimeline
            userId={user?.id}
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
                {leads.slice(0, 5).map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
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

      {/* Add Activity Dialog */}
      <AddActivityDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
      />
    </div>
  );
}