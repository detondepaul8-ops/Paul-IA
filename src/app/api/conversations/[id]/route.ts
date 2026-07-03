import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await db.paul_Message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    const conversation = await db.paul_Conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.paul_Message.deleteMany({ where: { conversationId: id } });
    await db.paul_Conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}