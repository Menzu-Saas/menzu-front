// QR codes for the public menu and tables. SVG for screen/print, PNG for downloads.
import QRCode from "qrcode";

/** QR colours are file data (they end up inside the exported SVG/PNG): ink on white, high contrast. */
const COLORS = { dark: "#1A1614", light: "#FFFFFF" }; // mz-allow-hardcoded

const OPTIONS = { margin: 1, errorCorrectionLevel: "M" as const, color: COLORS };

/** `${appUrl}/cardapio/{slug}` (+ `?table={n}` for a table). */
export function menuUrl(appUrl: string, slug: string, table?: number): string {
  const base = `${appUrl.replace(/\/+$/, "")}/cardapio/${encodeURIComponent(slug)}`;
  return table == null ? base : `${base}?table=${table}`;
}

/** Scalable SVG markup (viewBox only; size it with CSS). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...OPTIONS, type: "svg" });
}

/** PNG data URL, `size` pixels wide. */
export function qrPngDataUrl(text: string, size = 1024): Promise<string> {
  return QRCode.toDataURL(text, { ...OPTIONS, width: size });
}

/** URL without the protocol, for compact labels ("menzu.app/cardapio/burger-house?table=3"). */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
