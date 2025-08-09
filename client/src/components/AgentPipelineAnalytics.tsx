import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, Activity } from "lucide-react";
import type { Lead, User } from "@shared/schema";

const PIPELINE_STAGES = [
  { id: "prospecting", title: "Prospecting", color: "#64748b" },
  { id: "qualification", title: "Qualification", color: "#3b82f6" },
  { id: "proposal", title: "Proposal", color: "#eab308" },
  { id: "negotiation", title: "Negotiation", color: "#f97316" },
  { id: "closed_won", title: "Closed Won", color: "#22c55e" },
  { id: "closed_lost", title: "Closed Lost", color: "#ef4444" },
];

interface AgentPerformance {
  agent: User;
  totalLeads: number;
  totalValue: number;
  stageDistribution: Record<string, number>;
  conversionRate: number;
  avgDealSize: number;
}

export default function AgentPipelineAnalytics() {
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Calculate agent performance data
  const agentPerformance: AgentPerformance[] = users
    .filter(user => user.role === 'sales_agent')
    .map(agent => {
      const agentLeads = leads.filter(lead => lead.assignedTo === agent.id);
      const totalLeads = agentLeads.length;
      const totalValue = agentLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const wonLeads = agentLeads.filter(lead => lead.stage === 'closed_won').length;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
      const avgDealSize = totalLeads > 0 ? totalValue / totalLeads : 0;

      const stageDistribution = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage.id] = agentLeads.filter(lead => lead.stage === stage.id).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        agent,
        totalLeads,
        totalValue,
        stageDistribution,
        conversionRate,
        avgDealSize,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Overall pipeline statistics
  const totalPipelineValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  const totalLeads = leads.length;
  const overallConversionRate = totalLeads > 0 
    ? (leads.filter(lead => lead.stage === 'closed_won').length / totalLeads) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              Across {totalLeads} active leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentPerformance.length}</div>
            <p className="text-xs text-muted-foreground">
              Sales agents with leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall pipeline conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalLeads > 0 ? totalPipelineValue / totalLeads : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Agent Performance</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {agentPerformance.map((performance) => (
                  <div key={performance.agent.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {getInitials(performance.agent.employeeName || performance.agent.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {performance.agent.employeeName || performance.agent.email}
                          </h3>
                          <p className="text-sm text-gray-600">{performance.agent.teamName || 'No Team'}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <Badge variant="outline">{performance.totalLeads} leads</Badge>
                            <Badge variant="outline">{formatCurrency(performance.totalValue)}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          {performance.conversionRate >= 20 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-lg font-semibold">
                            {performance.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Conversion Rate</p>
                      </div>
                    </div>

                    {/* Pipeline Stage Distribution */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-gray-700">Pipeline Distribution</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {PIPELINE_STAGES.map((stage) => {
                          const count = performance.stageDistribution[stage.id] || 0;
                          const percentage = performance.totalLeads > 0 
                            ? (count / performance.totalLeads) * 100 
                            : 0;
                          
                          return (
                            <div key={stage.id} className="text-center p-3 bg-gray-50 rounded-lg">
                              <div 
                                className="w-3 h-3 rounded-full mx-auto mb-2"
                                style={{ backgroundColor: stage.color }}
                              />
                              <div className="text-sm font-medium">{count}</div>
                              <div className="text-xs text-gray-600 truncate">{stage.title}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {PIPELINE_STAGES.map((stage) => {
                  const stageLeads = leads.filter(lead => lead.stage === stage.id);
                  const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
                  const percentage = totalLeads > 0 ? (stageLeads.length / totalLeads) * 100 : 0;
                  
                  return (
                    <div key={stage.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium">{stage.title}</span>
                          <Badge variant="outline">{stageLeads.length} leads</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(stageValue)}</div>
                          <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}