import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Target, 
  Plus, 
  Bell,
  ArrowUp,
  Handshake,
  UserPlus,
  Calendar,
  FileText,
  BarChart3,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("This Month");

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/metrics"],
  });

  const { data: teamPerformance, isLoading: teamLoading } = useQuery({
    queryKey: ["/api/analytics/team-performance"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
  });

  if (metricsLoading || teamLoading || leadsLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospecting":
        return "bg-blue-100 text-blue-800";
      case "qualification":
        return "bg-yellow-100 text-yellow-800";
      case "proposal":
        return "bg-purple-100 text-purple-800";
      case "negotiation":
        return "bg-green-100 text-green-800";
      case "closed_won":
        return "bg-success-100 text-success-600";
      case "closed_lost":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const recentLeads = leads?.slice(0, 5) || [];
  const recentNotifications = notifications?.slice(0, 3) || [];

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your sales today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount?.count > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">{unreadCount.count}</span>
                  </span>
                )}
              </Button>
            </div>
            <Button className="bg-primary-600 hover:bg-primary-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Target Notifications (for admins) */}
        {user?.role === "admin" && (
          <div className="mb-6">
            <Alert className="bg-warning-50 border-warning-200">
              <Bell className="h-4 w-4 text-warning-500" />
              <AlertDescription className="text-warning-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-warning-800">Target Updates Required</h3>
                    <p className="text-sm mt-1">
                      3 sales team members need Q4 targets assigned. Review and set targets to help team track progress.
                    </p>
                  </div>
                  <Button variant="link" className="text-warning-700 hover:text-warning-800 p-0">
                    Manage Targets →
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics?.totalRevenue || 0)}
                  </p>
                  <p className="text-sm text-success-600 flex items-center mt-1">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    12.5% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-success-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics?.activeLeads || 0}</p>
                  <p className="text-sm text-primary-600 flex items-center mt-1">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    8 new this week
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(metrics?.conversionRate || 0).toFixed(1)}%
                  </p>
                  <p className="text-sm text-success-600 flex items-center mt-1">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    2.1% improvement
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-warning-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Target Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(metrics?.targetProgress || 0).toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ${formatCurrency((metrics?.totalRevenue || 0) * 0.85).replace('$', '')} of ${formatCurrency((metrics?.totalRevenue || 0) * 1.25).replace('$', '')} monthly goal
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Leads */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Leads</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">Filter</Button>
                  <Button variant="link" size="sm">View All</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {lead.contactName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{lead.contactName}</p>
                        <p className="text-sm text-gray-600">{lead.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(lead.value)}</p>
                        <Badge className={`text-xs ${getStageColor(lead.stage)}`}>
                          {lead.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="ghost" className="w-full justify-start">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <UserPlus className="w-4 h-4 text-primary-600" />
                  </div>
                  Add New Lead
                </Button>

                <Button variant="ghost" className="w-full justify-start">
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="w-4 h-4 text-success-600" />
                  </div>
                  Schedule Meeting
                </Button>

                <Button variant="ghost" className="w-full justify-start">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  Create Proposal
                </Button>

                <Button variant="ghost" className="w-full justify-start">
                  <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center mr-3">
                    <Target className="w-4 h-4 text-warning-600" />
                  </div>
                  Update Targets
                </Button>

                <Button variant="ghost" className="w-full justify-start">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                  </div>
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance (Admin View) */}
        {user?.role === "admin" && teamPerformance && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Performance</CardTitle>
                <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>This Quarter</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformance.map((member) => (
                  <div key={member.user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        {member.user.profileImageUrl ? (
                          <img
                            src={member.user.profileImageUrl}
                            alt={`${member.user.firstName} ${member.user.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-primary-600">
                            {(member.user.firstName?.[0] || '') + (member.user.lastName?.[0] || '')}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">{member.user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Deals Closed</p>
                        <p className="text-lg font-semibold text-gray-900">{member.dealsCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(member.revenue)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Target</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={member.targetProgress} className="w-20" />
                          <span className={`text-sm font-medium ${
                            member.targetProgress >= 75 ? 'text-success-600' : 
                            member.targetProgress >= 50 ? 'text-warning-600' : 'text-gray-600'
                          }`}>
                            {member.targetProgress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
