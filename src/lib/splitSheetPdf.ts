import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

export interface PdfWriter {
  name: string;
  role: string;
  pro?: string;
  ipi?: string;
  publisher?: string;
  percentage: number;
}
export interface PdfData {
  songTitle: string;
  workDate?: Date | string | null;
  notes?: string;
  writers: PdfWriter[];
}

const RED = rgb(0.753, 0.224, 0.169);   // #C0392B
const BLACK = rgb(0.04, 0.04, 0.04);    // #0A0A0A
const GRAY = rgb(0.42, 0.42, 0.42);
const LIGHT = rgb(0.93, 0.93, 0.93);
const WHITE = rgb(1, 1, 1);

// Columns (Letter page, 50pt margins → usable 50..562)
const COLS = {
  name:      { x: 50,  w: 135 },
  role:      { x: 188, w: 58 },
  pro:       { x: 248, w: 44 },
  ipi:       { x: 294, w: 66 },
  publisher: { x: 362, w: 132 },
  pct:       { x: 498, w: 64 }, // right-aligned to 562
};

const fmtDate = (d?: Date | string | null) =>
  (d ? new Date(d) : new Date()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

// Truncate text to fit a column width at the given font size.
function clip(text: string, font: PDFFont, size: number, maxW: number): string {
  if (!text) return '';
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let s = text;
  while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1);
  return s + '…';
}

export async function buildSplitSheetPdf(data: PdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.songTitle} — Split Sheet`);
  pdf.setAuthor('X7 Music Group');
  let page: PDFPage = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const M = 50;
  const right = (text: string, edge: number, y: number, size: number, f: PDFFont, color = BLACK) =>
    page.drawText(text, { x: edge - f.widthOfTextAtSize(text, size), y, size, font: f, color });

  // ── Header bar ────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: BLACK });
  page.drawRectangle({ x: 0, y: height - 73, width, height: 3, color: RED });
  page.drawText('X7 MUSIC GROUP', { x: M, y: height - 45, size: 20, font: bold, color: WHITE });
  right('SONG SPLIT SHEET', width - M, height - 44, 12, bold, RED);

  // ── Song + date ─────────────────────────────────────────────────────────-
  let y = height - 110;
  page.drawText('SONG TITLE', { x: M, y, size: 8, font: bold, color: GRAY });
  right('DATE', width - M, y, 8, bold, GRAY);
  y -= 18;
  page.drawText(clip(data.songTitle, bold, 16, 380), { x: M, y, size: 16, font: bold, color: BLACK });
  right(fmtDate(data.workDate), width - M, y + 1, 12, font, BLACK);

  // ── Table header ────────────────────────────────────────────────────────-
  y -= 34;
  page.drawRectangle({ x: M, y: y - 4, width: width - 2 * M, height: 20, color: BLACK });
  const headers: [keyof typeof COLS, string][] = [
    ['name', 'PARTICIPANT'], ['role', 'ROLE'], ['pro', 'PRO'],
    ['ipi', 'IPI/CAE'], ['publisher', 'PUBLISHER'],
  ];
  const drawTableHeader = (yy: number) => {
    page.drawRectangle({ x: M, y: yy - 4, width: width - 2 * M, height: 20, color: BLACK });
    headers.forEach(([k, label]) =>
      page.drawText(label, { x: COLS[k].x, y: yy + 2, size: 7.5, font: bold, color: WHITE })
    );
    right('SPLIT %', M + (width - 2 * M), yy + 2, 7.5, bold, WHITE);
  };
  drawTableHeader(y);

  // ── Rows ────────────────────────────────────────────────────────────────-
  y -= 4;
  let total = 0;
  data.writers.forEach((w, i) => {
    y -= 22;
    // Page-break for long writer lists so rows never run off the page.
    if (y < 110) {
      page = pdf.addPage([612, 792]);
      y = height - 70;
      drawTableHeader(y);
      y -= 26;
    }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 4, width: width - 2 * M, height: 22, color: LIGHT });
    const size = 9;
    page.drawText(clip(w.name, font, size, COLS.name.w), { x: COLS.name.x, y: y + 2, size, font, color: BLACK });
    page.drawText(clip(w.role, font, size, COLS.role.w), { x: COLS.role.x, y: y + 2, size, font, color: GRAY });
    page.drawText(clip(w.pro || '—', font, size, COLS.pro.w), { x: COLS.pro.x, y: y + 2, size, font, color: GRAY });
    page.drawText(clip(w.ipi || '—', font, size, COLS.ipi.w), { x: COLS.ipi.x, y: y + 2, size, font, color: GRAY });
    page.drawText(clip(w.publisher || '—', font, size, COLS.publisher.w), { x: COLS.publisher.x, y: y + 2, size, font, color: GRAY });
    right(`${w.percentage}%`, width - M, y + 2, size, bold, BLACK);
    total += Number(w.percentage) || 0;
  });

  // ── Total ─────────────────────────────────────────────────────────────────
  y -= 26;
  page.drawLine({ start: { x: M, y: y + 14 }, end: { x: width - M, y: y + 14 }, thickness: 1, color: BLACK });
  page.drawText('TOTAL', { x: COLS.publisher.x, y: y, size: 10, font: bold, color: BLACK });
  const totalRounded = Math.round(total * 100) / 100;
  right(`${totalRounded}%`, width - M, y, 11, bold, totalRounded === 100 ? RED : rgb(0.7, 0.1, 0.1));

  // ── Notes ───────────────────────────────────────────────────────────────-
  if (data.notes && data.notes.trim()) {
    y -= 34;
    page.drawText('NOTES', { x: M, y, size: 8, font: bold, color: GRAY });
    y -= 14;
    for (const line of data.notes.split('\n').slice(0, 4)) {
      page.drawText(clip(line, font, 9, width - 2 * M), { x: M, y, size: 9, font, color: BLACK });
      y -= 13;
    }
  }

  // ── Signatures ──────────────────────────────────────────────────────────-
  y -= 30;
  page.drawText('SIGNATURES', { x: M, y, size: 8, font: bold, color: GRAY });
  y -= 8;
  const colW = (width - 2 * M - 30) / 2;
  let col = 0;
  for (const w of data.writers) {
    if (y < 90) break; // stay on one page
    const x = M + col * (colW + 30);
    page.drawLine({ start: { x, y: y - 18 }, end: { x: x + colW, y: y - 18 }, thickness: 0.75, color: GRAY });
    page.drawText(clip(w.name, font, 8, colW), { x, y: y - 30, size: 8, font, color: GRAY });
    right('Date: ____________', x + colW, y - 30, 8, font, GRAY);
    col = col === 0 ? 1 : 0;
    if (col === 0) y -= 48;
  }

  // ── Footer ──────────────────────────────────────────────────────────────-
  page.drawRectangle({ x: 0, y: 0, width, height: 3, color: RED });
  page.drawText(`Generated by X7 Music Group · x7musicgroup.com · ${fmtDate(new Date())}`,
    { x: M, y: 16, size: 7.5, font, color: GRAY });

  return pdf.save();
}
