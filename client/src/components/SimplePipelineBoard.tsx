import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, Phone, Mail, Building2 } from "lucide-react";
import type { Lead } from "@shared/schema";

const STAGES = [
  { id: "Prospecting", title: "Prospecting", color: "bg-blue-50 border-blue-200" },
  { id: "Qualification", title: "Qualification", color: "bg-yellow-50 border-yellow-200" },
  { id: "Proposal", title: "Proposal", color: "bg-purple-50 border-purple-200" },
  { id: "Negotiation", title: "Negotiation", color: "bg-orange-50 border-orange-200" },
  { id: "Closed Won", title: "Closed Won", color: "bg-green-50 border-green-200" },
  { id: "Closed Lost", title: "Closed Lost", color: "bg-red-50 border-red-200" },
];

export default function SimplePipelineBoard() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales Pipeline</h2>
        <p className="text-gray-600">
          Total: {leads.length} leads | 
          Total Value: {formatCurrency(leads.reduce((sum: number, lead: Lead) => {
            const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
            return sum + (isNaN(value) ? 0 : value);
          }, 0))}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsForStage(stage.id);
          const stageValue = getStageValue(stageLeads);

          return (
            <Card key={stage.id} className={`${stage.color}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{stage.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(stageValue)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <Card key={lead.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {lead.contactName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {lead.contactName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{lead.company}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {formatCurrency(lead.value)}
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {lead.email}
                          </div>

                          {lead.phone && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Phone className="w-3 h-3 mr-1" />
                              {lead.phone}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t text-xs text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}