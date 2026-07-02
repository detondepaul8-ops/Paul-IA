import { NextRequest, NextResponse } from 'next/server';
import { readMediaFile, getMimeType } from '@/lib/media-storage';

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

    const buffer = await readMediaFile(filename);
    if (!buffer) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
    }

    const mimeType = getMimeType(filename);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Media serving error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}