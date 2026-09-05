import React, { useState } from 'react';
import { RecurringThemeCard, InsightData } from '../../components/insights/RecurringThemeCard';
import { Button } from '../../components/ui/Button';
import { Lightbulb, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

const InsightsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, `users/${currentUser.uid}/insights`), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: InsightData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          theme: data.theme,
          frequency: data.frequency || 1,
          timeRange: data.timeRange || '',
          summary: data.summary,
          possibleInterpretation: data.possibleInterpretation,
          suggestedReflection: data.suggestedReflection,
        });
      });
      setInsights(loaded);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await api.post('/api/v1/intelligence/generate-insights');
    } catch (e) {
      console.warn('Failed to trigger insight generation:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-foreground/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-muted-foreground" /> Longitudinal Insights
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Behavioral and intellectual patterns synthesized organically from your vault archives.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
          size="sm"
          className="gap-2 border-foreground/10 text-foreground hover:bg-foreground/5 shadow-subtle text-xs"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isGenerating ? 'Synthesizing...' : 'Refresh Pattern Analysis'}
        </Button>
      </div>

      <div className="space-y-6">
        {insights.map((insight) => (
          <RecurringThemeCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
};

export default InsightsPage;
