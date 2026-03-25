// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlan } from "@/hooks/usePlan";

import Index from "./pages/Index";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import Dashboard from "@/pages/Dashboard";
import DashboardCockpit from "@/pages/DashboardCockpit";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CheckEmail from "./pages/CheckEmail";
import ClientsPage from "./pages/Clients";
import PricingPage from "@/pages/PricingPage";
import Onboarding from "./pages/Onboarding";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

// ─── SmartDashboard — switche selon le plan ───────────────────────────────────
function SmartDashboard() {
  const { plan, loading } = usePlan();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (plan === "pro" || plan === "business") return <DashboardCockpit />;
  return <Dashboard />;
}

// ─── App ─────────────────────────────────────────────────────────────────────

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <OnboardingGuard>
                <Routes>
                  {/* ── Public ── */}
                  <Route path="/" element={<Index />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/check-email" element={<CheckEmail />} />

                  {/* ── Démo publique — aucune auth requise ── */}
                  <Route path="/demo" element={<DashboardCockpit />} />

                  {/* ── Protected ── */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <SmartDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cockpit"
                    element={
                      <ProtectedRoute>
                        <DashboardCockpit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/generator"
                    element={
                      <ProtectedRoute>
                        <InvoiceGenerator />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <ProtectedRoute>
                        <ClientsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </OnboardingGuard>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;