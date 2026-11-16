import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";

interface UserRow { id: string; email: string; full_name: string | null; status: string; access: { id: string; company: string; branch: string | null; role: string }[] }
const sel = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

function GrantDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { companies } = useCompany();
  const qc = useQueryClient();
  const [cid, setCid] = useState(""); const [bid, setBid] = useState(""); const [rid, setRid] = useState("");
  const roles = useQuery({ queryKey: ["roles"], queryFn: async () => (await supabase!.from("roles").select("id,name").order("name")).data ?? [] });
  const branches = useQuery({ queryKey: ["branch-opts", cid], enabled: Boolean(cid), queryFn: async () => (await supabase!.from("branches").select("id,name").eq("company_id", cid).order("name")).data ?? [] });
  const grant = useMutation({
    mutationFn: async () => { const r = await supabase!.rpc("admin_grant_access", { p_user: user.id, p_company: cid, p_branch: bid || null, p_role: rid }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 dark:bg-slate-950">
        <div className="flex justify-between"><h3 className="font-semibold">Grant access: {user.email}</h3><button onClick={onClose}><X size={18} /></button></div>
        <select className={sel} value={cid} onChange={(e) => { setCid(e.target.value); setBid(""); }}><option value="">— company —</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={sel} value={bid} onChange={(e) => setBid(e.target.value)} disabled={!cid}><option value="">All branches</option>{branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select className={sel} value={rid} onChange={(e) => setRid(e.target.value)}><option value="">— role —</option>{roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        {grant.error && <p className="text-xs text-red-500">{(grant.error as Error).message}</p>}
        <button disabled={!cid || !rid || grant.isPending} onClick={() => grant.mutate()} className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50">Grant</button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [granting, setGranting] = useState<UserRow | null>(null);
  const { data, error, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: async () => { const r = await supabase!.rpc("admin_list_users"); if (r.error) throw new Error(r.error.message); return r.data as UserRow[]; } });
  const act = useMutation({
    mutationFn: async (f: () => PromiseLike<{ error: { message: string } | null }>) => { const r = await f(); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  if (isLoading) return <p className="mt-6 text-sm">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}. Pastikan migrasi admin_panel sudah di-push.</p>;
  if (!data?.length) return <p className="mt-6 text-sm text-slate-500">Tidak ada data: hanya Super Admin yang dapat melihat daftar user.</p>;
  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs text-slate-500">User baru mendaftar lewat halaman login, lalu diberi akses di sini. Membuat user langsung oleh admin butuh Edge Function (belum dibuat).</p>
      {act.error && <p className="text-xs text-red-500">{(act.error as Error).message}</p>}
      {data.map((u) => (
        <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><div className="font-medium">{u.email}</div><div className="text-xs text-slate-500">{u.full_name || "—"} · <span className={u.status === "active" ? "text-emerald-500" : "text-red-500"}>{u.status}</span></div></div>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setGranting(u)} className="flex items-center gap-1 rounded-lg border px-3 py-1"><UserPlus size={13} />Grant</button>
              <button onClick={() => act.mutate(() => supabase!.rpc("admin_set_status", { p_user: u.id, p_status: u.status === "active" ? "suspended" : "active" }))} className="rounded-lg border px-3 py-1">{u.status === "active" ? "Suspend" : "Activate"}</button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {u.access.length === 0 && <span className="text-xs text-amber-500">Belum punya akses data</span>}
            {u.access.map((a) => (
              <span key={a.id} className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-500">
                {a.company} · {a.branch ?? "all branches"} · {a.role}
                <button aria-label="Revoke" onClick={() => confirm("Cabut akses ini?") && act.mutate(() => supabase!.rpc("admin_revoke_access", { p_access: a.id }))}><X size={11} /></button>
              </span>
            ))}
          </div>
        </div>
      ))}
      {granting && <GrantDialog user={granting} onClose={() => setGranting(null)} />}
    </div>
  );
}
