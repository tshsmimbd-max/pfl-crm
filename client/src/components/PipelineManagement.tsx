import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import SimplePipelineBoard from "./SimplePipelineBoard";
import ActivityTimeline from "./ActivityTimeline";
import PipelineStats from "./PipelineStats";
import AgentPipelineAnalytics from "./AgentPipelineAnalytics";

export default function PipelineManagement() {
  const { user } = useAuth();
  
  // All users see their own pipeline board, but managers also get team analytics
  const isManagerOrAdmin = user?.role === 'super_admin' || user?.role === 'sales_manager';
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">My Pipeline</TabsTrigger>
          <TabsTrigger value="stats">My Stats</TabsTrigger>
          <TabsTrigger value="timeline">My Activity</TabsTrigger>
          {isManagerOrAdmin && (
            <TabsTrigger value="team-analytics">Team Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="board">
          <SimplePipelineBoard />
        </TabsContent>

        <TabsContent value="stats">
          <PipelineStats />
        </TabsContent>

        <TabsContent value="timeline">
          <ActivityTimeline userId={user?.id} showLeadInfo={true} showFilters={true} />
        </TabsContent>

        {isManagerOrAdmin && (
          <TabsContent value="team-analytics">
            <AgentPipelineAnalytics />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
