import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth";
import MfaChallenge from "@/components/MfaChallenge";

export default function RequireAuth() {
  const { session, loading } = useAuth();
  const aal = useQuery({ queryKey: ["aal", session?.user.id], enabled: Boolean(session && isSupabaseConfigured), queryFn: () => authService.aal() });
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-xl rounded-xl border p-6 text-sm">
        <h1 className="mb-2 text-lg font-semibold">Supabase belum dikonfigurasi</h1>
        <p>Salin <code>.env.example</code> menjadi <code>.env.local</code>, isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, lalu jalankan ulang <code>npm run dev</code>.</p>
      </div>
    );
  }
  if (loading || (session && aal.isLoading)) return <p className="p-8 text-sm">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  if (aal.data && aal.data.nextLevel === "aal2" && aal.data.currentLevel !== "aal2") return <MfaChallenge onDone={() => aal.refetch()} />;
  return <Outlet />;
}
