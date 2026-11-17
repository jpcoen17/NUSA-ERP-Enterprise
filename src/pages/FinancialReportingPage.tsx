import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface TB { code: string; name: string; type: string; debit: number; credit: number }
const box = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const debitNormal = (t: string) => t === "asset" || t === "expense";
const bal = (r: TB) => (debitNormal(r.type) ? Number(r.debit) - Number(r.credit) : Number(r.credit) - Number(r.debit));
const sum = (rows: TB[], type: string) => rows.filter((r) => r.type === type).reduce((s, r) => s + bal(r), 0);

export default function FinancialReportingPage() {
  const { selected } = useCompany();
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const tb = (key: string, f: string | null, t: string | null) => useQuery({ // eslint-disable-line react-hooks/rules-of-hooks
    queryKey: ["trial-balance", key, selected, f, t],
    queryFn: async () => { const r = await supabase!.rpc("trial_balance", { cid: selected || null, p_from: f || null, p_to: t || null }); if (r.error) throw new Error(r.error.message); return r.data as TB[]; },
  });
  const period = tb("period", from, to);   // trial balance + income statement: the chosen period
  const cumulative = tb("cum", null, to);  // balance sheet: everything up to the end date
  if (period.error) return <p className="mt-6 text-sm text-red-500">{(period.error as Error).message}. Pastikan migrasi accounting sudah di-push.</p>;
  const p = period.data ?? [], c = cumulative.data ?? [];
  const revenue = sum(p, "revenue"), expense = sum(p, "expense"), net = revenue - expense;
  const assets = sum(c, "asset"), liab = sum(c, "liability"), equity = sum(c, "equity"), netCum = sum(c, "revenue") - sum(c, "expense");
  const td = p.reduce((s, r) => s + Number(r.debit), 0), tc = p.reduce((s, r) => s + Number(r.credit), 0);
  const row = (l: string, v: number, bold = false) => <div className={`flex justify-between border-t border-slate-100 py-1.5 text-sm dark:border-slate-800 ${bold ? "font-semibold" : ""}`}><span>{l}</span><span>{idr(v)}</span></div>;
  const card = "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900";
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs">Dari<input type="date" className={`${box} mt-1 block`} value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-xs">Sampai<input type="date" className={`${box} mt-1 block`} value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}><h2 className="mb-2 text-sm font-semibold">Laba rugi (periode terpilih)</h2>{row("Pendapatan", revenue)}{row("Beban (HPP + operasional)", expense)}{row("Laba bersih", net, true)}</section>
        <section className={card}><h2 className="mb-2 text-sm font-semibold">Neraca (sampai tanggal akhir)</h2>{row("Aset", assets)}{row("Liabilitas", liab)}{row("Ekuitas + laba berjalan", equity + netCum)}
          <p className={`mt-2 text-xs ${Math.abs(assets - liab - equity - netCum) < 0.01 ? "text-emerald-500" : "text-red-500"}`}>{Math.abs(assets - liab - equity - netCum) < 0.01 ? "Seimbang: Aset = Liabilitas + Ekuitas" : "Tidak seimbang, periksa jurnal"}</p></section>
      </div>
      <section className={`${card} overflow-x-auto`}><h2 className="mb-2 text-sm font-semibold">Neraca saldo (trial balance)</h2>
        <table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-1">Akun</th><th>Tipe</th><th className="text-right">Debit</th><th className="text-right">Kredit</th></tr></thead>
          <tbody>{p.map((r) => <tr key={r.code} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1.5">{r.code} {r.name}</td><td>{r.type}</td><td className="text-right">{idr(Number(r.debit))}</td><td className="text-right">{idr(Number(r.credit))}</td></tr>)}
            <tr className="border-t-2 font-semibold"><td className="py-1.5" colSpan={2}>Total</td><td className="text-right">{idr(td)}</td><td className="text-right">{idr(tc)}</td></tr></tbody></table>
        <p className={`mt-2 text-xs ${Math.abs(td - tc) < 0.01 ? "text-emerald-500" : "text-red-500"}`}>{Math.abs(td - tc) < 0.01 ? "Debit = Kredit" : "Debit ≠ Kredit"}</p></section>
    </div>
  );
}
