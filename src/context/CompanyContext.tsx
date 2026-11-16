import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

interface Company { id: string; code: string; name: string }
const Ctx = createContext<{ companies: Company[]; selected: string; setSelected: (v: string) => void }>({ companies: [], selected: "", setSelected: () => {} });
export const useCompany = () => useContext(Ctx);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [selected, setSel] = useState(() => { try { return localStorage.getItem("nusa-company") ?? ""; } catch { return ""; } });
  const { data } = useQuery({
    queryKey: ["company-options", session?.user.id],
    enabled: Boolean(session && supabase),
    queryFn: async () => {
      const r = await supabase!.from("companies").select("id,code,name").order("code");
      if (r.error) throw new Error(r.error.message);
      return r.data as Company[];
    },
  });
  const companies = data ?? [];
  const valid = companies.some((c) => c.id === selected) ? selected : "";
  const setSelected = (v: string) => { setSel(v); try { localStorage.setItem("nusa-company", v); } catch { /* ignore */ } };
  return <Ctx.Provider value={{ companies, selected: valid, setSelected }}>{children}</Ctx.Provider>;
}
