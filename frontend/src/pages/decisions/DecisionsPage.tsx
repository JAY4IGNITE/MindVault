import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GitMerge, Plus, Calendar, Clock, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface DecisionItem {
  id: string;
  decision: string;
  reasoning: string;
  status: 'active' | 'reviewed' | 'completed' | 'changed';
  date: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  reviewDate?: string;
}



const statusStyles: Record<string, string> = {
  active: 'bg-sky-50 text-accent border border-sky-200',
  reviewed: 'bg-purple-50 text-purple-700 border border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  changed: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const DecisionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newDecision, setNewDecision] = useState('');
  const [newReasoning, setNewReasoning] = useState('');
  const [newExpectedOutcome, setNewExpectedOutcome] = useState('');

  const fetchDecisions = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await api.get('/api/v1/decisions');
      setDecisions(res.data);
    } catch (err) {
      console.error('Failed to fetch decisions', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDecisions();
  }, [currentUser]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecision.trim()) return;

    try {
      await api.post('/api/v1/decisions', {
        decision: newDecision.trim(),
        reasoning: newReasoning.trim(),
        expectedOutcome: newExpectedOutcome.trim() || undefined,
        date: new Date().toISOString(),
        reviewDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      setIsCreating(false);
      setNewDecision('');
      setNewReasoning('');
      setNewExpectedOutcome('');
      fetchDecisions();
    } catch (err) {
      console.error('Failed to create decision', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-primary-dark flex items-center gap-2">
            <GitMerge className="h-7 w-7 text-accent" /> Decision Tracker & Retrospectives
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            Log strategic decisions, articulate explicit reasoning, and conduct AI retrospectives.
          </p>
        </div>

        <Button variant="default" size="sm" className="gap-2 shadow-sm" onClick={() => setIsCreating(!isCreating)}>
          <Plus className="h-4 w-4" /> Log New Decision
        </Button>
      </div>

      {/* Creation Modal / Form */}
      {isCreating && (
        <Card className="border-accent/40 bg-sky-50/20 shadow-premium animate-slide-up">
          <CardHeader className="pb-4">
            <CardTitle>Record Strategic Decision</CardTitle>
            <CardDescription>
              Document your mental model at the moment of commitment before outcome bias sets in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Decision Statement"
                placeholder="What did you decide? (e.g., Adopt Postgres over MongoDB for billing)"
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                  Underlying Reasoning & Assumptions
                </label>
                <textarea
                  rows={4}
                  placeholder="Why this choice? What tradeoffs and risks are accepted?"
                  value={newReasoning}
                  onChange={(e) => setNewReasoning(e.target.value)}
                  className="w-full rounded-lg border border-border p-3 text-sm text-primary placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  required
                />
              </div>

              <Input
                label="Expected Outcome"
                placeholder="What observable result will determine success?"
                value={newExpectedOutcome}
                onChange={(e) => setNewExpectedOutcome(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Commit Decision Record
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Decision Cards List */}
      <div className="grid gap-4">
        {decisions.map((dec) => (
          <Link key={dec.id} to={`/decisions/${dec.id}`} className="block group">
            <Card className="hover:border-accent/40 hover:shadow-premium transition-all duration-200">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        statusStyles[dec.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {dec.status}
                    </span>
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Logged on {dec.date}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-accent transition-colors pt-1">
                    {dec.decision}
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-slate-400 group-hover:text-accent">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{dec.reasoning}</p>

                {dec.actualOutcome && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-semibold text-primary">Outcome:</strong> {dec.actualOutcome}
                    </span>
                  </div>
                )}

                {dec.reviewDate && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted pt-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>Target Retrospective: {dec.reviewDate}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DecisionsPage;
