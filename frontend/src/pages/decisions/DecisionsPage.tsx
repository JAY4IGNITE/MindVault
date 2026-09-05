import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'motion/react';
import { GitMerge, Plus, Calendar, Clock, ArrowRight, Trash2, AlertTriangle, X } from 'lucide-react';
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
  active: 'bg-sky-500/10 text-sky-500 border border-sky-500/30',
  reviewed: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  completed: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30',
  changed: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
};

const DecisionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newDecision, setNewDecision] = useState('');
  const [newReasoning, setNewReasoning] = useState('');
  const [newExpectedOutcome, setNewExpectedOutcome] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/v1/decisions/${id}`);
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete decision', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-foreground/10"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground flex items-center gap-2">
            <GitMerge className="h-7 w-7 text-foreground/60" /> Decision Tracker &amp; Retrospectives
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Log strategic decisions, articulate explicit reasoning, and conduct AI retrospectives.
          </p>
        </div>
        <Button variant="default" size="sm" className="gap-2 shadow-sm shrink-0" onClick={() => setIsCreating(!isCreating)}>
          <Plus className="h-4 w-4" /> Log New Decision
        </Button>
      </motion.div>

      {/* Creation Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-foreground/20 bg-foreground/[0.02] shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground">Record Strategic Decision</CardTitle>
                <CardDescription className="text-muted-foreground">
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Underlying Reasoning &amp; Assumptions
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Why this choice? What tradeoffs and risks are accepted?"
                      value={newReasoning}
                      onChange={(e) => setNewReasoning(e.target.value)}
                      className="w-full rounded-lg border border-foreground/15 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 transition"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Loading decisions…
        </div>
      ) : decisions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 text-muted-foreground"
        >
          <GitMerge className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No decisions logged yet.</p>
          <p className="text-xs mt-1">Start by clicking "Log New Decision" above.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {decisions.map((dec) => (
            <motion.div
              key={dec.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25 }}
              className="group relative"
            >
              <Link to={`/decisions/${dec.id}`} className="block">
                <Card className="hover:border-foreground/30 hover:shadow-lg transition-all duration-200">
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div className="space-y-1 pr-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            statusStyles[dec.status] || 'bg-foreground/10 text-foreground'
                          }`}
                        >
                          {dec.status}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(dec.date).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground/80 transition-colors pt-1 leading-snug">
                        {dec.decision}
                      </CardTitle>
                    </div>
                    <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {dec.reasoning && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{dec.reasoning}</p>
                    )}
                    {dec.reviewDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                        <Clock className="h-3 w-3" />
                        <span>Target Retrospective: {new Date(dec.reviewDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>

              {/* Delete button — sits outside the Link to avoid navigation */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteConfirmId(dec.id);
                }}
                className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive z-10"
                title="Delete decision"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-foreground/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-destructive/10 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Delete Decision?</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      This decision and all associated data will be permanently removed. This cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="shrink-0 p-1 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDelete(deleteConfirmId!)}
                    isLoading={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DecisionsPage;
