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

export default function Home() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState("dashboard");

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
        return <LeadManagement />;
      case "pipeline":
        return <PipelineManagement />;
      case "analytics":
        return <Analytics />;
      case "targets":
        return <TargetManagement />;
      case "user-management":
        return user.role === "admin" ? <UserManagement /> : <Dashboard />;
      case "calendar":
        return <Calendar />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar user={user} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>
      <NotificationSystem />
    </div>
  );
}
