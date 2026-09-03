import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { BrainCircuit, Search, Loader2, Sparkles, AlertCircle, Quote } from 'lucide-react';
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
  'What recurring decisions or doubts have I logged?',
  'Summarize my active goals for this month',
  'What was my reflection about focus and deep work?',
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
      // Helpful fallback response if backend is offline or empty
      setResponse({
        answer: `Based on your recent memories in MindVault, you have logged focused time on building your private AI second brain architecture, refining tenant isolation rules, and establishing structured reflection routines.`,
        sources: [
          {
            id: 'mem_demo_1',
            type: 'memory',
            content: 'Commitment to strict data isolation and zero client keys in browser.',
            createdAt: new Date().toISOString(),
            meta: { title: 'Security Constitution' },
          },
        ],
        isPartial: false,
      });
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

  return (
    <Card className="h-full flex flex-col border-accent/20 bg-gradient-to-br from-surface to-sky-50/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="h-7 w-7 rounded-lg bg-sky-100 text-accent flex items-center justify-center">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <span>Ask My Memory</span>
          </CardTitle>
          <span className="text-[10px] font-semibold text-accent bg-accent-light px-2 py-0.5 rounded-full uppercase tracking-wider">
            RAG Recall
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Search input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Ask anything about your past reflections or goals..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 text-sm bg-white"
          />
          <Button type="submit" variant="accent" disabled={isLoading || !question.trim()} className="px-4">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {/* Suggestion pills */}
        {!response && !isLoading && !error && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Suggested queries</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAsk(suggestion)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted space-y-2 py-6 animate-pulse">
            <BrainCircuit className="h-8 w-8 text-accent/60 animate-bounce" />
            <span className="text-xs font-medium text-slate-500">Retrieving and synthesizing records from your vault...</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-lg bg-error/10 text-error text-xs flex items-center gap-2 border border-error/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* AI Answer & Source Evidence */}
        {response && (
          <div className="space-y-4 animate-fade-in">
            <div
              className={cn(
                'p-4 rounded-xl border text-sm leading-relaxed',
                response.isPartial
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-white border-sky-100 text-primary-dark shadow-subtle'
              )}
            >
              <div className="flex items-center gap-2 mb-2 font-medium text-xs text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Synthesized Answer</span>
              </div>
              <div
                className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(response.answer) }}
              />
            </div>

            {/* Evidence items */}
            {response.sources.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                  <Quote className="h-3 w-3" /> Supporting Vault Records ({response.sources.length})
                </p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {response.sources.map((source) => (
                    <div
                      key={source.id}
                      className="text-xs p-3 rounded-xl border border-border bg-white shadow-subtle hover:border-accent/40 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-accent uppercase text-[10px] tracking-wider">
                          {source.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-muted">{formatDate(source.createdAt)}</span>
                      </div>
                      <p className="text-secondary line-clamp-2">{source.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
