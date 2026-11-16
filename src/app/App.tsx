import { Route, Routes } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import LauncherPage from "@/pages/LauncherPage";
import RequireAuth from "@/components/RequireAuth";
import LoginPage from "@/pages/LoginPage";
import ModulePage from "@/pages/ModulePage";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route index element={<LauncherPage />} />
        <Route path="module/:no" element={<ModulePage />} />
        <Route path="*" element={<LauncherPage />} />
      </Route>
      </Route>
    </Routes>
  );
}
