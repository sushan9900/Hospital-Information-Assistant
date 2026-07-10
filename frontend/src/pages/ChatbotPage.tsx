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
import { Send, Bot, Loader2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const ChatbotPage: React.FC = () => {
  const { user } = useAuth();
  
  // Session tracking states
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionTitle, setSessionTitle] = useState('AI Consultant');

  // UI Flow states
  const [inputMsg, setInputMsg] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Suggested reply chips for clinical prompt assistance
  const suggestionChips = [
    "What are the cardiology department hours?",
    "How do I schedule an appointment?",
    "List doctors specializing in Pediatrics",
    "What documents do I need to bring?"
  ];

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
      setSessionTitle(history.title || 'AI Consultant');
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
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !activeSessionId || isAiResponding) return;

    const userPrompt = textToSend.trim();
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

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const msg = inputMsg;
    setInputMsg('');
    handleSendMessage(msg);
  };

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
    <div className="flex h-[calc(100vh-8.5rem)] rounded-xl border border-clinic-sage-200/40 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-premium animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: CHAT HISTORY SIDEBAR */}
      <Sidebar
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onSessionCreated={(id) => handleSelectSession(id)}
      />

      {/* RIGHT COLUMN: AI CONVERSATION VIEWPORT */}
      <div className="flex-1 flex flex-col bg-clinic-bg/40 dark:bg-slate-950/40">
        {activeSessionId ? (
          /* ACTIVE CHAT WORKSPACE */
          <>
            {/* Header / Active session title */}
            <div className="border-b border-clinic-sage-200/40 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clinic-sage-50 dark:bg-slate-900 text-clinic-forest-500 border border-clinic-sage-200/35 dark:border-slate-800 flex-shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-sm font-semibold text-clinic-text dark:text-slate-100 truncate leading-snug">{sessionTitle}</h3>
                  <span className="text-[9px] text-clinic-sage-500 dark:text-slate-500 font-sans font-bold uppercase tracking-wider block mt-0.5">
                    Secure AI Medical Companion
                  </span>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="mx-6 mt-4 flex items-start space-x-2.5 p-3 rounded-xl border border-clinic-terracotta-100 dark:border-clinic-terracotta-500/20 bg-clinic-terracotta-50/50 dark:bg-clinic-terracotta-500/10 text-clinic-terracotta-600 dark:text-clinic-terracotta-400 text-xs font-semibold animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="text-clinic-terracotta-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Message History Viewport */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-clinic-sage-500">
                  <Loader2 size={20} className="animate-spin text-clinic-forest-500" />
                  <span className="text-[9px] font-sans font-bold uppercase tracking-widest">Retrieving Consultation...</span>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto">
                      <div className="p-4 bg-clinic-sage-50 dark:bg-slate-850 text-clinic-forest-500 rounded-2xl border border-clinic-sage-200/40 dark:border-slate-800 shadow-inner">
                        <Bot size={32} className="animate-bounce" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-serif text-base text-clinic-text dark:text-slate-200 font-semibold">Consult Your Assistant</h4>
                        <p className="text-[11px] text-clinic-text/60 dark:text-slate-550 leading-relaxed font-semibold">
                          Ask about department shifts, certified specialists, doctor consulting fees, or clinical health guidelines.
                        </p>
                      </div>

                      {/* Suggestions list for empty state */}
                      <div className="flex flex-col space-y-2 w-full pt-4 border-t border-clinic-sage-200/30 dark:border-slate-800/80">
                        <p className="text-[9px] font-sans font-bold uppercase text-clinic-sage-500 tracking-wider text-left pl-1">Suggested Inquiries</p>
                        {suggestionChips.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(chip)}
                            className="w-full text-left p-3.5 bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-800/60 rounded-xl text-xs font-bold text-clinic-text/90 dark:text-slate-350 hover:border-clinic-forest-500 dark:hover:border-clinic-forest-500 hover:bg-clinic-sage-50/20 hover:text-clinic-forest-500 transition-all flex items-center justify-between group"
                          >
                            <span>{chip}</span>
                            <ArrowRight size={12} className="text-clinic-sage-500 group-hover:text-clinic-forest-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Chat Bubbles */}
                  {messages.map((msg, index) => {
                    const isHuman = msg.role === 'human';
                    return (
                      <div
                        key={index}
                        className={`flex items-start space-x-3.5 max-w-[85%] ${
                          isHuman ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
                        }`}
                      >
                        {/* Bubble Avatar */}
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[9px] font-sans font-bold border flex-shrink-0 shadow-sm ${
                          isHuman
                            ? 'bg-clinic-forest-500 text-white border-transparent'
                            : 'bg-white dark:bg-slate-900 text-clinic-forest-500 border-clinic-sage-200/40 dark:border-slate-800'
                        }`}>
                          {isHuman ? getInitials() : <Bot size={13} />}
                        </div>

                        {/* Bubble Text Body */}
                        <div className="flex flex-col space-y-1">
                          <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            isHuman
                              ? 'bg-clinic-forest-500 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-900 text-clinic-text dark:text-slate-200 border border-clinic-sage-200/40 dark:border-slate-850 rounded-tl-none font-medium'
                          }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                          <span className={`text-[9px] text-clinic-text/40 dark:text-slate-500 ${isHuman ? 'text-right pr-1' : 'pl-1'}`}>
                            Just now
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Typing Loading Bubble */}
                  {isAiResponding && (
                    <div className="flex items-start space-x-3.5 mr-auto max-w-[85%]">
                      <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 text-clinic-forest-500 border border-clinic-sage-200/40 dark:border-slate-800 flex items-center justify-center shadow-sm">
                        <Bot size={13} />
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-clinic-sage-200/40 dark:border-slate-850 rounded-xl rounded-tl-none px-5 py-3.5 shadow-sm">
                        <div className="flex space-x-1.5 items-center h-4">
                          <div className="h-1.5 w-1.5 bg-clinic-sage-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-1.5 w-1.5 bg-clinic-sage-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-1.5 w-1.5 bg-clinic-sage-500 rounded-full animate-bounce" />
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
            <div className="bg-white dark:bg-slate-900 border-t border-clinic-sage-200/40 dark:border-slate-800 p-4">
              <form onSubmit={onFormSubmit} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Ask a question about doctors, departments, or scheduling..."
                  disabled={isLoadingHistory || isAiResponding}
                  className="flex-1 bg-clinic-bg/25 dark:bg-slate-950 border border-clinic-sage-200 dark:border-slate-800 text-sm text-clinic-text dark:text-slate-200 placeholder-clinic-sage-550/40 dark:placeholder-slate-650 outline-none hover:border-clinic-sage-500 dark:hover:border-clinic-sage-705 focus:border-clinic-forest-500 dark:focus:border-clinic-forest-500 focus:ring-1 focus:ring-clinic-forest-500/20 px-4 py-3 rounded-xl shadow-inner transition-all disabled:opacity-50 font-semibold"
                  required
                />
                <button
                  type="submit"
                  disabled={!inputMsg.trim() || isAiResponding || isLoadingHistory}
                  className="bg-clinic-forest-500 hover:bg-clinic-forest-600 active:bg-clinic-forest-700 text-white p-3 rounded-xl shadow-premium transition-colors disabled:opacity-50"
                  title="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* EMPTY STATE WELCOME SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-4">
            <div className="p-5 bg-white dark:bg-slate-900 text-clinic-sage-500 rounded-full border border-clinic-sage-200/40 dark:border-slate-800 shadow-sm">
              <Bot size={40} className="text-clinic-forest-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-base text-clinic-text dark:text-slate-250 font-semibold">Consultation Inbox</h3>
              <p className="text-xs text-clinic-text/50 dark:text-slate-500 leading-relaxed font-semibold">
                Select a previous conversation from the history sidebar or click **"New Consultation"** at the top left to begin.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
export default ChatbotPage;
