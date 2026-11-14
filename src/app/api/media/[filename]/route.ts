import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Fichier invalide' }, { status: 400 });
    }

    // The identifier is either the row id (uuid) or the stored filename (uuid.ext)
    const file = await db.paul_MediaFile.findFirst({
      where: { OR: [{ id: filename }, { filename }] },
    });
    if (!file) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
    }

    const bytes = new Uint8Array(file.data);

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Media serving error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
