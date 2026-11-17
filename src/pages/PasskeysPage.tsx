import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { authService } from "@/services/auth";

export default function PasskeysPage() {
  const qc = useQueryClient();
  const supported = authService.passkeysSupported();
  const list = useQuery({ queryKey: ["passkeys"], enabled: supported, queryFn: () => authService.listPasskeys() });
  const act = useMutation({ mutationFn: (f: () => Promise<void>) => f(), onSuccess: () => qc.invalidateQueries({ queryKey: ["passkeys"] }) });
  return (
    <div className="mt-6 space-y-3">
      <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">Fitur passkey Supabase masih <b>eksperimental/beta</b> dan harus diaktifkan di Dashboard (Authentication → Configuration → Passkeys). Perilakunya bisa berubah tanpa pemberitahuan. Login password tetap menjadi cadangan.</p>
      {!supported && <p className="text-sm text-red-500">Browser ini tidak mendukung WebAuthn/passkey.</p>}
      {supported && <button onClick={() => act.mutate(() => authService.registerPasskey())} disabled={act.isPending} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><KeyRound size={16} />Daftarkan passkey di perangkat ini</button>}
      {act.error && <p className="text-xs text-red-500">{(act.error as Error).message}</p>}
      {list.error && <p className="text-xs text-red-500">{(list.error as Error).message}</p>}
      {list.data?.length === 0 && <p className="text-sm text-slate-500">Belum ada passkey terdaftar.</p>}
      {list.data?.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div><div className="font-medium">{p.friendly_name || "Passkey tanpa nama"}</div><div className="text-xs text-slate-500">Dibuat {new Date(p.created_at).toLocaleDateString("id-ID")}{p.last_used_at ? ` · terakhir dipakai ${new Date(p.last_used_at).toLocaleDateString("id-ID")}` : ""}</div></div>
          <div className="flex gap-3">
            <button aria-label="Rename" onClick={() => { const n = prompt("Nama baru (maks 120 karakter)", p.friendly_name ?? ""); if (n) act.mutate(() => authService.renamePasskey(p.id, n.slice(0, 120))); }}><Pencil size={15} /></button>
            <button aria-label="Delete" onClick={() => confirm("Hapus passkey ini?") && act.mutate(() => authService.deletePasskey(p.id))}><Trash2 size={15} className="text-red-500" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
