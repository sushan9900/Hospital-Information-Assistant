// ==============================================================================
// Hospital Information Assistance — Chatbot API Service
// ==============================================================================
// WHY THIS FILE EXISTS:
//   Handles all HTTP queries related to interacting with the AI chatbot,
//   managing user chat sessions, and loading/clearing history logs.
//
// OPERATIONS:
//   - sendMessage()         → Sends a message and receives the AI's reply
//   - createSession()       → Creates a new conversation thread
//   - listSessions()        → Lists the user's past chats (for sidebar history)
//   - getSessionHistory()   → Retrieves past messages of a conversation thread
//   - clearSessionHistory() → Resets memory logs for a conversation thread
// ==============================================================================

import api from '@/utils/api';
import {
  ChatSession,
  ChatMessage,
  ChatHistoryResponse,
  ChatResponse
} from '@/types';

export interface SessionListResponse {
  total: number;
  sessions: ChatSession[];
}

export const chatService = {
  // ----------------------------------------------------------------------------
  // SEND MESSAGE (PATIENT / ADMIN)
  // WHY: Sends a new query. Reusing the same `session_id` maintains history.
  // ----------------------------------------------------------------------------
  async sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/chat/', {
      session_id: sessionId,
      message,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // CREATE SESSION (PATIENT / ADMIN)
  // WHY: Generates a new conversation thread in the database.
  // ----------------------------------------------------------------------------
  async createSession(title?: string, sessionId?: string): Promise<ChatSession> {
    const response = await api.post<ChatSession>('/chat/sessions', {
      title,
      session_id: sessionId,
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // LIST SESSIONS (PATIENT / ADMIN)
  // WHY: Lists past chats in the sidebar history view.
  // ----------------------------------------------------------------------------
  async listSessions(skip = 0, limit = 20): Promise<SessionListResponse> {
    const response = await api.get<SessionListResponse>('/chat/sessions', {
      params: { skip, limit },
    });
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // GET SESSION HISTORY (PATIENT / ADMIN)
  // WHY: Loads past messages when a user selects a session from the sidebar.
  // ----------------------------------------------------------------------------
  async getSessionHistory(sessionId: string): Promise<ChatHistoryResponse> {
    const response = await api.get<ChatHistoryResponse>(`/chat/sessions/${sessionId}/history`);
    return response.data;
  },

  // ----------------------------------------------------------------------------
  // CLEAR HISTORY (PATIENT / ADMIN)
  // WHY: Resets chatbot memory context without deleting the session container.
  // ----------------------------------------------------------------------------
  async clearSessionHistory(sessionId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/chat/sessions/${sessionId}/clear`);
    return response.data;
  }
};
