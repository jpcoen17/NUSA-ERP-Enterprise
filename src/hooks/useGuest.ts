import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// True when the signed-in profile is flagged as the shared guest account (decided by the database, not the browser).
export function useGuest(): boolean {
  const { session } = useAuth();
  const q = useQuery({ queryKey: ["is-guest", session?.user.id], enabled: Boolean(session && supabase), queryFn: async () => (await supabase!.rpc("is_guest")).data === true });
  return q.data === true;
}
