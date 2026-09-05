import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { BrainCircuit, Search, Loader2, Sparkles, AlertCircle, Quote, RotateCcw } from 'lucide-react';
import { api } from '../../../lib/api';
import { sanitizeHtml } from '../../../lib/sanitize';
import { cn } from '../../../lib/utils';

interface SourceItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  meta?: any;
}

interface AskResponse {
  answer: string;
  sources: SourceItem[];
  isPartial: boolean;
}

const SUGGESTIONS = [
  'What projects have I been focused on recently?',
  'Summarize my active goals & reflections',
];

export const AskMemoryCard: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setQuestion(queryText);

    try {
      const res = await api.post('/api/v1/ask', { question: queryText });
      setResponse(res.data);
    } catch (err: any) {
      console.error('Ask request failed:', err);
      setError(
        err.response?.data?.message ||
          'Unable to synthesize memory response at this time. Please ensure you have recorded memories in your vault.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(question);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'recent';
    }
  };

  const handleReset = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col min-h-0 rounded-[22px] border border-border/70 bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-border">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-[15px] font-semibold text-foreground font-display leading-none">
              Ask My Memory
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
              Semantic RAG over your private vault
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {response && (
            <button
              onClick={handleReset}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-muted/50"
              title="Clear inquiry"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-500/20">
            RAG Recall
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-between pt-3 gap-3 min-h-0 overflow-hidden">
        {/* Search input form */}
        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
          <Input
            placeholder="Ask anything about your reflections, decisions, or goals..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-background/50 border-input rounded-xl h-9 sm:h-10 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !question.trim()}
            className="px-3.5 sm:px-4 rounded-xl h-9 sm:h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {/* Suggestion pills if no response yet */}
        {!response && !isLoading && !error && (
          <div className="flex-1 flex flex-col justify-center gap-2 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested queries</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAsk(suggestion)}
                  className="text-xs bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl border border-border/60 transition-all text-left truncate flex items-center justify-between group"
                >
                  <span className="truncate">{suggestion}</span>
                  <Sparkles className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-2 py-4 animate-pulse">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <BrainCircuit className="h-5 w-5 animate-spin" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Synthesizing vault records...</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Answer & Source Evidence (Scrolls internally if needed) */}
        {response && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none min-h-0 animate-fade-in">
            <div className="p-3 rounded-xl border border-border/70 bg-muted/30 text-xs sm:text-[13px] leading-relaxed">
              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <Sparkles className="h-3 w-3" />
                <span>Synthesized Recall</span>
              </div>
              <div
                className="text-foreground leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(response.answer) }}
              />
            </div>

            {/* Evidence items */}
            {response.sources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Quote className="h-2.5 w-2.5" /> Cited Sources ({response.sources.length})
                </p>
                <div className="space-y-1.5">
                  {response.sources.map((source) => (
                    <div
                      key={source.id}
                      className="text-[11px] p-2 rounded-lg border border-border/60 bg-card hover:border-border transition-colors"
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-semibold text-blue-500 uppercase text-[9px] tracking-wider">
                          {source.type.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{formatDate(source.createdAt)}</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-1">{source.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
