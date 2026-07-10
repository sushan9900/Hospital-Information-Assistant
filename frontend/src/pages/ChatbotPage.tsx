// ==============================================================================
// Hospital Information Assistance — AI Chatbot Portal
// ==============================================================================
// WHY THIS FILE EXISTS:
//   This page implements the interactive AI chatbot interface.
//   It integrates:
//     - Left Sidebar component (to load and start conversation threads)
//     - Right Viewport Panel (to render scrollable messages and input messages)
//
// INTERACTION FLOW:
//   1. Displays welcome empty state if no session is active.
//   2. On select, calls `chatService.getSessionHistory` to reload past logs.
//   3. On submit, appends the user prompt locally, shows typing loaders,
//      posts to `chatService.sendMessage`, and appends the AI reply.
//   4. Automatically scrolls viewport to the bottom on new messages.
// ==============================================================================

import React, { useEffect, useState, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { chatService } from '@/services/chatService';
import { ChatMessage, ChatSession } from '@/types';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const ChatbotPage: React.FC = () => {
  const { user } = useAuth();
  
  // Session tracking states
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionTitle, setSessionTitle] = useState('AI Assistant');

  // UI Flow states
  const [inputMsg, setInputMsg] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reference hooks to automatically scroll chat panels
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom whenever message threads update or AI starts writing
  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiResponding]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ----------------------------------------------------------------------------
  // LOAD SESSION HISTORY
  // WHY: Triggered when user selects a conversation thread from the sidebar.
  // ----------------------------------------------------------------------------
  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsLoadingHistory(true);
    setErrorMsg(null);
    try {
      const history = await chatService.getSessionHistory(sessionId);
      setMessages(history.messages);
      setSessionTitle(history.title || 'AI Assistant');
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Failed to load conversation logs.';
      setErrorMsg(apiErr);
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ----------------------------------------------------------------------------
  // SEND MESSAGE HANDLER
  // ----------------------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeSessionId || isAiResponding) return;

    const userPrompt = inputMsg.trim();
    setInputMsg('');
    setErrorMsg(null);

    // 1. Append user's message locally first (ensures snappy UX)
    const userMessageObj: ChatMessage = { role: 'human', content: userPrompt };
    setMessages((prev) => [...prev, userMessageObj]);
    
    // 2. Start AI loading typing indicator
    setIsAiResponding(true);
    try {
      const response = await chatService.sendMessage(activeSessionId, userPrompt);
      
      // 3. Append AI response
      const aiMessageObj: ChatMessage = { role: 'ai', content: response.ai_response };
      setMessages((prev) => [...prev, aiMessageObj]);
    } catch (err: any) {
      const apiErr = err.response?.data?.detail || 'Failed to get response from AI. Please try again.';
      setErrorMsg(apiErr);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Helper to extract user initials for chat bubble avatar
  const getInitials = () => {
    if (!user) return 'U';
    return user.full_name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: CHAT HISTORY SIDEBAR */}
      <Sidebar
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onSessionCreated={(id) => handleSelectSession(id)}
      />

      {/* RIGHT COLUMN: AI CONVERSATION VIEWPORT */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {activeSessionId ? (
          /* ACTIVE CHAT WORKSPACE */
          <>
            {/* Header / Active session title */}
            <div className="border-b border-slate-200/80 bg-white px-6 py-4.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100 flex-shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate leading-snug">{sessionTitle}</h3>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                    Active AI Consultation
                  </span>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="mx-6 mt-4 flex items-start space-x-2.5 p-3 rounded-xl border border-red-100 bg-red-50 text-red-800 text-xs font-semibold animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Message History Viewport */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-emerald-500" />
                  <span className="text-xs font-bold">Loading message logs...</span>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto">
                      <div className="p-4 bg-emerald-50 text-emerald-500 rounded-3xl border border-emerald-100 shadow-inner">
                        <Bot size={40} className="animate-bounce" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-slate-800 text-base">New Consultation Thread</h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Ask about hospital departments, doctor specialties, consultation hours, fees, or general health policies.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Render Chat Bubbles */}
                  {messages.map((msg, index) => {
                    const isHuman = msg.role === 'human';
                    return (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 max-w-[85%] ${
                          isHuman ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
                        }`}
                      >
                        {/* Bubble Avatar */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 shadow-sm ${
                          isHuman
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                          {isHuman ? getInitials() : <Bot size={14} />}
                        </div>

                        {/* Bubble Text Body */}
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          isHuman
                            ? 'bg-emerald-500 text-white rounded-tr-none'
                            : 'bg-white text-slate-700 border border-slate-200/60 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Typing Loading Bubble */}
                  {isAiResponding && (
                    <div className="flex items-start space-x-3 mr-auto max-w-[85%]">
                      <div className="h-8 w-8 rounded-full bg-white text-slate-600 border border-slate-200 flex items-center justify-center shadow-sm">
                        <Bot size={14} />
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-none px-5 py-3.5 shadow-sm">
                        <div className="flex space-x-1.5 items-center h-4">
                          <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Anchor scroll point */}
                  <div ref={scrollRef} />
                </>
              )}
            </div>

            {/* Input Bar Footer */}
            <div className="bg-white border-t border-slate-200/80 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Ask a question about the hospital services..."
                  disabled={isLoadingHistory || isAiResponding}
                  className="flex-1 bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 px-4 py-3 rounded-xl shadow-inner transition-all disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={!inputMsg.trim() || isAiResponding || isLoadingHistory}
                  className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white p-3 rounded-xl shadow-md shadow-emerald-100 transition-colors disabled:opacity-50"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* EMPTY STATE WELCOME SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-4">
            <div className="p-5 bg-slate-100 text-slate-400 rounded-full border border-slate-200/50">
              <Bot size={44} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-800 text-lg">AI Assistant Consultation</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Select a previous conversation from the history sidebar or click **"New Chat"** at the top left to begin a new consultation.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
export default ChatbotPage;
