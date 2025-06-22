import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { MoreHorizontal } from "lucide-react";

const stages = [
  { id: "prospecting", name: "Prospecting", color: "bg-blue-500" },
  { id: "qualification", name: "Qualification", color: "bg-yellow-500" },
  { id: "proposal", name: "Proposal", color: "bg-purple-500" },
  { id: "negotiation", name: "Negotiation", color: "bg-green-500" },
];

export default function PipelineManagement() {
  const [leads, setLeads] = useState<any[]>([]);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["/api/leads"],
    onSuccess: (data) => {
      setLeads(data || []);
    },
  });

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter(lead => lead.stage === stage);
  };

  const calculateStageValue = (stage: string) => {
    return getLeadsByStage(stage).reduce((sum, lead) => sum + (lead.value || 0), 0);
  };

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const leadId = parseInt(draggableId);
    const newStage = destination.droppableId;

    // Update lead stage locally
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, stage: newStage } : lead
      )
    );

    // TODO: Update lead stage in backend
    // updateLeadMutation.mutate({ id: leadId, stage: newStage });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-6">
          {stages.map((stage) => (
            <Card key={stage.id} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
            <p className="text-gray-600">Manage leads through your sales process</p>
          </div>
        </div>
      </header>

      {/* Pipeline Overview */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-4 gap-6">
          {stages.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id);
            const stageValue = calculateStageValue(stage.id);
            const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
            const percentage = totalValue > 0 ? (stageValue / totalValue) * 100 : 0;

            return (
              <div key={stage.id} className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className={`w-3 h-3 ${stage.color} rounded-full`}></div>
                  <span className="font-medium text-gray-900">{stage.name}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {stageLeads.length} leads • {formatCurrency(stageValue.toString())}
                </div>
                <Progress value={percentage} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-6 h-full">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              
              return (
                <Card key={stage.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${stage.color} rounded-full`}></div>
                        <CardTitle className="text-lg">{stage.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">{stageLeads.length}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(calculateStageValue(stage.id).toString())}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-32 p-2 rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'bg-gray-50' : ''
                          }`}
                        >
                          {stageLeads.map((lead, index) => (
                            <Draggable
                              key={lead.id}
                              draggableId={lead.id.toString()}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900 text-sm">{lead.contactName}</h4>
                                      <p className="text-xs text-gray-600">{lead.company}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm text-gray-900">
                                      {formatCurrency(lead.value)}
                                    </span>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-gray-600">
                                        {lead.contactName.split(' ').map((n: string) => n[0]).join('')}
                                      </span>
                                    </div>
                                  </div>
                                  {lead.phone && (
                                    <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </>
  );
}
