import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface Inv { id: string; invoice_no: string; issue_date: string; due_date: string; amount: number; paid_amount: number; status: string }
const TONE: Record<string, string> = { unpaid: "text-red-500", partial: "text-amber-500", paid: "text-emerald-500" };

export default function InvoicesPage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["invoices", selected],
    queryFn: async () => { let b = supabase!.from("invoices").select("id,invoice_no,issue_date,due_date,amount,paid_amount,status"); if (selected) b = b.eq("company_id", selected); const r = await b.order("issue_date", { ascending: false }).limit(200); if (r.error) throw new Error(r.error.message); return r.data as unknown as Inv[]; },
  });
  const pay = useMutation({
    mutationFn: async (v: { id: string; amount: number }) => { const r = await supabase!.rpc("record_payment", { p_invoice: v.id, p_amount: v.amount }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => ["invoices", "dashboard", "analytics"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs text-slate-500">Pembayaran tercatat lewat fungsi server (Finance Manager / Company Admin / Super Admin). Nominal tidak boleh melebihi sisa tagihan.</p>
      {pay.error && <p className="mb-2 text-xs text-red-500">{(pay.error as Error).message}</p>}
      {q.error && <p className="text-xs text-red-500">{(q.error as Error).message}</p>}
      {q.data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Due</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2">Status</th><th /></tr></thead>
          <tbody>{q.data.map((i) => { const out = Number(i.amount) - Number(i.paid_amount); return (
            <tr key={i.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2">{i.invoice_no}</td><td className="px-3 py-2">{i.due_date}</td><td className="px-3 py-2 text-right">{idr(Number(i.amount))}</td><td className="px-3 py-2 text-right">{idr(Number(i.paid_amount))}</td><td className={`px-3 py-2 ${TONE[i.status]}`}>{i.status}</td>
              <td className="px-3 py-2">{out > 0 && <button onClick={() => { const v = prompt(`Nominal pembayaran (sisa ${idr(out)})`, String(out)); if (v && Number(v) > 0) pay.mutate({ id: i.id, amount: Number(v) }); }} className="rounded-lg border px-3 py-1 text-xs">Record payment</button>}</td></tr>); })}</tbody></table></div>
      )}
    </div>
  );
}
