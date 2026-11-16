import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { MODULES } from "@/lib/modules";

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? MODULES.filter((m) => `${m.name} ${m.groupName}`.toLowerCase().includes(s)).slice(0, 8) : [];
  }, [q]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search modules (Ctrl+K)"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-900" />
      {results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.map((m) => (
            <li key={m.no}>
              <button onClick={() => { nav(`/module/${m.no}`); setQ(""); }} className="flex w-full justify-between rounded px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <span>{m.no}. {m.name}</span><span className="text-xs text-slate-400">{m.groupName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
