import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ChatPage from "@/pages/chat";
import DashboardPage from "@/pages/dashboard";
import EntriesPage from "@/pages/entries";
import ReviewPage from "@/pages/review";
import DigestPage from "@/pages/digest";

// Layout wrapper for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <ChatPage />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/entries">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <EntriesPage />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/review">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <ReviewPage />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/digest">
        {() => (
          <ProtectedRoute>
            <AppLayout>
              <DigestPage />
            </AppLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <AppRouter />
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
