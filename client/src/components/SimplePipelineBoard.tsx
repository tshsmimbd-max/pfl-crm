import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Phone, Mail, Building2, Calendar, User, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import type { Lead } from "@shared/schema";

const STAGES = [
  { 
    id: "prospecting", 
    title: "Prospecting", 
    color: "bg-blue-50 border-blue-200", 
    badgeColor: "bg-blue-100 text-blue-800",
    accentColor: "border-l-blue-500"
  },
  { 
    id: "qualification", 
    title: "Qualification", 
    color: "bg-yellow-50 border-yellow-200", 
    badgeColor: "bg-yellow-100 text-yellow-800",
    accentColor: "border-l-yellow-500"
  },
  { 
    id: "proposal", 
    title: "Proposal", 
    color: "bg-purple-50 border-purple-200", 
    badgeColor: "bg-purple-100 text-purple-800",
    accentColor: "border-l-purple-500"
  },
  { 
    id: "negotiation", 
    title: "Negotiation", 
    color: "bg-orange-50 border-orange-200", 
    badgeColor: "bg-orange-100 text-orange-800",
    accentColor: "border-l-orange-500"
  },
  { 
    id: "closed_won", 
    title: "Closed Won", 
    color: "bg-green-50 border-green-200", 
    badgeColor: "bg-green-100 text-green-800",
    accentColor: "border-l-green-500"
  },
  { 
    id: "closed_lost", 
    title: "Closed Lost", 
    color: "bg-red-50 border-red-200", 
    badgeColor: "bg-red-100 text-red-800",
    accentColor: "border-l-red-500"
  },
];

export default function SimplePipelineBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const { toast } = useToast();

  const { data: fetchedLeads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: number; stage: string }) => {
      await apiRequest("PUT", `/api/leads/${leadId}`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead stage updated successfully",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update lead stage",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (fetchedLeads) {
      setLeads(fetchedLeads);
    }
  }, [fetchedLeads]);

  const formatCurrency = (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `৳${(isNaN(numValue) ? 0 : numValue).toLocaleString()}`;
  };

  const getLeadsForStage = (stageId: string) => {
    return leads.filter((lead: Lead) => lead.stage === stageId);
  };

  const getStageValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, lead) => {
      const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const leadId = parseInt(draggableId);
    const newStage = destination.droppableId;

    // Optimistic update
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, stage: newStage }
          : lead
      )
    );

    // API update
    updateLeadMutation.mutate({ leadId, stage: newStage });
  };

  const getStageStats = (stageId: string) => {
    const stageLeads = getLeadsForStage(stageId);
    const stageValue = getStageValue(stageLeads);
    return { count: stageLeads.length, value: stageValue };
  };

  const totalValue = leads.reduce((sum, lead) => {
    const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sales Pipeline</h2>
            <p className="text-gray-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Drag and drop leads to move them through your pipeline
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Total Pipeline Value</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{totalValue > 0 ? `Avg: ${formatCurrency(totalValue / leads.length)}` : 'No leads'}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAGES.map((stage, index) => {
            const stats = getStageStats(stage.id);
            return (
              <div key={stage.id} className="text-center p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.count}</div>
                <div className="text-sm font-medium text-gray-700 mb-1">{stage.title}</div>
                <div className="text-xs text-gray-500">{formatCurrency(stats.value)}</div>
                <div className="mt-2">
                  <div className={`w-full h-1 rounded-full bg-gray-200`}>
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${stage.accentColor.replace('border-l-', 'bg-')}`}
                      style={{ width: `${totalValue > 0 ? (stats.value / totalValue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsForStage(stage.id);
            const stageValue = getStageValue(stageLeads);

            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <Card className={`${stage.color} border-2 ${stage.accentColor} border-l-4 h-full shadow-lg hover:shadow-xl transition-shadow duration-300`}>
                  <CardHeader className="pb-3 bg-white/80 backdrop-blur-sm rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-800 flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${stage.accentColor.replace('border-l-', 'bg-')}`}></div>
                        {stage.title}
                      </CardTitle>
                      <Badge className={`text-xs ${stage.badgeColor} font-semibold`}>
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold text-gray-900 mt-1">
                      {formatCurrency(stageValue)}
                    </div>
                  </CardHeader>
                  
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[400px] max-h-[70vh] overflow-y-auto transition-all duration-200 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent ${
                          snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-300 shadow-inner' : ''
                        }`}
                      >
                        {stageLeads.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 text-sm">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${stage.color} border-2 border-dashed ${stage.accentColor.replace('border-l-', 'border-')}`}>
                              <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="font-medium mb-1">Drop leads here</p>
                            <p className="text-xs text-gray-400">Drag leads to update their stage</p>
                          </div>
                        ) : (
                          stageLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white shadow-sm hover:shadow-lg transition-all duration-200 cursor-move group border-l-4 ${stage.accentColor} ${
                                    snapshot.isDragging ? 'rotate-2 shadow-2xl scale-105 z-50 ring-2 ring-blue-300' : ''
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                                        <Avatar className="h-9 w-9 shrink-0">
                                          <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                                            {lead.contactName.split(' ').map(n => n[0]).join('')}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-sm text-gray-900 truncate">
                                            {lead.contactName}
                                          </p>
                                          <p className="text-xs text-gray-500 truncate flex items-center">
                                            <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                            {lead.company}
                                          </p>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="w-3 h-3" />
                                      </Button>
                                    </div>

                                    {/* Value */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center text-sm font-bold text-gray-900">
                                        <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                                        {formatCurrency(lead.value)}
                                      </div>
                                      <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                      </div>
                                    </div>

                                    {/* Contact Details */}
                                    <div className="space-y-2">
                                      <div className="flex items-center text-xs text-gray-600">
                                        <Mail className="w-3 h-3 mr-2 shrink-0 text-blue-500" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                      
                                      {lead.phone && (
                                        <div className="flex items-center text-xs text-gray-600">
                                          <Phone className="w-3 h-3 mr-2 shrink-0 text-green-500" />
                                          <span className="truncate">{lead.phone}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Progress Indicator */}
                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <div className={`w-2 h-2 rounded-full ${stage.accentColor.replace('border-l-', 'bg-')}`}></div>
                                          <span className="text-xs text-gray-500 capitalize">{stage.title}</span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          #{lead.id}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex items-center space-x-1">
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-blue-50">
                                          <Eye className="w-3 h-3 mr-1" />
                                          View
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-green-50">
                                          <Edit className="w-3 h-3 mr-1" />
                                          Edit
                                        </Button>
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        <Calendar className="w-3 h-3 inline mr-1" />
                                        {Math.floor(Math.random() * 30) + 1}d
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </CardContent>
                    )}
                  </Droppable>
                </Card>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}