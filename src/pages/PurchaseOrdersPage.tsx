import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface PO { id: string; po_no: string; order_date: string; status: string; total: number; suppliers: { name: string } | null }
interface Item { id: string; quantity: number; unit_cost: number; products: { name: string } | null }
interface Line { product_id: string; quantity: string; unit_cost: string }
const TONE: Record<string, string> = { draft: "bg-slate-500/15 text-slate-500", approved: "bg-blue-500/15 text-blue-500", received: "bg-emerald-500/15 text-emerald-600", cancelled: "bg-red-500/15 text-red-500" };
const box = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const empty: Line = { product_id: "", quantity: "1", unit_cost: "0" };

function Items({ poId }: { poId: string }) {
  const q = useQuery({ queryKey: ["po-items", poId], queryFn: async () => { const r = await supabase!.from("purchase_order_items").select("id,quantity,unit_cost,products(name)").eq("po_id", poId); if (r.error) throw new Error(r.error.message); return r.data as unknown as Item[]; } });
  if (q.isLoading) return <p className="text-xs">Loading…</p>;
  return <table className="w-full text-xs"><tbody>{q.data?.map((i) => <tr key={i.id}><td className="py-0.5">{i.products?.name}</td><td>{i.quantity} × {idr(i.unit_cost)}</td><td className="text-right">{idr(i.quantity * i.unit_cost)}</td></tr>)}</tbody></table>;
}

export default function PurchaseOrdersPage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [expanded, setExpanded] = useState<string | null>(null);
  const [supplier, setSupplier] = useState(""); const [lines, setLines] = useState<Line[]>([empty]);
  const list = useQuery({
    queryKey: ["purchase-orders", selected],
    queryFn: async () => { let q = supabase!.from("purchase_orders").select("id,po_no,order_date,status,total,suppliers(name)"); if (selected) q = q.eq("company_id", selected); const r = await q.order("created_at", { ascending: false }).limit(100); if (r.error) throw new Error(r.error.message); return r.data as unknown as PO[]; },
  });
  const suppliers = useQuery({ queryKey: ["sup-opts", selected], enabled: open && Boolean(selected), queryFn: async () => (await supabase!.from("suppliers").select("id,name").eq("company_id", selected).order("name")).data ?? [] });
  const products = useQuery({ queryKey: ["prod-opts-po", selected], enabled: open && Boolean(selected), queryFn: async () => (await supabase!.from("products").select("id,name,cost,stock_qty").eq("company_id", selected).order("name")).data ?? [] });
  const rpc = useMutation({
    mutationFn: async (f: () => PromiseLike<{ error: { message: string } | null }>) => { const r = await f(); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => { ["purchase-orders", "products", "dashboard", "analytics", "sc"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setOpen(false); setSupplier(""); setLines([empty]); },
  });
  const valid = lines.filter((l) => l.product_id && Number(l.quantity) > 0 && Number(l.unit_cost) >= 0);
  const total = valid.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_cost), 0);
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const act = (name: string, id: string, label: string) => <button onClick={() => rpc.mutate(() => supabase!.rpc(name, { p_po: id }))} className="rounded-lg border px-3 py-1 text-xs">{label}</button>;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Alur: Draft → Approve → Receive (goods receipt menambah stok dan memperbarui biaya rata-rata). Pembuat PO tidak bisa menyetujui PO-nya sendiri, kecuali Super Admin. Hak aksi dicek di server.</p>
        <button onClick={() => (selected ? setOpen(true) : alert("Pilih satu company di Topbar dulu."))} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />New PO</button>
      </div>
      {open && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <select className={`${box} w-full`} value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">— pilih supplier —</option>{suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select className={`${box} flex-1`} value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value, unit_cost: String(products.data?.find((p) => p.id === e.target.value)?.cost ?? 0) })}><option value="">— produk —</option>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name} · stok {Number(p.stock_qty)}</option>)}</select>
              <input className={`${box} w-20`} type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <input className={`${box} w-32`} type="number" min="0" step="any" value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} />
              {lines.length > 1 && <button onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={15} className="text-red-500" /></button>}
            </div>
          ))}
          <button onClick={() => setLines([...lines, empty])} className="text-xs text-accent">+ Tambah baris</button>
          <div className="text-sm">Total: <b>{idr(total)}</b></div>
          <div className="flex gap-2">
            <button disabled={!supplier || valid.length === 0 || rpc.isPending} onClick={() => rpc.mutate(() => supabase!.rpc("create_purchase_order", { p_company: selected, p_supplier: supplier, p_items: valid.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) })) }))} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">Simpan draft</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Batal</button>
          </div>
        </div>
      )}
      {rpc.error && <p className="text-xs text-red-500">{(rpc.error as Error).message}</p>}
      {list.error && <p className="text-xs text-red-500">{(list.error as Error).message}. Pastikan migrasi purchasing sudah di-push.</p>}
      {list.data?.length === 0 && <p className="text-sm text-slate-500">Belum ada purchase order.</p>}
      {list.data?.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button className="flex items-center gap-2 text-left" onClick={() => setExpanded(expanded === o.id ? null : o.id)}><ChevronDown size={14} className={expanded === o.id ? "rotate-180" : ""} /><span><b>{o.po_no}</b> <span className="text-xs text-slate-500">· {o.suppliers?.name} · {o.order_date}</span></span></button>
            <div className="flex items-center gap-2"><span className="text-sm font-medium">{idr(Number(o.total))}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[o.status]}`}>{o.status}</span>
              {o.status === "draft" && act("approve_purchase_order", o.id, "Approve")}
              {o.status === "approved" && act("receive_purchase_order", o.id, "Receive goods")}
              {(o.status === "draft" || o.status === "approved") && act("cancel_purchase_order", o.id, "Cancel")}</div>
          </div>
          {expanded === o.id && <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800"><Items poId={o.id} /></div>}
        </div>
      ))}
    </div>
  );
}
