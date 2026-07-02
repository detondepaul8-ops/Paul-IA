import { create } from 'zustand';

export type ClientMediaType = 'image' | 'video' | 'audio' | null;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  module?: string;
  mediaUrl?: string | null;
  mediaType?: ClientMediaType;
  isLoading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  module: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface ChatStore {
  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;

  // Messages
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMediaFromMessage: (messageId: string) => void;

  // UI State
  isLoading: boolean;
  sidebarOpen: boolean;
  setIsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;

  // Actions
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    })),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  removeMediaFromMessage: (messageId) => {
    const msg = get().messages.find((m) => m.id === messageId);
    if (msg && msg.mediaUrl) {
      const filename = msg.mediaUrl.split('/').pop();
      fetch('/api/media-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, messageId }),
      });
    }
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, mediaUrl: null, mediaType: null }
          : m
      ),
    }));
  },

  isLoading: false,
  sidebarOpen: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  clearMessages: () => set({ messages: [], currentConversationId: null }),
}));