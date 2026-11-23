'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/chat-store';
import Sidebar from './sidebar';
import MessageList from './message-list';
import ChatInput from './chat-input';
import VoiceMode from './voice-mode';
import { Button } from '@/components/ui/button';
import { Menu, Settings, MoreVertical, Mic } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ChatContainer() {
  const {
    sidebarOpen,
    setSidebarOpen,
    currentConversationId,
    setMessages,
    setConversations,
    setCurrentConversation,
    clearMessages,
    setActiveTaskId,
  } = useChatStore();
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch {
        console.error('Failed to load conversations');
      }
    }
    loadConversations();
  }, [setConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const res = await fetch(`/api/conversations/${currentConversationId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(
            data.messages.map((m: { id: string; role: string; content: string; module?: string; mediaUrl?: string | null; mediaType?: string | null }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              module: m.module,
              mediaUrl: m.mediaUrl ?? null,
              mediaType: (m.mediaType as 'image' | 'video' | 'audio' | null) ?? null,
            }))
          );
          // Reprise de suivi : une vidéo en préparation (message vidéo sans
          // média) continue d'avancer — on rattache le panneau à sa tâche.
          const lastAssistant = [...data.messages].reverse().find((m: { role: string }) => m.role === 'assistant');
          if (lastAssistant?.module === 'video' && !lastAssistant.mediaUrl) {
            try {
              const tRes = await fetch(`/api/tasks?conversationId=${currentConversationId}`, { cache: 'no-store' });
              if (tRes.ok) {
                const tData = await tRes.json();
                const running = (tData.tasks || []).find((t: { status: string }) => t.status === 'running');
                if (running) setActiveTaskId(running.id);
              }
            } catch { /* reprise impossible : la vidéo restera livrée dans l'historique */ }
          }
        }
      } catch {
        console.error('Failed to load messages');
      }
    }
    loadMessages();
  }, [currentConversationId, setMessages, setActiveTaskId]);

  const handleClearChat = () => {
    clearMessages();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground text-sm">Paul IA</h1>
              <p className="text-xs text-muted-foreground">Assistant universel — Texte, Voix, Images, Vidéos, Audio, Fichiers</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setVoiceOpen(true)}
              aria-label="Mode vocal"
              title="Conversation vocale en direct"
            >
              <Mic className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleClearChat}>
                  Nouvelle conversation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres (bientôt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages */}
        <MessageList />

        {/* Input */}
        <ChatInput />

        {/* Mode vocal plein écran */}
        <VoiceMode open={voiceOpen} onClose={() => setVoiceOpen(false)} />
      </main>
    </div>
  );
}