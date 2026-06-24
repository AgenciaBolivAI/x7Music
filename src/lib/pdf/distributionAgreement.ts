import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  PAGE, BLACK, type Fonts, type SignerInfo,
  clip, wrap, fmtDateEs, drawHeader, drawFooter, drawSignatureBlocks,
} from './shared';

export interface DistributionData {
  artistName: string;
  legalName?: string;
  address?: string;
  email?: string;
  phone?: string;
  releaseTitle?: string;
  catalogScope?: string;
  territory?: string;
  term?: string;
  distributionFeePct?: number;
  effectiveDate?: string | Date | null;
  notes?: string;
}

export async function buildDistributionAgreementPdf(
  data: DistributionData,
  signers: SignerInfo[] = [],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Acuerdo de Distribución — ${data.artistName}`);
  pdf.setAuthor('X7 Music Group');

  const fonts: Fonts = {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  const pageRef = { page: pdf.addPage([PAGE.w, PAGE.h]) };
  const { w, margin } = PAGE;
  let y = drawHeader(pageRef.page, fonts, 'ACUERDO DE DISTRIBUCIÓN');

  const ensure = (need: number) => {
    if (y - need < 110) {
      pageRef.page = pdf.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - 80;
    }
  };
  const para = (text: string, size = 9.5, gap = 8) => {
    for (const line of wrap(text, fonts.font, size, w - 2 * margin)) {
      ensure(14);
      pageRef.page.drawText(line, { x: margin, y, size, font: fonts.font, color: BLACK });
      y -= size + 3.5;
    }
    y -= gap;
  };
  const clause = (n: number, heading: string, body: string) => {
    ensure(30);
    pageRef.page.drawText(`${n}. ${heading}`, { x: margin, y, size: 10.5, font: fonts.bold, color: BLACK });
    y -= 16;
    para(body);
  };

  // ── Title ───────────────────────────────────────────────────────────────-
  const title = 'ACUERDO DE DISTRIBUCIÓN MUSICAL';
  pageRef.page.drawText(title, { x: (w - fonts.bold.widthOfTextAtSize(title, 18)) / 2, y: y - 4, size: 18, font: fonts.bold, color: BLACK });
  y -= 36;

  // ── Parties ─────────────────────────────────────────────────────────────-
  para(
    `El presente Acuerdo de Distribución ("Acuerdo") se celebra con fecha de entrada en vigor ${fmtDateEs(data.effectiveDate)} entre X7 MUSIC GROUP ("el Distribuidor") y la parte identificada a continuación ("el Titular"):`,
    9.5, 10,
  );

  const field = (label: string, value?: string | null) => {
    if (!value) return;
    ensure(15);
    pageRef.page.drawText(label, { x: margin, y, size: 9, font: fonts.bold, color: BLACK });
    const lx = margin + fonts.bold.widthOfTextAtSize(label, 9) + 6;
    pageRef.page.drawText(clip(value, fonts.font, 9, w - margin - lx), { x: lx, y, size: 9, font: fonts.font, color: BLACK });
    y -= 15;
  };
  field('Nombre artístico:', data.artistName);
  field('Nombre legal:', data.legalName);
  field('Dirección:', data.address);
  field('Email:', data.email);
  field('Teléfono:', data.phone);
  y -= 8;

  // ── Clauses ─────────────────────────────────────────────────────────────-
  clause(1, 'Objeto', `El Titular encarga al Distribuidor la distribución digital de ${data.catalogScope || data.releaseTitle || 'la(s) obra(s) musical(es) acordada(s)'} en las plataformas de streaming y descarga (DSPs) aplicables.`);
  clause(2, 'Territorio', `La distribución se realizará en el siguiente territorio: ${data.territory || 'Mundial (Worldwide)'}.`);
  clause(3, 'Vigencia', `El presente Acuerdo entrará en vigor en la fecha indicada y permanecerá vigente por ${data.term || 'el plazo acordado por las partes'}, renovable por acuerdo escrito.`);
  clause(4, 'Regalías y Comisión', `El Distribuidor retendrá una comisión del ${typeof data.distributionFeePct === 'number' ? data.distributionFeePct : 15}% sobre los ingresos netos recaudados, y abonará al Titular el porcentaje restante. Las liquidaciones se realizarán periódicamente conforme a los reportes recibidos de las plataformas.`);
  clause(5, 'Titularidad de Derechos', 'El Titular conserva la propiedad de sus grabaciones (masters) y de su composición. Mediante este Acuerdo, el Titular otorga al Distribuidor una licencia no exclusiva (salvo pacto en contrario) para distribuir las obras durante la vigencia.');
  clause(6, 'Declaraciones del Titular', 'El Titular declara y garantiza ser el legítimo titular o tener autorización sobre los derechos de las obras entregadas, y mantendrá indemne al Distribuidor frente a reclamaciones de terceros derivadas de dicha titularidad.');
  clause(7, 'Terminación', 'Cualquiera de las partes podrá terminar el Acuerdo mediante notificación escrita con un preaviso razonable. La terminación no afectará las liquidaciones devengadas con anterioridad.');
  clause(8, 'Ley Aplicable', 'Este Acuerdo se regirá e interpretará conforme a la legislación aplicable acordada por las partes.');

  if (data.notes && data.notes.trim()) {
    clause(9, 'Disposiciones Adicionales', data.notes.trim());
  }

  // ── Signatures ────────────────────────────────────────────────────────────
  ensure(60);
  y -= 10;
  pageRef.page.drawText('Firmado y Acordado:', { x: margin, y, size: 11, font: fonts.bold, color: BLACK });
  y -= 18;
  const blockSigners: SignerInfo[] = signers.length
    ? signers
    : [
        { name: data.legalName || data.artistName, role: 'Titular', email: data.email },
        { name: 'X7 Music Group', role: 'Distribuidor' },
      ];
  await drawSignatureBlocks(pdf, pageRef, fonts, y, blockSigners);

  for (const p of pdf.getPages()) drawFooter(p, fonts);
  return pdf.save();
}
