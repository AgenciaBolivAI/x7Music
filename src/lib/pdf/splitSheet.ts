import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  PAGE, BLACK, RED, GRAY, LIGHT, WHITE,
  type Fonts, type SignerInfo,
  clip, wrap, fmtDateEs, rightOn, drawHeader, drawFooter, drawSignatureBlocks,
} from './shared';

export interface SplitWriter {
  name: string;
  role?: string;
  pro?: string;
  ipi?: string;
  publisher?: string;
  publisherIpi?: string;
  percentage: number;
}

export interface SplitSheetData {
  songTitle: string;
  artists?: string;
  producer?: string;
  effectiveDate?: string | Date | null;
  recordingVersion?: string;
  isrc?: string;
  iswc?: string;
  notes?: string;
  writers: SplitWriter[];
}

// 6-column table within the 50..562 usable width.
const COLS = {
  name:   { x: 50,  w: 150 },
  pro:    { x: 206, w: 38 },
  ipi:    { x: 248, w: 66 },
  pub:    { x: 318, w: 96 },
  pubIpi: { x: 418, w: 66 },
  // pct is right-aligned to the right margin (562)
};

export async function buildSplitSheetPdf(data: SplitSheetData, signers: SignerInfo[] = []): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.songTitle} — Split Sheet`);
  pdf.setAuthor('X7 Music Group');

  const fonts: Fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const pageRef = { page: pdf.addPage([PAGE.w, PAGE.h]) };
  let page = pageRef.page;
  const { w, margin } = PAGE;
  const right = rightOn(page);

  let y = drawHeader(page, fonts, 'SPLIT SHEET');

  // ── Document title ──────────────────────────────────────────────────────────
  const title = 'SPLIT SHEET';
  page.drawText(title, { x: (w - fonts.bold.widthOfTextAtSize(title, 22)) / 2, y: y - 6, size: 22, font: fonts.bold, color: BLACK });
  const sub = 'ACUERDO DE COMPOSICIÓN';
  page.drawText(sub, { x: (w - fonts.bold.widthOfTextAtSize(sub, 10)) / 2, y: y - 24, size: 10, font: fonts.bold, color: GRAY });
  y -= 52;

  // ── Meta fields ───────────────────────────────────────────────────────────-
  const meta = (label: string, value?: string | null) => {
    if (!value) return;
    page.drawText(label, { x: margin, y, size: 9, font: fonts.bold, color: BLACK });
    const lx = margin + fonts.bold.widthOfTextAtSize(label, 9) + 6;
    page.drawText(clip(value, fonts.font, 9, w - margin - lx), { x: lx, y, size: 9, font: fonts.font, color: BLACK });
    y -= 16;
  };
  meta('Título de la Canción:', data.songTitle);
  meta('Artista(s):', data.artists);
  meta('Productor Musical:', data.producer);
  y -= 4;
  meta('Fecha de entrada en vigor:', data.effectiveDate ? fmtDateEs(data.effectiveDate) : undefined);
  meta('Versión de la grabación:', data.recordingVersion);
  if (data.isrc || data.iswc) {
    page.drawText('ISRC:', { x: margin, y, size: 9, font: fonts.bold, color: BLACK });
    page.drawText(data.isrc || '—', { x: margin + 34, y, size: 9, font: fonts.font, color: BLACK });
    page.drawText('ISWC:', { x: margin + 180, y, size: 9, font: fonts.bold, color: BLACK });
    page.drawText(data.iswc || '—', { x: margin + 216, y, size: 9, font: fonts.font, color: BLACK });
    y -= 16;
  }

  // ── Section heading ─────────────────────────────────────────────────────────
  y -= 14;
  const heading = 'División de Derechos de Coautores';
  page.drawText(heading, { x: (w - fonts.bold.widthOfTextAtSize(heading, 11)) / 2, y, size: 11, font: fonts.bold, color: BLACK });
  y -= 18;

  // ── Table header ─────────────────────────────────────────────────────────-
  const drawTableHeader = (yy: number) => {
    page.drawRectangle({ x: margin, y: yy - 4, width: w - 2 * margin, height: 20, color: BLACK });
    page.drawText('COMPOSITOR', { x: COLS.name.x + 2, y: yy + 2, size: 7.5, font: fonts.bold, color: WHITE });
    page.drawText('PRO', { x: COLS.pro.x, y: yy + 2, size: 7.5, font: fonts.bold, color: WHITE });
    page.drawText('IPI', { x: COLS.ipi.x, y: yy + 2, size: 7.5, font: fonts.bold, color: WHITE });
    page.drawText('PUBLICADORA', { x: COLS.pub.x, y: yy + 2, size: 7.5, font: fonts.bold, color: WHITE });
    page.drawText('PUB. IPI', { x: COLS.pubIpi.x, y: yy + 2, size: 7.5, font: fonts.bold, color: WHITE });
    right('%', w - margin, yy + 2, 7.5, fonts.bold, WHITE);
  };
  drawTableHeader(y);
  y -= 4;

  // ── Rows ──────────────────────────────────────────────────────────────────-
  let total = 0;
  data.writers.forEach((wr, i) => {
    y -= 22;
    if (i % 2 === 1) page.drawRectangle({ x: margin, y: y - 4, width: w - 2 * margin, height: 22, color: LIGHT });
    const s = 9;
    page.drawText(clip(wr.name, fonts.font, s, COLS.name.w), { x: COLS.name.x + 2, y: y + 2, size: s, font: fonts.font, color: BLACK });
    page.drawText(clip(wr.pro || '—', fonts.font, s, COLS.pro.w), { x: COLS.pro.x, y: y + 2, size: s, font: fonts.font, color: GRAY });
    page.drawText(clip(wr.ipi || '—', fonts.font, s, COLS.ipi.w), { x: COLS.ipi.x, y: y + 2, size: s, font: fonts.font, color: GRAY });
    page.drawText(clip(wr.publisher || '—', fonts.font, s, COLS.pub.w), { x: COLS.pub.x, y: y + 2, size: s, font: fonts.font, color: GRAY });
    page.drawText(clip(wr.publisherIpi || '—', fonts.font, s, COLS.pubIpi.w), { x: COLS.pubIpi.x, y: y + 2, size: s, font: fonts.font, color: GRAY });
    right(`${wr.percentage}%`, w - margin, y + 2, s, fonts.bold, BLACK);
    total += Number(wr.percentage) || 0;
  });

  // ── Total ────────────────────────────────────────────────────────────────-
  y -= 24;
  page.drawLine({ start: { x: margin, y: y + 14 }, end: { x: w - margin, y: y + 14 }, thickness: 1, color: BLACK });
  page.drawText('TOTAL', { x: COLS.pub.x, y, size: 10, font: fonts.bold, color: BLACK });
  const totalRounded = Math.round(total * 100) / 100;
  right(`${totalRounded}%`, w - margin, y, 11, fonts.bold, RED);
  y -= 24;

  // ── Legal text ──────────────────────────────────────────────────────────-
  const legal1 =
    'Las partes reconocen que el 100% de la composición está representado en este acuerdo y que no existen terceros con derechos sobre la obra, salvo los aquí expresamente indicados.';
  const legal2 =
    'Cada compositor administrará su porcentaje de publishing a través de la publicadora indicada, salvo acuerdo escrito en contrario.';
  for (const para of [legal1, legal2]) {
    for (const line of wrap(para, fonts.font, 9, w - 2 * margin)) {
      page.drawText(line, { x: margin, y, size: 9, font: fonts.font, color: BLACK });
      y -= 13;
    }
    y -= 6;
  }

  // ── Notes ───────────────────────────────────────────────────────────────-
  if (data.notes && data.notes.trim()) {
    y -= 4;
    page.drawText('NOTAS', { x: margin, y, size: 8, font: fonts.bold, color: GRAY });
    y -= 13;
    for (const line of data.notes.split('\n').slice(0, 4)) {
      page.drawText(clip(line, fonts.font, 9, w - 2 * margin), { x: margin, y, size: 9, font: fonts.font, color: BLACK });
      y -= 13;
    }
  }

  // ── Signatures ─────────────────────────────────────────────────────────-
  y -= 24;
  page.drawText('Firmado y Acordado:', { x: margin, y, size: 11, font: fonts.bold, color: BLACK });
  y -= 18;
  const blockSigners: SignerInfo[] = signers.length
    ? signers
    : data.writers.map((wr) => ({ name: wr.name, role: wr.role }));
  await drawSignatureBlocks(pdf, pageRef, fonts, y, blockSigners);

  // Footer on every page.
  for (const p of pdf.getPages()) drawFooter(p, fonts);

  return pdf.save();
}
