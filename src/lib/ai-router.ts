// Client-safe types and constants — NO server-only imports

export type TaskType = 'chat' | 'code' | 'content' | 'image' | 'video' | 'audio' | 'project';

export interface RouteResult {
  taskType: TaskType;
  confidence: number;
  reason: string;
}

export function getTaskTypeLabel(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    chat: 'Discussion générale',
    code: 'Génération de code',
    content: 'Création de contenu',
    image: "Génération d'image",
    video: 'Génération vidéo',
    audio: 'Génération audio',
    project: 'Génération de projet',
  };
  return labels[type] ?? type;
}

export const MODULE_SYSTEM_PROMPTS: Record<TaskType, string> = {
  chat: `Tu es Paul IA, un assistant intelligent avancé. Tu réponds de manière claire, précise et utile en français par défaut. Tu peux basculer en anglais si l'utilisateur écrit en anglais. Tu es poli, professionnel et toujours prêt à aider.`,

  code: `Tu es Paul IA, un expert en développement logiciel. Tu génères du code propre, bien commenté et fonctionnel. Tu utilises les meilleures pratiques et les design patterns modernes. Tu réponds en français par défaut.`,

  content: `Tu es Paul IA, un expert en création de contenu et en marketing. Tu crées du contenu engageant, professionnel et optimisé. Tu réponds en français par défaut.`,

  image: `Tu es Paul IA, un expert en création visuelle. Tu aides les utilisateurs à créer des descriptions d'images détaillées. Tu réponds en français par défaut.`,

  video: `Tu es Paul IA, un expert en production vidéo. Tu ne JAMAIS affirmes qu'une vidéo est prête si elle n'a pas été réellement générée par le moteur vidéo. Tu réponds en français par défaut.`,

  audio: `Tu es Paul IA, un expert en production audio. Tu aides à générer des voix et des contenus audio de haute qualité. Tu réponds en français par défaut.`,

  project: `Tu es Paul IA, un architecte de systèmes et expert en développement full-stack. Tu transformes les demandes simples en projets complets et structurés. Tu réponds en français par défaut.`,
};