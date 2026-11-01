import { NextRequest, NextResponse } from 'next/server';
import { deleteMediaFile } from '@/lib/media-storage';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { filename, messageId, storagePath } = await request.json() as {
      filename?: string;
      messageId?: string;
      storagePath?: string;
    };

    // Clear media reference from the message in DB
    if (messageId) {
      await db.paul_Message.update({
        where: { id: messageId },
        data: { mediaUrl: null, mediaType: null, mediaFilename: null },
      });
    }

    // Delete file from Supabase Storage
    let deleted = false;
    if (filename || storagePath) {
      deleted = await deleteMediaFile(filename || storagePath!);
    }

    return NextResponse.json({ success: true, fileDeleted: deleted });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}