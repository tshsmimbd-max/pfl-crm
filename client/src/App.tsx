import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";


function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Debug logging to understand the authentication state
  console.log('Auth state:', { isAuthenticated, isLoading, user: !!user });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/leads" component={Home} />
      <Route path="/pipeline" component={Home} />
      <Route path="/customers" component={Home} />
      <Route path="/analytics" component={Home} />
      <Route path="/targets" component={Home} />
      <Route path="/user-management" component={Home} />
      <Route path="/calendar" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
