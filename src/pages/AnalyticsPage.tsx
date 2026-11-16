import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { compact, idr } from "@/lib/format";

type Row = { label: string; value: number };
const SECTIONS: { key: string; title: string }[] = [
  { key: "top_customers", title: "Top 5 customers (revenue)" }, { key: "orders_by_status", title: "Sales orders by status (value)" },
  { key: "stock_by_category", title: "Stock value by category (qty × cost)" }, { key: "receivable_aging", title: "Receivable aging (outstanding)" },
  { key: "expenses_by_category", title: "Expenses by category" },
];

export default function AnalyticsPage({ view }: { view: "tables" | "charts" }) {
  const { selected } = useCompany();
  const { data, error, isLoading } = useQuery({
    queryKey: ["analytics", selected],
    queryFn: async () => { const r = await supabase!.rpc("analytics_summary", { cid: selected || null }); if (r.error) throw new Error(r.error.message); return r.data as Record<string, Row[]>; },
  });
  if (isLoading) return <p className="mt-6 text-sm">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}. Pastikan migrasi approvals_analytics sudah di-push.</p>;
  const clean = (k: string, rows: Row[]) => rows.map((r) => ({ label: k === "receivable_aging" ? r.label.slice(2) : r.label, value: Number(r.value) }));
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {SECTIONS.map((s) => {
        const rows = clean(s.key, data?.[s.key] ?? []);
        return (
          <section key={s.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold">{s.title}</h2>
            {rows.length === 0 ? <p className="text-sm text-slate-500">Tidak ada data.</p> : view === "charts" ? (
              <div className="h-56"><ResponsiveContainer><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" /><XAxis dataKey="label" fontSize={11} /><YAxis tickFormatter={compact} fontSize={11} /><Tooltip formatter={(v) => idr(Number(v))} /><Bar dataKey="value" fill="#2f6bff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            ) : (
              <table className="w-full text-sm"><tbody>{rows.map((r) => <tr key={r.label} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1.5">{r.label}</td><td className="py-1.5 text-right">{idr(r.value)}</td></tr>)}</tbody></table>
            )}
          </section>
        );
      })}
    </div>
  );
}
