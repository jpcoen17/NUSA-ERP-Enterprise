import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TABLES = ["companies", "branches", "customers", "suppliers", "products", "sales_orders", "sales_order_items", "invoices", "payments", "stock_movements",
  "purchase_orders", "purchase_order_items", "bills", "expenses", "accounts", "journal_entries", "journal_lines", "module_records", "approval_requests"];
const PAGE = 1000;

export default function BackupPage() {
  const { session } = useAuth();
  const admin = useQuery({ queryKey: ["is-admin", session?.user.id], queryFn: async () => (await supabase!.rpc("is_admin")).data === true });
  const [busy, setBusy] = useState(false); const [log, setLog] = useState<string[]>([]); const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr(""); setLog([]);
    try {
      const out: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const rows: unknown[] = [];
        for (let from = 0; ; from += PAGE) {
          const r = await supabase!.from(t).select("*").order("id").range(from, from + PAGE - 1);
          if (r.error) throw new Error(`${t}: ${r.error.message}`);
          rows.push(...r.data);
          if (r.data.length < PAGE) break;
        }
        out[t] = rows; setLog((l) => [...l, `${t}: ${rows.length} baris`]);
      }
      const payload = { exported_at: new Date().toISOString(), exported_by: session?.user.email, note: "Logical data export (JSON). Follows the exporter's RLS access. Not a full database backup.", counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), tables: out };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" }));
      a.download = `nusa-erp-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const card = "rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900";
  return (
    <div className="mt-6 max-w-2xl space-y-4">
      <section className={card}><h2 className="mb-1 font-semibold">Backup database (Supabase)</h2>
        <p className="text-slate-600 dark:text-slate-300">Backup sebenarnya dikelola Supabase, bukan aplikasi ini. Cek status, jadwal, dan retensinya di Dashboard → Database → Backups. Ketersediaan dan lamanya tergantung paket Supabase Anda. Struktur database juga selalu bisa dibangun ulang dari folder <code>supabase/migrations</code> di GitHub.</p></section>
      <section className={card}><h2 className="mb-1 font-semibold">Ekspor data (JSON)</h2>
        <p className="mb-3 text-slate-600 dark:text-slate-300">Mengunduh isi {TABLES.length} tabel bisnis dalam satu berkas JSON, sebagai salinan tambahan yang bisa Anda simpan sendiri. Hanya Super Admin. <b>Belum ada fitur restore</b>: berkas ini untuk arsip dan analisis, bukan pemulihan otomatis.</p>
        {admin.data ? <button onClick={run} disabled={busy} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Download size={16} />{busy ? "Mengekspor…" : "Ekspor semua data"}</button>
          : <p className="text-amber-600">Hanya Super Admin yang dapat mengekspor data.</p>}
        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
        {log.length > 0 && <div className="mt-3 max-h-48 overflow-auto text-xs text-slate-500">{log.map((l) => <div key={l}>{l}</div>)}</div>}
        <p className="mt-3 text-xs text-slate-500">Berkas berisi data bisnis. Simpan di tempat aman dan jangan dibagikan sembarangan.</p></section>
    </div>
  );
}
