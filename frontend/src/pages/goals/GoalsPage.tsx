import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Target,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Trash2,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import {
  pageVariants,
  pageTransition,
  staggerContainer,
  staggerItem,
  transitions,
} from '../../lib/motion';

export interface GoalItem {
  id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | string;
  priority: 'low' | 'medium' | 'high' | string;
  targetDate?: string;
  sourceConversationId?: string;
  createdAt?: any;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All Goals' },
  { value: 'in_progress', label: 'In Progress', icon: Clock },
  { value: 'not_started', label: 'Not Started', icon: AlertCircle },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const GoalsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'completed'>('in_progress');
  const [targetDate, setTargetDate] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, `users/${currentUser.uid}/goals`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: GoalItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            title: data.title,
            description: data.description || '',
            status: data.status || 'not_started',
            priority: data.priority || 'medium',
            targetDate: data.targetDate || '',
            sourceConversationId: data.sourceConversationId,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          });
        });
        setGoals(loaded);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to goals:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Goal title is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        title: trimmedTitle,
        status,
        priority,
        createdAt: serverTimestamp(),
      };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (targetDate) {
        payload.targetDate = targetDate;
      }
      await addDoc(collection(db, `users/${currentUser.uid}/goals`), payload);

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('in_progress');
      setTargetDate('');
      setIsCreating(false);
    } catch (err: any) {
      console.error('Failed to create goal:', err);
      setFormError(err.message || 'Failed to save goal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async (goal: GoalItem) => {
    if (!currentUser) return;
    setUpdatingId(goal.id);
    const newStatus = goal.status === 'completed' ? 'in_progress' : 'completed';
    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/goals`, goal.id), {
        status: newStatus,
      });
    } catch (err) {
      console.error('Failed to update goal status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!currentUser) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/goals`, id));
    } catch (err) {
      console.error('Failed to delete goal:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredGoals = goals.filter((g) => {
    const titleMatches = g.title.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatches = (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = !searchQuery.trim() || titleMatches || descMatches;
    const matchesStatus = selectedStatus === 'all' || g.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const inProgressGoals = goals.filter((g) => g.status === 'in_progress').length;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'high':
        return 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20';
      case 'low':
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20';
      case 'medium':
      default:
        return 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="space-y-7 pb-12 max-w-[1240px] mx-auto w-full"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-border/70">
        <div className="flex items-start gap-3.5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={transitions.fast}
            className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
          >
            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold font-display text-foreground tracking-tight leading-tight">
              Strategic Goals & Commitments
            </h1>
            <p className="text-xs sm:text-[13.5px] text-muted-foreground mt-1 leading-normal">
              Track objectives, milestones, and high-priority commitments extracted from your thought stream.
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="rounded-full h-10 sm:h-11 px-5 shadow-sm text-xs sm:text-sm font-medium gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200"
          >
            {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isCreating ? 'Close Form' : 'Create Goal'}
          </Button>
        </motion.div>
      </div>

      {/* Metrics Row with Staggered Motion */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Objectives</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">{inProgressGoals}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/15">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">{completedGoals}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/15">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress Velocity</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">{completionRate}%</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/15">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Tracked</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">{totalGoals}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/15">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Goal Creator Modal / Form with AnimatePresence */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={transitions.normal}
          >
            <div className="rounded-[22px] border border-emerald-500/30 bg-card/80 backdrop-blur-xl p-6 sm:p-7 shadow-lg shadow-emerald-500/5">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground font-display">
                      Define Strategic Goal
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Set explicit intent, milestones, and priority levels for your second brain.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreating(false)}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4 pt-4">
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 rounded-xl"
                  >
                    {formError}
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Goal Title <span className="text-emerald-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g., Publish open-source AI knowledge assistant"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 bg-background/50 border-input text-foreground rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Description & Key Milestones
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe desired outcomes, success criteria, or key steps..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-input bg-background/50 text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Initial Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-input bg-background/50 text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="not_started">Not Started</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Target Date</label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="h-10 bg-background/50 border-input text-foreground rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                    className="text-xs text-muted-foreground rounded-full px-4"
                  >
                    Cancel
                  </Button>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-full px-5 h-9 shadow-sm"
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Save Goal
                    </Button>
                  </motion.div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((tab) => {
            const isSelected = selectedStatus === tab.value;
            return (
              <motion.button
                key={tab.value}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                onClick={() => setSelectedStatus(tab.value)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap border shadow-sm',
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                    : 'bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals or milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border/70 text-foreground rounded-2xl text-xs shadow-sm focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Goals List with PopLayout animations */}
      {isLoading ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-muted-foreground font-medium">Tracking strategic trajectory...</span>
        </div>
      ) : filteredGoals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={transitions.normal}
          className="rounded-[22px] border border-dashed border-border/80 bg-card/40 p-12 text-center"
        >
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3.5 border border-emerald-500/20">
            <Target className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground font-display">No goals found</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
            {searchQuery || selectedStatus !== 'all'
              ? 'Try changing the status tab or search filter.'
              : 'Define clear milestones to align your reflections and daily execution.'}
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs rounded-full px-4 h-9 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Define First Goal
          </Button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredGoals.map((goal) => {
              const isCompleted = goal.status === 'completed';
              const isUpdating = updatingId === goal.id;
              const isDeleting = deletingId === goal.id;

              return (
                <motion.div
                  layout
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  whileHover={{ y: -2, scale: 1.008 }}
                  transition={transitions.normal}
                  className={cn(
                    'rounded-[20px] border border-border/70 bg-card p-5 shadow-sm hover:shadow-md hover:border-border transition-all flex flex-col justify-between group',
                    isCompleted && 'opacity-80 bg-muted/20'
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider',
                            getPriorityBadge(goal.priority)
                          )}
                        >
                          {goal.priority} priority
                        </span>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                              : goal.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
                          )}
                        >
                          {isCompleted ? 'Completed' : goal.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <motion.div whileTap={{ scale: 0.88 }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isUpdating}
                            onClick={() => handleToggleComplete(goal)}
                            className={cn(
                              'h-7 w-7 rounded-lg transition-colors',
                              isCompleted
                                ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
                                : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
                            )}
                            title={isCompleted ? 'Mark as active' : 'Mark as completed'}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>

                        <motion.div whileTap={{ scale: 0.88 }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isDeleting}
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            title="Delete goal"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    <div>
                      <h3
                        className={cn(
                          'text-[15px] font-semibold text-foreground font-display leading-snug',
                          isCompleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {goal.targetDate ? `Target: ${goal.targetDate}` : (goal.createdAt ? goal.createdAt.toLocaleDateString() : 'Active Goal')}
                    </span>
                    {goal.sourceConversationId && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium border border-emerald-500/15">
                        AI Extracted
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GoalsPage;
