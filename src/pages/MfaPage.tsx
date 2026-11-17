import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2 } from "lucide-react";
import { authService } from "@/services/auth";

type Enroll = { id: string; totp: { qr_code: string; secret: string } };

export default function MfaPage() {
  const qc = useQueryClient();
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [code, setCode] = useState("");
  const factors = useQuery({ queryKey: ["mfa-factors"], queryFn: () => authService.mfaFactors() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["mfa-factors"] }); qc.invalidateQueries({ queryKey: ["aal"] }); };
  const start = useMutation({ mutationFn: () => authService.mfaEnroll(), onSuccess: (d) => setEnroll(d as unknown as Enroll) });
  const verify = useMutation({
    mutationFn: async () => { await authService.mfaVerify(enroll!.id, code.trim()); void authService.logEvent("auth_mfa_enrolled"); },
    onSuccess: () => { setEnroll(null); setCode(""); refresh(); },
  });
  const remove = useMutation({ mutationFn: (id: string) => authService.mfaRemove(id), onSuccess: refresh });
  const err = (start.error || verify.error || remove.error || factors.error) as Error | null;
  return (
    <div className="mt-6 max-w-xl space-y-3">
      <p className="text-xs text-slate-500">Autentikasi dua langkah (TOTP) memakai aplikasi authenticator seperti Google Authenticator. Saat ini pemeriksaannya dilakukan di antarmuka aplikasi; aturan database (RLS) belum memaksa level AAL2.</p>
      {err && <p className="text-xs text-red-500">{err.message}</p>}
      {factors.data?.length === 0 && <p className="text-sm text-slate-500">Belum ada faktor MFA.</p>}
      {factors.data?.map((f) => (
        <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div><div className="font-medium">{f.friendly_name || f.factor_type}</div><div className="text-xs text-slate-500">{f.factor_type} · <span className={f.status === "verified" ? "text-emerald-500" : "text-amber-500"}>{f.status}</span></div></div>
          <button aria-label="Remove" onClick={() => confirm("Hapus faktor ini?") && remove.mutate(f.id)}><Trash2 size={15} className="text-red-500" /></button>
        </div>
      ))}
      {!enroll && <button onClick={() => start.mutate()} disabled={start.isPending} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><ShieldCheck size={16} />Aktifkan authenticator (TOTP)</button>}
      {enroll && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-sm">1. Pindai QR ini dengan aplikasi authenticator. 2. Masukkan kode 6 digit untuk memverifikasi.</p>
          <img src={enroll.totp.qr_code} alt="QR TOTP" className="h-44 w-44 rounded bg-white p-2" />
          <p className="break-all text-xs text-slate-500">Atau masukkan manual: <code>{enroll.totp.secret}</code></p>
          <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center tracking-widest dark:border-slate-700 dark:bg-slate-900" />
          <div className="flex gap-2"><button disabled={code.length !== 6 || verify.isPending} onClick={() => verify.mutate()} className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50">Verifikasi</button><button onClick={() => { remove.mutate(enroll.id); setEnroll(null); }} className="rounded-lg border px-4 py-2 text-sm">Batal</button></div>
        </div>
      )}
    </div>
  );
}
