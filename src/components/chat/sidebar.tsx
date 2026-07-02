'use client';

import { useChatStore } from '@/lib/chat-store';
import { Conversation } from '@/lib/chat-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { getTaskTypeLabel } from '@/lib/ai-router';
import type { TaskType } from '@/lib/ai-router';

const MODULE_COLORS: Record<string, string> = {
  chat: 'text-emerald-400',
  code: 'text-cyan-400',
  content: 'text-amber-400',
  image: 'text-pink-400',
  video: 'text-rose-400',
  audio: 'text-violet-400',
  project: 'text-blue-400',
};

const MODULE_ICONS: Record<string, string> = {
  chat: '💬',
  code: '⚡',
  content: '📝',
  image: '🎨',
  video: '🎬',
  audio: '🔊',
  project: '🏗️',
};

export default function Sidebar() {
  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    removeConversation,
    clearMessages,
    sidebarOpen,
    setSidebarOpen,
  } = useChatStore();

  const handleNewChat = () => {
    clearMessages();
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversation(id);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      removeConversation(id);
    } catch {
      console.error('Failed to delete conversation');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-foreground">Paul IA</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Nouvelle conversation
          </Button>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune conversation
              </p>
            ) : (
              conversations.map((conv: Conversation) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm',
                    currentConversationId === conv.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <span className="text-base flex-shrink-0">
                    {MODULE_ICONS[conv.module] ?? '💬'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className={cn('text-xs', MODULE_COLORS[conv.module] ?? 'text-muted-foreground')}>
                      {getTaskTypeLabel(conv.module as TaskType)}
                      {conv._count && ` · ${conv._count.messages} msg`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 flex-shrink-0"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Système actif
          </div>
        </div>
      </aside>
    </>
  );
}