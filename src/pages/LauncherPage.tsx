import { useState } from "react";
import { Link } from "react-router-dom";
import { GROUPS, MODULES, STATUSES, type ModuleStatus } from "@/lib/modules";
import { GROUP_ICONS, GROUP_TILE } from "@/components/groupIcons";
import StatusBadge from "@/components/StatusBadge";

export default function LauncherPage() {
  const [filter, setFilter] = useState<ModuleStatus | "ALL">("ALL");
  const count = (s: ModuleStatus) => MODULES.filter((m) => m.status === s).length;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-semibold text-navy-900 dark:text-white">Application Launcher</h1>
      <p className="mb-4 text-sm text-slate-500">{MODULES.length} modules in {GROUPS.length} groups. Status shows real implementation progress.</p>
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 ${filter === s ? "border-accent bg-accent text-white" : "border-slate-300 dark:border-slate-700"}`}>
            {s}{s !== "ALL" && ` (${count(s)})`}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        {GROUPS.map((g) => {
          const mods = MODULES.filter((m) => m.group === g.code && (filter === "ALL" || m.status === filter));
          if (!mods.length) return null;
          const Icon = GROUP_ICONS[g.code];
          return (
            <section key={g.code}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-navy-700 dark:text-blue-300"><Icon size={16} />{g.code} {g.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {mods.map((m) => (
                  <Link key={m.no} to={`/module/${m.no}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-accent hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-start justify-between"><span className={`rounded-lg p-2 ${GROUP_TILE[g.code]}`}><Icon size={20} /></span><StatusBadge status={m.status} /></div>
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">Module #{m.no}</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
