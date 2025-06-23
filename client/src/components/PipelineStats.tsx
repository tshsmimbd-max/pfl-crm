import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Users, Target, TrendingUp, TrendingDown } from "lucide-react";
import type { Lead } from "@shared/schema";

const PIPELINE_STAGES = [
  { name: "Prospecting", color: "#6b7280" },
  { name: "Qualified", color: "#3b82f6" },
  { name: "Proposal", color: "#f59e0b" },
  { name: "Negotiation", color: "#f97316" },
  { name: "Closed Won", color: "#10b981" },
  { name: "Closed Lost", color: "#ef4444" },
];

export default function PipelineStats() {
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics/metrics"],
  });

  const formatCurrency = (value: number) => {
    return `৳${value.toLocaleString()}`;
  };

  // Calculate pipeline metrics
  const calculatePipelineMetrics = () => {
    const stageMetrics = PIPELINE_STAGES.map(stage => {
      const stageLeads = leads.filter((lead: Lead) => lead.stage === stage.name);
      const totalValue = stageLeads.reduce((sum: number, lead: Lead) => {
        const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      
      return {
        name: stage.name,
        count: stageLeads.length,
        value: totalValue,
        color: stage.color,
      };
    });

    return stageMetrics;
  };

  const pipelineData = calculatePipelineMetrics();
  const totalPipelineValue = pipelineData.reduce((sum, stage) => sum + stage.value, 0);
  const totalLeads = pipelineData.reduce((sum, stage) => sum + stage.count, 0);

  // Conversion rates between stages
  const conversionRates = PIPELINE_STAGES.slice(0, -2).map((stage, index) => {
    const currentStageCount = pipelineData[index]?.count || 0;
    const nextStageCount = pipelineData[index + 1]?.count || 0;
    const rate = currentStageCount > 0 ? (nextStageCount / currentStageCount) * 100 : 0;
    
    return {
      from: stage.name,
      to: PIPELINE_STAGES[index + 1]?.name,
      rate: rate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {pipelineData.find(s => s.name === "Qualified")?.count || 0} qualified leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Close Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.conversionRate ? `${analytics.conversionRate}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
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

      {/* Pipeline Stages Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipelineData.map((stage, index) => (
              <div key={stage.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  ></div>
                  <div>
                    <h3 className="font-medium">{stage.name}</h3>
                    <p className="text-sm text-gray-600">{stage.count} opportunities</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(stage.value)}</div>
                  <div className="text-sm text-gray-600">
                    {totalPipelineValue > 0 ? ((stage.value / totalPipelineValue) * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionRates.map((conversion, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{conversion.from}</span>
                  <span className="text-gray-500">→</span>
                  <span className="font-medium">{conversion.to}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={conversion.rate} className="w-20" />
                  <span className="font-medium">{conversion.rate.toFixed(1)}%</span>
                  {conversion.rate >= 50 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}