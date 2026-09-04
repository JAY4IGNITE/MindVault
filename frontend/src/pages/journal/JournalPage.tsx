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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-foreground/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground flex items-center gap-3">
            <BookText className="h-8 w-8 text-blue-400" /> Journal & Vault Logs
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Capture unfiltered reflections. MindVault extracts atomic memories and patterns.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setSelectedEntry(null);
          }}
          className="gap-2 shrink-0 rounded-full h-11 px-6 shadow-glow"
        >
          <Plus className="h-4 w-4" /> New Entry
        </Button>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-220px)] min-h-[600px]">
        {/* Left Sidebar (List) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search journals..."
              className="pl-11 bg-foreground/5 border-foreground/10 rounded-xl h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-xs font-medium uppercase tracking-widest">Loading vault logs...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-foreground/10 rounded-2xl bg-foreground/5">
                <p className="text-sm text-muted-foreground mb-4">No entries found.</p>
                <Button variant="outline" size="sm" onClick={() => setIsCreating(true)} className="rounded-full border-foreground/10">
                  Write your first entry
                </Button>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsCreating(false);
                  }}
                  className={`p-4 rounded-[1.25rem] cursor-pointer transition-all duration-200 border ${
                    selectedEntry?.id === entry.id && !isCreating
                      ? 'bg-foreground/10 border-foreground/20 shadow-glow'
                      : 'bg-foreground/5 border-foreground/5 hover:bg-foreground/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{entry.title}</h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 font-medium bg-foreground/10 px-2 py-0.5 rounded-full">{entry.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{entry.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          {isCreating ? (
            <Card className="flex-1 flex flex-col overflow-hidden border-foreground/5 bg-foreground/5 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-foreground/10 bg-foreground/[0.03]">
                <CardTitle>New Journal Entry</CardTitle>
                <CardDescription>Jot down your thoughts. Encryption happens automatically.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-6 overflow-hidden gap-4">
                <form id="new-entry-form" onSubmit={handleSaveEntry} className="flex-1 flex flex-col gap-4 h-full">
                  <Input
                    placeholder="Entry Title (Optional)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="text-lg font-medium bg-foreground/5 border-foreground/10 rounded-xl h-14"
                  />
                  <textarea
                    placeholder="What's on your mind? Just start typing..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="flex-1 w-full p-4 rounded-2xl border border-foreground/10 bg-foreground/5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-shadow text-base leading-relaxed"
                    required
                  />
                </form>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" form="new-entry-form" variant="default" isLoading={isSaving} disabled={!newContent.trim()}>
                    Encrypt & Save Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedEntry ? (
            <Card className="flex-1 flex flex-col overflow-hidden border-foreground/5 bg-foreground/5 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-foreground/10 bg-foreground/[0.03] shrink-0">
                <div>
                  <CardTitle className="text-2xl font-bold font-display text-foreground leading-tight">
                    {selectedEntry.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 bg-foreground/5 px-2.5 py-1 rounded-md">
                      <Calendar className="h-3.5 w-3.5" />
                      {selectedEntry.date}
                    </span>
                    {selectedEntry.mood && (
                      <span className="flex items-center gap-1.5 bg-foreground/5 px-2.5 py-1 rounded-md">
                        Mood: {selectedEntry.mood}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                <div className="p-8">
                  <div
                    className="prose prose-invert max-w-none text-foreground leading-loose text-base"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(selectedEntry.content.replace(/\n/g, '<br/>')),
                    }}
                  />
                </div>

                {/* AI Analysis Section */}
                {(selectedEntry.conciseSummary || (selectedEntry.topics && selectedEntry.topics.length > 0)) && (
                  <div className="mx-8 mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-[1.25rem]">
                    <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-400 mb-4">
                      <Sparkles className="h-4 w-4" /> AI Vault Analysis
                    </h4>
                    
                    {selectedEntry.conciseSummary && (
                      <div className="mb-4">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">TL;DR</h5>
                        <p className="text-sm text-blue-100 leading-relaxed bg-foreground/5 p-4 rounded-xl border border-foreground/5">{selectedEntry.conciseSummary}</p>
                      </div>
                    )}

                    {selectedEntry.topics && selectedEntry.topics.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Extracted Themes</h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedEntry.topics.map((topic, i) => (
                            <span key={i} className="px-3 py-1.5 bg-foreground/5 text-blue-200 text-xs font-medium rounded-lg border border-blue-500/10 shadow-sm">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-foreground/10 bg-foreground/5">
              <div className="h-16 w-16 rounded-3xl bg-foreground/5 flex items-center justify-center mb-6 shadow-glow">
                <BookText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Select an entry</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                Choose an existing log from the sidebar to view it, or create a new one to securely record your thoughts.
              </p>
              <Button onClick={() => setIsCreating(true)} className="rounded-full px-6 gap-2 shadow-glow">
                <Plus className="h-4 w-4" /> New Entry
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
