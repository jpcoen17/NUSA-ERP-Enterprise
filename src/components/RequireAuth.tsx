import { Navigate, Outlet } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth() {
  const { session, loading } = useAuth();
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto mt-24 max-w-xl rounded-xl border p-6 text-sm">
        <h1 className="mb-2 text-lg font-semibold">Supabase belum dikonfigurasi</h1>
        <p>Salin <code>.env.example</code> menjadi <code>.env.local</code>, isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, lalu jalankan ulang <code>npm run dev</code>.</p>
      </div>
    );
  }
  if (loading) return <p className="p-8 text-sm">Loading…</p>;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
