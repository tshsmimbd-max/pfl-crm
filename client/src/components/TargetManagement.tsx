import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Target, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTargetSchema, type InsertTarget } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function TargetManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ["/api/targets"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
  });

  const { data: metrics } = useQuery({
    queryKey: ["/api/analytics/metrics"],
  });

  const form = useForm<InsertTarget>({
    resolver: zodResolver(insertTargetSchema),
    defaultValues: {
      userId: "",
      period: "monthly",
      amount: "0",
      startDate: new Date(),
      endDate: new Date(),
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (data: InsertTarget) => {
      await apiRequest("POST", "/api/targets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Target created successfully",
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
        description: "Failed to create target",
        variant: "destructive",
      });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({
        title: "Success",
        description: "Target deleted successfully",
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
        description: "Failed to delete target",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTarget) => {
    createTargetMutation.mutate(data);
  };

  const handleDelete = (targetId: number) => {
    if (confirm("Are you sure you want to delete this target?")) {
      deleteTargetMutation.mutate(targetId);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const calculateProgress = (target: any) => {
    if (!metrics?.totalRevenue) return 0;
    return Math.min((metrics.totalRevenue / parseFloat(target.amount)) * 100, 100);
  };

  const getPeriodColor = (period: string) => {
    switch (period) {
      case "monthly":
        return "bg-blue-100 text-blue-800";
      case "quarterly":
        return "bg-purple-100 text-purple-800";
      case "annual":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (targetsLoading || (user?.role === "admin" && usersLoading)) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentTargets = targets?.filter((target) => {
    const now = new Date();
    const startDate = new Date(target.startDate);
    const endDate = new Date(target.endDate);
    return now >= startDate && now <= endDate;
  }) || [];

  const userTargets = user?.role === "admin" ? currentTargets : currentTargets.filter(t => t.userId === user?.id);
  const usersWithoutTargets = users?.filter(u => !currentTargets.some(t => t.userId === u.id)) || [];

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Target Management</h1>
            <p className="text-gray-600">Set and track sales targets for your team</p>
          </div>
          {user?.role === "admin" && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600 hover:bg-primary-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Set Target
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set New Target</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="period"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
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
                      <Button type="submit" disabled={createTargetMutation.isPending}>
                        {createTargetMutation.isPending ? "Creating..." : "Set Target"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Admin Alert for Missing Targets */}
        {user?.role === "admin" && usersWithoutTargets.length > 0 && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">Pending Assignments</h3>
                  <p className="text-sm mt-1">
                    {usersWithoutTargets.length} team members need targets assigned for the current period.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Target Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {userTargets.map((target) => {
            const targetUser = users?.find(u => u.id === target.userId);
            const progress = calculateProgress(target);
            const progressColor = progress >= 80 ? "text-success-600" : progress >= 50 ? "text-warning-600" : "text-gray-600";

            return (
              <Card key={target.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        {targetUser?.profileImageUrl ? (
                          <img
                            src={targetUser.profileImageUrl}
                            alt={`${targetUser.firstName} ${targetUser.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <Target className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : 'Unknown User'}
                        </h3>
                        <Badge className={`text-xs ${getPeriodColor(target.period)}`}>
                          {target.period.charAt(0).toUpperCase() + target.period.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    {user?.role === "admin" && (
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(target.id)}
                          disabled={deleteTargetMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Target Amount</span>
                        <span className="font-semibold">{formatCurrency(target.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Current Progress</span>
                        <span className={`font-semibold ${progressColor}`}>
                          {formatCurrency((metrics?.totalRevenue || 0).toString())}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{progress.toFixed(1)}% Complete</span>
                        <span className={progressColor}>
                          {progress >= 100 ? "Target Achieved!" : `${(100 - progress).toFixed(1)}% Remaining`}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Period:</span>
                        <span className="font-medium">
                          {formatDate(target.startDate)} - {formatDate(target.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary Card */}
        {user?.role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Target Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Targets</p>
                  <p className="text-2xl font-bold text-gray-900">{currentTargets.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Monthly Targets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      currentTargets
                        .filter(t => t.period === 'monthly')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                        .toString()
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Quarterly Targets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      currentTargets
                        .filter(t => t.period === 'quarterly')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                        .toString()
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Annual Targets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      currentTargets
                        .filter(t => t.period === 'annual')
                        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                        .toString()
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
