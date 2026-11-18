import { useState } from "react";
import { Bell, Menu, Moon, Sun, UserCircle } from "lucide-react";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Globe } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import InstallButton from "./InstallButton";
import GlobalSearch from "./GlobalSearch";

interface Props { dark: boolean; onTheme: () => void; onMenu: () => void }

// Company / branch selectors and notifications have NO data source yet (Stage 3-5).
// They are shown disabled and honestly labelled instead of faking data.
export default function Topbar({ dark, onTheme, onMenu }: Props) {
  const { session } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { companies, selected, setSelected } = useCompany();
  const [panel, setPanel] = useState<"notif" | "user" | null>(null);
  const toggle = (p: "notif" | "user") => setPanel(panel === p ? null : p);
  const box = "absolute right-0 z-50 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
      <button aria-label={t("menu")} onClick={onMenu} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><Menu size={20} /></button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="hidden max-w-48 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 md:block"><option value="">{t("company.all")}</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select disabled title="Available after Stage 5 (Branch Management)" className="hidden rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900 md:block"><option>{t("branch.na")}</option></select>
        <button aria-label={t("lang.switch")} onClick={() => setLang(lang === "id" ? "en" : "id")} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"><Globe size={14} />{lang.toUpperCase()}</button>
        <InstallButton />
        <button aria-label={t("theme")} onClick={onTheme} className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <div className="relative">
          <button aria-label={t("notif.title")} onClick={() => toggle("notif")} className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Bell size={18} /></button>
          {panel === "notif" && <div className={box}><b>{t("notif.title")}</b><p className="mt-2 text-slate-500">{t("notif.empty")}</p></div>}
        </div>
        <div className="relative">
          <button aria-label="Profile" onClick={() => toggle("user")} className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><UserCircle size={20} /></button>
          {panel === "user" && <div className={box}><b className="break-all">{session?.user.email}</b><button onClick={() => authService.signOut()} className="mt-3 block rounded border px-3 py-1 text-xs">{t("signout")}</button></div>}
        </div>
      </div>
    </header>
  );
}
