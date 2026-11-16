import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Role { code: string; name: string; role_permissions: { permissions: { code: string } | null }[] }

export default function RbacPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["rbac"],
    queryFn: async () => { const r = await supabase!.from("roles").select("code,name,role_permissions(permissions(code))").order("name"); if (r.error) throw new Error(r.error.message); return r.data as unknown as Role[]; },
  });
  if (isLoading) return <p className="mt-6 text-sm">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}</p>;
  return (
    <div className="mt-6 space-y-3">
      <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">Catatan jujur: daftar permission di bawah masih bersifat deskriptif. Penegakan akses saat ini lewat RLS (Super Admin, akses company, dan akses cabang). Penegakan per-permission belum dihubungkan.</p>
      {data?.map((r) => (
        <div key={r.code} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="font-medium">{r.name} <span className="text-xs text-slate-400">({r.code})</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.role_permissions.length === 0 && <span className="text-xs text-slate-400">tidak ada permission</span>}
            {r.role_permissions.map((p) => <span key={p.permissions?.code} className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px]">{p.permissions?.code}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
