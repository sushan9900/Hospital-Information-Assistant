// ==============================================================================
// Hospital Information Assistance — Chat History Sidebar Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This component displays the list of previous AI chat sessions (conversation
//   history) in a sidebar panel. It is primarily used on the AI Chatbot page
//   to select old chats, start new conversations, and clear history logs.
//
// DESIGN & AESTHETICS:
//   - Premium panel layout (`bg-slate-50/50`, `border-r`)
//   - Interactive hover states and select states for active threads
//   - Action buttons (Plus icon for new chat, Trash icon for clearing history)
//   - Handles pagination internally or shows a scrollable thread list
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { chatService } from '@/services/chatService';
import { ChatSession } from '@/types';
import { Plus, MessageSquare, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  // Triggered when a new session is successfully created from this sidebar
  onSessionCreated?: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSessionId,
  onSelectSession,
  onSessionCreated,
}) => {
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load chat sessions on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, activeSessionId]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Fetch the first 20 recent sessions
      const response = await chatService.listSessions(0, 20);
      setSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // CREATE NEW SESSION
  // WHY: Calls backend to initialize a session UUID and appends it to list.
  // ----------------------------------------------------------------------------
  const handleNewSession = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newSession = await chatService.createSession('New Conversation');
      setSessions((prev) => [newSession, ...prev]);
      
      // Notify parent to focus the new session
      if (onSessionCreated) {
        onSessionCreated(newSession.session_id);
      }
      onSelectSession(newSession.session_id);
    } catch (error) {
      console.error('Failed to create new chat session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // ----------------------------------------------------------------------------
  // WIPE SESSION LOGS
  // WHY: Resets the message history in Qdrant/Memory, then refreshes list status.
  // ----------------------------------------------------------------------------
  const handleClearHistory = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevents clicking the session list row itself
    
    if (!window.confirm('Are you sure you want to clear this conversation history?')) {
      return;
    }

    try {
      await chatService.clearSessionHistory(sessionId);
      
      // Update list status locally
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === sessionId
            ? { ...s, message_count: 0, last_message: null, title: 'New Conversation' }
            : s
        )
      );

      // Force refresh of the currently active session viewport
      if (activeSessionId === sessionId) {
        onSelectSession(sessionId);
      }
    } catch (error) {
      console.error('Failed to clear session history:', error);
    }
  };

  return (
    <div className="flex flex-col h-full w-80 bg-slate-900 border-r border-slate-800 text-slate-300">
      
      {/* SIDEBAR HEADER / PLUS BTN */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={handleNewSession}
          disabled={isCreating}
          className="flex w-full items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all duration-200"
        >
          {isCreating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          <span>New Chat</span>
        </button>
      </div>

      {/* SESSION LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        <div className="flex justify-between items-center px-2 py-1 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Recent Conversations</span>
          <button 
            onClick={fetchSessions} 
            className="hover:text-slate-300 transition-colors" 
            title="Refresh history"
            disabled={isLoading}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-500">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No previous conversations. Click "New Chat" to begin.
          </div>
        ) : (
          sessions.map((session) => {
            const isSelected = session.session_id === activeSessionId;
            return (
              <div
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {/* Info block */}
                <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                  <MessageSquare
                    size={16}
                    className={`mt-0.5 flex-shrink-0 ${
                      isSelected ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate leading-tight">
                      {session.title || 'New Conversation'}
                    </span>
                    {session.last_message && (
                      <span className="text-[11px] text-slate-500 truncate mt-1 leading-none group-hover:text-slate-400">
                        {session.last_message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clear action button (visible on hover) */}
                <button
                  onClick={(e) => handleClearHistory(e, session.session_id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-all duration-200 ml-2"
                  title="Clear history logs"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-600 font-medium">
        AI Chatbot System v1.0
      </div>
    </div>
  );
};
