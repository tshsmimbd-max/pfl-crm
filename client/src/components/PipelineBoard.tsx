import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Phone, Mail, Building2, DollarSign, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";

interface PipelineStage {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
}

const PIPELINE_STAGES = [
  { id: "Prospecting", title: "Prospecting", color: "bg-gray-100 border-gray-300" },
  { id: "Qualified", title: "Qualified", color: "bg-blue-100 border-blue-300" },
  { id: "Proposal", title: "Proposal", color: "bg-yellow-100 border-yellow-300" },
  { id: "Negotiation", title: "Negotiation", color: "bg-orange-100 border-orange-300" },
  { id: "Closed Won", title: "Closed Won", color: "bg-green-100 border-green-300" },
  { id: "Closed Lost", title: "Closed Lost", color: "bg-red-100 border-red-300" },
];

export default function PipelineBoard() {
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ leadId, newStage }: { leadId: number; newStage: string }) => {
      const response = await apiRequest("PATCH", `/api/leads/${leadId}`, { stage: newStage });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead stage updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update lead stage",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (leads) {
      const stagesWithLeads = PIPELINE_STAGES.map(stage => ({
        ...stage,
        leads: leads.filter((lead: Lead) => lead.stage === stage.id),
      }));
      setStages(stagesWithLeads);
    }
  }, [leads]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const leadId = parseInt(draggableId);
    const newStage = destination.droppableId;

    if (source.droppableId === destination.droppableId) return;

    // Optimistically update the UI
    const newStages = [...stages];
    const sourceStageIndex = newStages.findIndex(stage => stage.id === source.droppableId);
    const destStageIndex = newStages.findIndex(stage => stage.id === destination.droppableId);
    
    const [movedLead] = newStages[sourceStageIndex].leads.splice(source.index, 1);
    movedLead.stage = newStage;
    newStages[destStageIndex].leads.splice(destination.index, 0, movedLead);
    
    setStages(newStages);

    // Update the backend
    updateLeadStageMutation.mutate({ leadId, newStage });
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `৳${numValue.toLocaleString()}`;
  };

  const getStageValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, lead) => {
      const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales Pipeline</h2>
        <p className="text-gray-600">Drag and drop leads between stages to update their status</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 h-[calc(100vh-200px)]">
          {stages.map((stage) => (
            <div key={stage.id} className="flex flex-col">
              <div className={`p-4 rounded-t-lg border-2 ${stage.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{stage.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stage.leads.length}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(getStageValue(stage.leads).toString())}
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <ScrollArea 
                    className={`flex-1 p-2 border-2 border-t-0 rounded-b-lg ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white'
                    } ${stage.color.replace('bg-', 'border-').replace('-100', '-200')}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <div className="space-y-3">
                      {stage.leads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-grab hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs">
                                        {lead.contactName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-sm text-gray-900">
                                        {lead.contactName}
                                      </p>
                                      <p className="text-xs text-gray-500">{lead.company}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center text-xs text-gray-600">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    {formatCurrency(lead.value)}
                                  </div>
                                  
                                  {lead.orderVolume && (
                                    <div className="flex items-center text-xs text-gray-600">
                                      <Package className="w-3 h-3 mr-1" />
                                      {lead.orderVolume}
                                    </div>
                                  )}

                                  {lead.leadSource && (
                                    <Badge variant="outline" className="text-xs">
                                      {lead.leadSource}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                    >
                                      <Phone className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                    >
                                      <Mail className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {new Date(lead.updatedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}