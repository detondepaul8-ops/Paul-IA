import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  module?: string;
  imageBase64?: string | null;
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

  // UI State
  isLoading: boolean;
  sidebarOpen: boolean;
  setIsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;

  // Actions
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
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

  isLoading: false,
  sidebarOpen: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  clearMessages: () => set({ messages: [], currentConversationId: null }),
}));