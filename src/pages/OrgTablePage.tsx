import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";
import { Plus } from "lucide-react";
import CreateDialog, { FORMS } from "@/components/CreateDialog";

type Fmt = "money" | "bool";
interface Col { key: string; label: string; fmt?: Fmt }
const CONFIG: Record<string, { title: string; order: string; scoped: boolean; cols: Col[] }> = {
  companies: { title: "Companies", order: "code", scoped: false, cols: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "currency", label: "Currency" }, { key: "is_active", label: "Active", fmt: "bool" }] },
  branches: { title: "Branches", order: "code", scoped: true, cols: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "is_active", label: "Active", fmt: "bool" }] },
  customers: { title: "Customers", order: "code", scoped: true, cols: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "city", label: "City" }] },
  products: { title: "Products", order: "sku", scoped: true, cols: [{ key: "sku", label: "SKU" }, { key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "unit_price", label: "Price", fmt: "money" }, { key: "stock_qty", label: "Stock" }, { key: "reorder_level", label: "Reorder at" }] },
  sales_orders: { title: "Sales orders", order: "order_no", scoped: true, cols: [{ key: "order_no", label: "Order" }, { key: "order_date", label: "Date" }, { key: "status", label: "Status" }, { key: "total", label: "Total", fmt: "money" }] },
  invoices: { title: "Invoices", order: "invoice_no", scoped: true, cols: [{ key: "invoice_no", label: "Invoice" }, { key: "issue_date", label: "Issued" }, { key: "due_date", label: "Due" }, { key: "amount", label: "Amount", fmt: "money" }, { key: "paid_amount", label: "Paid", fmt: "money" }, { key: "status", label: "Status" }] },
};
const PAGE = 25;

export default function OrgTablePage({ table }: { table: string }) {
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const { selected } = useCompany();
  const cfg = CONFIG[table];
  const { data, error, isLoading } = useQuery({
    queryKey: [table, page, selected],
    queryFn: async () => {
      let q = supabase!.from(table).select("*", { count: "exact" });
      if (cfg.scoped && selected) q = q.eq("company_id", selected);
      const r = await q.order(cfg.order).range(page * PAGE, page * PAGE + PAGE - 1);
      if (r.error) throw new Error(r.error.message);
      return r;
    },
  });
  const show = (r: Record<string, unknown>, c: Col) => c.fmt === "money" ? idr(Number(r[c.key])) : c.fmt === "bool" ? (r[c.key] ? "Yes" : "No") : String(r[c.key] ?? "");
  if (isLoading) return <p className="mt-6 text-sm">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}</p>;
  const rows = (data?.data ?? []) as Record<string, unknown>[];
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{cfg.title} <span className="text-xs font-normal text-slate-500">({data?.count ?? 0} data yang boleh Anda akses)</span></h2>
        {FORMS[table] && <button onClick={() => (selected ? setAdding(true) : alert("Pilih satu company di Topbar dulu."))} className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />Add</button>}
      </div>
      {adding && <CreateDialog table={table} companyId={selected} onClose={() => setAdding(false)} />}
      {rows.length === 0 && <p className="text-sm text-slate-500">Tidak ada data. Seed belum dijalankan, atau akun Anda belum diberi akses (lihat docs/security).</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr>{cfg.cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={String(r.id)} className="border-t border-slate-100 dark:border-slate-800">{cfg.cols.map((c) => <td key={c.key} className="px-3 py-2">{show(r, c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex gap-2 text-xs">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
        <button disabled={(page + 1) * PAGE >= (data?.count ?? 0)} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
