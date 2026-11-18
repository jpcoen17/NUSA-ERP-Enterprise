import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Posture {
  generated_at: string;
  tables: { name: string; rls: boolean; anon_access: boolean; policies: number }[];
  users: { total: number; suspended: number; guests: number; without_access: number; super_admins: number };
  activity: { action: string; n: number }[];
  issues: { severity: string; message: string }[];
}
const SEV: Record<string, string> = { critical: "bg-red-500/15 text-red-500", high: "bg-orange-500/15 text-orange-500", medium: "bg-amber-500/15 text-amber-600", info: "bg-blue-500/15 text-blue-500" };
const ORDER = ["critical", "high", "medium", "info"];

export default function SecurityPage() {
  const q = useQuery({ queryKey: ["posture"], queryFn: async () => { const r = await supabase!.rpc("security_posture"); if (r.error) throw new Error(r.error.message); return r.data as Posture; } });
  if (q.isLoading) return <p className="mt-6 text-sm">Memeriksa…</p>;
  if (q.error) return <p className="mt-6 text-sm text-red-500">{(q.error as Error).message === "forbidden" ? "Hanya Super Admin yang dapat membuka halaman ini." : (q.error as Error).message + ". Pastikan migrasi security_posture sudah di-push."}</p>;
  const d = q.data!;
  const serious = d.issues.filter((i) => i.severity !== "info").length;
  const rlsOk = d.tables.filter((t) => t.rls).length;
  const issues = [...d.issues].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const card = "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900";
  return (
    <div className="mt-6 space-y-4">
      <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">Ini adalah <b>pemeriksaan konfigurasi keamanan database</b> (RLS, hak akses, fungsi) dan ringkasan aktivitas dari audit log. Ini <b>bukan</b> deteksi ancaman real-time: tidak ada pemantauan login gagal, alamat IP, atau anomali. Pantau juga Dashboard Supabase (Logs dan Advisors).</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${card} flex items-center gap-3`}>{serious === 0 ? <ShieldCheck className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}<div><div className="text-xs text-slate-500">Masalah serius</div><div className="text-xl font-semibold">{serious}</div></div></div>
        <div className={card}><div className="text-xs text-slate-500">Tabel dengan RLS</div><div className="text-xl font-semibold">{rlsOk} / {d.tables.length}</div></div>
        <div className={card}><div className="text-xs text-slate-500">Super Admin</div><div className="text-xl font-semibold">{d.users.super_admins}</div></div>
      </div>
      <section className={card}><h2 className="mb-2 text-sm font-semibold">Temuan</h2>
        {issues.length === 0 && <p className="text-sm text-emerald-500">Tidak ada temuan.</p>}
        {issues.map((i, n) => <div key={n} className="flex items-start gap-2 border-t border-slate-100 py-1.5 text-sm dark:border-slate-800"><span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${SEV[i.severity]}`}>{i.severity}</span><span>{i.message}</span></div>)}</section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}><h2 className="mb-2 text-sm font-semibold">Pengguna</h2>
          {([["Total akun", d.users.total], ["Ditangguhkan", d.users.suspended], ["Akun guest", d.users.guests], ["Belum punya akses", d.users.without_access]] as [string, number][]).map(([l, v]) => <div key={l} className="flex justify-between border-t border-slate-100 py-1.5 text-sm dark:border-slate-800"><span>{l}</span><b>{v}</b></div>)}</section>
        <section className={card}><h2 className="mb-2 text-sm font-semibold">Aktivitas 7 hari terakhir (audit log)</h2>
          {d.activity.length === 0 && <p className="text-sm text-slate-500">Belum ada aktivitas tercatat.</p>}
          {d.activity.map((a) => <div key={a.action} className="flex justify-between border-t border-slate-100 py-1.5 text-sm dark:border-slate-800"><span>{a.action}</span><b>{a.n}</b></div>)}</section>
      </div>
      <p className="text-xs text-slate-400">Diperiksa {new Date(d.generated_at).toLocaleString("id-ID")}</p>
    </div>
  );
}
