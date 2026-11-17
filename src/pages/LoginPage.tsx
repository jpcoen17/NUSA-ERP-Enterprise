import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Minimal 8 karakter").or(z.literal("")),
  fullName: z.string().optional(),
});
type Form = z.infer<typeof schema>;
type Mode = "login" | "register" | "reset";

export default function LoginPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  if (session) return <Navigate to="/" replace />;

  const submit = async (v: Form) => {
    setMsg(null);
    try {
      if (mode !== "reset" && !v.password) throw new Error("Password wajib diisi");
      if (mode === "login") await authService.signIn(v.email, v.password);
      if (mode === "register") { await authService.signUp(v.email, v.password, v.fullName ?? ""); setMsg({ ok: true, text: "Cek email Anda untuk verifikasi akun." }); }
      if (mode === "reset") { await authService.resetPassword(v.email); setMsg({ ok: true, text: "Jika email terdaftar, tautan reset sudah dikirim." }); }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  const guestEmail = import.meta.env.VITE_GUEST_EMAIL as string | undefined;
  const guestPass = import.meta.env.VITE_GUEST_PASSWORD as string | undefined;
  const guestLogin = async () => { setMsg(null); try { await authService.signIn(guestEmail!, guestPass!); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } };
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <form onSubmit={handleSubmit(submit)} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 text-slate-900 shadow-xl dark:bg-slate-950 dark:text-slate-100">
        <h1 className="text-xl font-semibold">NUSA <span className="text-accent">ERP</span> Demo</h1>
        <p className="text-xs text-slate-500">{mode === "login" ? "Masuk" : mode === "register" ? "Buat akun" : "Reset password"}</p>
        {mode === "register" && <input className={input} placeholder="Nama lengkap" {...register("fullName")} />}
        <input className={input} type="email" placeholder="Email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        {mode !== "reset" && <input className={input} type="password" placeholder="Password" {...register("password")} />}
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        {msg && <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>}
        <button disabled={isSubmitting} className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Memproses…" : "Lanjut"}</button>
        <div className="flex justify-between text-xs text-accent">
          <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Daftar akun" : "Kembali ke login"}</button>
          {mode === "login" && <button type="button" onClick={() => setMode("reset")}>Lupa password?</button>}
        </div>
        {mode === "login" && authService.passkeysSupported() && (
          <button type="button" onClick={async () => { setMsg(null); try { await authService.signInWithPasskey(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } }} className="w-full rounded-lg border border-accent py-2 text-sm font-medium text-accent">Masuk dengan passkey</button>
        )}
        {mode === "login" && guestEmail && guestPass && (
          <div className="space-y-1 rounded-lg border border-dashed border-accent/60 bg-accent/5 p-3 text-xs">
            <div className="font-semibold text-accent">Coba demo sebagai Guest</div>
            <div>Email: <code className="select-all">{guestEmail}</code></div>
            <div>Password: <code className="select-all">{guestPass}</code></div>
            <div className="text-slate-500">Akun bersama, hanya-baca, berisi data demo.</div>
            <button type="button" onClick={guestLogin} className="mt-1 w-full rounded-lg bg-accent py-1.5 font-medium text-white">Masuk sebagai Guest</button>
          </div>
        )}
        <p className="text-[11px] text-slate-400">Passkey bersifat eksperimental dan hanya bisa dipakai setelah didaftarkan di Modul 38. Password tetap tersedia sebagai cadangan. Akun baru belum punya akses data sampai admin memberikannya.</p>
      </form>
    </div>
  );
}
