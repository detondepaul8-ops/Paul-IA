import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const conversations = await db.paul_Conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        module: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conversation = await db.paul_Conversation.create({
      data: { title: body.title || 'Nouvelle conversation' },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}