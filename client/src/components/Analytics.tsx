import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  Calendar,
  Download,
  Filter
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const COLORS = ['#2563eb', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#6b7280'];

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState("this_month");
  const [chartType, setChartType] = useState("revenue");
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["/api/analytics/metrics"],
  });

  const { data: teamPerformance, isLoading: teamLoading } = useQuery({
    queryKey: ["/api/analytics/team-performance"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["/api/targets"],
  });

  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ["/api/daily-revenue"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const formatCurrency = (amount: number | undefined) => {
    return `৳${(amount || 0).toLocaleString()}`;
  };

  // Show loading state
  if (metricsLoading || teamLoading || leadsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (metricsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Error loading analytics data</p>
          <p className="text-gray-600 mt-2">Please refresh the page or try again later</p>
        </div>
      </div>
    );
  }

  // Calculate target vs achieved metrics - simplified and working
  const getTargetVsAchieved = () => {
    if (!Array.isArray(targets) || !Array.isArray(dailyRevenue) || !Array.isArray(leads) || !Array.isArray(customers)) {
      return {
        revenue: { target: 0, achieved: 0, percentage: 0 },
        leads: { target: 0, achieved: 0, percentage: 0 },
        customers: { achieved: 0, total: 0 }
      };
    }

    // Get monthly targets for current user
    const monthlyTargets = targets.filter((target: any) => 
      target.period === 'monthly' && target.userId === user?.id
    );

    // Simple calculations using metrics data if available
    const totalTarget = monthlyTargets.reduce((sum: number, t: any) => sum + (t.targetValue || 0), 0);
    const totalRevenue = metrics?.totalRevenue || 0;
    const totalLeads = leads.length;
    const totalCustomers = customers.length;

    return {
      revenue: {
        target: totalTarget,
        achieved: totalRevenue,
        percentage: totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0
      },
      leads: {
        target: monthlyTargets.length * 10, // Default target
        achieved: totalLeads,
        percentage: monthlyTargets.length > 0 ? Math.round((totalLeads / (monthlyTargets.length * 10)) * 100) : 0
      },
      customers: {
        achieved: totalCustomers,
        total: totalCustomers
      }
    };
  };

  const targetMetrics = getTargetVsAchieved();

  // Generate sample data for charts (in a real app, this would come from API)


  // Calculate real pipeline data from leads
  const calculatePipelineData = () => {
    if (!Array.isArray(leads)) return [];
    
    const stages = [
      'prospecting',
      'qualification', 
      'proposal',
      'negotiation',
      'closed_won',
      'closed_lost'
    ];
    
    return stages.map(stage => {
      const stageLeads = leads.filter((lead: any) => lead.stage === stage);
      const totalValue = stageLeads.reduce((sum: number, lead: any) => {
        const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      
      return {
        name: stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' '),
        value: stageLeads.length,
        amount: totalValue
      };
    }).filter(stage => stage.value > 0); // Only show stages with leads
  };

  // Use real data from leads for pipeline calculations
  const pipelineData = calculatePipelineData();
  
  // Calculate real revenue trends from daily revenue data
  const calculateRevenueData = () => {
    if (!Array.isArray(dailyRevenue)) return [];
    
    // Group revenue by month for last 6 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentDate = new Date();
    
    return months.map((month, index) => {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - index), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - index) + 1, 0);
      
      const monthRevenue = dailyRevenue
        .filter((rev: any) => {
          const revDate = new Date(rev.date);
          return revDate >= monthStart && revDate <= monthEnd;
        })
        .reduce((sum: number, rev: any) => sum + (rev.revenue || 0), 0);
      
      const monthLeads = leads.filter((lead: any) => {
        const leadDate = new Date(lead.createdAt);
        return leadDate >= monthStart && leadDate <= monthEnd;
      }).length;
      
      return {
        month,
        revenue: monthRevenue,
        target: targetMetrics.revenue.target / 6, // Spread annual target across months
        leads: monthLeads,
      };
    });
  };

  const revenueData = calculateRevenueData();

  if (metricsLoading || teamLoading || leadsLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStagesByLead = () => {
    const stageCount = leads?.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(stageCount).map(([stage, count]) => ({
      name: stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
    }));
  };

  const getConversionRate = () => {
    if (!leads || leads.length === 0) return 0;
    const closedWon = leads.filter(lead => lead.stage === 'closed_won').length;
    return (closedWon / leads.length) * 100;
  };

  const getMetricChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Mock previous period data for comparison
  const previousMetrics = {
    totalRevenue: (metrics?.totalRevenue || 0) * 0.88,
    activeLeads: Math.floor((metrics?.activeLeads || 0) * 0.92),
    conversionRate: (metrics?.conversionRate || 0) - 2.1,
  };

  const revenueChange = getMetricChange(metrics?.totalRevenue || 0, previousMetrics.totalRevenue);
  const leadsChange = getMetricChange(metrics?.activeLeads || 0, previousMetrics.activeLeads);
  const conversionChange = getMetricChange(metrics?.conversionRate || 0, previousMetrics.conversionRate);

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-600">Track your sales performance and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Target vs Achieved Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Monthly Target Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Target */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Revenue Target</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      targetMetrics.revenue.percentage >= 100 
                        ? 'bg-green-100 text-green-800' 
                        : targetMetrics.revenue.percentage >= 75 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {targetMetrics.revenue.percentage}%
                    </span>
                  </div>
                  <Progress value={Math.min(targetMetrics.revenue.percentage, 100)} className="h-2" />
                  <div className="text-xs text-gray-600">
                    {formatCurrency(targetMetrics.revenue.achieved)} / {formatCurrency(targetMetrics.revenue.target)}
                  </div>
                </div>

                {/* Leads Target */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Leads Target</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      targetMetrics.leads.percentage >= 100 
                        ? 'bg-green-100 text-green-800' 
                        : targetMetrics.leads.percentage >= 75 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {targetMetrics.leads.percentage}%
                    </span>
                  </div>
                  <Progress value={Math.min(targetMetrics.leads.percentage, 100)} className="h-2" />
                  <div className="text-xs text-gray-600">
                    {targetMetrics.leads.achieved} / {targetMetrics.leads.target} leads won
                  </div>
                </div>

                {/* Customer Conversions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Customer Conversions</span>
                    <Badge variant="secondary">
                      {targetMetrics.customers.achieved} this month
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {targetMetrics.customers.total}
                  </div>
                  <div className="text-xs text-gray-600">
                    Total customers
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                  <div className="flex items-center mt-1">
                    {revenueChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-success-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${revenueChange >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                      {Math.abs(revenueChange).toFixed(1)}% from last period
                    </span>
                  </div>
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
                  <div className="flex items-center mt-1">
                    {leadsChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-success-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${leadsChange >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                      {Math.abs(leadsChange).toFixed(1)}% from last period
                    </span>
                  </div>
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
                  <div className="flex items-center mt-1">
                    {conversionChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-success-600 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm ${conversionChange >= 0 ? 'text-success-600' : 'text-red-600'}`}>
                      {Math.abs(conversionChange).toFixed(1)}% from last period
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-warning-600" />
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
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(metrics?.targetProgress || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue Trend</CardTitle>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="target">vs Target</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area 
                    type="monotone" 
                    dataKey={chartType === 'leads' ? 'leads' : 'revenue'} 
                    stroke="#2563eb" 
                    fill="#2563eb" 
                    fillOpacity={0.1}
                  />
                  {chartType === 'target' && (
                    <Area 
                      type="monotone" 
                      dataKey="target" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.1}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getStagesByLead()}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {getStagesByLead().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance */}
        {user?.role === "admin" && teamPerformance && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Performance Comparison</CardTitle>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="user.firstName" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : name === 'dealsCount' ? 'Deals' : 'Target %'
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" name="revenue" />
                  <Bar dataKey="dealsCount" fill="#10b981" name="dealsCount" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Value by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Value by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {pipelineData.map((stage, index) => {
                const totalValue = pipelineData.reduce((sum, s) => sum + s.amount, 0);
                const percentage = (stage.amount / totalValue) * 100;
                
                return (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        ></div>
                        <span className="font-medium text-gray-900">{stage.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">{stage.value} leads</Badge>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(stage.amount)}
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-gray-500 text-right">
                      {percentage.toFixed(1)}% of total pipeline
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
