'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Paperclip, X } from 'lucide-react';
import { useChatStore } from '@/lib/chat-store';

interface PendingImage { mime: string; dataBase64: string; preview: string }

export default function ChatInput() {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<PendingImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    isLoading, setIsLoading,
    addMessage, updateMessage,
    currentConversationId, setCurrentConversation,
    messages, addConversation,
  } = useChatStore();

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Focus
  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handlePickImages = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 3)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 3_300_000) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1] || '';
        setImages((prev) => prev.length < 3
          ? [...prev, { mime: f.type, dataBase64: base64, preview: dataUrl }]
          : prev);
      };
      reader.readAsDataURL(f);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && images.length === 0) || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const sentImages = images;
    setImages([]);

    const userMsgId = crypto.randomUUID();
    addMessage({
      id: userMsgId,
      role: 'user',
      content: trimmed
        + (sentImages.length ? ` [${sentImages.length} image${sentImages.length > 1 ? 's' : ''} transmise${sentImages.length > 1 ? 's' : ''}]` : ''),
    });

    const loadingId = crypto.randomUUID();
    addMessage({ id: loadingId, role: 'assistant', content: '', isLoading: true });

    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: currentConversationId,
          history,
          images: sentImages.length ? sentImages.map((i) => ({ mime: i.mime, dataBase64: i.dataBase64 })) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      updateMessage(loadingId, {
        content: data.content,
        module: data.module,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || null,
        isLoading: false,
      });

      if (!currentConversationId && data.conversationId) {
        setCurrentConversation(data.conversationId);
        addConversation({
          id: data.conversationId,
          title: (trimmed || 'Analyse d\'image').slice(0, 60),
          module: data.module,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { messages: 1 },
        });
      }
    } catch {
      updateMessage(loadingId, {
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        isLoading: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`image ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-secondary hover:bg-accent"
                  aria-label="Retirer l'image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handlePickImages(e.target.files)}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={isLoading || images.length >= 3}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0"
            aria-label="Joindre des images"
            title="Joindre des images à analyser"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Demandez quelque chose à Paul IA..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground min-h-[40px] max-h-[200px]"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && images.length === 0) || isLoading}
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Texte, voix, images à analyser, code, fichiers Excel/PDF, recherche web — Paul IA route automatiquement.
        </p>
      </div>
    </div>
  );
}