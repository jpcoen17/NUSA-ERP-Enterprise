import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Field { key: string; label: string; type: "text" | "number" | "date" | "select"; required?: boolean; options?: string[] }
export const FORMS: Record<string, { title: string; fields: Field[] }> = {
  customers: { title: "New customer", fields: [
    { key: "code", label: "Code", type: "text", required: true }, { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "text" }, { key: "city", label: "City", type: "text" }] },
  suppliers: { title: "New supplier", fields: [
    { key: "code", label: "Code", type: "text", required: true }, { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "text" }, { key: "city", label: "City", type: "text" }] },
  products: { title: "New product", fields: [
    { key: "sku", label: "SKU", type: "text", required: true }, { key: "name", label: "Name", type: "text", required: true },
    { key: "category", label: "Category", type: "text" }, { key: "unit_price", label: "Unit price", type: "number", required: true },
    { key: "cost", label: "Cost", type: "number", required: true }, { key: "stock_qty", label: "Stock", type: "number", required: true },
    { key: "reorder_level", label: "Reorder level", type: "number", required: true }] },
  sales_orders: { title: "New sales order", fields: [
    { key: "customer_id", label: "Customer", type: "select", required: true },
    { key: "order_no", label: "Order no", type: "text", required: true }, { key: "order_date", label: "Date", type: "date", required: true },
    { key: "status", label: "Status", type: "select", required: true, options: ["draft", "confirmed", "delivered", "cancelled"] },
    { key: "total", label: "Total", type: "number", required: true }] },
};

export default function CreateDialog({ table, companyId, onClose }: { table: string; companyId: string; onClose: () => void }) {
  const cfg = FORMS[table];
  const qc = useQueryClient();
  const shape: Record<string, z.ZodTypeAny> = {};
  cfg.fields.forEach((f) => {
    shape[f.key] = f.type === "number" ? z.coerce.number({ invalid_type_error: "Harus angka" }).min(0, "Tidak boleh negatif")
      : f.required ? z.string().min(1, "Wajib diisi") : z.string().optional();
  });
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>({
    resolver: zodResolver(z.object(shape)) as never,
    defaultValues: { status: "draft", order_date: new Date().toISOString().slice(0, 10) },
  });
  const customers = useQuery({
    queryKey: ["customer-options", companyId], enabled: table === "sales_orders",
    queryFn: async () => { const r = await supabase!.from("customers").select("id,name").eq("company_id", companyId).order("name"); if (r.error) throw new Error(r.error.message); return r.data; },
  });
  const save = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const row: Record<string, unknown> = { company_id: companyId };
      for (const [k, val] of Object.entries(v)) row[k] = val === "" ? null : val;
      const r = await supabase!.from(table).insert(row);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); onClose(); },
  });
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-5 dark:bg-slate-950">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{cfg.title}</h3><button type="button" onClick={onClose}><X size={18} /></button></div>
        {cfg.fields.map((f) => (
          <label key={f.key} className="block text-xs font-medium">{f.label}{f.required && " *"}
            {f.type === "select" ? (
              <select className={`${input} mt-1`} {...register(f.key)}>
                {f.key === "customer_id" ? <><option value="">— pilih customer —</option>{customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</> : f.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : <input className={`${input} mt-1`} type={f.type === "number" ? "number" : f.type} step="any" {...register(f.key)} />}
            {errors[f.key] && <span className="text-red-500">{String(errors[f.key]?.message)}</span>}
          </label>
        ))}
        {save.error && <p className="text-xs text-red-500">{(save.error as Error).message}</p>}
        <button disabled={save.isPending} className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-60">{save.isPending ? "Menyimpan…" : "Simpan"}</button>
      </form>
    </div>
  );
}
