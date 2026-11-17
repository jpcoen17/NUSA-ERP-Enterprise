import { useState } from "react";
import { authService } from "@/services/auth";

// Shown when the account has a verified TOTP factor but this session is not yet AAL2.
// NOTE: this gate is in the UI. RLS does not check the AAL level yet.
export default function MfaChallenge({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const f = (await authService.mfaFactors()).find((x) => x.factor_type === "totp" && x.status === "verified");
      if (!f) throw new Error("Tidak ada faktor TOTP terverifikasi.");
      await authService.mfaVerify(f.id, code.trim()); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <h1 className="text-lg font-semibold">Verifikasi dua langkah</h1>
        <p className="text-xs text-slate-500">Masukkan 6 digit kode dari aplikasi authenticator Anda.</p>
        <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg tracking-widest dark:border-slate-700 dark:bg-slate-900" placeholder="000000" />
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button disabled={code.length !== 6 || busy} onClick={submit} className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Memeriksa…" : "Verifikasi"}</button>
        <button onClick={() => authService.signOut()} className="w-full text-xs text-accent">Keluar</button>
      </div>
    </div>
  );
}
