import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface Entry { id: string; entry_date: string; memo: string | null; source_type: string }
interface Line { id: string; debit: number; credit: number; accounts: { code: string; name: string } | null }
interface JLine { account_id: string; debit: string; credit: string }
const box = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const blank: JLine = { account_id: "", debit: "", credit: "" };

function Lines({ entryId }: { entryId: string }) {
  const q = useQuery({ queryKey: ["je-lines", entryId], queryFn: async () => { const r = await supabase!.from("journal_lines").select("id,debit,credit,accounts(code,name)").eq("entry_id", entryId); if (r.error) throw new Error(r.error.message); return r.data as unknown as Line[]; } });
  return <table className="w-full text-xs"><tbody>{q.data?.map((l) => <tr key={l.id}><td className="py-0.5">{l.accounts?.code} {l.accounts?.name}</td><td className="text-right">{Number(l.debit) ? idr(Number(l.debit)) : ""}</td><td className="text-right">{Number(l.credit) ? idr(Number(l.credit)) : ""}</td></tr>)}</tbody></table>;
}

export default function GeneralLedgerPage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [expanded, setExpanded] = useState<string | null>(null);
  const [memo, setMemo] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [lines, setLines] = useState<JLine[]>([blank, blank]);
  const list = useQuery({
    queryKey: ["journals", selected],
    queryFn: async () => { let q = supabase!.from("journal_entries").select("id,entry_date,memo,source_type"); if (selected) q = q.eq("company_id", selected); const r = await q.order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(100); if (r.error) throw new Error(r.error.message); return r.data as Entry[]; },
  });
  const accounts = useQuery({ queryKey: ["acc-opts", selected], enabled: open && Boolean(selected), queryFn: async () => (await supabase!.from("accounts").select("id,code,name").eq("company_id", selected).order("code")).data ?? [] });
  const post = useMutation({
    mutationFn: async () => { const r = await supabase!.rpc("create_manual_journal", { p_company: selected, p_date: date, p_memo: memo, p_lines: lines.filter((l) => l.account_id).map((l) => ({ account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })) }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => { ["journals", "trial-balance"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setOpen(false); setMemo(""); setLines([blank, blank]); },
  });
  const set = (i: number, p: Partial<JLine>) => setLines(lines.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const dr = lines.reduce((s, l) => s + Number(l.debit || 0), 0), cr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Jurnal terbentuk otomatis dari penjualan, pembayaran, dan penerimaan barang. Jurnal tidak bisa diubah atau dihapus; koreksi dilakukan dengan jurnal balik. Jurnal manual hanya untuk Finance Manager, Company Admin, dan Super Admin.</p>
        <button onClick={() => (selected ? setOpen(true) : alert("Pilih satu company di Topbar dulu."))} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />Manual journal</button>
      </div>
      {open && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex gap-2"><input type="date" className={box} value={date} onChange={(e) => setDate(e.target.value)} /><input className={`${box} flex-1`} placeholder="Memo *" value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select className={`${box} flex-1`} value={l.account_id} onChange={(e) => set(i, { account_id: e.target.value })}><option value="">— akun —</option>{accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select>
              <input className={`${box} w-32`} type="number" min="0" placeholder="Debit" value={l.debit} onChange={(e) => set(i, { debit: e.target.value, credit: "" })} />
              <input className={`${box} w-32`} type="number" min="0" placeholder="Credit" value={l.credit} onChange={(e) => set(i, { credit: e.target.value, debit: "" })} />
              {lines.length > 2 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={15} className="text-red-500" /></button>}
            </div>
          ))}
          <button onClick={() => setLines([...lines, blank])} className="text-xs text-accent">+ Tambah baris</button>
          <div className={`text-sm ${dr === cr && dr > 0 ? "text-emerald-500" : "text-amber-500"}`}>Debit {idr(dr)} · Credit {idr(cr)} {dr === cr && dr > 0 ? "(seimbang)" : "(belum seimbang)"}</div>
          <div className="flex gap-2"><button disabled={!memo.trim() || dr !== cr || dr === 0 || post.isPending} onClick={() => post.mutate()} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">Posting</button><button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Batal</button></div>
        </div>
      )}
      {post.error && <p className="text-xs text-red-500">{(post.error as Error).message}</p>}
      {list.error && <p className="text-xs text-red-500">{(list.error as Error).message}. Pastikan migrasi accounting sudah di-push.</p>}
      {list.data?.length === 0 && <p className="text-sm text-slate-500">Belum ada jurnal. Jalankan supabase/seed_demo_gl.sql untuk data demo.</p>}
      {list.data?.map((e) => (
        <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <button className="flex w-full items-center justify-between text-left text-sm" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
            <span className="flex items-center gap-2"><ChevronDown size={14} className={expanded === e.id ? "rotate-180" : ""} />{e.memo}</span><span className="text-xs text-slate-500">{e.entry_date} · {e.source_type}</span></button>
          {expanded === e.id && <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800"><Lines entryId={e.id} /></div>}
        </div>
      ))}
    </div>
  );
}
