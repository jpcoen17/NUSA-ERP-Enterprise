import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

// Passkeys are experimental in Supabase (beta). The flag is ignored by SDK >= 2.119 but required by older ones.
// Browser client: publishable key only. Security comes from RLS, not from hiding this key.
export const supabase = isSupabaseConfigured ? createClient(url!, key!, { auth: { experimental: { passkey: true } } }) : null;
