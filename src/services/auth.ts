import { supabase } from "@/lib/supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. See .env.example.");
  return supabase;
}
const unwrap = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

export const authService = {
  async signIn(email: string, password: string) { unwrap((await client().auth.signInWithPassword({ email, password })).error); },
  async signUp(email: string, password: string, fullName: string) {
    unwrap((await client().auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } })).error);
  },
  async resetPassword(email: string) {
    unwrap((await client().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })).error);
  },
  async signOut() { unwrap((await client().auth.signOut()).error); },
};
