import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Printer, ScanLine, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCompany } from "@/context/CompanyContext";
import { idr } from "@/lib/format";
import CodeImage from "@/components/CodeImage";
import RecordsPage from "@/pages/RecordsPage";

interface Prod { id: string; sku: string; name: string; category: string | null; unit_price: number; stock_qty: number; reorder_level: number }
const box = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
type Tab = "labels" | "scan" | "records";

function Labels() {
  const { selected } = useCompany();
  const [format, setFormat] = useState<"QR" | "Barcode">("QR");
  const [picked, setPicked] = useState<string[]>([]);
  const prods = useQuery({ queryKey: ["label-products", selected], queryFn: async () => { let q = supabase!.from("products").select("id,sku,name,category,unit_price,stock_qty,reorder_level"); if (selected) q = q.eq("company_id", selected); const r = await q.order("sku").limit(300); if (r.error) throw new Error(r.error.message); return r.data as unknown as Prod[]; } });
  const chosen = (prods.data ?? []).filter((p) => picked.includes(p.id));
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Kode di label adalah <b>SKU produk</b>. Saat dipindai, aplikasi mencari produk dengan SKU yang sama. Pilih produk, pilih format, lalu cetak.</p>
      <div className="flex flex-wrap items-center gap-3">
        <select className={box} value={format} onChange={(e) => setFormat(e.target.value as "QR" | "Barcode")}><option value="QR">QR code</option><option value="Barcode">Barcode (Code 128)</option></select>
        <button className="text-xs text-accent" onClick={() => setPicked((prods.data ?? []).slice(0, 12).map((p) => p.id))}>Pilih 12 pertama</button>
        <button className="text-xs text-accent" onClick={() => setPicked([])}>Kosongkan</button>
        <button disabled={chosen.length === 0} onClick={() => window.print()} className="flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"><Printer size={15} />Cetak {chosen.length} label</button>
      </div>
      {prods.error && <p className="text-xs text-red-500">{(prods.error as Error).message}</p>}
      <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-800">
        {prods.data?.map((p) => <label key={p.id} className="flex items-center gap-2 py-0.5"><input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />{p.sku} · {p.name}</label>)}
        {prods.data?.length === 0 && <p className="text-slate-500">Belum ada produk. Tambahkan di Modul 21.</p>}
      </div>
      <div id="print-area" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {chosen.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 rounded-lg border border-slate-300 bg-white p-3 text-center text-xs text-black">
            <CodeImage value={p.sku} format={format} size={110} />
            <div className="font-semibold">{p.name}</div><div>{p.sku}</div><div>{idr(Number(p.unit_price))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scan() {
  const { selected } = useCompany();
  const [code, setCode] = useState(""); const [manual, setManual] = useState(""); const [cam, setCam] = useState(false); const [camErr, setCamErr] = useState("");
  const video = useRef<HTMLVideoElement>(null); const stopRef = useRef<() => void>(() => {});
  const found = useQuery({
    queryKey: ["scan", code, selected], enabled: code !== "",
    queryFn: async () => {
      let p = supabase!.from("products").select("id,sku,name,category,unit_price,stock_qty,reorder_level").eq("sku", code); if (selected) p = p.eq("company_id", selected);
      let m = supabase!.from("module_records").select("id,data").eq("module_no", 25).eq("data->>code", code); if (selected) m = m.eq("company_id", selected);
      const [a, b] = await Promise.all([p, m]);
      if (a.error) throw new Error(a.error.message);
      return { products: a.data as unknown as Prod[], records: (b.data ?? []) as { id: string; data: Record<string, string> }[] };
    },
  });
  const stop = () => { stopRef.current(); stopRef.current = () => {}; setCam(false); };
  useEffect(() => () => stopRef.current(), []);

  const start = async () => {
    setCamErr(""); setCode("");
    if (!navigator.mediaDevices?.getUserMedia) { setCamErr("Browser ini tidak mendukung akses kamera (butuh HTTPS)."); return; }
    setCam(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (Native) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.current!.srcObject = stream; await video.current!.play();
        const det = new Native({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "code_39", "upc_a"] });
        const timer = setInterval(async () => { try { const r = await det.detect(video.current!); if (r[0]) { setCode(r[0].rawValue); stop(); } } catch { /* keep scanning */ } }, 300);
        stopRef.current = () => { clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); };
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (res, _e, c) => { if (res) { setCode(res.getText()); c.stop(); stop(); } });
        stopRef.current = () => controls.stop();
      }
    } catch (e) { setCamErr(`Kamera tidak bisa dibuka: ${(e as Error).message}. Pastikan izin kamera diberikan.`); stop(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${box} flex-1`} placeholder="Ketik atau pindai kode (pemindai USB/Bluetooth: arahkan kursor ke sini)" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && manual.trim()) { setCode(manual.trim()); setManual(""); } }} />
        <button onClick={() => manual.trim() && (setCode(manual.trim()), setManual(""))} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><ScanLine size={15} />Cari</button>
        {!cam ? <button onClick={start} className="flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm text-white"><Camera size={15} />Pindai dengan kamera</button> : <button onClick={stop} className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm"><Square size={14} />Hentikan</button>}
      </div>
      {camErr && <p className="text-xs text-red-500">{camErr}</p>}
      {cam && <video ref={video} muted playsInline className="w-full max-w-sm rounded-xl bg-black" />}
      {code && <p className="text-sm">Kode terbaca: <code className="rounded bg-slate-500/15 px-1">{code}</code></p>}
      {found.isLoading && <p className="text-sm">Mencari…</p>}
      {found.error && <p className="text-xs text-red-500">{(found.error as Error).message}</p>}
      {found.data && found.data.products.length === 0 && found.data.records.length === 0 && <p className="text-sm text-amber-600">Kode tidak ditemukan di produk maupun catatan kode. Cek pilihan company di Topbar.</p>}
      {found.data?.products.map((p) => (
        <div key={p.id} className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
          <div className="text-base font-semibold">{p.name}</div>
          <div className="text-xs text-slate-500">{p.sku} · {p.category ?? "tanpa kategori"}</div>
          <div className="mt-2 grid grid-cols-3 gap-2"><div><div className="text-xs text-slate-500">Harga</div><b>{idr(Number(p.unit_price))}</b></div><div><div className="text-xs text-slate-500">Stok</div><b className={Number(p.stock_qty) <= Number(p.reorder_level) ? "text-rose-500" : ""}>{Number(p.stock_qty)}</b></div><div><div className="text-xs text-slate-500">Reorder</div><b>{Number(p.reorder_level)}</b></div></div>
        </div>
      ))}
      {found.data?.records.map((r) => <div key={r.id} className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-3 text-xs">Catatan kode: item <b>{r.data.item}</b> · format {r.data.format}</div>)}
    </div>
  );
}

export default function BarcodePage() {
  const [tab, setTab] = useState<Tab>("labels");
  const tabs: [Tab, string][] = [["labels", "Buat & cetak label"], ["scan", "Pindai"], ["records", "Catatan kode"]];
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2 text-sm">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 ${tab === k ? "border-accent bg-accent text-white" : "border-slate-300 dark:border-slate-700"}`}>{l}</button>)}</div>
      {tab === "labels" && <Labels />}
      {tab === "scan" && <Scan />}
      {tab === "records" && <RecordsPage moduleNo={25} />}
    </div>
  );
}
