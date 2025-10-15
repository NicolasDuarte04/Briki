"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  agent?: {
    label?: string;
    tag?: string;
  };
  isSeeded?: boolean;
}

export interface ConversationMeta {
  id: string;
  title: string;
  updatedAt: number;
  archived: boolean;
}

interface ChatState {
  activeConversationId: string | null;
  conversations: ConversationMeta[];
  messagesById: Record<string, ChatMessage[]>;
  conversationFilter: "all" | "archived";
  createConversation: (title?: string) => string;
  setActiveConversation: (conversationId: string) => void;
  appendMessage: (conversationId: string, message: Omit<ChatMessage, "id" | "createdAt"> & Partial<Pick<ChatMessage, "id" | "createdAt">>) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  unarchiveConversation: (conversationId: string) => void;
  setConversationFilter: (filter: "all" | "archived") => void;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function deriveTitleFromMessage(text: string): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  const max = 48;
  return singleLine.length > max ? `${singleLine.slice(0, max)}…` : singleLine || "New chat";
}

// Selector helper for visible conversations based on filter
// IMPORTANT: This selector must be stable to avoid infinite loops with shallow comparison
export const selectVisibleConversations = (state: ChatState): ConversationMeta[] => {
  const { conversations, conversationFilter } = state;
  
  // Return the original array if possible to maintain referential equality
  const hasArchived = conversations.some(c => c.archived);
  const hasNonArchived = conversations.some(c => !c.archived);
  
  if (conversationFilter === "archived") {
    // If all are archived, return original array
    if (hasArchived && !hasNonArchived) return conversations;
    // Otherwise filter
    return conversations.filter((c) => c.archived);
  }
  
  // "all" shows non-archived conversations
  // If none are archived, return original array
  if (!hasArchived && hasNonArchived) return conversations;
  // Otherwise filter
  return conversations.filter((c) => !c.archived);
};

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      activeConversationId: null,
      conversations: [],
      messagesById: {},
      conversationFilter: "all",

      createConversation: (title) => {
        const id = generateId();
        const now = Date.now();
        const meta: ConversationMeta = {
          id,
          title: (title && title.trim()) || "New chat",
          updatedAt: now,
          archived: false,
        };
        set((state) => ({
          conversations: [meta, ...state.conversations],
          messagesById: { ...state.messagesById, [id]: [] },
          activeConversationId: id,
        }));
        return id;
      },

      setActiveConversation: (conversationId) => {
        const exists = get().conversations.some((c) => c.id === conversationId);
        if (!exists) return;
        set(() => ({ activeConversationId: conversationId }));
      },

      appendMessage: (conversationId, message) => {
        const id = message.id ?? generateId();
        const createdAt = message.createdAt ?? Date.now();
        set((state) => {
          const current = state.messagesById[conversationId] ?? [];
          const nextMessages = [...current, { ...message, id, createdAt } as ChatMessage];

          // Update conversation updatedAt and optionally title based on first user message
          const conversations = state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            let nextTitle = c.title;
            if (c.title === "New chat" && message.role === "user" && typeof message.content === "string") {
              nextTitle = deriveTitleFromMessage(message.content);
            }
            return { ...c, updatedAt: createdAt, title: nextTitle };
          });

          return {
            conversations,
            messagesById: { ...state.messagesById, [conversationId]: nextMessages },
          };
        });
      },

      renameConversation: (conversationId, title) => {
        const trimmed = (title ?? "").trim();
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, title: trimmed || c.title } : c)),
        }));
      },

      deleteConversation: (conversationId) => {
        set((state) => {
          const conversations = state.conversations.filter((c) => c.id !== conversationId);
          const { [conversationId]: _, ...rest } = state.messagesById;
          let activeConversationId = state.activeConversationId;
          if (state.activeConversationId === conversationId) {
            activeConversationId = conversations[0]?.id ?? null;
          }
        
          return {
            conversations,
            messagesById: rest,
            activeConversationId,
          };
        });
      },

      archiveConversation: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, archived: true, updatedAt: Date.now() } : c
          ),
        }));
      },

      unarchiveConversation: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, archived: false, updatedAt: Date.now() } : c
          ),
        }));
      },

      setConversationFilter: (filter) => {
        set(() => ({ conversationFilter: filter }));
      },
    }),
    { name: "chat-store" }
  )
);


