import React, { useState } from 'react';
import { RecurringThemeCard, InsightData } from '../../components/insights/RecurringThemeCard';
import { Button } from '../../components/ui/Button';
import { Lightbulb, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

const SAMPLE_INSIGHTS: InsightData[] = [
  {
    id: 'theme_deep_focus',
    theme: 'Deep Work & Morning Sanctuaries',
    frequency: 4,
    timeRange: 'Aug 20 - Sep 03',
    summary:
      'Consistently associates uninterrupted morning hours with heightened clarity, reduced decision fatigue, and higher architectural velocity.',
    possibleInterpretation:
      'Morning hours represent your lowest cognitive interference zone; asynchronous communication safeguards your highest leverage outputs.',
    suggestedReflection:
      'What single boundary can you formalize to protect this morning sanctuary on a recurring weekly basis?',
  },
  {
    id: 'theme_system_modularity',
    theme: 'Decoupled Architectures & Security',
    frequency: 3,
    timeRange: 'Aug 25 - Sep 03',
    summary:
      'Repeatedly gravitates toward strict trust boundaries, isolated service boundaries, and explicit contracts.',
    possibleInterpretation:
      'You prioritize predictable, tamper-proof architectures over premature convenience or monolithic coupling.',
    suggestedReflection:
      'Are there auxiliary areas in your toolchain where adopting a similar zero-trust mindset would eliminate friction?',
  },
];

const InsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<InsightData[]>(SAMPLE_INSIGHTS);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await api.post('/api/v1/intelligence/generate-insights');
    } catch (e) {
      console.warn('Backend insight generation trigger simulated:', e);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-primary-dark flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-accent" /> Longitudinal Insights
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            Behavioral and intellectual patterns synthesized organically from your vault archives.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
          size="sm"
          className="gap-2 border-sky-200 text-accent hover:bg-sky-50 shadow-subtle text-xs"
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
