import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SprintProvider } from "@/contexts/SprintContext";
import { SessionTimeoutAlert } from "@/shared/components/common/SessionTimeoutAlert";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { useOnboarding } from "@/hooks/useOnboarding";
import React, { Suspense, lazy } from "react";

// Pages — Static imports for critical auth flow
import Auth             from "./pages/Auth.tsx";
import AuthCallback     from "./pages/AuthCallback.tsx";
import NotFound         from "./pages/NotFound.tsx";
import ResetPassword    from "./pages/ResetPassword.tsx";
import ForcePasswordChange from "./pages/ForcePasswordChange.tsx";

// Lazy loaded modules
const Index            = lazy(() => import("./pages/Index.tsx"));
const SustentacaoPage  = lazy(() => import("./features/sustentacao/SustentacaoPage"));
const RdmPage          = lazy(() => import("./features/rdm/RdmPage"));
const ModuleSelector   = lazy(() => import("./features/sustentacao/components/ModuleSelector").then(m => ({ default: m.ModuleSelector })));
const AdminDashboard   = lazy(() => import("./pages/AdminDashboard"));
const PlanningPokerPage = lazy(() => import("./pages/PlanningPokerPage"));
const RetrospactivaPage = lazy(() => import("./pages/RetrospactivaPage"));

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, refreshProfile } = useAuth();
  const { showWizard, completeOnboarding } = useOnboarding();
  if (loading) return <PageLoading />;
  if (!session) return <Navigate to="/auth" replace />;
  if (profile?.must_change_password) {
    return <ForcePasswordChange onDone={refreshProfile} />;
  }
  return (
    <>
      <Suspense fallback={<PageLoading />}>
        {children}
      </Suspense>
      <SessionTimeoutAlert />
      <OnboardingWizard open={showWizard} onComplete={completeOnboarding} />
    </>
  );
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, isAdmin, hasModuleAccess } = useAuth();
  if (loading) return null;
  if (!session) return <>{children}</>;
  if (isAdmin || profile?.module_access === "admin") return <Navigate to="/dashboard-admin" replace />;
  if (hasModuleAccess("rdm") && !hasModuleAccess("sala_agil") && !hasModuleAccess("sustentacao"))
    return <Navigate to="/rdm" replace />;
  if (hasModuleAccess("sustentacao") && !hasModuleAccess("sala_agil"))
    return <Navigate to="/sustentacao" replace />;
  return <Navigate to="/sala-agil/dashboard" replace />;
}

function ModuleRedirect() {
  const { profile, loading, isAdmin, hasModuleAccess } = useAuth();
  if (loading) return null;
  if (isAdmin || profile?.module_access === "admin") return <Navigate to="/dashboard-admin" replace />;
  if (hasModuleAccess("rdm") && !hasModuleAccess("sala_agil") && !hasModuleAccess("sustentacao"))
    return <Navigate to="/rdm" replace />;
  if (hasModuleAccess("sustentacao") && !hasModuleAccess("sala_agil"))
    return <Navigate to="/sustentacao" replace />;
  return <Navigate to="/sala-agil/dashboard" replace />;
}

function ModuleGuard({
  module,
  children,
}: {
  module: "sala_agil" | "sustentacao" | "rdm";
  children: React.ReactNode;
}) {
  const { isAdmin, hasModuleAccess } = useAuth();
  if (isAdmin || hasModuleAccess(module)) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-lg font-semibold text-destructive">Acesso Restrito</p>
        <p className="text-muted-foreground">Você não tem permissão para acessar este módulo.</p>
      </div>
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/modulos" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <SprintProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/auth"          element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/"             element={<ProtectedRoute><ModuleRedirect /></ProtectedRoute>} />
        <Route path="/modulos"      element={<ProtectedRoute><ModuleSelector /></ProtectedRoute>} />

        <Route
          path="/dashboard-admin"
          element={<ProtectedRoute><AdminGuard><AdminDashboard /></AdminGuard></ProtectedRoute>}
        />
        <Route
          path="/sala-agil"
          element={<ProtectedRoute><ModuleGuard module="sala_agil"><Navigate to="/sala-agil/dashboard" replace /></ModuleGuard></ProtectedRoute>}
        />
        <Route
          path="/sala-agil/planning-poker"
          element={<ProtectedRoute><ModuleGuard module="sala_agil"><PlanningPokerPage /></ModuleGuard></ProtectedRoute>}
        />
        <Route
          path="/sala-agil/retrospectiva"
          element={<ProtectedRoute><ModuleGuard module="sala_agil"><RetrospactivaPage /></ModuleGuard></ProtectedRoute>}
        />
        <Route
          path="/sala-agil/:section"
          element={<ProtectedRoute><ModuleGuard module="sala_agil"><Index /></ModuleGuard></ProtectedRoute>}
        />
        <Route
          path="/sustentacao/*"
          element={<ProtectedRoute><ModuleGuard module="sustentacao"><SustentacaoPage /></ModuleGuard></ProtectedRoute>}
        />
        <Route
          path="/rdm/*"
          element={<ProtectedRoute><ModuleGuard module="rdm"><RdmPage /></ModuleGuard></ProtectedRoute>}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SprintProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
