import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useGuest } from "@/hooks/useGuest";
import { useTheme } from "@/hooks/useTheme";

export default function AppLayout() {
  const { dark, toggle } = useTheme();
  const guest = useGuest();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar dark={dark} onTheme={toggle} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {guest && <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">Anda masuk sebagai <b>Guest (hanya-baca)</b>. Silakan jelajahi dashboard, laporan, dan data demo. Tombol tambah, ubah, hapus, atau proses transaksi akan ditolak oleh server.</div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
