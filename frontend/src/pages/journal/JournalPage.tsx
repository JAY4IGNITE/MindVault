import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BookText, Calendar, Plus, Sparkles, Loader2, CheckCircle2, Search, Clock } from 'lucide-react';
import { sanitizeHtml } from '../../lib/sanitize';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  conciseSummary?: string;
  topics?: string[];
  mood?: string;
}



const JournalPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New entry form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, `users/${currentUser.uid}/journals`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: JournalEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          title: data.title,
          content: data.content,
          conciseSummary: data.conciseSummary,
          topics: data.topics,
          mood: data.mood,
        });
      });
      setEntries(loaded);
      if (!selectedEntry && loaded.length > 0 && !isCreating) {
        setSelectedEntry(loaded[0]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, isCreating]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !currentUser) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, `users/${currentUser.uid}/journals`), {
        title: newTitle.trim() || 'Daily Reflection',
        content: newContent.trim(),
        createdAt: serverTimestamp(),
      });
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      // Selection reset logic relies on onSnapshot fetching the latest document.
    } catch (err) {
      console.error("Failed to save journal entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.topics?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-primary-dark flex items-center gap-2">
            <BookText className="h-7 w-7 text-accent" /> Journal & Vault Logs
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            Capture unfiltered reflections. MindVault extracts atomic memories and patterns.
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="gap-2 shadow-sm"
          onClick={() => {
            setIsCreating(true);
            setSelectedEntry(null);
          }}
        >
          <Plus className="h-4 w-4" /> New Reflection
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Entry List & Search */}
        <div className="lg:col-span-5 space-y-4">
          <Input
            placeholder="Search entries, keywords, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-white"
          />

          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredEntries.map((entry) => {
              const isSelected = selectedEntry?.id === entry.id && !isCreating;
              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsCreating(false);
                  }}
                  className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-sky-50/40 shadow-subtle'
                      : 'border-border bg-white hover:border-slate-300 hover:shadow-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-primary-dark truncate">{entry.title}</span>
                    <span className="text-[10px] text-muted flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" /> {entry.date}
                    </span>
                  </div>
                  <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{entry.content}</p>

                  {entry.topics && entry.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {entry.topics.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Editor or Detail View */}
        <div className="lg:col-span-7">
          {isCreating ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Compose New Reflection</CardTitle>
                <CardDescription>
                  Write freely. MindVault will parse durable memories upon saving.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveEntry} className="space-y-4">
                  <Input
                    placeholder="Entry Title (e.g., Morning Focus & Insights)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="font-medium text-sm"
                  />
                  <div className="space-y-1">
                    <textarea
                      rows={12}
                      placeholder="What is happening? What did you decide, observe, or wonder today?"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full rounded-lg border border-border p-3 text-sm text-primary placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-y"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="default" isLoading={isSaving} disabled={!newContent.trim()}>
                      Encrypt & Save Entry
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : selectedEntry ? (
            <Card className="animate-fade-in">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Logged on {selectedEntry.date}
                  </span>
                  {selectedEntry.mood && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      Mood: {selectedEntry.mood}
                    </span>
                  )}
                </div>
                <CardTitle className="text-xl sm:text-2xl mt-2">{selectedEntry.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* AI Extracted Summary Banner */}
                {selectedEntry.conciseSummary && (
                  <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/70 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" /> AI Extracted Summary
                    </div>
                    <p className="text-xs sm:text-sm text-primary-dark leading-relaxed">
                      {selectedEntry.conciseSummary}
                    </p>
                  </div>
                )}

                {/* Raw content */}
                <div
                  className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap select-text"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEntry.content) }}
                />

                {/* Topics footer */}
                {selectedEntry.topics && (
                  <div className="pt-4 border-t border-border flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted font-medium">Tags:</span>
                    {selectedEntry.topics.map((t) => (
                      <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted border border-dashed border-border rounded-2xl">
              <BookText className="h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm">Select an entry or compose a new reflection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
