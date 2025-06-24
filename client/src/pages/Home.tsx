import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import LeadManagement from "@/components/LeadManagement";
import PipelineManagement from "@/components/PipelineManagement";
import TargetManagement from "@/components/TargetManagement";
import UserManagement from "@/components/UserManagement";
import Analytics from "@/components/Analytics";
import Calendar from "@/components/Calendar";
import NotificationSystem from "@/components/NotificationSystem";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { usePermissions, PERMISSIONS } from "@/hooks/usePermissions";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState("dashboard");
  const { hasPermission, canManageUsers } = usePermissions();



  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  useEffect(() => {
    // Set current view based on location
    if (location === "/leads") setCurrentView("leads");
    else if (location === "/pipeline") setCurrentView("pipeline");
    else if (location === "/analytics") setCurrentView("analytics");
    else if (location === "/targets") setCurrentView("targets");
    else if (location === "/user-management") setCurrentView("user-management");
    else if (location === "/calendar") setCurrentView("calendar");
    else setCurrentView("dashboard");
  }, [location]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case "leads":
        return hasPermission(PERMISSIONS.LEAD_VIEW) ? <LeadManagement /> : <Dashboard />;
      case "pipeline":
        return hasPermission(PERMISSIONS.PIPELINE_VIEW) ? <PipelineManagement /> : <Dashboard />;
      case "analytics":
        return hasPermission(PERMISSIONS.ANALYTICS_PERSONAL) ? <Analytics /> : <Dashboard />;
      case "targets":
        return hasPermission(PERMISSIONS.TARGET_VIEW) ? <TargetManagement /> : <Dashboard />;
      case "user-management":
        return canManageUsers() ? <UserManagement /> : <Dashboard />;
      case "calendar":
        return hasPermission(PERMISSIONS.CALENDAR_VIEW) ? <Calendar /> : <Dashboard />;
      case "notifications":
        return <NotificationSystem />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar user={user} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('-', ' ')}
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/logout', { 
                      method: 'POST',
                      credentials: 'include'
                    });
                    window.location.reload();
                  } catch (error) {
                    console.error('Logout error:', error);
                    window.location.reload();
                  }
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Log out
              </button>
            </div>
          </div>
          {renderContent()}
        </div>
      </main>
      <NotificationSystem />
    </div>
  );
}
