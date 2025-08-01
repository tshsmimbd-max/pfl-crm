import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import SimplePipelineBoard from "./SimplePipelineBoard";
import ActivityTimeline from "./ActivityTimeline";
import PipelineStats from "./PipelineStats";
import AgentPipelineAnalytics from "./AgentPipelineAnalytics";

export default function PipelineManagement() {
  const { user } = useAuth();
  
  // Super Admin and Sales Manager see analytics view
  // Sales Agent sees their own pipeline board
  const isAgent = user?.role === 'sales_agent';
  
  if (!isAgent) {
    // Show analytics view for Super Admin and Sales Manager
    return <AgentPipelineAnalytics />;
  }

  // Show pipeline board for Sales Agents
  return (
    <div className="space-y-6">
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">My Pipeline</TabsTrigger>
          <TabsTrigger value="stats">My Stats</TabsTrigger>
          <TabsTrigger value="timeline">My Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <SimplePipelineBoard />
        </TabsContent>

        <TabsContent value="stats">
          <PipelineStats />
        </TabsContent>

        <TabsContent value="timeline">
          <ActivityTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
