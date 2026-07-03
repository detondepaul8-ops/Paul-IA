import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { classifyIntent } from '@/lib/ai-router.server';
import { processMessage, fallbackResponse } from '@/lib/ai-modules/processor';
import type { ChatMessage } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, history } = body as {
      message: string;
      conversationId?: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.paul_Conversation.create({
        data: { title: message.slice(0, 60) },
      });
      convId = conversation.id;
    }

    // Save user message
    await db.paul_Message.create({
      data: { conversationId: convId, role: 'user', content: message },
    });

    // Classify intent
    const routeResult = await classifyIntent(message);

    // Build history
    const chatHistory: ChatMessage[] = (history || [])
      .filter((h: { role: string }) => h.role === 'user' || h.role === 'assistant')
      .slice(-10)
      .map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      }));

    // Process with the right module
    let response;
    try {
      response = await processMessage(routeResult.taskType, message, chatHistory);
    } catch (error) {
      console.error('Module error, fallback:', error);
      response = await fallbackResponse(message, error as Error);
    }

    // Save assistant message WITH media references
    await db.paul_Message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: response.content,
        module: response.module,
        mediaUrl: response.mediaUrl,
        mediaType: response.mediaType,
      },
    });

    // Update conversation metadata
    await db.paul_Conversation.update({
      where: { id: convId },
      data: {
        module: response.module,
        title: message.slice(0, 60),
      },
    });

    return NextResponse.json({
      content: response.content,
      module: response.module,
      conversationId: convId,
      route: routeResult,
      mediaUrl: response.mediaUrl,
      mediaType: response.mediaType,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}