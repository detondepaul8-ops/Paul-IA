'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Menu, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChatStore } from '@/lib/chat-store';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading, setIsLoading, addMessage, updateMessage, currentConversationId, setCurrentConversation, messages, addConversation, setConversations } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message
    const userMsgId = crypto.randomUUID();
    addMessage({
      id: userMsgId,
      role: 'user',
      content: trimmed,
    });

    // Add loading placeholder
    const loadingId = crypto.randomUUID();
    addMessage({
      id: loadingId,
      role: 'assistant',
      content: '',
      isLoading: true,
    });

    setIsLoading(true);

    try {
      // Build history from messages (exclude the loading one)
      const history = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: currentConversationId,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur');
      }

      // Update loading message with real content
      updateMessage(loadingId, {
        content: data.content,
        module: data.module,
        imageBase64: data.imageBase64 || null,
        isLoading: false,
      });

      // If new conversation was created, update state
      if (!currentConversationId && data.conversationId) {
        setCurrentConversation(data.conversationId);
        addConversation({
          id: data.conversationId,
          title: trimmed.slice(0, 60),
          module: data.module,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { messages: 1 },
        });
      }
    } catch (error) {
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
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
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
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Paul IA route automatiquement vers le module adapté. Les réponses peuvent contenir des erreurs.
        </p>
      </div>
    </div>
  );
}