import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, LayoutGrid, ChevronDown } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { GROUPS, MODULES } from "@/lib/modules";
import { GROUP_ICONS } from "./groupIcons";

interface Props { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const { t, modName, groupName } = useI18n();
  const width = collapsed ? "lg:w-16" : "lg:w-72";

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-900 text-white transition-all lg:static ${width} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Link to="/" onClick={onClose} className={`font-semibold ${collapsed ? "lg:hidden" : ""}`}>NUSA <span className="text-accent">ERP</span></Link>
          <button aria-label="Toggle sidebar" onClick={onToggle} className="hidden rounded p-1 hover:bg-white/10 lg:block">
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 text-sm">
          <NavLink to="/" end onClick={onClose} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10 ${isActive ? "bg-white/10" : ""}`}>
            <LayoutGrid size={18} /><span className={collapsed ? "lg:hidden" : ""}>{t("launcher.title")}</span>
          </NavLink>
          {GROUPS.map((g) => {
            const Icon = GROUP_ICONS[g.code];
            const isOpen = open === g.code && !collapsed;
            return (
              <div key={g.code}>
                <button
                  title={`${g.code} ${groupName(g.code, g.name)}`}
                  onClick={() => { if (collapsed) onToggle(); setOpen(isOpen ? null : g.code); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10"
                >
                  <Icon size={18} className="shrink-0 text-blue-300" />
                  <span className={`flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{g.code} {groupName(g.code, g.name)}</span>
                  {!collapsed && <ChevronDown size={14} className={`transition ${isOpen ? "rotate-180" : ""}`} />}
                </button>
                {isOpen && MODULES.filter((m) => m.group === g.code).map((m) => (
                  <NavLink key={m.no} to={`/module/${m.no}`} onClick={onClose}
                    className={({ isActive }) => `ml-8 block truncate rounded px-2 py-1.5 text-xs text-blue-100/80 hover:bg-white/10 ${isActive ? "bg-white/10 text-white" : ""}`}>
                    {m.no}. {modName(m)}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
