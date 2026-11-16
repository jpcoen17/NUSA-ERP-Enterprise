import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface InstallEvent extends Event { prompt: () => Promise<void> }

// Shown only when the browser says the app is installable (Chrome/Edge/Android). Hidden otherwise.
export default function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!evt) return null;
  return (
    <button onClick={async () => { await evt.prompt(); setEvt(null); }} className="flex items-center gap-1 rounded-lg border border-accent px-2 py-1 text-xs text-accent">
      <Download size={14} /><span className="hidden sm:inline">Install app</span>
    </button>
  );
}
