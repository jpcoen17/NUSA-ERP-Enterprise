import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "@/locales/en";
import { id } from "@/locales/id";
import { ID_GROUPS, ID_MODULES } from "@/locales/names";

export type Lang = "id" | "en";
const DICTS: Record<Lang, Record<string, string>> = { en, id };
const initial = (): Lang => {
  try { const s = localStorage.getItem("nusa-lang"); if (s === "id" || s === "en") return s; } catch { /* ignore */ }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("id") ? "id" : "en";
};
interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: Record<string, string | number>) => string; modName: (m: { no: number; name: string }) => string; groupName: (code: string, fallback: string) => string }
const I18n = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k, modName: (m) => m.name, groupName: (_c, f) => f });
export const useI18n = () => useContext(I18n);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem("nusa-lang", l); } catch { /* ignore */ } };
  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = DICTS[lang][key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
  const modName = (m: { no: number; name: string }) => (lang === "id" ? ID_MODULES[m.no] ?? m.name : m.name);
  const groupName = (code: string, fallback: string) => (lang === "id" ? ID_GROUPS[code] ?? fallback : fallback);
  return <I18n.Provider value={{ lang, setLang, t, modName, groupName }}>{children}</I18n.Provider>;
}
