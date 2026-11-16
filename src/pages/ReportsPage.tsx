import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";

const DATASETS: Record<string, { date?: string; cols: string[] }> = {
  sales_orders: { date: "order_date", cols: ["order_no", "order_date", "status", "total"] },
  invoices: { date: "issue_date", cols: ["invoice_no", "issue_date", "due_date", "amount", "paid_amount", "status"] },
  products: { cols: ["sku", "name", "category", "unit_price", "cost", "stock_qty", "reorder_level"] },
  customers: { cols: ["code", "name", "email", "city"] },
  expenses: { date: "expense_date", cols: ["expense_date", "category", "description", "amount"] },
};
type Row = Record<string, unknown>;
// Prefix risky leading characters so spreadsheets do not execute cell content as a formula.
const cell = (v: unknown) => { let s = v === null || v === undefined ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

export default function ReportsPage() {
  const { selected } = useCompany();
  const [ds, setDs] = useState("sales_orders");
  const [cols, setCols] = useState<string[]>(DATASETS.sales_orders.cols);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const cfg = DATASETS[ds];
  const run = useMutation({
    mutationFn: async () => {
      let q = supabase!.from(ds).select(cols.join(","));
      if (selected) q = q.eq("company_id", selected);
      if (cfg.date && from) q = q.gte(cfg.date, from);
      if (cfg.date && to) q = q.lte(cfg.date, to);
      const r = await q.order(cfg.date ?? cols[0]).limit(1000);
      if (r.error) throw new Error(r.error.message);
      return r.data as unknown as Row[];
    },
  });
  const rows = run.data ?? [];
  const exportCsv = () => {
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${ds}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">Dataset<select className={`${input} mt-1 block`} value={ds} onChange={(e) => { setDs(e.target.value); setCols(DATASETS[e.target.value].cols); run.reset(); }}>{Object.keys(DATASETS).map((d) => <option key={d}>{d}</option>)}</select></label>
        {cfg.date && <><label className="text-xs">Dari<input type="date" className={`${input} mt-1 block`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs">Sampai<input type="date" className={`${input} mt-1 block`} value={to} onChange={(e) => setTo(e.target.value)} /></label></>}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">{cfg.cols.map((c) => <label key={c} className="flex items-center gap-1"><input type="checkbox" checked={cols.includes(c)} onChange={(e) => setCols(e.target.checked ? cfg.cols.filter((x) => x === c || cols.includes(x)) : cols.filter((x) => x !== c))} />{c}</label>)}</div>
      <div className="flex gap-2">
        <button disabled={cols.length === 0 || run.isPending} onClick={() => run.mutate()} className="flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"><Play size={14} />Run report</button>
        <button disabled={rows.length === 0} onClick={exportCsv} className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"><Download size={14} />Export CSV</button>
      </div>
      {run.error && <p className="text-xs text-red-500">{(run.error as Error).message}</p>}
      {run.data && <p className="text-xs text-slate-500">{rows.length} baris{rows.length === 1000 ? " (dibatasi 1000)" : ""} — hanya data yang boleh Anda akses.</p>}
      {rows.length > 0 && (
        <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr>{cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 200).map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-800">{cols.map((c) => <td key={c} className="px-3 py-1.5">{String(r[c] ?? "")}</td>)}</tr>)}</tbody></table></div>
      )}
    </div>
  );
}
