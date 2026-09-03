import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BrainCircuit, Sparkles, Lightbulb, Clock } from 'lucide-react';

export interface InsightData {
  id: string;
  theme: string;
  frequency: number;
  timeRange: string;
  summary: string;
  possibleInterpretation: string;
  suggestedReflection: string;
  supportingMemoryIds?: string[];
}

export const RecurringThemeCard: React.FC<{ insight: InsightData }> = ({ insight }) => {
  return (
    <Card className="border-sky-200/80 overflow-hidden animate-fade-in bg-gradient-to-br from-surface to-sky-50/20 shadow-subtle">
      <CardHeader className="bg-sky-50/60 pb-4 border-b border-sky-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent">
            <BrainCircuit className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Recurring Pattern</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
            <Clock className="h-3 w-3" />
            <span>Observed across {insight.timeRange}</span>
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold font-display text-primary-dark mt-2">
          Focus Theme: <span className="text-accent">{insight.theme}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Frequency & Observation Summary */}
        <div className="flex gap-4 items-start">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-accent text-white flex flex-col items-center justify-center font-bold shadow-subtle">
            <span className="text-lg leading-none">{insight.frequency}x</span>
            <span className="text-[9px] uppercase tracking-tighter opacity-80 mt-0.5">Noted</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary-dark leading-snug">{insight.summary}</p>
            <p className="text-xs text-secondary">
              Derived organically from non-continuous journal entries and reflections.
            </p>
          </div>
        </div>

        {/* Interpretations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Interpretation */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-subtle">
            <div className="flex items-center gap-2 text-secondary">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Synthesized Pattern</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{insight.possibleInterpretation}"
            </p>
            <span className="inline-block text-[10px] text-muted font-medium uppercase tracking-wider pt-1">
              Observational analysis • Non-diagnostic
            </span>
          </div>

          {/* Reflection */}
          <div className="bg-sky-50/50 rounded-xl border border-sky-200/80 p-4 space-y-2 shadow-subtle">
            <div className="flex items-center gap-2 text-accent">
              <Lightbulb className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800">Inquiry for Reflection</h4>
            </div>
            <p className="text-xs font-medium text-slate-800 leading-relaxed">
              {insight.suggestedReflection}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
