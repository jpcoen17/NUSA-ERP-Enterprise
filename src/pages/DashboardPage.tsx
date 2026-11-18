import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, PiggyBank, Receipt, TrendingDown, TrendingUp, Users, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { useI18n } from "@/context/I18nContext";
import { compact, idr } from "@/lib/format";

interface Summary {
  revenue: number; expenses: number; receivables: number; products: number; low_stock: number; customers: number;
  monthly: { month: string; revenue: number; expenses: number }[];
  recent: { order_no: string; order_date: string; status: string; total: number }[];
}

export default function DashboardPage() {
  const { selected } = useCompany();
  const { t } = useI18n();
  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboard", selected],
    queryFn: async () => {
      const r = await supabase!.rpc("dashboard_summary", { cid: selected || null });
      if (r.error) throw new Error(r.error.message);
      return r.data as Summary;
    },
  });
  if (isLoading) return <p className="mt-6 text-sm">{t("common.loading")}</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}. Pastikan migrasi bisnis sudah di-push.</p>;
  const d = data!;
  const profit = d.revenue - d.expenses;
  const cards = [
    { label: t("dash.revenue"), value: idr(d.revenue), icon: TrendingUp, tone: "bg-emerald-500/15 text-emerald-500" },
    { label: t("dash.expenses"), value: idr(d.expenses), icon: TrendingDown, tone: "bg-red-500/15 text-red-500" },
    { label: t("dash.profit"), value: idr(profit), icon: PiggyBank, tone: "bg-blue-500/15 text-blue-500" },
    { label: t("dash.receivables"), value: idr(d.receivables), icon: Receipt, tone: "bg-amber-500/15 text-amber-500" },
    { label: t("dash.customers"), value: String(d.customers), icon: Users, tone: "bg-violet-500/15 text-violet-500" },
    { label: t("dash.products"), value: String(d.products), icon: Package, tone: "bg-cyan-500/15 text-cyan-500" },
    { label: t("dash.lowstock"), value: String(d.low_stock), icon: AlertTriangle, tone: "bg-rose-500/15 text-rose-500" },
  ];
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`rounded-lg p-2.5 ${c.tone}`}><c.icon size={20} /></span>
            <div className="min-w-0"><div className="text-xs text-slate-500">{c.label}</div><div className="truncate text-lg font-semibold">{c.value}</div></div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">{t("dash.chart")}</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={d.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" />
              <XAxis dataKey="month" fontSize={12} /><YAxis tickFormatter={compact} fontSize={12} />
              <Tooltip formatter={(v) => idr(Number(v))} /><Legend />
              <Area type="monotone" dataKey="revenue" name={t("dash.revenue")} stroke="#2f6bff" fill="#2f6bff33" />
              <Area type="monotone" dataKey="expenses" name={t("dash.expenses")} stroke="#f43f5e" fill="#f43f5e22" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <h2 className="p-4 pb-2 text-sm font-semibold">{t("dash.recent")}</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="px-4 py-2">{t("dash.order")}</th><th className="px-4 py-2">{t("dash.date")}</th><th className="px-4 py-2">{t("dash.status")}</th><th className="px-4 py-2 text-right">{t("dash.total")}</th></tr></thead>
          <tbody>{d.recent.map((r) => <tr key={r.order_no} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-2">{r.order_no}</td><td className="px-4 py-2">{r.order_date}</td><td className="px-4 py-2">{r.status}</td><td className="px-4 py-2 text-right">{idr(r.total)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
