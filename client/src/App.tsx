import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RequireAuth } from "./components/RequireAuth";
import { StudentsPage } from "./pages/StudentsPage";
import { AcademicsPage } from "./pages/AcademicsPage";
import { FinancePage } from "./pages/FinancePage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { TransportPage } from "./pages/TransportPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { ExamsPage } from "./pages/ExamsPage";
import { PortalPage } from "./pages/PortalPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ClassroomsPage } from "./pages/ClassroomsPage";
import { BillingPage } from "./pages/BillingPage";
import { LibraryPage } from "./pages/LibraryPage";
import { OrganizationPage } from "./pages/OrganizationPage";
import { CommentsPage } from "./pages/CommentsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/academics" element={<AcademicsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/comments" element={<CommentsPage />} />
          <Route path="/portal" element={<PortalPage />} />
          <Route path="/workflow" element={<WorkflowPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/classrooms" element={<ClassroomsPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
