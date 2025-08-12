
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  DollarSign, 
  Plus, 
  Mail, 
  Phone, 
  Building2,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  Edit,
  Tag,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DailyRevenueDialog from "./DailyRevenueDialog";
import CreateCustomerDialog from "./CreateCustomerDialog";
import BulkCustomerUpload from "./BulkCustomerUpload";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCustomerSchema } from "@shared/schema";

const editCustomerSchema = insertCustomerSchema.omit({ createdBy: true });

export default function CustomerManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showRevenueDialog, setShowRevenueDialog] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rateChartFilter, setRateChartFilter] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [newTag, setNewTag] = useState("");
  const [showTagDialog, setShowTagDialog] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ["/api/daily-revenue"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const editForm = useForm({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      merchantCode: "",
      merchantName: "",
      rateChart: "",
      contactPerson: "",
      phoneNumber: "",
      assignedAgent: "",
      productType: "",
      notes: "",
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return await apiRequest(`/api/customers/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowEditDialog(false);
      setSelectedCustomer(null);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    editForm.reset({
      merchantCode: customer.merchantCode,
      merchantName: customer.merchantName,
      rateChart: customer.rateChart,
      contactPerson: customer.contactPerson,
      phoneNumber: customer.phoneNumber,
      assignedAgent: customer.assignedAgent,
      productType: customer.productType || "",
      notes: customer.notes || "",
    });
    setShowEditDialog(true);
  };

  const onEditSubmit = (data: any) => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({
        id: selectedCustomer.id,
        updates: data,
      });
    }
  };

  const handleAddTag = (customerId: number, tag: string) => {
    if (!tag.trim()) return;
    
    const customer = customers.find((c: any) => c.id === customerId);
    if (!customer) return;

    const currentTags = customer.tags ? customer.tags.split(",").filter((t: string) => t.trim()) : [];
    const newTags = [...currentTags, tag.trim()];
    
    updateCustomerMutation.mutate({
      id: customerId,
      updates: { tags: newTags.join(",") },
    });
    setNewTag("");
  };

  const handleRemoveTag = (customerId: number, tagToRemove: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    if (!customer) return;

    const currentTags = customer.tags ? customer.tags.split(",").filter((t: string) => t.trim()) : [];
    const newTags = currentTags.filter((tag: string) => tag !== tagToRemove);
    
    updateCustomerMutation.mutate({
      id: customerId,
      updates: { tags: newTags.join(",") },
    });
  };

  const formatCurrency = (value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `৳${(isNaN(numValue) ? 0 : numValue).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  const getTotalRevenueForCustomer = (customerId: number) => {
    return dailyRevenue
      .filter((rev: any) => rev.customerId === customerId)
      .reduce((sum: number, rev: any) => sum + (rev.revenue || 0), 0);
  };

  const getTotalOrdersForCustomer = (customerId: number) => {
    return dailyRevenue
      .filter((rev: any) => rev.customerId === customerId)
      .reduce((sum: number, rev: any) => sum + (rev.orders || 0), 0);
  };

  const getAgentName = (agentId: string) => {
    const agent = users.find((u: any) => u.id === agentId);
    return agent ? agent.employeeName : 'Unknown';
  };

  // Filter customers based on search and filter criteria
  const filteredCustomers = customers.filter((customer: any) => {
    const matchesSearch = 
      customer.merchantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm);

    const matchesRateChart = rateChartFilter === "all" || customer.rateChart === rateChartFilter;
    const matchesProductType = productTypeFilter === "all" || customer.productType === productTypeFilter;
    const matchesAgent = agentFilter === "all" || customer.assignedAgent === agentFilter;

    return matchesSearch && matchesRateChart && matchesProductType && matchesAgent;
  });

  // Get unique values for filters
  const uniqueRateCharts = [...new Set(customers.map((c: any) => c.rateChart))];
  const uniqueProductTypes = [...new Set(customers.map((c: any) => c.productType).filter(Boolean))];
  const uniqueAgents = [...new Set(customers.map((c: any) => c.assignedAgent))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">Manage converted customers and track revenue</p>
        </div>
        <div className="flex space-x-3">
          {user?.role === "super_admin" && (
            <>
              <Button 
                onClick={() => setShowCreateCustomerDialog(true)}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
              <BulkCustomerUpload />
            </>
          )}
          <Button 
            onClick={() => setShowRevenueDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Daily Revenue
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={rateChartFilter} onValueChange={setRateChartFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Rate Chart" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rate Charts</SelectItem>
                {uniqueRateCharts.map((chart) => (
                  <SelectItem key={chart} value={chart}>{chart}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Product Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {uniqueProductTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Assigned Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {uniqueAgents.map((agentId) => (
                  <SelectItem key={agentId} value={agentId}>
                    {getAgentName(agentId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setRateChartFilter("all");
                  setProductTypeFilter("all");
                  setAgentFilter("all");
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCustomers.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredCustomers.length !== customers.length && `Filtered from ${customers.length} total`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dailyRevenue.reduce((sum: number, rev: any) => sum + (rev.revenue || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              From all daily entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyRevenue.reduce((sum: number, rev: any) => sum + (rev.orders || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From all customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {customers.length === 0 ? "No customers yet" : "No customers match your filters"}
              </h3>
              <p className="text-gray-600">
                {customers.length === 0 
                  ? "Only super admins can create customers" 
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant Code</TableHead>
                  <TableHead>Merchant Name</TableHead>
                  <TableHead>Rate Chart</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>Product Type</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium text-blue-600">{customer.merchantCode}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.merchantName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                        customer.rateChart === 'ISD' ? 'bg-blue-100 text-blue-800' :
                        customer.rateChart === 'Pheripheri' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {customer.rateChart}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{customer.contactPerson}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        {customer.phoneNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getAgentName(customer.assignedAgent)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.productType || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags && customer.tags.split(",").filter((tag: string) => tag.trim()).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag.trim()}
                            <button
                              onClick={() => handleRemoveTag(customer.id, tag.trim())}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowTagDialog(true);
                          }}
                        >
                          <Tag className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {formatDate(customer.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user?.role === "super_admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="merchantCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="merchantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="rateChart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Chart</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rate chart" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ISD">ISD</SelectItem>
                          <SelectItem value="Pheripheri">Pheripheri</SelectItem>
                          <SelectItem value="OSD">OSD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="assignedAgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Agent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.employeeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomerMutation.isPending}>
                  {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag name"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag(selectedCustomer?.id, newTag);
                    setShowTagDialog(false);
                  }
                }}
              />
              <Button
                onClick={() => {
                  handleAddTag(selectedCustomer?.id, newTag);
                  setShowTagDialog(false);
                }}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Revenue Dialog */}
      <DailyRevenueDialog 
        open={showRevenueDialog} 
        onOpenChange={setShowRevenueDialog} 
      />

      {/* Create Customer Dialog */}
      <CreateCustomerDialog 
        open={showCreateCustomerDialog} 
        onOpenChange={setShowCreateCustomerDialog} 
      />
    </div>
  );
}
