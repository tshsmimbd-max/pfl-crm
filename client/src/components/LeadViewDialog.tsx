import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign, 
  Calendar, 
  Clock,
  Edit,
  MessageSquare,
  TrendingUp,
  FileText,
  UserCheck,
  Trophy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";
import ActivityTimeline from "./ActivityTimeline";
import AddActivityDialog from "./AddActivityDialog";

interface LeadViewDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (lead: Lead) => void;
}

export default function LeadViewDialog({ lead, open, onOpenChange, onEdit }: LeadViewDialogProps) {
  const { toast } = useToast();
  const [convertingToCustomer, setConvertingToCustomer] = useState(false);
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);

  const { data: interactions = [], isLoading: interactionsLoading, error: interactionsError } = useQuery<any[]>({
    queryKey: [`/api/leads/${lead?.id}/interactions`],
    enabled: open && !!lead,
    retry: 1,
  });

  const convertToCustomerMutation = useMutation({
    mutationFn: async (leadId: number) => {
      return await apiRequest("POST", `/api/customers/convert/${leadId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setConvertingToCustomer(false);
      toast({
        title: "Success",
        description: "Lead successfully converted to customer!",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setConvertingToCustomer(false);
      toast({
        title: "Error",
        description: error.message || "Failed to convert lead to customer",
        variant: "destructive",
      });
    },
  });

  const handleConvertToCustomer = () => {
    if (!lead) return;
    setConvertingToCustomer(true);
    convertToCustomerMutation.mutate(lead.id);
  };

  const formatCurrency = (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `৳${(isNaN(numValue) ? 0 : numValue).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'N/A';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospecting': return 'bg-blue-100 text-blue-800';
      case 'qualification': return 'bg-yellow-100 text-yellow-800';
      case 'proposal': return 'bg-purple-100 text-purple-800';
      case 'negotiation': return 'bg-orange-100 text-orange-800';
      case 'closed_won': return 'bg-green-100 text-green-800';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageLabel = (stage: string) => {
    return stage.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Calculate Lead Score based on multiple factors
  const calculateLeadScore = (lead: Lead, interactions: any[]) => {
    let score = 0;
    
    // Base score for lead value (0-30 points)
    const value = typeof lead.value === 'string' ? parseFloat(lead.value) : lead.value;
    if (value > 100000) score += 30;
    else if (value > 50000) score += 20;
    else if (value > 10000) score += 10;
    else score += 5;
    
    // Stage progression score (0-25 points)
    const stageScores = {
      'prospecting': 5,
      'qualification': 10,
      'proposal': 15,
      'negotiation': 20,
      'closed_won': 25,
      'closed_lost': 0
    };
    score += stageScores[lead.stage as keyof typeof stageScores] || 0;
    
    // Interaction activity score (0-20 points)
    const recentInteractions = interactions.filter(i => {
      const interactionDate = new Date(i.createdAt);
      const daysSince = (Date.now() - interactionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });
    
    if (recentInteractions.length >= 5) score += 20;
    else if (recentInteractions.length >= 3) score += 15;
    else if (recentInteractions.length >= 1) score += 10;
    
    // Contact information completeness (0-15 points)
    let completeness = 0;
    if (lead.phone) completeness += 3;
    if (lead.email) completeness += 3;
    if (lead.company) completeness += 3;
    if (lead.website) completeness += 3;
    if (lead.notes) completeness += 3;
    score += completeness;
    
    // Lead source quality (0-10 points)
    const sourceScores = {
      'Referral': 10,
      'Social Media': 7,
      'Ads': 5,
      'Others': 3
    };
    score += sourceScores[lead.leadSource as keyof typeof sourceScores] || 3;
    
    return Math.min(100, Math.max(0, score));
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Lead Details</DialogTitle>
            <div className="flex gap-2">
              {onEdit && (
                <Button onClick={() => onEdit(lead)} variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {lead.stage === 'closed_won' && (
                <Button 
                  onClick={handleConvertToCustomer}
                  disabled={convertingToCustomer}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {convertingToCustomer ? "Converting..." : "Convert to Customer"}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                        {lead.contactName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{lead.contactName}</h3>
                      <p className="text-gray-600 flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        {lead.company}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${getStageColor(lead.stage)} font-medium`}>
                    {getStageLabel(lead.stage)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-900">{lead.email}</span>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{lead.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(lead.value)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-900">{formatDate(lead.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {lead.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="w-5 h-5 mr-2" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Clock className="w-5 h-5 mr-2" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : interactionsError ? (
                  <div className="text-center py-8 text-red-500">
                    <p>Failed to load activities</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <ActivityTimeline 
                    leadId={lead.id} 
                    activities={interactions}
                    onAddActivity={() => setShowAddActivityDialog(true)}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Lead ID</span>
                  <span className="font-medium">#{lead.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="font-medium">{formatDate(lead.createdAt)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="font-medium">{formatDate(lead.updatedAt)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Interactions</span>
                  <span className="font-medium">{interactions.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Lead Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Lead Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {calculateLeadScore(lead, interactions)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on engagement and profile
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  {interactions.slice(0, 3).map((interaction: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{interaction.type}</p>
                        <p className="text-xs text-gray-600">{formatDate(interaction.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {interactions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No recent activity
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>

      {/* Add Activity Dialog */}
      <AddActivityDialog 
        open={showAddActivityDialog}
        onOpenChange={setShowAddActivityDialog}
        leadId={lead?.id}
      />
    </Dialog>
  );
}