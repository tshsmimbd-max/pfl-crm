import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import LeadManagement from "@/components/LeadManagement";
import PipelineManagement from "@/components/PipelineManagement";
import TargetManagement from "@/components/TargetManagement";
import UserManagement from "@/components/UserManagement";
import CustomerManagement from "@/components/CustomerManagement";
import Analytics from "@/components/Analytics";
import Calendar from "@/components/Calendar";
import AgentActivityManagement from "@/components/AgentActivityManagement";
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
    else if (location === "/customers") setCurrentView("customers");
    else if (location === "/user-management") setCurrentView("user-management");
    else if (location === "/calendar") setCurrentView("calendar");
    else if (location === "/agent-activities") setCurrentView("agent-activities");
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
        return hasPermission(PERMISSIONS.LEAD_VIEW) ? <LeadManagement /> : <Dashboard setCurrentView={setCurrentView} />;
      case "pipeline":
        return hasPermission(PERMISSIONS.PIPELINE_VIEW) ? <PipelineManagement /> : <Dashboard setCurrentView={setCurrentView} />;
      case "analytics":
        return hasPermission(PERMISSIONS.ANALYTICS_PERSONAL) ? <Analytics /> : <Dashboard setCurrentView={setCurrentView} />;
      case "targets":
        return hasPermission(PERMISSIONS.TARGET_VIEW) ? <TargetManagement /> : <Dashboard setCurrentView={setCurrentView} />;
      case "customers":
        return hasPermission(PERMISSIONS.LEAD_VIEW) ? <CustomerManagement /> : <Dashboard setCurrentView={setCurrentView} />;
      case "user-management":
        return canManageUsers() ? <UserManagement /> : <Dashboard setCurrentView={setCurrentView} />;
      case "calendar":
        return hasPermission(PERMISSIONS.CALENDAR_VIEW) ? <Calendar /> : <Dashboard setCurrentView={setCurrentView} />;
      case "agent-activities":
        return (user.role === 'super_admin' || user.role === 'sales_manager') ? <AgentActivityManagement /> : <Dashboard setCurrentView={setCurrentView} />;
      case "notifications":
        return <NotificationSystem />;
      default:
        return <Dashboard setCurrentView={setCurrentView} />;
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar 
        user={user} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Paperfly CRM</h1>
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-medium text-sm">
              {user.employeeName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </span>
          </div>
        </div>
        
        <div className="flex-1 p-4 lg:p-6">
          <div className="hidden lg:flex items-center justify-between mb-6">
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
