// src/hooks/useChatStore.ts
import { create } from 'zustand';

// Tipos básicos para el chat
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: Record<string, unknown>;
  agent?: {
    label: string;
  };
}

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  activeConversationId: string | null;
  conversations: ConversationMeta[];
  messagesById: Record<string, ChatMessage[]>;
  conversationFilter: "all" | "archived";
  setActiveConversation: (id: string | null) => void;
  createConversation: (meta: ConversationMeta) => void;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  conversations: [],
  messagesById: {},
  conversationFilter: "all",
  setActiveConversation: (id) => {
    console.warn('useChatStore.setActiveConversation (placeholder) called with:', id);
    set({ activeConversationId: id });
  },
  createConversation: (meta) => {
    console.warn('useChatStore.createConversation (placeholder) called with:', meta);
    set((state) => ({ conversations: [...state.conversations, meta] }));
  },
  appendMessage: (conversationId, message) => {
    console.warn('useChatStore.appendMessage (placeholder) called:', { conversationId, message });
    set((state) => ({
      messagesById: {
        ...state.messagesById,
        [conversationId]: [...(state.messagesById[conversationId] || []), message],
      },
    }));
  },
}));