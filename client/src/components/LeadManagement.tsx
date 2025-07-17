import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, Edit, Trash2, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadSchema, type InsertLead } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { usePermissions, PERMISSIONS } from "@/hooks/usePermissions";
import BulkLeadUpload from "./BulkLeadUpload";
import LeadEditDialog from "./LeadEditDialog";
import LeadViewDialog from "./LeadViewDialog";

export default function LeadManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();
  const { hasPermission, canCreateLeads } = usePermissions();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users/assignment"],
  });

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      contactName: "",
      email: "",
      phone: "",
      company: "",
      value: "0",
      stage: "Prospecting",
      assignedTo: "myself", // Default to self for sales agents
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      await apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLead) => {
    // If "myself" is selected or no assignment, don't send assignedTo field
    const leadData = { ...data };
    if (leadData.assignedTo === "myself" || !leadData.assignedTo) {
      delete leadData.assignedTo;
    }
    createLeadMutation.mutate(leadData);
  };

  const handleDelete = (leadId: number) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteLeadMutation.mutate(leadId);
    }
  };

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch = lead.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    return matchesSearch && matchesStage;
  }) || [];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospecting":
        return "bg-blue-100 text-blue-800";
      case "qualification":
        return "bg-yellow-100 text-yellow-800";
      case "proposal":
        return "bg-purple-100 text-purple-800";
      case "negotiation":
        return "bg-green-100 text-green-800";
      case "closed_won":
        return "bg-success-100 text-success-600";
      case "closed_lost":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-600">Manage and track your sales leads</p>
          </div>
          {canCreateLeads() && (
            <div className="flex items-center space-x-3">
              <BulkLeadUpload />
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary-600 hover:bg-primary-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="prospecting">Prospecting</SelectItem>
                              <SelectItem value="qualification">Qualification</SelectItem>
                              <SelectItem value="proposal">Proposal</SelectItem>
                              <SelectItem value="negotiation">Negotiation</SelectItem>
                              <SelectItem value="closed_won">Closed Won</SelectItem>
                              <SelectItem value="closed_lost">Closed Lost</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "myself"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Assign to myself" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="myself">Assign to Myself</SelectItem>
                              {hasPermission(PERMISSIONS.LEAD_ASSIGN) && users?.filter(u => u.id !== "myself").map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.fullName} ({user.role.replace('_', ' ')})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLeadMutation.isPending}>
                      {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Order Volume</TableHead>
                  <TableHead>Lead Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {lead.contactName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{lead.contactName}</p>
                          <p className="text-sm text-gray-500">{lead.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{lead.company}</TableCell>
                    <TableCell className="font-medium">৳{parseFloat(lead.value).toLocaleString()}</TableCell>
                    <TableCell>{lead.orderVolume || '-'}</TableCell>
                    <TableCell>{lead.leadSource || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`${getStageColor(lead.stage)}`}>
                        {lead.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {users?.find(u => u.id === lead.assignedTo)?.firstName || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowViewDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead.id)}
                          disabled={deleteLeadMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <LeadEditDialog 
        lead={selectedLead}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      {/* View Dialog */}
      <LeadViewDialog 
        lead={selectedLead}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        onEdit={(lead) => {
          setSelectedLead(lead);
          setShowViewDialog(false);
          setShowEditDialog(true);
        }}
      />
    </>
  );
}
