import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { pngBytesFromDataUrl, fmtDateEs, type SignerInfo } from './shared';

const BLACK = rgb(0.07, 0.07, 0.07);
const GRAY = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.75, 0.75, 0.75);
const HEADER_FILL = rgb(0.93, 0.93, 0.93);

const PAGE = { w: 612, h: 792, margin: 56, bottom: 64 };

export interface TemplateWriter {
  name?: string; society?: string; pro?: string; ipi?: string;
  publisher?: string; publisherIpi?: string; percentage?: number | string;
}

/**
 * Render a document from an editable template body + merge data + signers.
 * Markup: `# Title`, `## Heading`, `**bold**`, `{{key}}` (scalar from data),
 * `{{TABLA}}` (co-author splits from data.writers), `{{FIRMAS}}` (signature blocks).
 */
export async function buildTemplatePdf(
  body: string,
  data: Record<string, unknown>,
  signers: SignerInfo[] = [],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setAuthor('X7 Music Group');
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.margin;
  const x0 = PAGE.margin;
  const maxW = PAGE.w - PAGE.margin * 2;

  const newPage = () => { page = pdf.addPage([PAGE.w, PAGE.h]); y = PAGE.h - PAGE.margin; };
  const ensure = (need: number) => { if (y - need < PAGE.bottom) newPage(); };

  // Substitute scalar {{key}} (leave {{TABLA}}/{{FIRMAS}} for structured rendering).
  const merged = body.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    const v = data[key];
    return typeof v === 'string' || typeof v === 'number' ? String(v) : m;
  });

  const boldWords = (text: string): { w: string; b: boolean }[] => {
    const out: { w: string; b: boolean }[] = [];
    text.split('**').forEach((part, i) => {
      const b = i % 2 === 1;
      for (const w of part.split(/\s+/)) if (w) out.push({ w, b });
    });
    return out;
  };

  const drawWrapped = (text: string, opts: { size: number; lineH: number; center?: boolean; color?: typeof BLACK; allBold?: boolean }) => {
    const { size, lineH, center, color = BLACK, allBold } = opts;
    const words = boldWords(text);
    const spaceW = reg.widthOfTextAtSize(' ', size);
    let line: { w: string; b: boolean }[] = [];
    let lineW = 0;
    const flush = () => {
      if (!line.length) { y -= lineH; return; }
      ensure(lineH);
      const width = line.reduce((s, t, i) => s + (t.b || allBold ? bold : reg).widthOfTextAtSize(t.w, size) + (i ? spaceW : 0), 0);
      let cx = center ? x0 + (maxW - width) / 2 : x0;
      line.forEach((t, i) => {
        const f = t.b || allBold ? bold : reg;
        if (i) cx += spaceW;
        page.drawText(t.w, { x: cx, y, size, font: f, color });
        cx += f.widthOfTextAtSize(t.w, size);
      });
      y -= lineH;
      line = [];
      lineW = 0;
    };
    for (const t of words) {
      const f = t.b || allBold ? bold : reg;
      const ww = f.widthOfTextAtSize(t.w, size);
      if (lineW + ww > maxW && line.length) flush();
      line.push(t);
      lineW += ww + spaceW;
    }
    flush();
  };

  // ── Co-author splits table ({{TABLA}}) ──────────────────────────────────────
  const drawTable = () => {
    const writers = (Array.isArray(data.writers) ? data.writers : []) as TemplateWriter[];
    const cols = [
      { key: 'name', label: 'Compositor', w: 150 },
      { key: 'society', label: 'Sociedad', w: 52 },
      { key: 'ipi', label: 'IPI', w: 78 },
      { key: 'publisher', label: 'Publicadora', w: 120 },
      { key: 'publisherIpi', label: 'Publisher IPI', w: 62 },
      { key: 'pct', label: '%', w: 38 },
    ];
    const size = 8.5;
    const pad = 4;
    const cellLines = (txt: string, w: number) => {
      const words = (txt || '').split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let cur = '';
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (reg.widthOfTextAtSize(test, size) > w - pad * 2 && cur) { lines.push(cur); cur = word; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [''];
    };

    const drawRow = (vals: string[], isHeader: boolean) => {
      const perCol = vals.map((v, i) => cellLines(v, cols[i].w));
      const rows = Math.max(...perCol.map((l) => l.length));
      const rowH = rows * (size + 3) + pad * 2;
      ensure(rowH);
      let cx = x0;
      const top = y;
      cols.forEach((c, i) => {
        if (isHeader) page.drawRectangle({ x: cx, y: top - rowH, width: c.w, height: rowH, color: HEADER_FILL });
        page.drawRectangle({ x: cx, y: top - rowH, width: c.w, height: rowH, borderColor: LINE, borderWidth: 0.7, color: undefined });
        perCol[i].forEach((ln, li) => {
          page.drawText(ln, { x: cx + pad, y: top - pad - size - li * (size + 3) + 2, size, font: isHeader ? bold : reg, color: BLACK });
        });
        cx += c.w;
      });
      y = top - rowH;
    };

    drawRow(cols.map((c) => c.label), true);
    let total = 0;
    for (const w of writers) {
      total += Number(w.percentage) || 0;
      drawRow([
        String(w.name ?? ''),
        String(w.society ?? w.pro ?? ''),
        String(w.ipi ?? ''),
        String(w.publisher ?? ''),
        String(w.publisherIpi ?? ''),
        w.percentage != null ? `${w.percentage}` : '',
      ], false);
    }
    y -= 4;
    drawWrapped(`**Total:** ${Math.round(total * 100) / 100}%`, { size: 9, lineH: 14 });
  };

  // ── Signature blocks ({{FIRMAS}}) ───────────────────────────────────────────
  const drawFirmas = async () => {
    for (const s of signers) {
      ensure(78);
      const info = `**Nombre:** ${s.signedName || s.name || ''}    **Email:** ${s.email || ''}` + (s.phone ? `    **Tel:** ${s.phone}` : '');
      drawWrapped(info, { size: 9, lineH: 13 });
      if (s.address) drawWrapped(`**Dirección:** ${s.address}`, { size: 9, lineH: 13 });

      // signature image (if signed) sitting on the "Firma" line
      const lineY = y - 22;
      if (s.signatureData) {
        try {
          const img = await pdf.embedPng(pngBytesFromDataUrl(s.signatureData));
          const scale = Math.min(150 / img.width, 34 / img.height, 1);
          page.drawImage(img, { x: x0 + 42, y: lineY + 2, width: img.width * scale, height: img.height * scale });
        } catch { /* ignore */ }
      }
      page.drawText('Firma', { x: x0, y: lineY, size: 9, font: reg, color: BLACK });
      page.drawLine({ start: { x: x0 + 40, y: lineY - 2 }, end: { x: x0 + 250, y: lineY - 2 }, thickness: 0.6, color: GRAY });
      const dateStr = s.signedAt ? fmtDateEs(s.signedAt) : '';
      page.drawText('Fecha', { x: x0 + 300, y: lineY, size: 9, font: reg, color: BLACK });
      page.drawText(dateStr, { x: x0 + 342, y: lineY, size: 9, font: reg, color: BLACK });
      page.drawLine({ start: { x: x0 + 338, y: lineY - 2 }, end: { x: x0 + maxW, y: lineY - 2 }, thickness: 0.6, color: GRAY });
      y = lineY - 24;
    }
  };

  // ── Walk the body ───────────────────────────────────────────────────────────
  for (const raw of merged.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const t = line.trim();
    if (t === '') { y -= 7; continue; }
    if (t === '{{TABLA}}') { drawTable(); continue; }
    if (t === '{{FIRMAS}}') { await drawFirmas(); continue; }
    if (line.startsWith('# ')) { y -= 6; drawWrapped(line.slice(2), { size: 15, lineH: 19, center: true, allBold: true }); y -= 8; continue; }
    if (line.startsWith('## ')) { y -= 9; drawWrapped(line.slice(3), { size: 11.5, lineH: 15, center: true, allBold: true }); y -= 3; continue; }
    drawWrapped(line, { size: 9.5, lineH: 13.5 });
  }

  // Thin footer + page numbers on every page.
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Generado por X7 Music Group · ${fmtDateEs(new Date())}`, { x: PAGE.margin, y: 30, size: 7.5, font: reg, color: GRAY });
    p.drawText(`${i + 1} / ${pages.length}`, { x: PAGE.w - PAGE.margin - 24, y: 30, size: 7.5, font: reg, color: GRAY });
  });

  return pdf.save();
}
