import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Phone, Mail, Building2, DollarSign, Package, Calendar, FileText, Activity, Clock, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead, Interaction } from "@shared/schema";
import AddActivityDialog from "./AddActivityDialog";
import ActivityTimeline from "./ActivityTimeline";
import { format } from "date-fns";

interface PipelineStage {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
}

const PIPELINE_STAGES = [
  { id: "prospecting", title: "Prospecting", color: "bg-gray-100 border-gray-300" },
  { id: "qualification", title: "Qualification", color: "bg-blue-100 border-blue-300" },
  { id: "proposal", title: "Proposal", color: "bg-yellow-100 border-yellow-300" },
  { id: "negotiation", title: "Negotiation", color: "bg-orange-100 border-orange-300" },
  { id: "closed_won", title: "Closed Won", color: "bg-green-100 border-green-300" },
  { id: "closed_lost", title: "Closed Lost", color: "bg-red-100 border-red-300" },
];

export default function PipelineBoard() {
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | undefined>();
  const [selectedLeadForTimeline, setSelectedLeadForTimeline] = useState<number | undefined>();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: allInteractions = [] } = useQuery({
    queryKey: ["/api/interactions/all"],
    select: (data: Interaction[]) => data || [],
  });

  console.log("Pipeline leads data:", leads);
  console.log("Pipeline loading:", isLoading);
  console.log("Pipeline error:", error);

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ leadId, newStage }: { leadId: number; newStage: string }) => {
      const response = await apiRequest("PUT", `/api/leads/${leadId}`, { stage: newStage });
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
    if (Array.isArray(leads) && leads.length > 0) {
      console.log("Processing leads for pipeline:", leads);
      const stagesWithLeads = PIPELINE_STAGES.map(stage => {
        const stageLeads = leads.filter((lead: Lead) => {
          console.log(`Lead ${lead.id} stage: "${lead.stage}", checking against: "${stage.id}"`);
          return lead.stage === stage.id;
        });
        console.log(`Stage "${stage.id}" has ${stageLeads.length} leads:`, stageLeads);
        return {
          ...stage,
          leads: stageLeads,
        };
      });
      setStages(stagesWithLeads);
    } else {
      console.log("No leads data available:", leads);
      setStages(PIPELINE_STAGES.map(stage => ({ ...stage, leads: [] })));
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

  const handleQuickActivity = async (leadId: number, type: 'call' | 'email') => {
    try {
      const defaultSubjects = {
        call: 'Quick call log',
        email: 'Email correspondence'
      };

      const data = {
        leadId,
        type,
        subject: defaultSubjects[type],
        description: `Quick ${type} activity logged from pipeline`,
        completedAt: new Date().toISOString(),
      };

      await apiRequest("POST", "/api/interactions", data);
      
      queryClient.invalidateQueries({ queryKey: ["/api/interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interactions/all"] });
      
      toast({
        title: "Activity Logged",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} activity has been logged successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to log ${type} activity`,
        variant: "destructive",
      });
    }
  };

  // Activity Summary Component
  const ActivitySummary = ({ leadId, interactions }: { leadId: number; interactions: Interaction[] }) => {
    const leadInteractions = interactions.filter(i => i.leadId === leadId);
    const recentActivity = leadInteractions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (leadInteractions.length === 0) {
      return (
        <div className="text-xs text-gray-400 text-center py-1">
          No activities yet
        </div>
      );
    }

    const activityCounts = {
      call: leadInteractions.filter(i => i.type === 'call').length,
      email: leadInteractions.filter(i => i.type === 'email').length,
      meeting: leadInteractions.filter(i => i.type === 'meeting').length,
      note: leadInteractions.filter(i => i.type === 'note').length,
    };

    const totalActivities = leadInteractions.length;
    const scheduledActivities = leadInteractions.filter(i => i.scheduledAt && !i.completedAt).length;

    return (
      <div className="space-y-2">
        {/* Activity Counts */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex space-x-2">
            {activityCounts.call > 0 && (
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3 text-blue-500" />
                <span className="text-blue-600 font-medium">{activityCounts.call}</span>
              </div>
            )}
            {activityCounts.email > 0 && (
              <div className="flex items-center space-x-1">
                <Mail className="h-3 w-3 text-green-500" />
                <span className="text-green-600 font-medium">{activityCounts.email}</span>
              </div>
            )}
            {activityCounts.meeting > 0 && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-purple-500" />
                <span className="text-purple-600 font-medium">{activityCounts.meeting}</span>
              </div>
            )}
            {activityCounts.note > 0 && (
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3 text-orange-500" />
                <span className="text-orange-600 font-medium">{activityCounts.note}</span>
              </div>
            )}
          </div>
          
          {scheduledActivities > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span className="text-yellow-600 font-medium text-xs">{scheduledActivities}</span>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div className="flex items-center space-x-1">
              <span className="font-medium">Last:</span>
              <span className="capitalize">{recentActivity.type}</span>
              <span>•</span>
              <span>{format(new Date(recentActivity.createdAt), 'MMM d, HH:mm')}</span>
            </div>
            <p className="truncate mt-1">{recentActivity.subject}</p>
          </div>
        )}
      </div>
    );
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
                  <div 
                    className={`flex-1 p-2 border-2 border-t-0 rounded-b-lg overflow-y-auto max-h-[calc(100vh-300px)] ${
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
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                        {lead.contactName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm text-gray-900 truncate">
                                        {lead.contactName}
                                      </p>
                                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                                        <Building2 className="h-3 w-3" />
                                        <span className="truncate">{lead.company}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLeadForTimeline(lead.id);
                                    }}
                                  >
                                    <Activity className="h-3 w-3" />
                                  </Button>
                                </div>

                                {/* Lead Value and Contact Info */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1">
                                      <DollarSign className="h-3 w-3 text-green-600" />
                                      <span className="text-sm font-semibold text-green-600">
                                        {formatCurrency(lead.value)}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {lead.email && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="p-1 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer">
                                              <Mail className="h-3 w-3 text-gray-600" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{lead.email}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {lead.phone && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="p-1 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer">
                                              <Phone className="h-3 w-3 text-gray-600" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{lead.phone}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Activity Summary */}
                                <ActivitySummary leadId={lead.id} interactions={allInteractions} />

                                <Separator className="my-2" />

                                {/* Quick Action Buttons */}
                                <div className="flex items-center justify-between">
                                  <div className="flex space-x-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLeadId(lead.id);
                                            setAddActivityOpen(true);
                                          }}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Add Activity</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickActivity(lead.id, 'call');
                                          }}
                                        >
                                          <Phone className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Log Call</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickActivity(lead.id, 'email');
                                          }}
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Log Email</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>

                                  <div className="text-xs text-gray-400">
                                    {format(new Date(lead.updatedAt), 'MMM d')}
                                  </div>
                                </div>

                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Activity Dialog */}
      <AddActivityDialog
        open={addActivityOpen}
        onOpenChange={setAddActivityOpen}
        leadId={selectedLeadId}
      />

      {/* Activity Timeline Sidebar */}
      {selectedLeadForTimeline && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Lead Activities</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeadForTimeline(undefined)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                {(() => {
                  const lead = leads.find((l: Lead) => l.id === selectedLeadForTimeline);
                  return lead ? (
                    <div>
                      <p className="font-medium text-gray-900">{lead.contactName}</p>
                      <p className="text-sm text-gray-500">{lead.company}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ActivityTimeline
                leadId={selectedLeadForTimeline}
                onAddActivity={() => {
                  setSelectedLeadId(selectedLeadForTimeline);
                  setAddActivityOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}