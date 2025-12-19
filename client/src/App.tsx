import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import AddSubscription from "@/pages/add-subscription";
import CancellationFlow from "@/pages/cancellation-flow";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} />
      </Route>
      <Route path="/add">
        <ProtectedRoute component={() => (
          <Layout>
            <AddSubscription />
          </Layout>
        )} />
      </Route>
      <Route path="/cancel/:id">
         {/* Need to wrap dynamic routes carefully with wouter+auth */}
         {/* Using a wrapper component to handle params passing if needed, 
             but wouter hooks inside components work fine */}
         <ProtectedRoute component={() => (
           <Layout>
             <CancellationFlow />
           </Layout>
         )} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
