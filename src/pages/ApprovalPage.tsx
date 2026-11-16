import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface Req { id: string; title: string; description: string | null; request_type: string; amount: number; status: string; requested_by: string | null; decision_note: string | null; created_at: string }
const TONE: Record<string, string> = { pending: "bg-amber-500/15 text-amber-600", approved: "bg-emerald-500/15 text-emerald-600", rejected: "bg-red-500/15 text-red-600", cancelled: "bg-slate-500/15 text-slate-500" };
const box = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

export default function ApprovalPage() {
  const { session } = useAuth();
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", request_type: "general", amount: "0" });
  const admin = useQuery({ queryKey: ["is-admin", session?.user.id], queryFn: async () => (await supabase!.rpc("is_admin")).data === true });
  const list = useQuery({
    queryKey: ["approvals", selected],
    queryFn: async () => {
      let q = supabase!.from("approval_requests").select("*");
      if (selected) q = q.eq("company_id", selected);
      const r = await q.order("created_at", { ascending: false }).limit(200);
      if (r.error) throw new Error(r.error.message);
      return r.data as Req[];
    },
  });
  const run = useMutation({
    mutationFn: async (f: () => PromiseLike<{ error: { message: string } | null }>) => { const r = await f(); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); setAdding(false); },
  });
  const rows = (list.data ?? []).filter((r) => filter === "all" || r.status === filter);
  const submit = () => run.mutate(() => supabase!.from("approval_requests").insert({ company_id: selected, title: form.title, description: form.description || null, request_type: form.request_type, amount: Number(form.amount) }));

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 text-xs">{["pending", "approved", "rejected", "cancelled", "all"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 ${filter === s ? "border-accent bg-accent text-white" : "border-slate-300 dark:border-slate-700"}`}>{s}</button>))}</div>
        <button onClick={() => (selected ? setAdding(true) : alert("Pilih satu company di Topbar dulu."))} className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />New request</button>
      </div>
      {adding && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <input className={box} placeholder="Judul permintaan *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={box} placeholder="Keterangan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <select className={box} value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>{["general", "purchase", "expense", "leave", "discount"].map((t) => <option key={t}>{t}</option>)}</select>
            <input className={box} type="number" min="0" placeholder="Nominal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="flex gap-2"><button disabled={!form.title.trim() || run.isPending} onClick={submit} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">Kirim</button><button onClick={() => setAdding(false)} className="rounded-lg border px-4 py-2 text-sm">Batal</button></div>
        </div>
      )}
      {run.error && <p className="text-xs text-red-500">{(run.error as Error).message}</p>}
      {list.error && <p className="text-xs text-red-500">{(list.error as Error).message}. Pastikan migrasi approvals sudah di-push.</p>}
      {list.data && rows.length === 0 && <p className="text-sm text-slate-500">Tidak ada permintaan pada filter ini.</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="font-medium">{r.title}</div><div className="text-xs text-slate-500">{r.request_type} · {idr(r.amount)} · {new Date(r.created_at).toLocaleDateString("id-ID")}{r.description ? ` · ${r.description}` : ""}</div></div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[r.status]}`}>{r.status}</span>
          </div>
          {r.decision_note && <p className="mt-1 text-xs text-slate-500">Catatan: {r.decision_note}</p>}
          {r.status === "pending" && (
            <div className="mt-3 flex gap-2 text-xs">
              {admin.data && <>
                <button onClick={() => run.mutate(() => supabase!.rpc("approval_decide", { p_id: r.id, p_decision: "approved", p_note: prompt("Catatan (opsional)") }))} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-white"><Check size={13} />Approve</button>
                <button onClick={() => run.mutate(() => supabase!.rpc("approval_decide", { p_id: r.id, p_decision: "rejected", p_note: prompt("Alasan penolakan") }))} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-white"><X size={13} />Reject</button></>}
              {r.requested_by === session?.user.id && <button onClick={() => run.mutate(() => supabase!.rpc("approval_cancel", { p_id: r.id }))} className="rounded-lg border px-3 py-1">Cancel request</button>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
