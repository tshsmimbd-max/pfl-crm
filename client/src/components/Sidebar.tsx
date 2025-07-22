import { Layers, BarChart3, Users, Target, Calendar, Settings, LogOut, Filter, Handshake, UserCog, Bell, Activity, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { usePermissions, PERMISSIONS } from "@/hooks/usePermissions";

interface SidebarProps {
  user: User;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export default function Sidebar({ user, currentView, setCurrentView }: SidebarProps) {
  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const { hasPermission, canViewAnalytics, canManageUsers } = usePermissions();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, badge: null },
    ...(hasPermission(PERMISSIONS.LEAD_VIEW) ? [{ id: "leads", label: "Leads", icon: Users, badge: null }] : []),
    ...(hasPermission(PERMISSIONS.PIPELINE_VIEW) ? [{ id: "pipeline", label: "Pipeline", icon: Filter, badge: null }] : []),
    { id: "activities", label: "Activities", icon: Activity, badge: null },
    ...(hasPermission(PERMISSIONS.LEAD_VIEW) ? [{ id: "customers", label: "Customers", icon: UserCheck, badge: null }] : []),
    ...(canViewAnalytics() ? [{ id: "analytics", label: "Analytics", icon: BarChart3, badge: null }] : []),
    ...(hasPermission(PERMISSIONS.TARGET_VIEW) ? [{ id: "targets", label: "Targets", icon: Target, badge: null }] : []),
    ...(hasPermission(PERMISSIONS.CALENDAR_VIEW) ? [{ id: "calendar", label: "Calendar", icon: Calendar, badge: null }] : []),
    ...(canManageUsers() ? [{ id: "user-management", label: "User Management", icon: UserCog, badge: null }] : []),
  ];

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paperfly</h1>
            <p className="text-xs text-gray-500">CRM System</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-medium">{user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user.fullName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <Badge variant={user.role === "super_admin" ? "default" : "secondary"} className="text-xs">
            {user.role === "super_admin" ? "Super Admin" : 
             user.role === "sales_manager" ? "Manager" : "Agent"}
          </Badge>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg w-full text-left transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.id === "leads" && item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
              {item.id === "dashboard" && unreadCount && typeof unreadCount === 'object' && 'count' in unreadCount && (unreadCount as any).count > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {(unreadCount as any).count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900"
          onClick={() => setCurrentView("settings")}
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900"
          onClick={async () => {
            try {
              await fetch('/api/logout', { method: 'POST', credentials: 'include' });
              window.location.href = '/auth';
            } catch (error) {
              console.error('Logout error:', error);
            }
          }}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
