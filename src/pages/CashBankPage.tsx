import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface L { id: string; debit: number; credit: number; journal_entries: { entry_date: string; memo: string | null; source_type: string } | null }
const box = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const CATS = ["Salary", "Rent", "Utilities", "Logistics", "Marketing", "Office", "Other"];

export default function CashBankPage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), category: "Utilities", description: "", amount: "" });
  const ledger = useQuery({
    queryKey: ["cash-ledger", selected],
    queryFn: async () => {
      let q = supabase!.from("journal_lines").select("id,debit,credit,journal_entries(entry_date,memo,source_type),accounts!inner(code)").eq("accounts.code", "1100");
      if (selected) q = q.eq("company_id", selected);
      const r = await q.limit(1000);
      if (r.error) throw new Error(r.error.message);
      return (r.data as unknown as L[]).sort((a, b) => (a.journal_entries?.entry_date ?? "").localeCompare(b.journal_entries?.entry_date ?? ""));
    },
  });
  const save = useMutation({
    mutationFn: async () => { const r = await supabase!.rpc("record_expense", { p_company: selected, p_date: f.date, p_category: f.category, p_description: f.description, p_amount: Number(f.amount) }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => { ["cash-ledger", "dashboard", "journals", "trial-balance", "analytics"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setF({ ...f, description: "", amount: "" }); },
  });
  let run = 0;
  const rows = (ledger.data ?? []).map((l) => { run += Number(l.debit) - Number(l.credit); return { ...l, balance: run }; });
  const balance = run;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><span className="rounded-lg bg-emerald-500/15 p-2.5 text-emerald-500"><Wallet size={20} /></span><div><div className="text-xs text-slate-500">Saldo Kas & Bank (akun 1100, dari buku besar)</div><div className="text-xl font-semibold">{idr(balance)}</div></div></div>
      <section className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-sm font-semibold">Catat biaya</h2>
        <p className="text-xs text-slate-500">Memposting jurnal otomatis: Debit Beban Operasional, Kredit Kas & Bank. Hanya Finance Manager, Company Admin, dan Super Admin.</p>
        <div className="flex flex-wrap gap-2">
          <input type="date" className={box} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <select className={box} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          <input className={`${box} flex-1`} placeholder="Keterangan" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <input className={`${box} w-40`} type="number" min="0" placeholder="Nominal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <button disabled={!f.amount || Number(f.amount) <= 0 || save.isPending} onClick={() => (selected ? save.mutate() : alert("Pilih satu company di Topbar dulu."))} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">Simpan</button>
        </div>
        {save.error && <p className="text-xs text-red-500">{(save.error as Error).message}</p>}
      </section>
      {ledger.error && <p className="text-xs text-red-500">{(ledger.error as Error).message}</p>}
      <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Keterangan</th><th className="px-3 py-2 text-right">Masuk</th><th className="px-3 py-2 text-right">Keluar</th><th className="px-3 py-2 text-right">Saldo</th></tr></thead>
        <tbody>{[...rows].reverse().map((r) => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-1.5">{r.journal_entries?.entry_date}</td><td className="px-3 py-1.5">{r.journal_entries?.memo}</td><td className="px-3 py-1.5 text-right">{Number(r.debit) ? idr(Number(r.debit)) : ""}</td><td className="px-3 py-1.5 text-right">{Number(r.credit) ? idr(Number(r.credit)) : ""}</td><td className="px-3 py-1.5 text-right">{idr(r.balance)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
