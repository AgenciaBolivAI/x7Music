import { PDFDocument, PDFFont, PDFPage, rgb, RGB } from 'pdf-lib';

export const RED = rgb(0.753, 0.224, 0.169); // #C0392B
export const BLACK = rgb(0.04, 0.04, 0.04); // #0A0A0A
export const GRAY = rgb(0.42, 0.42, 0.42);
export const LIGHT = rgb(0.93, 0.93, 0.93);
export const WHITE = rgb(1, 1, 1);

export const PAGE = { w: 612, h: 792, margin: 50 } as const;

/** A signer slot (from agreement_signers) with optional captured signature. */
export interface SignerInfo {
  name: string;
  email?: string | null;
  role?: string | null;
  signatureData?: string | null; // data URL or bare base64 PNG
  signedName?: string | null;
  signedAt?: string | Date | null;
}

/** Spanish long date, e.g. "14 de agosto de 2020". */
export function fmtDateEs(d?: Date | string | null): string {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Truncate text with an ellipsis to fit a column width at a given size. */
export function clip(text: string, font: PDFFont, size: number, maxW: number): string {
  if (!text) return '';
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let s = text;
  while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxW) s = s.slice(0, -1);
  return s + '…';
}

/** Word-wrap text into lines that fit maxW; returns the lines. */
export function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = (text || '').split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface Fonts {
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

/** Right-align helper bound to a page. */
export function rightOn(page: PDFPage) {
  return (text: string, edge: number, y: number, size: number, f: PDFFont, color: RGB = BLACK) =>
    page.drawText(text, { x: edge - f.widthOfTextAtSize(text, size), y, size, font: f, color });
}

/** Branded X7 header bar; returns the y just below it. */
export function drawHeader(page: PDFPage, fonts: Fonts, rightLabel: string): number {
  const { w, h, margin } = PAGE;
  page.drawRectangle({ x: 0, y: h - 70, width: w, height: 70, color: BLACK });
  page.drawRectangle({ x: 0, y: h - 73, width: w, height: 3, color: RED });
  page.drawText('X7 MUSIC GROUP', { x: margin, y: h - 45, size: 20, font: fonts.bold, color: WHITE });
  rightOn(page)(rightLabel, w - margin, h - 44, 11, fonts.bold, RED);
  return h - 100;
}

/** Branded footer (red bar + generated-by line). */
export function drawFooter(page: PDFPage, fonts: Fonts): void {
  const { w, margin } = PAGE;
  page.drawRectangle({ x: 0, y: 0, width: w, height: 3, color: RED });
  page.drawText(`Generado por X7 Music Group · x7musicgroup.com · ${fmtDateEs(new Date())}`, {
    x: margin, y: 16, size: 7.5, font: fonts.font, color: GRAY,
  });
}

/** Decode a data-URL / base64 PNG into bytes for embedding. */
export function pngBytesFromDataUrl(data: string): Uint8Array {
  const base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Render a row of signature blocks (two per row) for the given signers.
 * Embeds the captured signature image when present, otherwise leaves a line.
 * Returns the y after drawing. Adds pages if it runs out of room.
 */
export async function drawSignatureBlocks(
  pdf: PDFDocument,
  pageRef: { page: PDFPage },
  fonts: Fonts,
  startY: number,
  signers: SignerInfo[],
): Promise<number> {
  const { w, margin } = PAGE;
  const colGap = 30;
  const colW = (w - 2 * margin - colGap) / 2;
  let y = startY;
  let col = 0;

  for (const s of signers) {
    if (y < 130) {
      pageRef.page = pdf.addPage([PAGE.w, PAGE.h]);
      drawFooter(pageRef.page, fonts);
      y = PAGE.h - 80;
      col = 0;
    }
    const page = pageRef.page;
    const x = margin + col * (colW + colGap);

    // Signature image or blank line.
    if (s.signatureData) {
      try {
        const img = await pdf.embedPng(pngBytesFromDataUrl(s.signatureData));
        const maxW = colW;
        const maxH = 38;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        page.drawImage(img, { x, y: y - img.height * scale, width: img.width * scale, height: img.height * scale });
      } catch {
        /* ignore bad image */
      }
    }
    page.drawLine({ start: { x, y: y - 44 }, end: { x: x + colW, y: y - 44 }, thickness: 0.75, color: GRAY });

    // Name / role / email / date under the line.
    page.drawText(clip(s.signedName || s.name, fonts.font, 9, colW), { x, y: y - 58, size: 9, font: fonts.bold, color: BLACK });
    const sub = [s.role, s.email].filter(Boolean).join(' · ');
    if (sub) page.drawText(clip(sub, fonts.font, 7.5, colW), { x, y: y - 70, size: 7.5, font: fonts.font, color: GRAY });
    const dateStr = s.signedAt ? `Firmado: ${fmtDateEs(s.signedAt)}` : 'Fecha: ____________';
    page.drawText(dateStr, { x, y: y - 82, size: 7.5, font: fonts.font, color: GRAY });

    col = col === 0 ? 1 : 0;
    if (col === 0) y -= 104;
  }
  return col === 0 ? y : y - 104;
}
