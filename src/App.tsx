import type { ReactNode } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useStore } from "./store/useStore";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import FinancePage from "./pages/FinancePage";
import NotesPage from "./pages/NotesPage";
import HivePage from "./pages/HivePage";
import CrmPage from "./pages/CrmPage";
import InboxPage from "./pages/InboxPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import AgendaPage from "./pages/AgendaPage";
import PersonalIntegrationsPage from "./pages/PersonalIntegrationsPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import { Toaster } from "@/components/ui/sonner";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const token = useStore((s) => s.token);
  const role = useStore((s) => s.user?.role);
  if (!token) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-primary/30">
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="hive" element={<HivePage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="integracoes-pessoais" element={<PersonalIntegrationsPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
