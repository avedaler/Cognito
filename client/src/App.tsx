import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import AuthPage from "@/pages/auth";
import InboxPage from "@/pages/inbox";
import StructuredPage from "@/pages/structured";
import ActivePage from "@/pages/active";
import ActionPlansPage from "@/pages/action-plans";
import CompletedPage from "@/pages/completed";
import DashboardPage from "@/pages/dashboard";
import SearchPage from "@/pages/search";
import SpacePage from "@/pages/space";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={InboxPage} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/structured" component={StructuredPage} />
      <Route path="/active" component={ActivePage} />
      <Route path="/action-plans" component={ActionPlansPage} />
      <Route path="/completed" component={CompletedPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/spaces/:id" component={SpacePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Cognito...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto scrollbar-thin">
            <AppRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            {/* Router wraps everything so sidebar Links also get hash routing */}
            <Router hook={useHashLocation}>
              <AppShell />
            </Router>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
