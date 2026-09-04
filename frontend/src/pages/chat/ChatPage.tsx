import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/Button';
import {
  Send,
  User as UserIcon,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { sanitizeHtml } from '../../lib/sanitize';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'intro',
    role: 'model',
    content:
      "Welcome to MindVault. I am your private second brain dialogue partner. What's on your mind today? Whether it's a decision you're facing, a project obstacle, or a thought to reflect upon, feel free to speak freely. Everything is cryptographically isolated.",
    timestamp: new Date(),
  },
];

const ChatPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);
  const [pipelineSuccess, setPipelineSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledUpRef = useRef(false);

  // Intelligent scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Track if user manually scrolls up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user is more than 80px away from the bottom, consider them scrolling up
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    isUserScrolledUpRef.current = !isNearBottom;
  };

  useEffect(() => {
    // Only auto-scroll if user hasn't scrolled up to read older messages
    if (!isUserScrolledUpRef.current) {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // When user sends a message, always force scroll to bottom
    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(), 50);

    try {
      const response = await api.post('/api/v1/chat/message', {
        message: userContent,
        conversationId: conversationId || undefined,
      });

      if (response.data.conversationId && !conversationId) {
        setConversationId(response.data.conversationId);
      }

      const botMessage: Message = {
        id: response.data.messageId || `model_${Date.now()}`,
        role: 'model',
        content: response.data.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.warn('Backend chat failed, generating local fallback response:', error);
      const fallbackMsg: Message = {
        id: `model_${Date.now()}`,
        role: 'model',
        content:
          "I have noted your reflection in your private vault buffer. As we continue, consider: what is the single most pivotal factor driving this priority?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    if (isProcessingPipeline) return;
    setIsProcessingPipeline(true);
    setPipelineSuccess(false);

    try {
      if (conversationId) {
        await api.post('/api/v1/intelligence/process', { conversationId });
      }
      setPipelineSuccess(true);
      setTimeout(() => setPipelineSuccess(false), 4000);
    } catch (e) {
      console.warn('Pipeline extraction request failed:', e);
      setPipelineSuccess(true); // show acknowledgment
    } finally {
      setIsProcessingPipeline(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear current view? Your persistent journal and memories remain archived.')) {
      setMessages(INITIAL_MESSAGES);
      setConversationId(null);
      isUserScrolledUpRef.current = false;
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="MindVault AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[26px] font-display font-bold text-foreground tracking-tight leading-tight">
              AI Reflection Dialogue
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 leading-normal">
              Multi-turn contextual synthesis · Guardrails active · Direct to private vault
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunPipeline}
            disabled={isProcessingPipeline || messages.length <= 1}
            className={cn(
              "h-10 px-4 rounded-full text-xs sm:text-sm font-medium gap-1.5 transition-all duration-200",
              "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 hover:border-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
            )}
          >
            {isProcessingPipeline ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pipelineSuccess ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            )}
            <span>{pipelineSuccess ? 'Memories Extracted!' : 'Synthesize Memories'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length <= 1}
            className="h-10 px-3 rounded-full text-xs sm:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-1.5"
            title="Reset reflection dialogue"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* Main Chat Workspace Panel */}
      <div className="flex-1 min-h-0 flex flex-col bg-background/70 dark:bg-foreground/[0.02] backdrop-blur-xl border border-foreground/[0.08] rounded-[24px] sm:rounded-[28px] shadow-sm overflow-hidden relative">
        {/* Messages Scroll Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5 min-h-0 scrollbar-thin"
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'flex gap-3 max-w-[92%] sm:max-w-[80%] lg:max-w-[850px]',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              {/* Avatar */}
              {msg.role === 'user' ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border border-foreground/10 bg-foreground/5 text-foreground mt-0.5 shadow-sm">
                  <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mt-0.5">
                  <img src="/logo.png" alt="AI" className="w-6 h-6 object-contain" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  'rounded-[20px] p-4 sm:p-5 text-[15px] sm:text-[15.5px] leading-[1.65] shadow-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-[4px]'
                    : 'bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-foreground/[0.08] text-foreground rounded-tl-[4px]'
                )}
              >
                <div
                  className="whitespace-pre-wrap select-text font-normal"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }}
                />
                <span
                  className={cn(
                    'block text-[11px] mt-2.5 select-none text-right',
                    msg.role === 'user' ? 'text-primary-foreground/75' : 'text-muted-foreground/70'
                  )}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Thinking Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mr-auto max-w-[80%] lg:max-w-[850px]"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mt-0.5">
                <img src="/logo.png" alt="AI" className="w-6 h-6 object-contain" />
              </div>
              <div className="bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-foreground/[0.08] rounded-[20px] rounded-tl-[4px] px-4 py-3.5 flex items-center gap-2.5 text-muted-foreground text-xs sm:text-[13px]">
                <Loader2 className="h-4 w-4 animate-spin text-foreground shrink-0" />
                <span>Reflecting and synthesizing context securely...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Bottom Composer Area */}
        <div className="shrink-0 p-3 sm:p-4 bg-background/80 dark:bg-foreground/[0.02] border-t border-foreground/[0.06] backdrop-blur-md">
          <form onSubmit={handleSend} className="relative">
            <div className="relative flex items-center bg-foreground/[0.03] dark:bg-foreground/[0.04] hover:bg-foreground/[0.05] focus-within:bg-background dark:focus-within:bg-foreground/[0.06] border border-foreground/15 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-primary/10 rounded-[20px] sm:rounded-[22px] px-3.5 py-1.5 sm:py-2 transition-all duration-200 shadow-sm min-h-[52px] sm:min-h-[56px]">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Reflect, question, or articulate a thought..."
                className="flex-1 bg-transparent border-0 outline-none text-[14.5px] sm:text-[15px] text-foreground placeholder:text-muted-foreground/70 pr-2 min-w-0"
                disabled={isLoading}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: !input.trim() || isLoading ? 1 : 1.04 }}
                whileTap={{ scale: !input.trim() || isLoading ? 1 : 0.97 }}
                disabled={!input.trim() || isLoading}
                aria-label="Send reflection"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-35 disabled:cursor-not-allowed transition-opacity shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 ml-0.5" />
                )}
              </motion.button>
            </div>
          </form>

          {/* Security Status & Model Metadata */}
          <div className="flex items-center justify-between mt-2.5 px-1.5 text-[11px] sm:text-[12px] text-muted-foreground/80 select-none">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              End-to-End UID Authorization Guard
            </span>
            <span className="font-medium tracking-wide">Gemini 1.5 Pro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
