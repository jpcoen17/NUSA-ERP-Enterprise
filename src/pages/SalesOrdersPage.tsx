import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface Order { id: string; order_no: string; order_date: string; status: string; total: number; customers: { name: string } | null }
interface Item { id: string; quantity: number; unit_price: number; products: { name: string } | null }
const TONE: Record<string, string> = { draft: "bg-slate-500/15 text-slate-500", confirmed: "bg-blue-500/15 text-blue-500", delivered: "bg-emerald-500/15 text-emerald-600", cancelled: "bg-red-500/15 text-red-500" };
const box = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

function Items({ orderId }: { orderId: string }) {
  const q = useQuery({ queryKey: ["so-items", orderId], queryFn: async () => { const r = await supabase!.from("sales_order_items").select("id,quantity,unit_price,products(name)").eq("order_id", orderId); if (r.error) throw new Error(r.error.message); return r.data as unknown as Item[]; } });
  if (q.isLoading) return <p className="text-xs">Loading…</p>;
  if (!q.data?.length) return <p className="text-xs text-slate-500">Order ini tidak punya baris item (data demo awal).</p>;
  return <table className="w-full text-xs"><tbody>{q.data.map((i) => <tr key={i.id}><td className="py-0.5">{i.products?.name}</td><td>{i.quantity} × {idr(i.unit_price)}</td><td className="text-right">{idr(i.quantity * i.unit_price)}</td></tr>)}</tbody></table>;
}

export default function SalesOrdersPage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [expanded, setExpanded] = useState<string | null>(null);
  const [customer, setCustomer] = useState(""); const [lines, setLines] = useState([{ product_id: "", quantity: "1" }]);
  const orders = useQuery({
    queryKey: ["orders", selected],
    queryFn: async () => { let q = supabase!.from("sales_orders").select("id,order_no,order_date,status,total,customers(name)"); if (selected) q = q.eq("company_id", selected); const r = await q.order("created_at", { ascending: false }).limit(100); if (r.error) throw new Error(r.error.message); return r.data as unknown as Order[]; },
  });
  const customers = useQuery({ queryKey: ["cust-opts", selected], enabled: open && Boolean(selected), queryFn: async () => (await supabase!.from("customers").select("id,name").eq("company_id", selected).order("name")).data ?? [] });
  const products = useQuery({ queryKey: ["prod-opts", selected], enabled: open && Boolean(selected), queryFn: async () => (await supabase!.from("products").select("id,name,unit_price,stock_qty").eq("company_id", selected).order("name")).data ?? [] });
  const refresh = () => { ["orders", "products", "invoices", "dashboard", "analytics", "sc"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  const rpc = useMutation({ mutationFn: async (f: () => PromiseLike<{ error: { message: string } | null }>) => { const r = await f(); if (r.error) throw new Error(r.error.message); }, onSuccess: () => { refresh(); setOpen(false); setCustomer(""); setLines([{ product_id: "", quantity: "1" }]); } });
  const valid = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
  const est = valid.reduce((s, l) => s + Number(l.quantity) * Number(products.data?.find((p) => p.id === l.product_id)?.unit_price ?? 0), 0);
  const act = (name: string, id: string, label: string) => <button onClick={() => rpc.mutate(() => supabase!.rpc(name, { p_order: id }))} className="rounded-lg border px-3 py-1 text-xs">{label}</button>;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Konfirmasi order mengurangi stok dan membuat invoice secara otomatis. Hak aksi dicek di server per role (Sales Manager / Company Admin / Super Admin).</p>
        <button onClick={() => (selected ? setOpen(true) : alert("Pilih satu company di Topbar dulu."))} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />New order</button>
      </div>
      {open && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <select className={`${box} w-full`} value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="">— pilih customer —</option>{customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select className={`${box} flex-1`} value={l.product_id} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, product_id: e.target.value } : x)))}><option value="">— produk —</option>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name} · {idr(Number(p.unit_price))} · stok {Number(p.stock_qty)}</option>)}</select>
              <input className={`${box} w-24`} type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
              {lines.length > 1 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={15} className="text-red-500" /></button>}
            </div>
          ))}
          <button onClick={() => setLines([...lines, { product_id: "", quantity: "1" }])} className="text-xs text-accent">+ Tambah baris</button>
          <div className="text-sm">Estimasi total: <b>{idr(est)}</b> <span className="text-xs text-slate-500">(dihitung ulang di server)</span></div>
          <div className="flex gap-2">
            <button disabled={!customer || valid.length === 0 || rpc.isPending} onClick={() => rpc.mutate(() => supabase!.rpc("create_sales_order", { p_company: selected, p_customer: customer, p_items: valid.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })) }))} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">Simpan draft</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Batal</button>
          </div>
        </div>
      )}
      {rpc.error && <p className="text-xs text-red-500">{(rpc.error as Error).message}</p>}
      {orders.error && <p className="text-xs text-red-500">{(orders.error as Error).message}. Pastikan migrasi sales_stock_payments sudah di-push.</p>}
      {orders.data?.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button className="flex items-center gap-2 text-left" onClick={() => setExpanded(expanded === o.id ? null : o.id)}><ChevronDown size={14} className={expanded === o.id ? "rotate-180" : ""} /><span><b>{o.order_no}</b> <span className="text-xs text-slate-500">· {o.customers?.name} · {o.order_date}</span></span></button>
            <div className="flex items-center gap-2"><span className="text-sm font-medium">{idr(Number(o.total))}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[o.status]}`}>{o.status}</span>
              {o.status === "draft" && act("confirm_sales_order", o.id, "Confirm")}
              {o.status === "confirmed" && act("deliver_sales_order", o.id, "Deliver")}
              {(o.status === "draft" || o.status === "confirmed") && act("cancel_sales_order", o.id, "Cancel")}</div>
          </div>
          {expanded === o.id && <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800"><Items orderId={o.id} /></div>}
        </div>
      ))}
    </div>
  );
}
