import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

// Renders a QR code or a Code 128 barcode for `value`. Output is generated geometry (SVG), never raw user markup.
export default function CodeImage({ value, format, size = 120 }: { value: string; format: "QR" | "Barcode"; size?: number }) {
  const [qr, setQr] = useState(""); const svg = useRef<SVGSVGElement>(null); const [err, setErr] = useState("");
  useEffect(() => {
    setErr("");
    if (format === "QR") QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setQr).catch((e: Error) => setErr(e.message));
    else if (svg.current) { try { JsBarcode(svg.current, value, { format: "CODE128", height: 48, width: 1.6, fontSize: 12, margin: 4, displayValue: true, background: "#ffffff" }); } catch (e) { setErr((e as Error).message); } }
  }, [value, format]);
  if (err) return <span className="text-xs text-red-500">{err}</span>;
  return format === "QR"
    ? <div className="bg-white" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: qr.replace("<svg ", '<svg width="100%" height="100%" ') }} />
    : <svg ref={svg} className="bg-white" style={{ maxWidth: size * 1.8 }} />;
}
