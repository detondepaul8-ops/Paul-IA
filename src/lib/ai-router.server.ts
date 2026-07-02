// Server-only AI Router — classifie l'intention de l'utilisateur
import { chatCompletion } from './zai';
import type { TaskType, RouteResult } from './ai-router';

const INTENT_PATTERNS: { type: TaskType; patterns: RegExp[]; priority: number }[] = [
  {
    type: 'image',
    patterns: [
      /\b(génère|crée|dessine|fais|fabrique)\s+(une\s+)?(image|illustration|photo|dessin|logo|bannière|icône|affiche|miniature|thumbnail)/i,
      /\b(image|illustration|photo|dessin)\s+(de|d'|sur|pour)/i,
      /\b(generate|create|draw|make|design)\s+(an?\s+)?(image|illustration|photo|drawing|logo|banner|icon|poster|thumbnail)/i,
      /^(génère|crée|dessine|make me|draw me|generate|create)\s/i,
      /\b(visuel|graphique|pictogramme|infographie)\b/i,
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
      /\b(structure|architecture|projet|project)\s+(de\s+)?(code|web|app|application)\b/i,
      /\b{[\s\S]*}\s*$/,
    ],
    priority: 4,
  },
  {
    type: 'content',
    patterns: [
      /\b(article|blog|contenu|content|copywriting|texte|description|résumé|summary|proposal|offre|présentation|pitch|email|newsletter|story|histoire)\b/i,
      /\b(rédige|écris|compose|formule|draft|propose)\s+(un|une|a|an)?\s*(article|blog|contenu|texte|email|offre|proposal|présentation|pitch|résumé|story)\b/i,
      /\b(marketing|seo|stratégie|business|plan|idées|ideas|brainstorm|créatif|creative)\b/i,
      /\b(stratégie\s+de\s+contenu|content\s+strategy|calendrier\s+éditorial)\b/i,
    ],
    priority: 3,
  },
  {
    type: 'project',
    patterns: [
      /\b(projet\s+complet|full\s+project|application\s+complète|mvp|saas|plateforme|platform)\b/i,
      /\b(construis\s+(moi\s+)?(un|une)\s*(projet|app|application|système|system)\s+complet)/i,
      /\b(build\s+(me\s+)?(a\s+)?(complete\s+)?(project|app|application|system|platform))\b/i,
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
  // Step 1: Try pattern matching first (fast)
  const patternResult = classifyByPatterns(userMessage);
  if (patternResult && patternResult.confidence >= 4) {
    return patternResult;
  }

  // Step 2: Use LLM for classification
  try {
    const classificationPrompt = `Tu es un classificateur d'intention. Analyse le message de l'utilisateur et classe-le dans UNE des catégories suivantes:

- "chat": Discussion générale, questions, explications, conversation
- "code": Génération de code, développement, programmation, debug, refactoring
- "content": Création de contenu, rédaction, marketing, articles, emails
- "image": Génération d'images, illustrations, visuels
- "project": Création de projet complet, MVP, architecture système, déploiement

Réponds UNIQUEMENT avec un objet JSON: {"taskType": "chat|code|content|image|project", "confidence": 0.0-1.0, "reason": "courte explication"}

Message de l'utilisateur: "${userMessage}"`;

    const response = await chatCompletion([
      { role: 'system', content: classificationPrompt },
    ], { temperature: 0.1, maxTokens: 100 });

    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as RouteResult;
      return {
        taskType: parsed.taskType as TaskType,
        confidence: parsed.confidence,
        reason: parsed.reason,
      };
    }
  } catch (error) {
    console.error('LLM classification failed, falling back to patterns:', error);
  }

  // Step 3: Fallback
  return patternResult ?? {
    taskType: 'chat',
    confidence: 0.5,
    reason: 'Classification par défaut (fallback)',
  };
}