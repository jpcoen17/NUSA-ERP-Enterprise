import { Briefcase, Landmark, Handshake, ShoppingCart, Boxes, Factory, Users, Fingerprint, KanbanSquare, Truck, Headset, FileText, BarChart3, ShieldCheck, Megaphone, type LucideIcon } from "lucide-react";

export const GROUP_ICONS: Record<string, LucideIcon> = {
  "01": Briefcase, "02": Landmark, "03": Handshake, "04": ShoppingCart, "05": Boxes,
  "06": Factory, "07": Users, "08": Fingerprint, "09": KanbanSquare, "10": Truck,
  "11": Headset, "12": FileText, "13": BarChart3, "14": ShieldCheck, "15": Megaphone,
};

// Full class strings so Tailwind can detect them.
export const GROUP_TILE: Record<string, string> = {
  "01": "bg-blue-500/15 text-blue-500", "02": "bg-emerald-500/15 text-emerald-500", "03": "bg-pink-500/15 text-pink-500",
  "04": "bg-orange-500/15 text-orange-500", "05": "bg-amber-500/15 text-amber-500", "06": "bg-slate-500/15 text-slate-500",
  "07": "bg-violet-500/15 text-violet-500", "08": "bg-cyan-500/15 text-cyan-500", "09": "bg-indigo-500/15 text-indigo-500",
  "10": "bg-teal-500/15 text-teal-500", "11": "bg-rose-500/15 text-rose-500", "12": "bg-sky-500/15 text-sky-500",
  "13": "bg-fuchsia-500/15 text-fuchsia-500", "14": "bg-red-500/15 text-red-500", "15": "bg-lime-500/15 text-lime-600",
};
