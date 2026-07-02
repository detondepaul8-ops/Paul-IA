import { NextRequest, NextResponse } from 'next/server';
import { deleteMediaFile } from '@/lib/media-storage';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { filename, messageId } = await request.json() as {
      filename?: string;
      messageId?: string;
    };

    // Clear media reference from the message in DB
    if (messageId) {
      await db.message.update({
        where: { id: messageId },
        data: { mediaUrl: null, mediaType: null },
      });
    }

    // Delete file from disk
    let deleted = false;
    if (filename) {
      deleted = await deleteMediaFile(filename);
    }

    return NextResponse.json({ success: true, fileDeleted: deleted });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}