import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./components/layout/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";
import { CorePage } from "./pages/CorePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpeditionsPage } from "./pages/ExpeditionsPage";
import { KitPage } from "./pages/KitPage";
import { LibraryPage } from "./pages/LibraryPage";
import { LoginPage } from "./pages/LoginPage";
import { MembershipPage } from "./pages/MembershipPage";
import { SignupPage } from "./pages/SignupPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="expeditions" element={<ExpeditionsPage />} />
              <Route path="kit" element={<KitPage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="core" element={<CorePage />} />
              <Route path="membership" element={<MembershipPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
