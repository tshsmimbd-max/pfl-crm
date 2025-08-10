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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Users, UserCog, Crown, Shield, Edit, Trash2, AlertCircle, KeyRound } from "lucide-react";
import { AdminPasswordResetDialog } from "@/components/AdminPasswordResetDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";

const updateRoleSchema = z.object({
  role: z.enum(["super_admin", "sales_manager", "sales_agent"]),
});

const addUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  employeeName: z.string().min(2, "Employee name must be at least 2 characters"),
  employeeCode: z.string().min(2, "Employee code is required"),
  role: z.enum(["super_admin", "sales_manager", "sales_agent"]),
  managerId: z.string().min(1, "Manager assignment is required for sales agents"),
  teamName: z.enum(["Sales Titans", "Revenue Rangers"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => {
  // For sales agents, managerId is required
  if (data.role === "sales_agent" && (!data.managerId || data.managerId === "")) {
    return false;
  }
  return true;
}, {
  message: "Sales agents must be assigned to a manager",
  path: ["managerId"],
});

type UpdateRoleData = z.infer<typeof updateRoleSchema>;
type AddUserData = z.infer<typeof addUserSchema>;

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: targets } = useQuery<any[]>({
    queryKey: ["/api/targets"],
  });

  const { data: teamPerformance } = useQuery<any[]>({
    queryKey: ["/api/analytics/team-performance"],
  });

  const form = useForm<UpdateRoleData>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      role: "sales_agent",
    },
  });

  const addUserForm = useForm<AddUserData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: "",
      employeeName: "",
      employeeCode: "",
      role: "sales_agent",
      managerId: currentUser?.role === 'sales_manager' ? currentUser.id : "",
      teamName: (currentUser?.role === 'sales_manager' ? (currentUser.teamName as "Sales Titans" | "Revenue Rangers") || "Sales Titans" : "Sales Titans"),
      password: "",
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      form.reset();
      toast({
        title: "Success",
        description: "User role updated successfully",
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
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: AddUserData) => {
      await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserDialogOpen(false);
      addUserForm.reset();
      toast({
        title: "Success",
        description: "User added successfully",
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
        description: "Failed to add user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateRoleData) => {
    if (selectedUser) {
      updateRoleMutation.mutate({
        userId: selectedUser.id,
        role: data.role,
      });
    }
  };

  const onAddUserSubmit = (data: AddUserData) => {
    addUserMutation.mutate(data);
  };

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    form.setValue("role", user.role as "super_admin" | "sales_manager" | "sales_agent");
    setIsRoleDialogOpen(true);
  };

  const handlePasswordReset = (user: User) => {
    setPasswordResetUser(user);
    setIsPasswordResetDialogOpen(true);
  };

  const filteredUsers = users?.filter((user: User) => {
    const matchesSearch = 
      user.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const getUserStats = (user: User) => {
    const userTargets = targets?.filter((t: any) => t.userId === user.id) || [];
    const userPerformance = teamPerformance?.find((p: any) => p.user.id === user.id);
    
    return {
      activeTargets: userTargets.length,
      dealsCount: userPerformance?.dealsCount || 0,
      revenue: userPerformance?.revenue || 0,
      targetProgress: userPerformance?.targetProgress || 0,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return Crown;
      case "sales_manager":
        return Shield;
      case "sales_agent":
        return Users;
      default:
        return Users;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return (
          <Badge className="bg-purple-100 text-purple-700">
            <Crown className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
        );
      case "sales_manager":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Shield className="w-3 h-3 mr-1" />
            Sales Manager
          </Badge>
        );
      case "sales_agent":
        return (
          <Badge variant="secondary">
            <Users className="w-3 h-3 mr-1" />
            Sales Agent
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Users className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  // Get manager name for display
  const getManagerName = (managerId?: string) => {
    if (!managerId) return "No Manager";
    const manager = users?.find((u: User) => u.id === managerId);
    return manager?.employeeName || "Unknown Manager";
  };

  // Check if current user can add users (super_admin or sales_manager)
  const canAddUsers = currentUser?.role === "super_admin" || currentUser?.role === "sales_manager";

  // Get available managers for assignment (super_admin and sales_manager)
  const availableManagers = users?.filter((u: User) => 
    u.role === "super_admin" || u.role === "sales_manager"
  ) || [];

  // Filter users based on role hierarchy
  const getVisibleUsers = () => {
    if (!users) return [];
    
    if (currentUser?.role === "super_admin") {
      // Super admin sees all users
      return filteredUsers;
    } else if (currentUser?.role === "sales_manager") {
      // Sales manager sees only their team members
      return filteredUsers.filter((user: User) => 
        user.managerId === currentUser.id || user.id === currentUser.id
      );
    } else {
      // Sales agent sees only themselves
      return filteredUsers.filter((user: User) => user.id === currentUser?.id);
    }
  };

  const visibleUsers = getVisibleUsers();

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

  const superAdminCount = visibleUsers.filter((u: User) => u.role === "super_admin").length || 0;
  const managerCount = visibleUsers.filter((u: User) => u.role === "sales_manager").length || 0;
  const agentCount = visibleUsers.filter((u: User) => u.role === "sales_agent").length || 0;
  const usersWithoutTargets = visibleUsers.filter((u: User) => 
    u.role === "sales_agent" && !targets?.some((t: any) => t.userId === u.id)
  ).length || 0;

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage team members and their roles</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {superAdminCount} Super Admins • {managerCount} Managers • {agentCount} Agents
            </div>
            {canAddUsers && (
              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <Form {...addUserForm}>
                    <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={addUserForm.control}
                          name="employeeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addUserForm.control}
                          name="employeeCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee Code</FormLabel>
                              <FormControl>
                                <Input placeholder="EMP001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={addUserForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addUserForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Minimum 6 characters" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addUserForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currentUser?.role === "super_admin" && (
                                  <SelectItem value="sales_manager">
                                    <div className="flex items-center space-x-2">
                                      <Shield className="w-4 h-4" />
                                      <span>Sales Manager</span>
                                    </div>
                                  </SelectItem>
                                )}
                                <SelectItem value="sales_agent">
                                  <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4" />
                                    <span>Sales Agent</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {addUserForm.watch("role") === "sales_agent" && (
                        <FormField
                          control={addUserForm.control}
                          name="managerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign Manager</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manager" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableManagers.map((manager: User) => {
                                    const ManagerIcon = getRoleIcon(manager.role);
                                    return (
                                      <SelectItem key={manager.id} value={manager.id}>
                                        <div className="flex items-center space-x-2">
                                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                            <ManagerIcon className="w-3 h-3 text-primary-600" />
                                          </div>
                                          <div>
                                            <p className="font-medium">{manager.employeeName}</p>
                                            <p className="text-xs text-gray-500">{manager.role}</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={addUserForm.control}
                        name="teamName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Sales Titans">Sales Titans</SelectItem>
                                <SelectItem value="Revenue Rangers">Revenue Rangers</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUserDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addUserMutation.isPending}>
                          {addUserMutation.isPending ? "Adding..." : "Add User"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Alert for users without targets */}
        {usersWithoutTargets > 0 && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">Action Required</h3>
                  <p className="text-sm mt-1">
                    {usersWithoutTargets} sales team members don't have targets assigned. 
                    Consider setting targets to help track their performance.
                  </p>
                </div>
                <Button variant="link" className="text-yellow-700 hover:text-yellow-800 p-0">
                  Go to Targets →
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sales Managers</p>
                  <p className="text-2xl font-bold text-gray-900">{managerCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sales Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{agentCount}</p>
                </div>
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-success-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Without Targets</p>
                  <p className="text-2xl font-bold text-gray-900">{usersWithoutTargets}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admins</SelectItem>
                  <SelectItem value="sales_manager">Sales Managers</SelectItem>
                  <SelectItem value="sales_agent">Sales Agents</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({visibleUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Active Targets</TableHead>
                  <TableHead>Deals Closed</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user: User) => {
                  const stats = getUserStats(user);
                  const RoleIcon = getRoleIcon(user.role);
                  const isCurrentUser = user.id === currentUser?.id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <RoleIcon className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.employeeName}
                              {isCurrentUser && <span className="text-xs text-gray-500 ml-2">(You)</span>}
                            </p>
                            {user.employeeCode && (
                              <p className="text-xs text-gray-400">{user.employeeCode}</p>
                            )}
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-600">{getManagerName(user.managerId)}</p>
                          {user.teamName && <p className="text-xs text-gray-500">{user.teamName}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stats.activeTargets}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stats.dealsCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(stats.revenue)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(user)}
                            disabled={isCurrentUser}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {(currentUser?.role === 'super_admin' || 
                            (currentUser?.role === 'sales_manager' && user.managerId === currentUser.id)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePasswordReset(user)}
                              className="text-orange-600 hover:text-orange-800"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Role Update Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update User Role</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedUser.employeeName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="super_admin">
                                <div className="flex items-center space-x-2">
                                  <Crown className="w-4 h-4" />
                                  <span>Super Admin</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="sales_manager">
                                <div className="flex items-center space-x-2">
                                  <Shield className="w-4 h-4" />
                                  <span>Sales Manager</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="sales_agent">
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4" />
                                  <span>Sales Agent</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsRoleDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateRoleMutation.isPending}>
                        {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        {passwordResetUser && (
          <AdminPasswordResetDialog
            open={isPasswordResetDialogOpen}
            onOpenChange={setIsPasswordResetDialogOpen}
            userId={passwordResetUser.id}
            userEmail={passwordResetUser.email}
            userName={passwordResetUser.employeeName}
          />
        )}
      </div>
    </>
  );
}
