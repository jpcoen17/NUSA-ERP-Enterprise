import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { authService } from "@/services/auth";

export default function PasskeyStatusPage({ kind }: { kind: "fingerprint" | "face" }) {
  const platform = useQuery({ queryKey: ["platform-auth"], queryFn: () => authService.platformAuthenticatorAvailable() });
  const passkeys = useQuery({ queryKey: ["passkeys"], enabled: authService.passkeysSupported(), queryFn: () => authService.listPasskeys() });
  const row = (label: string, ok: boolean | undefined) => <div className="flex justify-between border-t border-slate-100 py-2 text-sm dark:border-slate-800"><span>{label}</span><b className={ok ? "text-emerald-500" : "text-red-500"}>{ok === undefined ? "…" : ok ? "Ya" : "Tidak"}</b></div>;
  return (
    <div className="mt-6 max-w-xl space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold">Status perangkat ini</h2>
        {row("Browser mendukung passkey (WebAuthn)", authService.passkeysSupported())}
        {row("Perangkat punya verifikasi bawaan (sidik jari / wajah / PIN)", platform.data)}
        {row("Sudah ada passkey terdaftar", passkeys.data ? passkeys.data.length > 0 : undefined)}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {kind === "fingerprint" ? "Sidik jari" : "Pengenalan wajah"} bukan fitur yang dikendalikan aplikasi ini. Aplikasi meminta passkey, lalu sistem operasi perangkat Anda yang memilih cara verifikasinya (sidik jari, wajah, atau PIN, tergantung perangkat). Aplikasi tidak pernah menerima atau menyimpan data biometrik.
      </p>
      <Link to="/module/38" className="text-sm text-accent">Daftarkan atau kelola passkey (Modul 38) →</Link>
    </div>
  );
}
