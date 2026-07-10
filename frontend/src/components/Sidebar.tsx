// ==============================================================================
// Hospital Information Assistance — Chat History Sidebar Component
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This component displays the list of previous AI chat sessions (conversation
//   history) in a sidebar panel. It is primarily used on the AI Chatbot page
//   to select old chats, start new conversations, and clear history logs.
//
// DESIGN & AESTHETICS (CONCIERGE CLINIC):
//   - Warm ivory/paper base matching layout details
//   - Deep forest green buttons and active select states
//   - Muted sage green icons, dividers, and list borders
//   - Accessible, high-contrast, clean typography and spacing
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
    <div className="flex flex-col h-full w-80 bg-clinic-bg dark:bg-slate-900 border-r border-clinic-sage-200/50 dark:border-slate-800 text-clinic-text dark:text-slate-350 transition-all duration-300">
      
      {/* SIDEBAR HEADER / PLUS BTN */}
      <div className="p-4 border-b border-clinic-sage-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
        <button
          onClick={handleNewSession}
          disabled={isCreating}
          className="flex w-full items-center justify-center space-x-2 bg-clinic-forest-500 hover:bg-clinic-forest-600 active:bg-clinic-forest-700 text-white text-[10px] font-sans font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-premium hover:shadow-premium-hover transition-all duration-200"
        >
          {isCreating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          <span>New Consultation</span>
        </button>
      </div>

      {/* SESSION LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        <div className="flex justify-between items-center px-2.5 py-1 mb-2.5 text-[9px] font-sans font-bold text-clinic-sage-500 uppercase tracking-widest">
          <span>Previous Consultations</span>
          <button 
            onClick={fetchSessions} 
            className="hover:text-clinic-forest-500 dark:hover:text-white transition-colors" 
            title="Refresh history"
            disabled={isLoading}
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-clinic-sage-500">
            <Loader2 size={18} className="animate-spin text-clinic-forest-500" />
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Loading history...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-clinic-sage-200 dark:border-slate-800 rounded-xl text-clinic-sage-500 dark:text-slate-500 text-xs font-semibold leading-relaxed">
            No previous threads.<br />Create a "New Consultation" to begin.
          </div>
        ) : (
          sessions.map((session) => {
            const isSelected = session.session_id === activeSessionId;
            return (
              <div
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isSelected
                    ? 'bg-white dark:bg-slate-850 text-clinic-forest-500 dark:text-white shadow-premium border-clinic-sage-200/80 dark:border-slate-800 font-bold'
                    : 'hover:bg-clinic-sage-50/50 dark:hover:bg-slate-800/40 text-clinic-text/80 dark:text-slate-400 hover:text-clinic-forest-500 dark:hover:text-white border-transparent'
                }`}
              >
                {/* Info block */}
                <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                  <MessageSquare
                    size={14}
                    className={`mt-0.5 flex-shrink-0 ${
                      isSelected ? 'text-clinic-forest-500' : 'text-clinic-sage-500'
                    }`}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs truncate leading-snug">
                      {session.title || 'New Conversation'}
                    </span>
                    {session.last_message && (
                      <span className="text-[10px] text-clinic-sage-500 dark:text-slate-500 truncate mt-1 leading-none group-hover:text-clinic-sage-600">
                        {session.last_message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clear action button (visible on hover) */}
                <button
                  onClick={(e) => handleClearHistory(e, session.session_id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-clinic-sage-500 hover:text-clinic-terracotta-500 hover:bg-clinic-sage-100/50 dark:hover:bg-slate-700/50 transition-all duration-200 ml-2"
                  title="Clear conversation log"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-clinic-sage-200/50 dark:border-slate-800 text-center text-[9px] font-sans font-bold uppercase tracking-widest text-clinic-sage-500">
        AI CONSULTANT SYSTEM v1.0
      </div>
    </div>
  );
};
export default Sidebar;
