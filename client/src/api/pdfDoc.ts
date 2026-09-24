// Render an uploaded PDF (as a data URL) to page images + positioned text so the
// Report & Scan canvas can show the real report being read page-by-page and draw
// red boxes on the actual abnormal values (grounded on the PDF text layer).
// pdf.js is heavy, so this module is dynamically imported only when a PDF is sent.
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface TextBox { str: string; x: number; y: number; w: number; h: number; }
export interface PageData { image: string; w: number; h: number; items: TextBox[]; }

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function renderPdf(dataUrl: string, maxPages = 8, scale = 1.6): Promise<PageData[]> {
  const doc = await pdfjsLib.getDocument({ data: dataUrlToBytes(dataUrl) }).promise;
  const n = Math.min(doc.numPages, maxPages);
  const pages: PageData[] = [];
  for (let p = 1; p <= n; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const image = canvas.toDataURL('image/jpeg', 0.82);
    const items: TextBox[] = [];
    try {
      const tc = await page.getTextContent();
      for (const raw of tc.items as any[]) {
        const str: string = raw.str || '';
        if (!str.trim()) continue;
        const t = pdfjsLib.Util.transform(viewport.transform, raw.transform);
        const fh = Math.hypot(t[2], t[3]) || 10;
        items.push({ str, x: t[4], y: t[5] - fh, w: (raw.width || 0) * scale, h: fh });
      }
    } catch { /* image-only PDF: no text layer */ }
    pages.push({ image, w: canvas.width, h: canvas.height, items });
  }
  try { doc.destroy(); } catch { /* ignore */ }
  return pages;
}
