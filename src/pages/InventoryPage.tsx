import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";
import CreateDialog from "@/components/CreateDialog";

interface Prod { id: string; sku: string; name: string; category: string | null; unit_price: number; cost: number; stock_qty: number; reorder_level: number }
interface Mov { id: string; qty_delta: number; reason: string; created_at: string; products: { name: string } | null }

export default function InventoryPage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const prods = useQuery({
    queryKey: ["products", selected],
    queryFn: async () => { let q = supabase!.from("products").select("id,sku,name,category,unit_price,cost,stock_qty,reorder_level"); if (selected) q = q.eq("company_id", selected); const r = await q.order("sku").limit(300); if (r.error) throw new Error(r.error.message); return r.data as unknown as Prod[]; },
  });
  const moves = useQuery({
    queryKey: ["movements", selected],
    queryFn: async () => { let q = supabase!.from("stock_movements").select("id,qty_delta,reason,created_at,products(name)"); if (selected) q = q.eq("company_id", selected); const r = await q.order("created_at", { ascending: false }).limit(30); if (r.error) throw new Error(r.error.message); return r.data as unknown as Mov[]; },
  });
  const adjust = useMutation({
    mutationFn: async (v: { id: string; delta: number; reason: string }) => { const r = await supabase!.rpc("adjust_stock", { p_product: v.id, p_delta: v.delta, p_reason: v.reason }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => ["products", "movements", "dashboard", "sc"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
  const ask = (p: Prod) => {
    const v = prompt(`Penyesuaian stok "${p.name}" (stok sekarang ${Number(p.stock_qty)}).\nIsi angka: + untuk menambah, - untuk mengurangi.`);
    const delta = Number(v);
    if (!v || !Number.isFinite(delta) || delta === 0) return;
    const reason = confirm("OK = penerimaan/pembelian manual (purchase)\nBatal = koreksi stok (adjustment)") ? "purchase" : "adjustment";
    adjust.mutate({ id: p.id, delta, reason });
  };
  const low = (prods.data ?? []).filter((p) => Number(p.stock_qty) <= Number(p.reorder_level)).length;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Stok hanya berubah lewat fungsi server: order, penerimaan PO, atau penyesuaian di sini (Inventory Manager / Company Admin / Super Admin). Setiap perubahan tercatat di riwayat pergerakan stok. <b className="text-rose-500">{low} produk</b> berada di batas reorder.</p>
        <button onClick={() => (selected ? setAdding(true) : alert("Pilih satu company di Topbar dulu."))} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />Add product</button>
      </div>
      {adding && <CreateDialog table="products" companyId={selected} onClose={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["products"] }); }} />}
      {adjust.error && <p className="text-xs text-red-500">{(adjust.error as Error).message}</p>}
      {prods.error && <p className="text-xs text-red-500">{(prods.error as Error).message}</p>}
      {prods.data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Stock</th><th className="px-3 py-2 text-right">Reorder</th><th /></tr></thead>
          <tbody>{prods.data.map((p) => { const isLow = Number(p.stock_qty) <= Number(p.reorder_level); return (
            <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2">{p.sku}</td><td className="px-3 py-2">{p.name}</td><td className="px-3 py-2">{p.category}</td><td className="px-3 py-2 text-right">{idr(Number(p.unit_price))}</td><td className="px-3 py-2 text-right">{idr(Number(p.cost))}</td>
              <td className={`px-3 py-2 text-right font-medium ${isLow ? "text-rose-500" : ""}`}>{Number(p.stock_qty)}</td><td className="px-3 py-2 text-right">{Number(p.reorder_level)}</td>
              <td className="px-3 py-2"><button onClick={() => ask(p)} className="rounded-lg border px-3 py-1 text-xs">Adjust</button></td></tr>); })}</tbody></table></div>
      )}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-2 text-sm font-semibold">Riwayat pergerakan stok (30 terakhir)</h2>
        {moves.data?.length === 0 && <p className="text-sm text-slate-500">Belum ada pergerakan. Konfirmasi order, terima PO, atau lakukan penyesuaian untuk membuatnya.</p>}
        {moves.data?.map((m) => <div key={m.id} className="flex justify-between border-t border-slate-100 py-1.5 text-sm dark:border-slate-800"><span>{m.products?.name} <span className="text-xs text-slate-500">· {m.reason} · {new Date(m.created_at).toLocaleString("id-ID")}</span></span><b className={Number(m.qty_delta) > 0 ? "text-emerald-500" : "text-rose-500"}>{Number(m.qty_delta) > 0 ? "+" : ""}{Number(m.qty_delta)}</b></div>)}</section>
    </div>
  );
}
