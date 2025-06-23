import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SimplePipelineBoard from "./SimplePipelineBoard";
import ActivityTimeline from "./ActivityTimeline";
import PipelineStats from "./PipelineStats";

export default function PipelineManagement() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Pipeline Board</TabsTrigger>
          <TabsTrigger value="stats">Pipeline Stats</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
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
