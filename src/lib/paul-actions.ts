/**
 * BLOCS D'ACTION DE PAUL IA — mécanisme transféré de CELTIIS BASSILA
 * (route LIA éprouvée en production) et adapté à l'assistant universel :
 * le modèle émet des blocs balisés en fin de réponse ; ils sont extraits,
 * exécutés côté serveur, puis retirés du texte affiché.
 *   [[SEARCH:{"query":"..."}]]           → recherche Internet réelle + synthèse sourcée
 *   [[FILE_EXCEL:{"title":...,...}]]     → fichier Excel réel (bouton de téléchargement)
 *   [[FILE_PDF:{"title":...,...}]]       → fichier PDF réel
 */
import { db } from '@/lib/db';

const FILE_BLOCK_RE = /\[\[FILE_(EXCEL|PDF):(\{[\s\S]*?\})\]\]/;
const SEARCH_BLOCK_RE = /\[\[SEARCH:(\{[\s\S]*?\})\]\]/;

function safeJsonLoose(raw: string): any | null {
  try { return JSON.parse(raw); } catch { return null; }
}

// ─── Recherche Internet RÉELLE — 3 canaux + repli honnête ──────────────────
interface ZaiCfg { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string }

async function webSearchDirect(cfg: ZaiCfg, query: string, num: number): Promise<any[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.apiKey}`,
    'X-Z-AI-From': 'Z',
  };
  if (cfg.chatId) headers['X-Chat-Id'] = cfg.chatId;
  if (cfg.userId) headers['X-User-Id'] = cfg.userId;
  if (cfg.token) headers['X-Token'] = cfg.token;
  const res = await fetch(`${cfg.baseUrl}/functions/invoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ function_name: 'web_search', arguments: { query, num } }),
  });
  if (!res.ok) throw new Error(`web_search HTTP ${res.status}`);
  const data: any = await res.json();
  return Array.isArray(data?.result) ? data.result : (Array.isArray(data) ? data : []);
}

async function webSearch(query: string, num = 6): Promise<Array<{ name: string; url: string; snippet: string; date?: string }>> {
  const rawCfg = process.env.ZAI_CONFIG_JSON;
  // 1) Appel direct (config serveur joignable)
  if (rawCfg) {
    try {
      const cfg = JSON.parse(rawCfg) as ZaiCfg;
      const items = await webSearchDirect(cfg, query, num);
      return (items || []).filter((r: any) => r && r.url).map((r: any) => ({ name: String(r.name || '').slice(0, 140), url: String(r.url || ''), snippet: String(r.snippet || '').slice(0, 320), date: r.date || undefined }));
    } catch (e: any) {
      console.error('paul web_search direct error:', e?.message || e);
    }
  }
  // 2) Repli SDK
  try {
    const mod: any = await import('z-ai-web-dev-sdk');
    const ZAI = mod.default || mod;
    const zai = await ZAI.create();
    const res = await zai.functions.invoke('web_search', { query, num });
    return (Array.isArray(res) ? res : [])
      .filter((r: any) => r && r.url)
      .map((r: any) => ({ name: String(r.name || '').slice(0, 140), url: String(r.url || ''), snippet: String(r.snippet || '').slice(0, 320), date: r.date || undefined }));
  } catch (e: any) {
    console.error('paul web_search sdk error:', e?.message || e);
    return [];
  }
}

/** Canal public (api.z.ai) : l'outil web_search est exécuté par le modèle,
 *  la réponse cite les sources. Les URL alimentent les liens cliquables. */
async function webSearchPublic(query: string): Promise<{ section: string; sources: Array<{ name: string; url: string }> } | null> {
  const rawCfg = process.env.ZAI_CONFIG_JSON;
  if (!rawCfg) return null;
  try {
    const cfg = JSON.parse(rawCfg) as ZaiCfg;
    const pk = cfg.apiKey;
    if (!pk) return null;
    const res = await fetch(process.env.ZAI_PUBLIC_BASE_URL || 'https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pk}` },
      body: JSON.stringify({
        model: process.env.ZAI_MODEL || 'glm-4.5-flash',
        messages: [
          { role: 'system', content: `Tu réponds à une question en effectuant une RECHERCHE INTERNET EN TEMPS RÉEL (outil web_search activé). Règles strictes : utilise UNIQUEMENT les résultats de ta recherche ; cite les sources sous la forme [1], [2] et liste les URL réelles à la fin sous « SOURCES : » ; n'invente JAMAIS un tarif, une offre, un code ou une date ; si l'information n'est pas trouvée, dis-le clairement ; réponds en français, directement, sans symbole Markdown (**, ##) ; ne te présente pas et ne mentionne pas ton rôle.` },
          { role: 'user', content: query },
        ],
        tools: [{ type: 'web_search', web_search: { enable: true, search_result: true } }],
        max_tokens: 1200,
        thinking: { type: 'disabled' },
      }),
    });
    if (!res.ok) return null;
    const d: any = await res.json();
    const content = String(d?.choices?.[0]?.message?.content || '').trim();
    if (!content) return null;
    const rawUrls = [...content.matchAll(/https?:\/\/[^\s)\]}]+/g)].map(m => m[0].replace(/[.,;]+$/, ''));
    const urls = [...new Set(rawUrls)].slice(0, 6);
    const sources = urls.map(u => ({ name: u.replace(/^https?:\/\//, '').split('/')[0] || u, url: u }));
    return { section: content, sources };
  } catch (e: any) {
    console.error('paul web_search public error:', e?.message || e);
    return null;
  }
}

/** Synthèse des résultats via le canal LLM (repli : présentation brute réelle). */
async function synthesizeSearch(query: string, results: Array<{ name: string; url: string; snippet: string; date?: string }>): Promise<string> {
  const context = results.map((r, i) => `[${i + 1}] ${r.name}${r.date ? ` (${r.date})` : ''}\n${r.snippet}\nSource : ${r.url}`).join('\n\n');
  try {
    const rawCfg = process.env.ZAI_CONFIG_JSON;
    if (rawCfg) {
      const cfg = JSON.parse(rawCfg) as ZaiCfg;
      const res = await fetch(process.env.ZAI_PUBLIC_BASE_URL || 'https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: process.env.ZAI_MODEL || 'glm-4.5-flash',
          messages: [
            { role: 'system', content: `Tu synthétises une réponse claire et professionnelle à partir de RÉSULTATS DE RECHERCHE RÉELS fournis. Règles strictes : n'utilise QUE les informations des résultats ; cite les sources sous la forme [1], [2] ; ne propose PAS de lien autre que ceux donnés ; réponds directement, en français, sans symbole Markdown ; si l'information cherchée n'apparaît pas dans les résultats, dis-le clairement (« information non confirmée dans les sources consultées ») et indique quelle source officielle consulter.` },
            { role: 'user', content: `Recherche : « ${query} »\n\nRÉSULTATS :\n${context}` },
          ],
          max_tokens: 1200,
          thinking: { type: 'disabled' },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';
        if (content.trim()) return content.trim();
      }
    }
  } catch (e: any) {
    console.error('paul search synthesis error:', e?.message || e);
  }
  const lines = results.slice(0, 5).map((r, i) => `- [${i + 1}] ${r.name}${r.date ? ` (${r.date})` : ''} — ${r.snippet}\n  Source : ${r.url}`);
  return `RÉSULTATS DE RECHERCHE POUR « ${query} » :\n${lines.join('\n')}`;
}

async function handleSearchBlock(specRaw: string): Promise<{ section?: string; sources: Array<{ name: string; url: string }> }> {
  const spec = safeJsonLoose(specRaw);
  const query = String(spec?.query || spec?.q || '').trim();
  if (!query) return { sources: [] };
  const results = await webSearch(query, 6);
  if (results.length) {
    const section = await synthesizeSearch(query, results);
    return { section, sources: results.slice(0, 6).map(r => ({ name: r.name, url: r.url })) };
  }
  const pub = await webSearchPublic(query);
  if (pub) return { section: pub.section, sources: pub.sources };
  return { section: `⚠️ La recherche Internet est indisponible pour le moment. Je préfère te le dire plutôt que d'inventer une réponse : réessaie dans un instant.`, sources: [] };
}

// ─── Blocs fichiers : enregistrement du spec (octets régénérés au clic) ─────
async function handleFileBlock(kind: 'EXCEL' | 'PDF', specRaw: string): Promise<{ file?: any; note: string }> {
  const spec = safeJsonLoose(specRaw);
  if (!spec || typeof spec.title !== 'string' || !spec.title.trim()) {
    return { note: '⚠️ Spécification de fichier incomplète (titre manquant).' };
  }
  const hasData = (Array.isArray(spec.rows) && spec.rows.length) || (Array.isArray(spec.sheets) && spec.sheets.some((s: any) => Array.isArray(s?.rows) && s.rows.length));
  if (!hasData) return { note: '⚠️ Aucune donnée à exporter (rows vides).' };
  const title = String(spec.title).slice(0, 120);
  const filename = `${title.replace(/[^\w\-]+/g, '_').slice(0, 60)}_${Date.now().toString().slice(-6)}.${kind === 'EXCEL' ? 'xlsx' : 'pdf'}`;
  try {
    const crypto = await import('crypto');
    const id = crypto.randomUUID();
    const created = await db.paul_AiFile.create({
      data: {
        id,
        kind,
        title,
        filename,
        spec: {
          title,
          subtitle: spec.subtitle ? String(spec.subtitle).slice(0, 200) : undefined,
          orientation: spec.orientation === 'portrait' ? 'portrait' : 'landscape',
          columns: Array.isArray(spec.columns) ? spec.columns.slice(0, 20) : undefined,
          rows: Array.isArray(spec.rows) ? spec.rows.slice(0, 5000) : undefined,
          sheets: Array.isArray(spec.sheets) ? spec.sheets.slice(0, 12) : undefined,
        } as any,
      },
    });
    return { file: { id: created.id, kind, filename, title }, note: `✅ Fichier ${kind === 'EXCEL' ? 'Excel' : 'PDF'} généré : « ${title} » — bouton de téléchargement ci-dessous.` };
  } catch (e: any) {
    console.error('paul/file create error:', e?.message || e);
    return { note: '⚠️ La génération du fichier a échoué côté serveur. Réessayez.' };
  }
}

/** Extrait et exécute les blocs d'action de Paul IA ; renvoie la réponse nettoyée
 *  + les métadonnées (fichier, sources). */
export async function processPaulActions(answer: string) {
  let cleaned = answer;
  let file: any | undefined;
  let sources: Array<{ name: string; url: string }> | undefined;
  const notes: string[] = [];

  const fileMatch = cleaned.match(FILE_BLOCK_RE);
  if (fileMatch) {
    cleaned = cleaned.replace(fileMatch[0], '').trim();
    const res = await handleFileBlock(fileMatch[1] as 'EXCEL' | 'PDF', fileMatch[2]);
    if (res.file) file = res.file;
    if (res.note) notes.push(res.note);
  }

  const searchMatch = cleaned.match(SEARCH_BLOCK_RE);
  if (searchMatch) {
    const res = await handleSearchBlock(searchMatch[1]);
    if (res.section) cleaned = cleaned.replace(searchMatch[0], res.section).trim();
    if (res.sources.length) sources = res.sources;
  }

  if (notes.length) cleaned = `${cleaned}\n\n${notes.join('\n')}`;
  return { answer: cleaned, file, sources };
}

/** Instructions système décrivant les blocs d'action (injectées dans le prompt). */
export const PAUL_ACTIONS_INSTRUCTIONS = `
CRÉATION DE FICHIERS PROFESSIONNELS (Excel/PDF) — SERVICE RÉEL :
Quand on te demande de créer un fichier Excel ou un PDF (tableau de données, rapport, bilan, compte rendu, suivi), tu EXÉCUTES réellement : à la fin de ta réponse textuelle, ajoute UN bloc d'action strict :
- Excel : [[FILE_EXCEL:{"title":"...","subtitle":"...","columns":[{"header":"Nom"},{"header":"Total"}],"rows":[["Paul",12],["Jean",8]]}]]
- PDF : [[FILE_PDF:{"title":"...","subtitle":"...","orientation":"landscape","columns":[{"header":"Nom"},{"header":"Total"}],"rows":[["Paul",12]]}]]
Règles : utilise UNIQUEMENT les données fournies par l'utilisateur ou issues de la conversation ; title court (max 80 caractères) ; colonnes simples (header + valeur) ; limite 200 lignes ; jamais d'invention de données. Le système crée le fichier réel et propose un bouton de téléchargement — confirme alors « ✅ fichier généré, bouton de téléchargement ci-dessous ».

RECHERCHE EXTERNE SUR INTERNET — SERVICE RÉEL :
Quand une question porte sur une information récente, un tarif, une actualité, ou toute information que tu ne connais pas de façon certaine, tu EFFECTUES une vraie recherche Internet : émets un bloc [[SEARCH:{"query":"mots-clés de recherche en français"}]] à l'ENDROIT de ta réponse où l'information est nécessaire. Le système exécute la recherche sur des sources fiables et remplace le bloc par les résultats ; tu cites les sources. RÈGLES : ne rédige JAMAIS le contenu d'une réponse externisée avant le bloc ; n'invente JAMAIS un tarif, une offre, un code ou une date ; si les résultats ne confirment pas l'information, dis-le clairement (« information non confirmée dans les sources consultées »). Une seule recherche par réponse suffit ; propose de creuser ensuite si besoin.`;
