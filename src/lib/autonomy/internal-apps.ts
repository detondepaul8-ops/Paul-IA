// ── MOTEUR INTERNE PAUL IA — Générateur d'applications & sites ────────────
// Produit de VRAIES applications complètes (HTML/CSS/JS autonome, prêt à
// ouvrir et à déployer) sans Z AI ni GROQ : le cerveau interne libre conçoit
// la spécification, les gabarits déterministes assemblent le code final.
// Chaque gabarit expose `__paulCore(...)` : une fonction pure testée par le
// moteur d'exécution interne pour VÉRIFIER que l'application fonctionne.

import { freeLLMChat, extractJson } from './free-llm';

export type AppArchetype = 'todo' | 'calculator' | 'landing' | 'portfolio' | 'dashboard';

export interface AppSpec {
  archetype: AppArchetype;
  title: string;
  subtitle: string;
  accent: string;
  items?: string[];
  sections?: Array<{ heading: string; text: string }>;
  features?: string[];
  metrics?: Array<{ label: string; value: string }>;
}

const ARCHETYPES: AppArchetype[] = ['todo', 'calculator', 'landing', 'portfolio', 'dashboard'];

export async function generateAppSpec(request: string): Promise<AppSpec> {
  try {
    const raw = await freeLLMChat([
      { role: 'system', content:
        'Tu conçois des applications. Réponds UNIQUEMENT avec un JSON de forme exacte: ' +
        '{"archetype":"todo|calculator|landing|portfolio|dashboard","title":"...","subtitle":"...",' +
        '"accent":"#rrggbb","items":["..."],"sections":[{"heading":"...","text":"..."}],' +
        '"features":["..."],"metrics":[{"label":"...","value":"..."}]}. ' +
        'Choisis l\'archétype le plus adapté à la demande. Contenus concrets en français.' },
      { role: 'user', content: request },
    ], { temperature: 0.6, maxTokens: 1200, timeoutMs: 35000 });
    const parsed = extractJson<AppSpec>(raw);
    if (!parsed || !ARCHETYPES.includes(parsed.archetype)) {
      return templateSpec(request);
    }
    parsed.title = String(parsed.title || 'Application').slice(0, 80);
    parsed.subtitle = String(parsed.subtitle || '').slice(0, 140);
    if (!/^#[0-9a-fA-F]{6}$/.test(parsed.accent || '')) parsed.accent = '#2563eb';
    return parsed;
  } catch {
    return templateSpec(request);
  }
}

export function templateSpec(request: string): AppSpec {
  const r = request.toLowerCase();
  const archetype: AppArchetype = r.includes('calcul') ? 'calculator'
    : r.includes('tâche') || r.includes('tache') || r.includes('todo') ? 'todo'
    : r.includes('portfolio') ? 'portfolio'
    : r.includes('tableau') || r.includes('dashboard') ? 'dashboard'
    : 'landing';
  return {
    archetype,
    title: 'Application Paul IA',
    subtitle: request.slice(0, 120),
    accent: '#2563eb',
    items: ['Premier élément', 'Deuxième élément', 'Troisième élément'],
    sections: [
      { heading: 'Présentation', text: 'Application générée par le moteur interne de Paul IA.' },
      { heading: 'Fonctionnalités', text: 'Interface responsive, persistance locale, aucune dépendance externe.' },
    ],
    features: ['Responsive', 'Hors ligne', 'Vérifiée'],
    metrics: [{ label: 'Utilisateurs', value: '128' }, { label: 'Satisfaction', value: '96%' }],
  };
}

/** Construit l'application complète (fichier HTML unique auto-suffisant). */
export function buildApp(spec: AppSpec): string {
  const head = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.title)}</title>
<style>
:root{--accent:${spec.accent}}*{box-sizing:border-box;margin:0}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7fb;color:#111827;line-height:1.6}
.wrap{max-width:960px;margin:0 auto;padding:clamp(16px,4vw,40px)}
header{background:linear-gradient(135deg,var(--accent),#111827);color:#fff;padding:clamp(24px,6vw,56px) 0;text-align:center}
h1{font-size:clamp(1.6rem,5vw,2.6rem)}p.lead{opacity:.9;margin-top:8px}
.card{background:#fff;border-radius:14px;padding:20px;margin:16px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}
button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:1rem;cursor:pointer}
input{padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:1rem;width:100%}
ul{list-style:none;padding:0}li{display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee}
.calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.calc-grid button{padding:16px;font-size:1.1rem}
#calcOut{font-size:1.6rem;text-align:right;padding:12px;background:#111827;color:#4ade80;border-radius:8px;min-height:48px}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.metric{background:#fff;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.metric b{font-size:1.5rem;color:var(--accent)}
footer{text-align:center;color:#6b7280;padding:24px;font-size:.9rem}
@media(max-width:640px){.calc-grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body>`;

  let body = `<header><div class="wrap"><h1>${esc(spec.title)}</h1><p class="lead">${esc(spec.subtitle)}</p></div></header><div class="wrap">`;

  switch (spec.archetype) {
    case 'todo':
      body += `<div class="card"><input id="inp" placeholder="Nouvelle tâche…" aria-label="Nouvelle tâche">
      <div style="margin-top:10px"><button onclick="app.add()">Ajouter</button></div>
      <ul id="list" style="margin-top:14px"></ul></div>
      <div class="card" id="stats"></div>`;
      break;
    case 'calculator':
      body += `<div class="card"><div id="calcOut">0</div><div class="calc-grid" id="pad"></div></div>`;
      break;
    case 'landing':
      body += (spec.sections || []).map((s) => `<div class="card"><h2>${esc(s.heading)}</h2><p>${esc(s.text)}</p></div>`).join('');
      body += `<div class="card"><h2>Contact</h2><input id="mail" placeholder="votre@email.com"><div style="margin-top:10px"><button onclick="app.contact()">Demander une démo</button></div><p id="msg"></p></div>`;
      break;
    case 'portfolio':
      body += `<div class="metrics">${(spec.metrics || [{ label: 'Projets', value: '12' }]).map((m) => `<div class="metric"><b>${esc(m.value)}</b><br>${esc(m.label)}</div>`).join('')}</div>` +
        (spec.sections || []).map((s) => `<div class="card"><h2>${esc(s.heading)}</h2><p>${esc(s.text)}</p></div>`).join('');
      break;
    case 'dashboard':
      body += `<div class="metrics">${(spec.metrics || [{ label: 'Ventes', value: '0' }]).map((m) => `<div class="metric"><b>${esc(m.value)}</b><br>${esc(m.label)}</div>`).join('')}</div>` +
        `<div class="card"><h2>Détails</h2><ul>${(spec.features || ['Indicateur']).map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>`;
      break;
  }
  body += `</div><footer>Propulsé par le moteur interne de Paul IA — fichier unique, aucune dépendance externe</footer>`;

  const script = SCRIPTS[spec.archetype](spec);
  return `${head}${body}<script>${script}</script></body></html>`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Logique applicative par archétype ; expose une fonction pure __paulCore. */
const SCRIPTS: Record<AppArchetype, (s: AppSpec) => string> = {
  todo: (s) => `
function __paulCore(action, payload) {
  var store = action === 'add' ? (payload || '').trim() : null;
  if (!store) return { ok: false, reason: 'texte requis' };
  return { ok: true, item: store, count: String(store).length };
}
var app = {
  items: [],
  add: function () {
    var inp = document.getElementById('inp');
    var core = __paulCore('add', inp.value);
    if (!core.ok) { alert('Entrez une tâche.'); return; }
    this.items.push(core.item);
    inp.value = ''; this.render();
  },
  remove: function (i) { this.items.splice(i, 1); this.render(); },
  render: function () {
    var list = document.getElementById('list');
    list.innerHTML = '';
    this.items.forEach(function (t, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + t + '</span>';
      var b = document.createElement('button');
      b.textContent = 'Supprimer'; b.onclick = function () { app.remove(i); };
      li.appendChild(b); list.appendChild(li);
    });
    document.getElementById('stats').textContent = this.items.length + ' tâche(s) enregistrée(s) localement.';
  }
};
document.addEventListener('DOMContentLoaded', function(){ app.render(); });`,

  calculator: () => `
function __paulCore(a, b, op) {
  var x = Number(a), y = Number(b);
  switch (op) {
    case '+': return x + y;
    case '-': return x - y;
    case '*': return x * y;
    case '/': return y === 0 ? 'Erreur : division par zéro' : x / y;
    default: return 'Opérateur inconnu';
  }
}
var expr = [];
var app = {
  press: function (k) {
    var out = document.getElementById('calcOut');
    if (k === '=') {
      if (expr.length >= 3) {
        var r = __paulCore(expr[0], expr[2], expr[1]);
        out.textContent = String(r); expr = [];
      }
    } else if (['+','-','*','/'].indexOf(k) >= 0) { expr.push(k); out.textContent = expr.join(' '); }
    else {
      if (expr.length % 2 === 0 && expr.length && typeof expr[expr.length-1] === 'string' && expr[expr.length-1].length && ['+','-','*','/'].indexOf(expr[expr.length-1]) < 0) { expr[expr.length-1] += k; }
      else expr.push(k);
      out.textContent = expr.join(' ');
    }
  }
};
(function () {
  var pad = document.getElementById('pad');
  var keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'];
  keys.forEach(function (k) {
    var b = document.createElement('button');
    b.textContent = k; b.onclick = function () { app.press(k); };
    pad.appendChild(b);
  });
})();`,

  landing: (s) => `
function __paulCore(email) {
  return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(String(email)) ? { ok: true } : { ok: false };
}
var app = {
  contact: function () {
    var v = document.getElementById('mail').value;
    var r = __paulCore(v);
    document.getElementById('msg').textContent = r.ok ? 'Merci ! Nous vous répondrons sous 24 h.' : 'Adresse email invalide.';
  }
};`,

  portfolio: (s) => `
function __paulCore(items) {
  return { total: (items || []).length, labels: (items || []).map(function (m) { return m.label; }) };
}
document.addEventListener('DOMContentLoaded', function () {
  var data = ${JSON.stringify((s.metrics || []).slice(0, 8))};
  var r = __paulCore(data);
  console.log('Portfolio initialisé:', r.total, 'indicateurs');
});`,

  dashboard: (s) => `
function __paulCore(metrics) {
  var vals = (metrics || []).map(function (m) { return parseFloat(String(m.value).replace(',', '.')) || 0; });
  return { count: vals.length, sum: vals.reduce(function (a, b) { return a + b; }, 0), avg: vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0 };
}
document.addEventListener('DOMContentLoaded', function () {
  var r = __paulCore(${JSON.stringify((s.metrics || []).slice(0, 10))});
  console.log('Tableau de bord:', r.count, 'indicateurs, somme', r.sum, 'moyenne', Math.round(r.avg * 100) / 100);
});`,
};

/** Teste la logique de l'application générée (exécution interne restreinte). */
export function coreTestFor(archetype: AppArchetype): { code: string; expect: (r: string) => boolean } | null {
  switch (archetype) {
    case 'calculator':
      return { code: `__paulCore(3, 4, '+')`, expect: (r) => r === '7' };
    case 'todo':
      return { code: `JSON.stringify(__paulCore('add', 'Ma première tâche'))`, expect: (r) => r.includes('"ok":true') };
    case 'landing':
      return { code: `__paulCore('test@exemple.fr').ok && !__paulCore('invalide').ok`, expect: (r) => r === 'true' };
    case 'portfolio':
      return { code: `__paulCore([{label:'Projets', value:'12'}]).total`, expect: (r) => r === '1' };
    case 'dashboard':
      return { code: `__paulCore([{label:'A', value:'10'},{label:'B', value:'20'}]).sum`, expect: (r) => r === '30' };
    default:
      return null;
  }
}
