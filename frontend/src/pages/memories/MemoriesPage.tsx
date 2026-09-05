import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  BrainCircuit,
  Plus,
  Sparkles,
  Search,
  Trash2,
  Calendar,
  Tag,
  Star,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  X,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
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

export interface MemoryItem {
  id: string;
  title?: string;
  fact?: string;
  content?: string;
  type?: 'idea' | 'preference' | 'project_plan' | 'important_event' | 'recurring_concern' | 'fact' | string;
  importance?: number;
  sourceConversationId?: string;
  createdAt?: any;
}

const MEMORY_TYPES = [
  { value: 'all', label: 'All Memories', icon: BrainCircuit },
  { value: 'fact', label: 'Facts', icon: Bookmark, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'idea', label: 'Ideas', icon: Lightbulb, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'preference', label: 'Preferences', icon: Star, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { value: 'project_plan', label: 'Plans', icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'important_event', label: 'Events', icon: Calendar, color: 'text-pink-500 dark:text-pink-400 bg-pink-500/10 border-pink-500/20' },
  { value: 'recurring_concern', label: 'Concerns', icon: AlertCircle, color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
];

const MemoriesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minImportance, setMinImportance] = useState<number>(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('fact');
  const [importance, setImportance] = useState(5);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, `users/${currentUser.uid}/memories`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: MemoryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            title: data.title,
            fact: data.fact,
            content: data.content,
            type: data.type || 'fact',
            importance: typeof data.importance === 'number' ? data.importance : 5,
            sourceConversationId: data.sourceConversationId,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          });
        });
        setMemories(loaded);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to memories:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError('');

    const memoryContent = content.trim();
    if (!memoryContent || memoryContent.length < 5) {
      setFormError('Memory content must be at least 5 characters long.');
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, `users/${currentUser.uid}/memories`), {
        title: title.trim() || memoryContent.slice(0, 40) + '...',
        content: memoryContent,
        fact: memoryContent,
        type,
        importance: Number(importance),
        createdAt: serverTimestamp(),
      });

      // Reset form
      setTitle('');
      setContent('');
      setType('fact');
      setImportance(5);
      setIsCreating(false);
    } catch (err: any) {
      console.error('Failed to create memory:', err);
      setFormError(err.message || 'Failed to persist memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!currentUser) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/memories`, id));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMemories = memories.filter((mem) => {
    const memContent = (mem.content || mem.fact || '').toLowerCase();
    const memTitle = (mem.title || '').toLowerCase();
    const queryMatches =
      !searchQuery.trim() ||
      memContent.includes(searchQuery.toLowerCase()) ||
      memTitle.includes(searchQuery.toLowerCase());

    const typeMatches = selectedType === 'all' || mem.type === selectedType;
    const importanceMatches = (mem.importance || 0) >= minImportance;

    return queryMatches && typeMatches && importanceMatches;
  });

  const getTypeStyle = (itemType?: string) => {
    const matched = MEMORY_TYPES.find((t) => t.value === itemType);
    return matched ? matched.color : 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
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
            className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
          >
            <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold font-display text-foreground tracking-tight leading-tight">
              Memories & Atomic Facts
            </h1>
            <p className="text-xs sm:text-[13.5px] text-muted-foreground mt-1 leading-normal">
              Continuous synthesis of durable facts, beliefs, and preferences from your reflections.
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="rounded-full h-10 sm:h-11 px-5 shadow-sm text-xs sm:text-sm font-medium gap-2 bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
          >
            {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isCreating ? 'Close Synthesizer' : 'Add Memory'}
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
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Vault Records</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">{memories.length}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/15">
                <BrainCircuit className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">High Importance (≥7)</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">
                  {memories.filter((m) => (m.importance || 0) >= 7).length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/15">
                <Star className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ideas & Plans</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">
                  {memories.filter((m) => m.type === 'idea' || m.type === 'project_plan').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/15">
                <Lightbulb className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ y: -2, scale: 1.01 }} transition={transitions.fast}>
          <div className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Atomic Facts</p>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground mt-1.5">
                  {memories.filter((m) => m.type === 'fact').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/15">
                <Bookmark className="h-5 w-5" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Manual Memory Modal / Creator Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={transitions.normal}
          >
            <div className="rounded-[22px] border border-purple-500/30 bg-card/80 backdrop-blur-xl p-6 sm:p-7 shadow-lg shadow-purple-500/5">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground font-display">
                      Synthesize Knowledge Memory
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Extract an atomic fact, belief, or long-term personal observation into your vault.
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

              <form onSubmit={handleCreateMemory} className="space-y-4 pt-4">
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 rounded-xl"
                  >
                    {formError}
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Title / Headline</label>
                    <Input
                      placeholder="e.g., Preference for deep-work mornings"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-10 bg-background/50 border-input text-foreground rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Memory Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background/50 text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    >
                      <option value="fact">Fact</option>
                      <option value="idea">Idea</option>
                      <option value="preference">Preference</option>
                      <option value="project_plan">Project Plan</option>
                      <option value="important_event">Important Event</option>
                      <option value="recurring_concern">Recurring Concern</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Atomic Content / Fact Details <span className="text-purple-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Record the core observation, fact, or durable mental model (minimum 5 characters)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Importance: <span className="text-purple-500 font-bold">{importance}/10</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={importance}
                      onChange={(e) => setImportance(Number(e.target.value))}
                      className="w-36 accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 rounded-full px-5 h-9"
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Save to Vault
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search memories by keyword, thought, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card border-border/70 text-foreground rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={minImportance}
                onChange={(e) => setMinImportance(Number(e.target.value))}
                className="h-11 rounded-2xl border border-border/70 bg-card text-foreground px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-sm"
              >
                <option value="0">All Importance</option>
                <option value="6">Importance ≥ 6</option>
                <option value="8">Importance ≥ 8 (Vital)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills with Micro-animations */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MEMORY_TYPES.map((t) => {
            const isSelected = selectedType === t.value;
            const Icon = t.icon;
            return (
              <motion.button
                key={t.value}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                onClick={() => setSelectedType(t.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border shadow-sm',
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/20'
                    : 'bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Memories Dynamic Grid with PopLayout animations */}
      {isLoading ? (
        <div className="min-h-[250px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-xs text-muted-foreground font-medium">Synchronizing with encrypted memory graph...</span>
        </div>
      ) : filteredMemories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={transitions.normal}
          className="rounded-[22px] border border-dashed border-border/80 bg-card/40 p-12 text-center"
        >
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-3.5 border border-purple-500/20">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground font-display">No memory records found</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
            {searchQuery || selectedType !== 'all' || minImportance > 0
              ? 'Try adjusting your filters or search keywords.'
              : 'Your second brain records atomic observations here automatically from conversations or manual entries.'}
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs rounded-full px-4 h-9 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Synthesize First Memory
          </Button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredMemories.map((mem) => {
              const displayTitle = mem.title || 'Extracted Memory';
              const displayContent = mem.content || mem.fact || '';
              const importanceScore = mem.importance || 5;

              return (
                <motion.div
                  layout
                  key={mem.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  whileHover={{ y: -2, scale: 1.008 }}
                  transition={transitions.normal}
                  className="rounded-[20px] border border-border/70 bg-card p-5 shadow-sm hover:shadow-md hover:border-border transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider',
                            getTypeStyle(mem.type)
                          )}
                        >
                          <Tag className="h-3 w-3" />
                          {mem.type ? mem.type.replace('_', ' ') : 'Fact'}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted/60 text-foreground border border-border/60">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                          {importanceScore}/10
                        </span>
                      </div>

                      <motion.div whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === mem.id}
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                          title="Delete memory"
                        >
                          {deletingId === mem.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </motion.div>
                    </div>

                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground font-display leading-snug">
                        {displayTitle}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                        {displayContent}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {mem.createdAt ? mem.createdAt.toLocaleDateString() : 'Atomic Record'}
                    </span>
                    {mem.sourceConversationId && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md font-medium border border-purple-500/15">
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

export default MemoriesPage;
