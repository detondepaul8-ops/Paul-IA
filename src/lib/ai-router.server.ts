// Server-only AI Router — classifie l'intention de l'utilisateur
import { chatCompletion } from './zai';
import type { TaskType, RouteResult } from './ai-router';

const INTENT_PATTERNS: { type: TaskType; patterns: RegExp[]; priority: number }[] = [
  {
    type: 'video',
    patterns: [
      /\b(vidéo|video|animation|clip|film|movie|animé|animée|motion)\b/i,
      /\b(crée|génère|fabrique|produis|make|create|generate)\s+(un|une|a|an)?\s*(vidéo|video|clip|film|animation|movie)\b/i,
      /\b(génère|crée)\s+(une\s+)?(animation|séquence|scène)\s+(vidéo|animée)?\b/i,
    ],
    priority: 6,
  },
  {
    type: 'audio',
    patterns: [
      /\b(audio|voix|voix\s+off|narration|musique|son|speech|tts|text[- ]to[- ]speech|parole)\b/i,
      /\b(lis|lis\s+ce\s+texte|prononce|enregistre|dicte|synthesize|synthétise)\b/i,
      /\b(génère|crée|produis)\s+(un|une|a|an)?\s*(audio|son|voix|discours|speech|musique)\b/i,
    ],
    priority: 6,
  },
  {
    type: 'image',
    patterns: [
      // Explicit "verb + image keyword"
      /\b(génère|crée|dessine|fais|fabrique|produis|trace)\s+(une?\s+|la\s+|un\s+)?(image|illustration|photo|dessin|logo|bannière|icône|affiche|miniature|thumbnail|peinture|portrait|caricature|schéma)/i,
      // "dessine-moi / fais-moi" + any object
      /\b(dessine|fais|crée|génère)\s*-\s*(moi|nous)\b/i,
      // "image/illustration/photo of/for"
      /\b(image|illustration|photo|dessin|visuel)\s+(de|d'|sur|pour|avec|qui)/i,
      // English: "verb + image keyword"
      /\b(generate|create|draw|make|design|render|paint)\s+(an?\s+)?(image|illustration|photo|drawing|logo|banner|icon|poster|thumbnail|picture|painting|portrait)/i,
      // Visual medium keywords
      /\b(visuel|graphique|pictogramme|infographie|thumbnail|miniature)\b/i,
      // "génère/crée un/une" + common drawable nouns (high confidence for image)
      /\b(génère|crée|dessine|fais|fabrique|produis|trace)\s+(un\s+|une\s+|le\s+|la\s+)?(chat|chien|oiseau|paysage|montagne|forêt|océan|soleil|lune|étoile|personnage|robot|dragon|maison|ville|fleur|arbre|voiture|avion|bateau|objet|scène|tableau|portrait|affiche|bannière|logo|icône|mascotte|fond\s+d'écran|wallpaper)/i,
    ],
    priority: 5,
  },
  {
    type: 'code',
    patterns: [
      /\b(code|script|programme|fonction|api|endpoint|composant|component|page|route|controller|service|module|class|interface|type|hook)\b/i,
      /\b(crée|écris|génère|code|développe|implémente|build|make|write|implement|develop)\s+(un|une|a|an|le|la|the)?\s*(api|app|application|site|website|backend|frontend|server|cli|tool|dashboard|landing|page|composant|component|hook|service)\b/i,
      /\b(html|css|javascript|typescript|python|react|next\.?js|node|express|prisma|sql|docker|git)\b/i,
      /\b(fix|corrige|debug|refactor|optimize|optimise)\s/i,
      /\b(comment\s+(puis-je|peut-on|dois-je|faire pour)|how\s+(to|can\s+i|do\s|i|should\s+i))\s.*\b(code|programme|implement|build|create)\b/i,
    ],
    priority: 4,
  },
  {
    type: 'content',
    patterns: [
      /\b(article|blog|contenu|content|copywriting|texte|description|résumé|summary|proposal|offre|présentation|pitch|email|newsletter|story|histoire)\b/i,
      /\b(rédige|écris|compose|formule|draft|propose)\s+(un|une|a|an)?\s*(article|blog|contenu|texte|email|offre|proposal|présentation|pitch|résumé|story)\b/i,
      /\b(marketing|seo|stratégie|business|plan|idées|ideas|brainstorm|créatif|creative)\b/i,
    ],
    priority: 3,
  },
  {
    type: 'project',
    patterns: [
      /\b(projet\s+complet|full\s+project|application\s+complète|mvp|saas|plateforme|platform)\b/i,
      /\b(construis\s+(moi\s+)?(un|une)\s*(projet|app|application|système|system)\s+complet)/i,
      /\b(structure\s+(du|de)\s+projet|project\s+structure|architecture\s+complète)\b/i,
      /\b(déploiement|deployment|guide\s+d'installation|installation\s+guide)\b/i,
    ],
    priority: 4,
  },
];

function classifyByPatterns(input: string): RouteResult | null {
  let bestMatch: RouteResult | null = null;

  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(input)) {
        if (!bestMatch || intent.priority > bestMatch.confidence) {
          bestMatch = {
            taskType: intent.type,
            confidence: intent.priority,
            reason: `Pattern match: ${pattern.source}`,
          };
        }
        break;
      }
    }
  }

  return bestMatch;
}

export async function classifyIntent(userMessage: string): Promise<RouteResult> {
  // Step 1: Fast pattern matching
  const patternResult = classifyByPatterns(userMessage);
  if (patternResult) {
    return patternResult;
  }

  // Step 2: LLM classification
  try {
    const classificationPrompt = `Tu es un classificateur d'intention ULTRA PRÉCIS. Analyse le message et classe-le dans UNE catégorie:

- "chat": Discussion, questions générales, explications, salutations
- "code": Génération de code, programmation, debug, développement web
- "content": Rédaction d'articles, marketing, emails, texte purement écrit
- "image": TOUTE demande de créer, générer, dessiner, produire une image/illustration/photo/visuel/dessin. Aussi toute DESCRIPTION VISUELLE d'une scène (ex: "un chat blanc sur une pelouse" = image)
- "video": Génération de vidéos, animations, clips
- "audio": Voix, narration, TTS, musique, son
- "project": Projet complet, MVP, architecture système

Règles CRITIQUES:
1. Si l'utilisateur DÉCRIT une scène visuelle, un objet, un personnage, un paysage → "image"
2. Si l'utilisateur dit "génère", "crée", "dessine", "fais" + un objet/animal/personnage → "image" (PAS "chat" !)
3. Si la demande parle de vidéo/film/animation → "video"
4. Si la demande parle de voix/audio/son → "audio"
5. "chat" ne signifie PAS "chat" (l'animal) — un chat (animal) est une demande d'image

JSON UNIQUEMENT: {"taskType":"...","confidence":0.0-1.0,"reason":"..."}

Message: "${userMessage}"`;

    const response = await chatCompletion([
      { role: 'system', content: classificationPrompt },
    ], { temperature: 0.1, maxTokens: 100 });

    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        taskType: parsed.taskType as TaskType,
        confidence: parsed.confidence,
        reason: parsed.reason,
      };
    }
  } catch (error) {
    console.error('LLM classification failed:', error);
  }

  return patternResult ?? {
    taskType: 'chat',
    confidence: 0.5,
    reason: 'Classification par défaut',
  };
}