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
      return NextResponse.json(
        { error: 'Message requis' },
        { status: 400 }
      );
    }

    // Save user message
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.conversation.create({
        data: {
          title: message.slice(0, 60),
        },
      });
      convId = conversation.id;
    }

    await db.message.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    // Classify intent
    const routeResult = await classifyIntent(message);

    // Convert history to ChatMessage format
    const chatHistory: ChatMessage[] = (history || [])
      .filter((h: { role: string; content: string }) => h.role === 'user' || h.role === 'assistant')
      .slice(-10)
      .map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      }));

    // Process with appropriate module
    let response;
    try {
      response = await processMessage(routeResult.taskType, message, chatHistory);
    } catch (error) {
      console.error('Module error, using fallback:', error);
      response = await fallbackResponse(message, error as Error);
    }

    // Save assistant message
    await db.message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: response.content,
        module: response.module,
      },
    });

    // Update conversation
    await db.conversation.update({
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
      imageBase64: response.imageBase64 ?? null,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}