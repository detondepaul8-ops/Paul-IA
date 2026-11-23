/**
 * FICHIERS GÉNÉRÉS PAR PAUL IA — téléchargement réel (Excel/PDF).
 * GET /api/files?id=<paulAiFileId>
 *
 * Composant transféré de CELTIIS BASSILA (route éprouvée) et adapté :
 * le spec est stocké en base (table paul_ai_files) ; les octets sont régénérés
 * À LA DEMANDE (aucun lien public permanent). Les identifiants sont des UUID
 * non devinables ; quand les comptes utilisateurs existeront, l'accès sera
 * restreint au créateur.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const maxDuration = 30;

const SpecSchema = {
  parse(spec: unknown) {
    const s = (spec || {}) as Record<string, unknown>;
    if (!s.title || typeof s.title !== 'string' || s.title.length > 120) throw new Error('spec invalide');
    return {
      title: s.title as string,
      subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
      orientation: s.orientation === 'portrait' ? 'portrait' : 'landscape',
      columns: Array.isArray(s.columns) ? s.columns : undefined,
      rows: Array.isArray(s.rows) ? s.rows : undefined,
      sheets: Array.isArray(s.sheets) ? s.sheets : undefined,
    };
  },
};

// ───────────────────────────── EXCEL (exceljs) ─────────────────────────────
async function buildExcel(spec: ReturnType<typeof SpecSchema.parse>): Promise<Buffer> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Paul IA';
  wb.created = new Date();

  const sheets = Array.isArray(spec.sheets) && spec.sheets.length
    ? spec.sheets
    : [{ name: 'Feuille 1', columns: spec.columns, rows: spec.rows }];

  for (const sh of sheets.slice(0, 12)) {
    const ws = wb.addWorksheet(String(sh.name || 'Feuille').slice(0, 31));
    const cols = Array.isArray(sh.columns) ? sh.columns : [];
    const rows = Array.isArray(sh.rows) ? sh.rows : [];

    if (cols.length) {
      ws.columns = cols.map((c: any) => ({
        header: typeof c === 'string' ? c : String(c?.header ?? c?.key ?? ''),
        key: typeof c === 'string' ? c : String(c?.key ?? c?.header ?? ''),
        width: (typeof c === 'object' && c?.width) ? Number(c.width) : 18,
      }));
      // En-tête stylé (identité Paul IA)
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162235' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
      headerRow.height = 22;
      ws.getRow(2).height = 16;
    }
    for (const r of rows.slice(0, 5000)) {
      const row = ws.addRow(Array.isArray(r) ? r : (cols.map((c: any) => (r && typeof r === 'object') ? r[typeof c === 'string' ? c : c?.key] ?? '' : '')));
      row.alignment = { vertical: 'top' };
    }
    // Filtres + gel de l'en-tête
    if (cols.length) {
      ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + Math.min(cols.length, 26))}1` };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }
    ws.getRow(1).commit();
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ───────────────────────────── PDF (pdf-lib — pur JS, serverless-friendly) ──
async function buildPdf(spec: ReturnType<typeof SpecSchema.parse>): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(String(spec.title || 'Document'));
  doc.setAuthor('Paul IA');
  doc.setCreator('Paul IA');

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const landscape = spec.orientation !== 'portrait';
  const pageW = landscape ? 842 : 595;
  const pageH = landscape ? 595 : 842;
  const margin = 36;
  const cHeader = rgb(0x16 / 255, 0x22 / 255, 0x35 / 255);
  const cTitle = rgb(0x0A / 255, 0x16 / 255, 0x28 / 255);
  const cSub = rgb(0.4, 0.4, 0.4);
  const cLine = rgb(0xC8 / 255, 0xDD / 255, 0xE2 / 255);
  const cRowAlt = rgb(0xF2 / 255, 0xF6 / 255, 0xF8 / 255);
  const cText = rgb(0.07, 0.07, 0.07);
  const cFooter = rgb(0.6, 0.6, 0.6);
  const WHITE = rgb(1, 1, 1);

  let page = doc.addPage([pageW, pageH]);
  let yTop = margin;

  const ensureSpace = (h: number) => {
    if (yTop + h > pageH - margin - 24) { page = doc.addPage([pageW, pageH]); yTop = margin; }
  };
  const textAt = (str: string, x: number, top: number, size: number, f: any, color: any, maxW?: number) => {
    const s = String(str ?? '');
    const trimmed = maxW ? s.slice(0, Math.max(1, Math.floor(maxW / (size * 0.55)))) : s;
    page.drawText(trimmed, { x, y: pageH - top - size, size, font: f, color });
  };

  // Titre
  textAt(String(spec.title || 'Document'), margin, yTop, 15, fontBold, cTitle, pageW - 2 * margin);
  yTop += 22;
  if (spec.subtitle) { textAt(String(spec.subtitle), margin, yTop, 9, font, cSub, pageW - 2 * margin); yTop += 14; }
  page.drawLine({ start: { x: margin, y: pageH - yTop }, end: { x: pageW - margin, y: pageH - yTop }, thickness: 1, color: cHeader });
  yTop += 10;

  const cols: any[] = Array.isArray(spec.columns) && spec.columns.length
    ? spec.columns.map((c: any) => ({ header: typeof c === 'string' ? c : String(c?.header ?? ''), width: (typeof c === 'object' && c?.width) ? Number(c.width) : null }))
    : [];
  const rows: any[][] = Array.isArray(spec.rows) ? spec.rows : [];
  const availW = pageW - 2 * margin;
  const colWidths = cols.length ? cols.map(c => c.width || Math.max(40, Math.floor(availW / cols.length))) : [];
  const rowH = 16;

  if (cols.length) {
    ensureSpace(rowH);
    page.drawRectangle({ x: margin, y: pageH - yTop - rowH, width: availW, height: rowH, color: cHeader });
    let x = margin;
    for (let i = 0; i < cols.length; i++) { textAt(cols[i].header, x + 4, yTop + 4, 9, fontBold, WHITE, colWidths[i] - 8); x += colWidths[i]; }
    yTop += rowH;
    for (let r = 0; r < rows.length; r++) {
      ensureSpace(rowH);
      if (r % 2 === 1) page.drawRectangle({ x: margin, y: pageH - yTop - rowH, width: availW, height: rowH, color: cRowAlt });
      let x2 = margin;
      const cells = Array.isArray(rows[r]) ? rows[r] : cols.map(c => (rows[r] && typeof rows[r] === 'object') ? rows[r][c.header] ?? '' : '');
      for (let i = 0; i < cols.length && i < cells.length; i++) { textAt(cells[i], x2 + 4, yTop + 4, 9, font, cText, colWidths[i] - 8); x2 += colWidths[i]; }
      yTop += rowH;
    }
    page.drawRectangle({ x: margin, y: pageH - yTop, width: availW, height: yTop - margin - 10, borderColor: cLine, borderWidth: 0.5 });
  } else {
    for (const r of rows) { ensureSpace(14); textAt(Array.isArray(r) ? r.join('  |  ') : r, margin, yTop, 10, font, cText, availW); yTop += 14; }
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Paul IA · page ${i + 1}/${pages.length}`, { x: pageW / 2 - 60, y: 18, size: 8, font, color: cFooter });
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Identifiant de fichier manquant' }, { status: 400 });

  const file = await db.paul_AiFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: 'Fichier introuvable ou expiré' }, { status: 404 });

  let spec: ReturnType<typeof SpecSchema.parse>;
  try { spec = SpecSchema.parse(file.spec); }
  catch { return NextResponse.json({ error: 'Spécification de fichier invalide' }, { status: 500 }); }

  try {
    const filename = file.filename.replace(/[^\w.\-]/g, '_');
    if (file.kind === 'EXCEL') {
      const buf = await buildExcel(spec);
      return new NextResponse(buf as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (file.kind === 'PDF') {
      const buf = await buildPdf(spec);
      return new NextResponse(buf as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return NextResponse.json({ error: 'Type de fichier non supporté' }, { status: 400 });
  } catch (e: any) {
    console.error('paul/files generate error:', e?.message || e);
    return NextResponse.json({ error: 'Génération du fichier impossible' }, { status: 500 });
  }
}
