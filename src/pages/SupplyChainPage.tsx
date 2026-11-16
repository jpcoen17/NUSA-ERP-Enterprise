import { useQuery } from "@tanstack/react-query";
import { Boxes, ClipboardList, Truck, Navigation } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";

interface SC { records: Record<string, number>; deliveries_by_status: { label: string; value: number }[]; low_stock: { name: string; sku: string; stock_qty: number; reorder_level: number }[] }

export default function SupplyChainPage() {
  const { selected } = useCompany();
  const { data, error, isLoading } = useQuery({
    queryKey: ["sc", selected],
    queryFn: async () => { const r = await supabase!.rpc("supply_chain_summary", { cid: selected || null }); if (r.error) throw new Error(r.error.message); return r.data as SC; },
  });
  if (isLoading) return <p className="mt-6 text-sm">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}</p>;
  const d = data!;
  const cards = [{ n: 46, label: "Demand plans", icon: ClipboardList }, { n: 47, label: "Shipments", icon: Boxes }, { n: 48, label: "Deliveries", icon: Truck }, { n: 49, label: "Fleet vehicles", icon: Navigation }];
  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map((c) => (
        <div key={c.n} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="rounded-lg bg-teal-500/15 p-2.5 text-teal-500"><c.icon size={20} /></span>
          <div><div className="text-xs text-slate-500">{c.label} (Modul {c.n})</div><div className="text-lg font-semibold">{d.records[c.n] ?? 0}</div></div>
        </div>))}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 text-sm font-semibold">Deliveries by status</h2>
          {d.deliveries_by_status.length === 0 ? <p className="text-sm text-slate-500">Tidak ada data.</p> : d.deliveries_by_status.map((s) => <div key={s.label} className="flex justify-between border-t border-slate-100 py-1.5 text-sm dark:border-slate-800"><span>{s.label}</span><b>{s.value}</b></div>)}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 text-sm font-semibold">Low stock (≤ reorder level)</h2>
          {d.low_stock.length === 0 ? <p className="text-sm text-slate-500">Semua stok aman.</p> : d.low_stock.map((p) => <div key={p.sku} className="flex justify-between border-t border-slate-100 py-1.5 text-sm dark:border-slate-800"><span>{p.name}</span><span className="text-rose-500">{p.stock_qty} / {p.reorder_level}</span></div>)}</section>
      </div>
    </div>
  );
}
