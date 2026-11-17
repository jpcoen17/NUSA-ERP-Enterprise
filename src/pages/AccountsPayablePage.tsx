import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";

interface Bill { id: string; bill_no: string; due_date: string; amount: number; paid_amount: number; status: string; suppliers: { name: string } | null }
const TONE: Record<string, string> = { unpaid: "text-red-500", partial: "text-amber-500", paid: "text-emerald-500" };

export default function AccountsPayablePage() {
  const { selected } = useCompany();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bills", selected],
    queryFn: async () => { let b = supabase!.from("bills").select("id,bill_no,due_date,amount,paid_amount,status,suppliers(name)"); if (selected) b = b.eq("company_id", selected); const r = await b.order("due_date").limit(200); if (r.error) throw new Error(r.error.message); return r.data as unknown as Bill[]; },
  });
  const pay = useMutation({
    mutationFn: async (v: { id: string; amount: number }) => { const r = await supabase!.rpc("pay_bill", { p_bill: v.id, p_amount: v.amount }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => ["bills", "journals", "trial-balance"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs text-slate-500">Tagihan supplier dibuat otomatis saat barang PO diterima (jatuh tempo 30 hari). Pembayaran memposting jurnal Debit Utang / Kredit Kas. Hanya Finance Manager, Company Admin, dan Super Admin.</p>
      {pay.error && <p className="mb-2 text-xs text-red-500">{(pay.error as Error).message}</p>}
      {q.error && <p className="text-xs text-red-500">{(q.error as Error).message}. Pastikan migrasi accounting sudah di-push.</p>}
      {q.data?.length === 0 && <p className="text-sm text-slate-500">Belum ada tagihan. Terima barang dari sebuah PO (Modul 18) untuk membuatnya.</p>}
      {q.data && q.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr><th className="px-3 py-2">Bill</th><th className="px-3 py-2">Supplier</th><th className="px-3 py-2">Due</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2">Status</th><th /></tr></thead>
          <tbody>{q.data.map((b) => { const out = Number(b.amount) - Number(b.paid_amount); return (
            <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2">{b.bill_no}</td><td className="px-3 py-2">{b.suppliers?.name}</td><td className="px-3 py-2">{b.due_date}</td><td className="px-3 py-2 text-right">{idr(Number(b.amount))}</td><td className="px-3 py-2 text-right">{idr(Number(b.paid_amount))}</td><td className={`px-3 py-2 ${TONE[b.status]}`}>{b.status}</td>
              <td className="px-3 py-2">{out > 0 && <button onClick={() => { const v = prompt(`Nominal pembayaran (sisa ${idr(out)})`, String(out)); if (v && Number(v) > 0) pay.mutate({ id: b.id, amount: Number(v) }); }} className="rounded-lg border px-3 py-1 text-xs">Pay bill</button>}</td></tr>); })}</tbody></table></div>
      )}
    </div>
  );
}
