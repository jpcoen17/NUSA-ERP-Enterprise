import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Log { id: string; created_at: string; action: string; table_name: string | null; user_id: string | null; details: Record<string, unknown> | null }
const PAGE = 25;

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const { data, error, isLoading } = useQuery({
    queryKey: ["audit", page],
    queryFn: async () => { const r = await supabase!.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1); if (r.error) throw new Error(r.error.message); return r; },
  });
  if (isLoading) return <p className="mt-6 text-sm">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-red-500">{(error as Error).message}</p>;
  const rows = (data?.data ?? []) as Log[];
  return (
    <div className="mt-6">
      <h2 className="mb-2 font-semibold">Audit log <span className="text-xs font-normal text-slate-500">({data?.count ?? 0}, hanya Super Admin)</span></h2>
      {rows.length === 0 && <p className="text-sm text-slate-500">Tidak ada log yang boleh Anda lihat.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-900"><tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Table</th><th className="px-3 py-2">User</th><th className="px-3 py-2">Details</th></tr></thead>
            <tbody>{rows.map((l) => <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("id-ID")}</td><td className="px-3 py-2">{l.action}</td><td className="px-3 py-2">{l.table_name}</td><td className="px-3 py-2 text-xs">{l.user_id?.slice(0, 8) ?? "system"}</td><td className="px-3 py-2 text-xs">{l.details ? JSON.stringify(l.details) : ""}</td></tr>)}</tbody>
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
