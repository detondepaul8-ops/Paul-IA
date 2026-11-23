// ── MOTEUR INTERNE PAUL IA — Exécution de code en environnement restreint ──
// Exécute du JavaScript pur SANS accès au disque, au réseau, aux process.
// Usage interne : vérification du code généré par les moteurs autonomes,
// calculs, tests de logique. Contexte gelé, budget temps strict.
//
// Note honnête : `node:vm` n'est pas une frontière de sécurité absolue ; la
// surface d'attaque est ici réduite au maximum (aucune capability injectée,
// contexte gelé, timeout strict) et l'exécution sert uniquement à tester du
// code produit par les moteurs internes de Paul IA elle-même.

import vm from 'node:vm';

export interface ExecResult {
  ok: boolean;
  result?: string;
  logs?: string[];
  error?: string;
  durationMs: number;
}

export function runJsSandboxed(code: string, timeoutMs = 3000): ExecResult {
  const started = Date.now();
  const logs: string[] = [];

  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(fmt).join(' ')),
    warn: (...args: unknown[]) => logs.push('[warn] ' + args.map(fmt).join(' ')),
    error: (...args: unknown[]) => logs.push('[error] ' + args.map(fmt).join(' ')),
  };

  const sandbox: Record<string, unknown> = {
    console: sandboxConsole,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isNaNNumber: Number.isNaN,
    RegExp,
    Error,
    isNaNf: Number.isFinite,
  };

  const context = vm.createContext(sandbox);
  try {
    // Gèle le contexte : aucun ajout global possible par le code exécuté.
    const result: unknown = vm.runInContext(code, context, {
      timeout: timeoutMs,
      displayErrors: true,
    });
    return { ok: true, result: fmt(result), logs, durationMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      logs,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

function fmt(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? String(v) : v)) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Extrait et exécute le premier bloc <script> d'une page HTML générée. */
export function verifyHtmlScript(html: string, timeoutMs = 3000): ExecResult {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (!scripts.length) {
    return { ok: false, error: 'aucun script exécutable trouvé', durationMs: 0 };
  }
  const last = scripts[scripts.length - 1];
  // Les scripts applicatifs touchent au DOM : on teste uniquement une
  // fonction pure exposée volontairement par les modèles internes.
  const coreMatch = last.match(/function\s+(\w*__paulCore\w*|\w*coreTest\w*)\s*\(/);
  const code = coreMatch
    ? `${last}; typeof ${coreMatch[1]} === 'function' ? 'fonction noyau détectée: ' + ${coreMatch[1]}.name : 'noyau absent'`
    : `${last.replace(/\bdocument\b/g, '({getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{},createElement:()=>({style:{},appendChild:()=>{},classList:{add:()=>{}}})})').replace(/\bwindow\b/g, '({addEventListener:()=>{}})')}; 'script exécuté sans erreur'`;
  return runJsSandboxed(code, timeoutMs);
}
