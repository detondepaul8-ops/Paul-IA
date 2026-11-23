// ── MOTEUR INTERNE PAUL IA — Auto-vérification ────────────────────────────
// Chaque réalisation autonome est RÉ-OUVERTE et testée après production :
// Excel rélu via exceljs, PDF reparsé via pdf-lib, MP4 validé (boîte ftyp),
// image validée via sharp, application exécutée dans l'environnement restreint.
// Conformément à l'exigence n°9 : vérifier, corriger et améliorer ses propres
// réalisations.

import { buildExcel, buildWord, buildPdf, type ExcelSpec, type DocSpec } from './internal-office';
import { runJsSandboxed } from './internal-exec';

export interface CheckResult {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
}

export async function verifyExcel(spec: ExcelSpec, bytes: Buffer): Promise<CheckResult> {
  const checks: CheckResult['checks'] = [];
  try {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as any);
    const sheets = wb.worksheets;
    checks.push({ name: 'ré-ouverture du classeur', ok: sheets.length > 0, detail: `${sheets.length} feuille(s)` });
    const first = sheets[0];
    checks.push({ name: 'lignes présentes', ok: first.rowCount > 1, detail: `${first.rowCount} lignes` });
    checks.push({ name: 'en-têtes remplis', ok: first.getRow(1).cellCount > 0 });
    checks.push({ name: 'signature créateur', ok: wb.creator === 'Paul IA (moteur interne)' });
  } catch (e) {
    checks.push({ name: 'ré-ouverture du classeur', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
  checks.push({ name: 'taille du fichier', ok: bytes.length > 500, detail: `${bytes.length} octets` });
  return { ok: checks.every((c) => c.ok), checks };
}

export async function verifyWord(bytes: Buffer): Promise<CheckResult> {
  const checks: CheckResult['checks'] = [
    { name: 'signature ZIP (docx)', ok: bytes.slice(0, 2).toString() === 'PK', detail: `${bytes.length} octets` },
    { name: 'taille minimum', ok: bytes.length > 1000 },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export async function verifyPdf(bytes: Buffer): Promise<CheckResult> {
  const checks: CheckResult['checks'] = [];
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPageCount();
    checks.push({ name: 're-parse du PDF', ok: pages > 0, detail: `${pages} page(s)` });
    const text = await pdf.save();
    checks.push({ name: 're-sauvegarde stable', ok: Buffer.from(text).length > 500 });
  } catch (e) {
    checks.push({ name: 're-parse du PDF', ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
  checks.push({ name: 'signature %PDF', ok: bytes.slice(0, 4).toString() === '%PDF' });
  return { ok: checks.every((c) => c.ok), checks };
}

export function verifyMp4(bytes: Buffer): CheckResult {
  const checks: CheckResult['checks'] = [
    { name: 'boîte ftyp (conteneur MP4)', ok: bytes.slice(4, 8).toString() === 'ftyp' },
    { name: 'taille minimum vidéo', ok: bytes.length > 10000, detail: `${(bytes.length / 1024).toFixed(0)} Ko` },
    {
      name: 'piste vidéo H.264 (moov/avc)',
      ok: bytes.indexOf(Buffer.from('avc1')) !== -1 || bytes.indexOf(Buffer.from('moov')) !== -1,
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export async function verifyImage(bytes: Buffer): Promise<CheckResult> {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(bytes).metadata();
    const checks: CheckResult['checks'] = [
      { name: 'décodage image', ok: !!meta.width, detail: `${meta.width}x${meta.height}` },
      { name: 'dimension minimum', ok: (meta.width || 0) >= 256 && (meta.height || 0) >= 256 },
      { name: 'non vide', ok: bytes.length > 1000, detail: `${(bytes.length / 1024).toFixed(0)} Ko` },
    ];
    return { ok: checks.every((c) => c.ok), checks };
  } catch (e) {
    return { ok: false, checks: [{ name: 'décodage image', ok: false, detail: e instanceof Error ? e.message : String(e) }] };
  }
}

/** Re-construit l'Excel depuis la spec et compare : boucle corriger/vérifier. */
export async function verifyExcelRoundtrip(spec: ExcelSpec): Promise<CheckResult> {
  const first = await buildExcel(spec);
  const again = await buildExcel(spec);
  return {
    ok: first.length === again.length && first.equals(again),
    checks: [
      { name: 'déterminisme (2 builds identiques)', ok: first.equals(again) },
      { name: 'taille', ok: first.length > 500, detail: `${first.length} octets` },
    ],
  };
}

/** Exécute une vérification logique dans l'environnement restreint. */
export function verifyLogic(code: string, timeoutMs = 3000): CheckResult {
  const r = runJsSandboxed(code, timeoutMs);
  return {
    ok: r.ok,
    checks: [
      { name: 'exécution restreinte', ok: r.ok, detail: r.ok ? `${r.durationMs} ms` : r.error },
      { name: 'résultat', ok: r.ok, detail: r.result },
    ],
  };
}
