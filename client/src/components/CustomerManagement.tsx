import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  DollarSign, 
  Plus, 
  Mail, 
  Phone, 
  Building2,
  Calendar,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import DailyRevenueDialog from "./DailyRevenueDialog";
import CreateCustomerDialog from "./CreateCustomerDialog";
import BulkCustomerUpload from "./BulkCustomerUpload";
import { useAuth } from "@/hooks/useAuth";

export default function CustomerManagement() {
  const { user } = useAuth();
  const [showRevenueDialog, setShowRevenueDialog] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ["/api/daily-revenue"],
  });

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              Converted from won leads
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
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers yet</h3>
              <p className="text-gray-600">Only super admins can create customers</p>
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
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer: any) => (
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
                        {customer.assignedAgent || 'Not assigned'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.productType || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {formatDate(customer.createdAt)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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