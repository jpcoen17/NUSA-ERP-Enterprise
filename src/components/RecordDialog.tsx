import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RecField } from "@/lib/moduleForms";

export interface RecRow { id: string; company_id: string; status: string; data: Record<string, unknown> }
const STATUSES = ["active", "pending", "done", "archived"];

export default function RecordDialog({ moduleNo, fields, companyId, row, onClose }: { moduleNo: number; fields: RecField[]; companyId: string; row?: RecRow; onClose: () => void }) {
  const qc = useQueryClient();
  const shape: Record<string, z.ZodTypeAny> = { status: z.string() };
  fields.forEach((f) => {
    shape[f.key] = f.type === "number" ? (f.required ? z.coerce.number({ invalid_type_error: "Harus angka" }) : z.union([z.literal(""), z.coerce.number()]))
      : f.required ? z.string().min(1, "Wajib diisi") : z.string().optional();
  });
  const defaults: Record<string, string> = { status: row?.status ?? "active" };
  fields.forEach((f) => { defaults[f.key] = String(row?.data[f.key] ?? ""); });
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>({ resolver: zodResolver(z.object(shape)) as never, defaultValues: defaults });

  const save = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const { status, ...rest } = v;
      const data: Record<string, unknown> = {};
      for (const f of fields) { const x = rest[f.key]; if (x !== "" && x !== undefined) data[f.key] = x; }
      const r = row
        ? await supabase!.from("module_records").update({ data, status }).eq("id", row.id)
        : await supabase!.from("module_records").insert({ company_id: companyId, module_no: moduleNo, data, status });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["records", moduleNo] }); onClose(); },
  });
  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-5 dark:bg-slate-950">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{row ? "Edit record" : "New record"}</h3><button type="button" onClick={onClose}><X size={18} /></button></div>
        {fields.map((f) => (
          <label key={f.key} className="block text-xs font-medium">{f.label}{f.required && " *"}
            {f.type === "select"
              ? <select className={input} {...register(f.key)}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
              : <input className={input} type={f.type} step="any" {...register(f.key)} />}
            {errors[f.key] && <span className="text-red-500">{String(errors[f.key]?.message)}</span>}
          </label>
        ))}
        <label className="block text-xs font-medium">Status<select className={input} {...register("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        {save.error && <p className="text-xs text-red-500">{(save.error as Error).message}</p>}
        <button disabled={save.isPending} className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-60">{save.isPending ? "Menyimpan…" : "Simpan"}</button>
      </form>
    </div>
  );
}
