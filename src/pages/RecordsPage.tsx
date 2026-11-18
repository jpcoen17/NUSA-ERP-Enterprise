import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { MODULE_FORMS } from "@/lib/moduleForms";
import { useI18n } from "@/context/I18nContext";
import RecordDialog, { type RecRow } from "@/components/RecordDialog";

const PAGE = 25;
// Cross-module links: a record becomes a real business event in another module (server-side function).
const ACTIONS: Record<number, { rpc: string; label: string }> = {
  12: { rpc: "convert_lead_to_customer", label: "action.convertLead" },
  34: { rpc: "post_payroll", label: "action.postPayroll" },
  48: { rpc: "complete_delivery", label: "action.completeDelivery" },
};

export default function RecordsPage({ moduleNo }: { moduleNo: number }) {
  const fields = MODULE_FORMS[moduleNo];
  const { t } = useI18n();
  const cols = fields.slice(0, 5);
  const { selected } = useCompany();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<{ row?: RecRow } | null>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ["records", moduleNo, selected, page],
    queryFn: async () => {
      let q = supabase!.from("module_records").select("*", { count: "exact" }).eq("module_no", moduleNo);
      if (selected) q = q.eq("company_id", selected);
      const r = await q.order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (r.error) throw new Error(r.error.message);
      return r;
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const r = await supabase!.from("module_records").delete().eq("id", id); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["records", moduleNo] }),
  });
  const link = useMutation({
    mutationFn: async (id: string) => { const r = await supabase!.rpc(ACTIONS[moduleNo].rpc, { p_record: id }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => ["records", "customers", "cust-opts", "dashboard", "journals", "trial-balance", "orders", "cash-ledger", "analytics", "sc"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
  const rows = (data?.data ?? []) as RecRow[];
  const fmt = (v: unknown, type: string) => (v === undefined || v === null ? "" : type === "number" ? new Intl.NumberFormat("id-ID").format(Number(v)) : String(v));

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Records <span className="text-xs font-normal text-slate-500">({data?.count ?? 0})</span></h2>
        <button onClick={() => (selected ? setDialog({}) : alert("Pilih satu company di Topbar dulu."))} className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"><Plus size={14} />Add</button>
      </div>
      {dialog && <RecordDialog moduleNo={moduleNo} fields={fields} companyId={selected} row={dialog.row} onClose={() => setDialog(null)} />}
      {isLoading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}. Pastikan migrasi module_records sudah di-push.</p>}
      {data && rows.length === 0 && <p className="text-sm text-slate-500">Belum ada data. Klik Add, atau jalankan supabase/seed_demo_modules.sql.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr>{cols.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}<th className="px-3 py-2">Status</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                {cols.map((c) => <td key={c.key} className="px-3 py-2">{fmt(r.data[c.key], c.type)}</td>)}
                <td className="px-3 py-2 text-xs">{r.status}</td>
                <td className="flex gap-2 px-3 py-2">
                  {ACTIONS[moduleNo] && r.status !== "done" && <button onClick={() => confirm(t("action.confirm")) && link.mutate(r.id)} className="rounded border border-accent px-2 text-[11px] text-accent">{t(ACTIONS[moduleNo].label)}</button>}
                  <button aria-label="Edit" onClick={() => setDialog({ row: r })}><Pencil size={14} /></button>
                  <button aria-label="Delete" onClick={() => confirm("Hapus record ini?") && del.mutate(r.id)}><Trash2 size={14} className="text-red-500" /></button>
                </td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
      {link.error && <p className="mt-2 text-xs text-red-500">{(link.error as Error).message}</p>}
      {del.error && <p className="mt-2 text-xs text-red-500">{(del.error as Error).message}</p>}
      <div className="mt-3 flex gap-2 text-xs">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
        <button disabled={(page + 1) * PAGE >= (data?.count ?? 0)} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
