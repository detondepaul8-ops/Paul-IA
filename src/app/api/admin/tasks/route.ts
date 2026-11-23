// ── ADMINISTRATEUR — détails techniques réels des opérations. ───────────
// Fournisseurs, modèles, agents mobilisés, durées, erreurs, historique.
// Protégé par clé admin (env ADMIN_KEY, header x-admin-key).
// JAMAIS exposé au client : c'est la seule porte des informations réelles.
import { NextRequest, NextResponse } from 'next/server';
import { getAdminOverview } from '@/lib/monitor';

export const dynamic = 'force-dynamic';

function checkAdmin(request: NextRequest): boolean {
  const key = process.env.ADMIN_KEY;
  if (!key) return false; // pas de bypass : sans clé configurée, refusé
  const provided = request.headers.get('x-admin-key')
    || new URL(request.url).searchParams.get('key');
  return provided === key;
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Accès administrateur requis' }, { status: 401 });
  }
  try {
    const overview = await getAdminOverview(12);
    return NextResponse.json({ ok: true, tasks: overview });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
