import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { classifyIntent } from '@/lib/ai-router.server';
import { processMessage, fallbackResponse, buildSystemPrompt } from '@/lib/ai-modules/processor';
import { processPaulActions, PAUL_ACTIONS_INSTRUCTIONS } from '@/lib/paul-actions';
import { chatCompletion } from '@/lib/zai';
import type { ChatMessage } from '@/lib/zai';

// Image generation needs ~30-50s; the default serverless limit (10s) kills the request.
export const maxDuration = 60;

// Analyse vision : images (photos, captures, documents photographiés) → contenu
type VisionImage = { mime: string; dataBase64: string };

function buildUserContent(text: string, images: VisionImage[]): any {
  const parts: any[] = images.map(i => ({
    type: 'image_url',
    image_url: { url: `data:${i.mime};base64,${i.dataBase64}` },
  }));
  parts.push({ type: 'text', text });
  return parts;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, history, images } = body as {
      message: string;
      conversationId?: string;
      history?: ChatMessage[];
      images?: VisionImage[];
    };

    const validImages: VisionImage[] = Array.isArray(images)
      ? images.slice(0, 3).filter((i: any) => i && typeof i.dataBase64 === 'string' && typeof i.mime === 'string'
        && /^image\/(jpeg|png|webp)$/.test(i.mime) && i.dataBase64.length < 4_500_000)
      : [];

    const textMessage = typeof message === 'string' ? message : '';
    if ((!textMessage || textMessage.trim().length === 0) && validImages.length === 0) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.paul_Conversation.create({
        data: { title: (textMessage || 'Analyse d\'image').slice(0, 60) },
      });
      convId = conversation.id;
    }

    // Save user message
    await db.paul_Message.create({
      data: { conversationId: convId, role: 'user', content: textMessage || '(images transmises)' },
    });

    // Classify intent (texte seul ; une demande d'analyse d'image reste routée vers chat)
    const routeResult = await classifyIntent(textMessage || 'analyse cette image');

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
      if (routeResult.taskType === 'chat' || routeResult.taskType === 'code'
        || routeResult.taskType === 'content' || routeResult.taskType === 'project') {
        // Modules texte : prompt enrichi des instructions d'action (fichiers + recherche),
        // et analyse vision si des images sont transmises.
        const systemPrompt = buildSystemPrompt(routeResult.taskType)
          + PAUL_ACTIONS_INSTRUCTIONS
          + (validImages.length ? '\n\nDes IMAGES sont fournies par l\'utilisateur : analyse-les fidèlement (contenu visible, textes lisibles, données chiffrées) et relie-les à la demande — sans rien supposer au-delà de ce qui est visible.' : '');

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          ...chatHistory.slice(-10),
          validImages.length
            ? { role: 'user', content: buildUserContent(textMessage || 'Analyse ces images.', validImages) }
            : { role: 'user', content: textMessage },
        ];
        try {
          const content = await chatCompletion(messages, {
            temperature: routeResult.taskType === 'code' ? 0.3 : 0.7,
            maxTokens: routeResult.taskType === 'project' ? 8192 : 4096,
          });
          response = { content, module: routeResult.taskType, mediaUrl: null, mediaType: null };
        } catch (visionError) {
          // Le modèle peut refuser les images : repli texte propre
          if (validImages.length) {
            console.error('Vision call failed, text-only fallback:', visionError);
            const content = await chatCompletion([
              { role: 'system', content: systemPrompt },
              ...chatHistory.slice(-10),
              { role: 'user', content: `${textMessage}\n\n(NB : l'analyse d'image est momentanément indisponible — réponds sur le texte.)` },
            ], { temperature: 0.7, maxTokens: 4096 });
            response = { content, module: routeResult.taskType, mediaUrl: null, mediaType: null };
          } else {
            throw visionError;
          }
        }
      } else {
        response = await processMessage(routeResult.taskType, textMessage, chatHistory);
      }
    } catch (error) {
      console.error('Module error, fallback:', error);
      response = await fallbackResponse(textMessage || 'analyse', error as Error);
    }

    // Blocs d'action : fichiers Excel/PDF réels + recherche Internet sourcée
    let file: { id: string; kind: string; filename: string; title: string } | null = null;
    let sources: Array<{ name: string; url: string }> | null = null;
    let finalContent = response.content;
    if (response.module === 'chat' || response.module === 'code'
      || response.module === 'content' || response.module === 'project') {
      const actions = await processPaulActions(response.content);
      finalContent = actions.answer;
      if (actions.file) file = actions.file;
      if (actions.sources?.length) sources = actions.sources;
    }

    // Sources : liens cliquables ajoutés au contenu persisté
    let persistedContent = finalContent;
    if (sources?.length) {
      persistedContent += '\n\nSOURCES :\n' + sources.map((s, i) => `[${i + 1}] ${s.name} — ${s.url}`).join('\n');
    }

    // Save assistant message WITH media/file references
    const isFile = Boolean(file);
    await db.paul_Message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: persistedContent,
        module: response.module,
        mediaUrl: isFile ? `/api/files?id=${file!.id}` : response.mediaUrl,
        mediaType: isFile ? 'file' : response.mediaType,
        mediaFilename: isFile ? file!.filename : null,
      },
    });

    // Update conversation metadata
    await db.paul_Conversation.update({
      where: { id: convId },
      data: {
        module: response.module,
        title: (textMessage || 'Analyse d\'image').slice(0, 60),
      },
    });

    return NextResponse.json({
      content: finalContent,
      module: response.module,
      conversationId: convId,
      route: routeResult,
      mediaUrl: isFile ? `/api/files?id=${file!.id}` : response.mediaUrl,
      mediaType: isFile ? 'file' : response.mediaType,
      mediaFilename: isFile ? file!.filename : undefined,
      sources: sources || undefined,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
