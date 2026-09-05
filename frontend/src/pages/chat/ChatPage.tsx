import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/Button';
import {
  Send,
  User as UserIcon,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  History,
  Plus,
  Search,
  MessageSquare,
  X,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { sanitizeHtml, formatMarkdownText } from '../../lib/sanitize';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface ConversationItem {
  id: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
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

  // Conversation History state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const [isLoadingConversationMessages, setIsLoadingConversationMessages] = useState(false);

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
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    isUserScrolledUpRef.current = !isNearBottom;
  };

  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch past conversations list
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingConversations(true);
    try {
      const res = await api.get('/api/v1/chat/conversations');
      if (Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.warn('Failed to load conversation history', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load a specific conversation's history
  const handleSelectConversation = async (conv: ConversationItem) => {
    if (conv.id === conversationId) return;
    setIsLoadingConversationMessages(true);
    setConversationId(conv.id);

    try {
      const res = await api.get(`/api/v1/chat/conversations/${conv.id}/messages`);
      if (res.data.messages && Array.isArray(res.data.messages)) {
        const loadedMessages: Message[] = res.data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp || Date.now()),
        }));

        setMessages(loadedMessages.length > 0 ? loadedMessages : INITIAL_MESSAGES);
      }
      isUserScrolledUpRef.current = false;
      setTimeout(() => scrollToBottom('auto'), 50);
    } catch (err) {
      console.error('Failed to retrieve conversation messages', err);
    } finally {
      setIsLoadingConversationMessages(false);
      // Close sidebar on mobile screens
      if (window.innerWidth < 1024) {
        setIsHistoryOpen(false);
      }
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation from your vault history?')) return;

    try {
      await api.delete(`/api/v1/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        setConversationId(null);
        setMessages(INITIAL_MESSAGES);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  // Start new conversation
  const handleNewChat = () => {
    setConversationId(null);
    setMessages(INITIAL_MESSAGES);
    setInput('');
    isUserScrolledUpRef.current = false;
    inputRef.current?.focus();
    if (window.innerWidth < 1024) {
      setIsHistoryOpen(false);
    }
  };

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

    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(), 50);

    try {
      const response = await api.post('/api/v1/chat/message', {
        message: userContent,
        conversationId: conversationId || undefined,
      });

      const isNewConversation = !conversationId && response.data.conversationId;
      if (isNewConversation) {
        setConversationId(response.data.conversationId);
        // Refresh conversations list to show the new thread in history
        fetchConversations();
      }

      const botMessage: Message = {
        id: response.data.messageId || `model_${Date.now()}`,
        role: 'model',
        content: response.data.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      if (error?.response?.status === 404 && conversationId) {
        setConversationId(null);
      }
      const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Unknown error';
      console.error('Chat API error:', errMsg, error);
      const fallbackMsg: Message = {
        id: `model_${Date.now()}`,
        role: 'model',
        content: `⚠️ Unable to reach the AI service right now. Error: ${errMsg}\n\nPlease try again in a moment.`,
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
      setPipelineSuccess(true);
    } finally {
      setIsProcessingPipeline(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.topic || '').toLowerCase().includes(searchHistory.toLowerCase())
  );

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] flex items-center justify-center shrink-0">
            <img src="/logo-128.webp" width={34} height={34} alt="MindVault AI" className="w-full h-full object-contain" />
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
          {/* History Sidebar Toggle Button */}
          <Button
            variant={isHistoryOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="h-10 px-3.5 rounded-full text-xs sm:text-sm font-medium gap-1.5 border-border/80 shadow-xs"
            title="Toggle chat history drawer"
          >
            <History className="h-4 w-4" />
            <span>History</span>
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-foreground/10 text-foreground">
                {conversations.length}
              </span>
            )}
          </Button>

          {/* New Chat Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="h-10 px-3.5 rounded-full text-xs sm:text-sm font-medium gap-1.5 border-border/80 shadow-xs hover:bg-foreground/5"
            title="Start new chat session"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </Button>

          {/* Synthesize Pipeline Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunPipeline}
            disabled={isProcessingPipeline || messages.length <= 1}
            className={cn(
              'h-10 px-4 rounded-full text-xs sm:text-sm font-medium gap-1.5 transition-all duration-200',
              'border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 hover:border-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 shadow-sm'
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
        </div>
      </div>

      {/* Main Workspace Split (Chat History Sidebar + Active Chat) */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden relative">
        {/* Chat History Sidebar Drawer */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col bg-card/90 dark:bg-foreground/[0.025] backdrop-blur-xl border border-foreground/[0.08] rounded-[24px] sm:rounded-[28px] shadow-md overflow-hidden z-20 shrink-0"
            >
              <div className="p-3.5 border-b border-foreground/[0.07] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold font-display text-foreground">Past Reflections</h3>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                  aria-label="Close history"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* History Search */}
              <div className="p-2.5 border-b border-foreground/[0.05]">
                <div className="flex items-center gap-2 bg-foreground/[0.03] border border-foreground/10 rounded-xl px-2.5 py-1.5 text-xs text-foreground">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    placeholder="Search past conversations..."
                    className="w-full bg-transparent border-0 outline-none placeholder:text-muted-foreground/60 text-xs"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {isLoadingConversations ? (
                  <div className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Loading vault history...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs space-y-2">
                    <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isActive = conv.id === conversationId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={cn(
                          'group relative p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs',
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold border border-primary/25 shadow-xs'
                            : 'hover:bg-foreground/5 text-foreground/85 border border-transparent'
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium text-[13px] leading-tight text-foreground">
                            {conv.topic || 'Untitled Conversation'}
                          </p>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">
                            {formatTimeAgo(conv.updatedAt || conv.createdAt)}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          title="Delete thread"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Workspace Panel */}
        <div className="flex-1 min-h-0 flex flex-col bg-background/70 dark:bg-foreground/[0.02] backdrop-blur-xl border border-foreground/[0.08] rounded-[24px] sm:rounded-[28px] shadow-sm overflow-hidden relative">
          {/* Conversation Loading Overlay */}
          {isLoadingConversationMessages && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Restoring conversation context...</span>
            </div>
          )}

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
                    <img src="/logo-128.webp" width={24} height={24} alt="AI" className="w-6 h-6 object-contain" />
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
                    dangerouslySetInnerHTML={{ __html: formatMarkdownText(msg.content) }}
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
                  <img src="/logo-128.webp" width={24} height={24} alt="AI" className="w-6 h-6 object-contain" />
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
              <span className="font-medium tracking-wide text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                Gemini 3.5 Flash-Lite Engine
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
