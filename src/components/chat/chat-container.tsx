'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/chat-store';
import Sidebar from './sidebar';
import MessageList from './message-list';
import ChatInput from './chat-input';
import { Button } from '@/components/ui/button';
import { Menu, Settings, MoreVertical } from 'lucide-react';
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
  } = useChatStore();

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
        }
      } catch {
        console.error('Failed to load messages');
      }
    }
    loadMessages();
  }, [currentConversationId, setMessages]);

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
              <p className="text-xs text-muted-foreground">Assistant multimédia — Texte, Images, Vidéos, Audio</p>
            </div>
          </div>

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
        </header>

        {/* Messages */}
        <MessageList />

        {/* Input */}
        <ChatInput />
      </main>
    </div>
  );
}