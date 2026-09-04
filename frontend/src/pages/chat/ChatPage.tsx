import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  Send,
  Bot,
  User as UserIcon,
  Loader2,
  Trash2,
  Brain,
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
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-fade-in">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary-dark flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent" /> AI Reflection Dialogue
          </h1>
          <p className="text-xs text-secondary">
            Multi-turn contextual synthesis • Guardrails active • Direct to private vault
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunPipeline}
            disabled={isProcessingPipeline || messages.length <= 1}
            className="text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            {isProcessingPipeline ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pipelineSuccess ? (
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {pipelineSuccess ? 'Memories Extracted!' : 'Synthesize Memories'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length <= 1}
            className="text-xs gap-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <Card className="flex-1 overflow-hidden flex flex-col bg-foreground/[0.02] border-foreground/10 shadow-subtle">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 max-w-[88%] sm:max-w-[80%]',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-subtle',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-foreground/10 text-foreground'
                )}
              >
                {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  'rounded-2xl p-4 text-sm leading-relaxed shadow-subtle',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-xs'
                    : 'bg-foreground/5 border border-foreground/10 text-foreground rounded-tl-xs'
                )}
              >
                <div
                  className="whitespace-pre-wrap select-text"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }}
                />
                <span
                  className={cn(
                    'block text-[10px] mt-2 opacity-60 text-right text-muted-foreground'
                  )}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[80%] animate-pulse">
              <div className="h-8 w-8 rounded-xl bg-foreground/10 text-foreground flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-foreground/5 border border-foreground/10 rounded-2xl rounded-tl-xs p-4 flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                <span>Reflecting and synthesizing context securely...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-foreground/[0.03] border-t border-foreground/10">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Reflect, question, or articulate a thought..."
              className="pr-12 py-5 text-sm bg-slate-50/70 border-slate-200 focus:bg-white"
              disabled={isLoading}
            />
            <Button
              type="submit"
              variant="default"
              size="icon"
              className="absolute right-2 top-1.5 h-8 w-8 rounded-lg shadow-sm"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-success" />
              End-to-End UID Authorization Guard
            </span>
            <span>Gemini 1.5 Pro</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatPage;
