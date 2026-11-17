import type { PasskeyListItem } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. See .env.example.");
  return supabase;
}
const unwrap = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
// Best-effort audit of auth events; never blocks or breaks the real action.
const logEvent = async (event: string) => { try { await supabase?.rpc("log_auth_event", { p_event: event }); } catch { /* ignore */ } };

// All passkey (experimental) and MFA calls live here, so SDK changes touch one file.
export const authService = {
  async signIn(email: string, password: string) { unwrap((await client().auth.signInWithPassword({ email, password })).error); void logEvent("auth_signed_in"); },
  async signUp(email: string, password: string, fullName: string) {
    unwrap((await client().auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } })).error);
  },
  async resetPassword(email: string) { unwrap((await client().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })).error); },
  async signOut() { await logEvent("auth_signed_out"); unwrap((await client().auth.signOut()).error); },

  passkeysSupported: () => typeof window !== "undefined" && "PublicKeyCredential" in window,
  async platformAuthenticatorAvailable() {
    try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
  },
  async signInWithPasskey() { unwrap((await client().auth.signInWithPasskey()).error); void logEvent("auth_passkey_signin"); },
  async registerPasskey() { unwrap((await client().auth.registerPasskey()).error); void logEvent("auth_passkey_registered"); },
  async listPasskeys() { const r = await client().auth.passkey.list(); unwrap(r.error); return (r.data ?? []) as PasskeyListItem[]; },
  async renamePasskey(passkeyId: string, friendlyName: string) { unwrap((await client().auth.passkey.update({ passkeyId, friendlyName })).error); },
  async deletePasskey(passkeyId: string) { unwrap((await client().auth.passkey.delete({ passkeyId })).error); void logEvent("auth_passkey_removed"); },

  async aal() { const r = await client().auth.mfa.getAuthenticatorAssuranceLevel(); unwrap(r.error); return r.data!; },
  async mfaFactors() { const r = await client().auth.mfa.listFactors(); unwrap(r.error); return r.data!.all; },
  async mfaEnroll() {
    const r = await client().auth.mfa.enroll({ factorType: "totp", friendlyName: `NUSA ERP ${new Date().toISOString().slice(0, 16)}` });
    unwrap(r.error); return r.data!;
  },
  async mfaVerify(factorId: string, code: string) { unwrap((await client().auth.mfa.challengeAndVerify({ factorId, code })).error); void logEvent("auth_mfa_verified"); },
  async mfaRemove(factorId: string) { unwrap((await client().auth.mfa.unenroll({ factorId })).error); void logEvent("auth_mfa_removed"); },
  logEvent,
};
