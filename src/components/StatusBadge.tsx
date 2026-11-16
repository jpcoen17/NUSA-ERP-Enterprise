import type { ModuleStatus } from "@/lib/modules";

const STYLE: Record<ModuleStatus, string> = {
  "PLANNED": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "IN DEVELOPMENT": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "FUNCTIONAL": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "TESTING": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "COMPLETE": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export default function StatusBadge({ status }: { status: ModuleStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${STYLE[status]}`}>{status}</span>;
}
