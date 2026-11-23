// Détection des demandes complexes (agents parallèles) — module PUR,
// sans dépendance serveur : importable depuis le client et le serveur.
const PATTERNS = [
  'mobilise[sz]?\\s+(tes\\s+)?agents',
  'deux\\s+agents',
  'agents?\\s+parall',
  'en\\s+parall[eè]le',
  'analyse\\s+approfondie',
  't[âa]che\\s+complexe',
  'charge\\s+de\\s+mission',
  'plan\\s+d[\'’]action',
  'd[ée]compose',
  'r[ée]partis?\\s+.{0,30}t[âa]che',
  'compare\\s+.{0,40}v[ée]rif',
];

export const ORCHESTRATION_MARKERS = new RegExp(PATTERNS.join('|'), 'i');

export function isComplexRequest(message: string): boolean {
  return message.length > 25 && ORCHESTRATION_MARKERS.test(message);
}
