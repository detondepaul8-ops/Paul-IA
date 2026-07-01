import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
      take: 50,
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body as { title?: string };

    const conversation = await db.conversation.create({
      data: {
        title: title ?? 'Nouvelle conversation',
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    );
  }
}