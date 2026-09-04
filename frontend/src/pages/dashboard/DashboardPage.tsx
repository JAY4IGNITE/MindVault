import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BookText, BrainCircuit, Target, GitMerge, Plus, Sparkles, MessageSquare, Network, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AskMemoryCard } from './components/AskMemoryCard';
import { collection, query, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { api } from '../../lib/api';

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Explorer';

  const [stats, setStats] = React.useState({ journals: 0, memories: 0, goals: 0, decisions: 0 });
  const [recentActivities, setRecentActivities] = React.useState<any[]>([]);
  const [emergingTheme, setEmergingTheme] = React.useState<any>(null);

  React.useEffect(() => {
    if (!currentUser) return;
    const fetchDashboardData = async () => {
      try {
        const journalsSnap = await getCountFromServer(collection(db, `users/${currentUser.uid}/journals`));
        const insightsSnap = await getCountFromServer(collection(db, `users/${currentUser.uid}/insights`));
        
        let decisionsCount = 0;
        let decs: any[] = [];
        try {
          const decRes = await api.get('/api/v1/decisions');
          decisionsCount = decRes.data.length;
          decs = decRes.data;
        } catch (e) {
          // ignore
        }

        setStats({
          journals: journalsSnap.data().count,
          memories: insightsSnap.data().count,
          goals: 0, // Goals not implemented yet
          decisions: decisionsCount
        });

        const activities: any[] = [];
        
        const qJ = query(collection(db, `users/${currentUser.uid}/journals`), orderBy('createdAt', 'desc'), limit(3));
        const jSnap = await getDocs(qJ);
        jSnap.forEach(doc => {
           activities.push({
             id: doc.id,
             title: doc.data().title || 'Journal Entry',
             time: doc.data().createdAt?.toDate()?.toLocaleDateString() || 'Recent',
             type: 'journal',
             snippet: doc.data().content,
             timestamp: doc.data().createdAt?.toMillis() || 0
           });
        });

        decs.slice(0, 3).forEach(d => {
           activities.push({
             id: d.id,
             title: d.decision,
             time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
             type: 'decision',
             snippet: d.reasoning,
             timestamp: d.createdAt ? new Date(d.createdAt).getTime() : 0
           });
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);
        setRecentActivities(activities.slice(0, 3));

        const qI = query(collection(db, `users/${currentUser.uid}/insights`), orderBy('createdAt', 'desc'), limit(1));
        const iSnap = await getDocs(qI);
        if (!iSnap.empty) {
           setEmergingTheme(iSnap.docs[0].data());
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display text-primary-dark">
            {greeting}, {displayName}.
          </h1>
          <p className="text-sm text-secondary mt-1">
            Your second brain is active and isolated under your personal UID key.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/chat">
            <Button variant="default" size="sm" className="gap-2 shadow-sm">
              <MessageSquare className="h-4 w-4" /> Start Dialogue
            </Button>
          </Link>
          <Link to="/journal">
            <Button variant="secondary" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          </Link>
          <Link to="/memory-graph">
            <Button variant="outline" size="sm" className="gap-2 text-accent border-sky-200 hover:bg-sky-50">
              <Network className="h-4 w-4" /> View Graph
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Entries</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <BookText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-dark">{stats.journals}</div>
            <p className="text-[11px] text-muted mt-1">Archived reflections</p>
          </CardContent>
        </Card>

        <Card className="hover:border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Memories</span>
            <div className="h-7 w-7 rounded-lg bg-sky-100 flex items-center justify-center text-accent">
              <BrainCircuit className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-dark">{stats.memories}</div>
            <p className="text-[11px] text-muted mt-1">Extracted atomic facts</p>
          </CardContent>
        </Card>

        <Card className="hover:border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Active Goals</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-dark">{stats.goals}</div>
            <p className="text-[11px] text-muted mt-1">Tracked milestones</p>
          </CardContent>
        </Card>

        <Card className="hover:border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Decisions</span>
            <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <GitMerge className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-dark">{stats.decisions}</div>
            <p className="text-[11px] text-muted mt-1">Logged with retrospectives</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Split: Ask My Memory RAG + Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Ask My Memory + Recent Activity */}
        <div className="lg:col-span-7 space-y-6">
          <AskMemoryCard />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Recent Vault Activity</CardTitle>
                <CardDescription className="text-xs">Direct audit log of latest encrypted records</CardDescription>
              </div>
              <Link to="/journal">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  All Records <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-white border border-border flex items-center justify-center text-primary shadow-subtle shrink-0 mt-0.5">
                      {act.type === 'journal' ? (
                        <BookText className="h-4 w-4 text-accent" />
                      ) : act.type === 'memory' ? (
                        <BrainCircuit className="h-4 w-4 text-purple-500" />
                      ) : (
                        <GitMerge className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary truncate">{act.title}</span>
                        <span className="text-[10px] text-muted shrink-0">{act.time}</span>
                      </div>
                      <p className="text-xs text-secondary line-clamp-2">{act.snippet}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Emerging Themes & Graph Callout */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emerging Theme Card */}
          {emergingTheme ? (
            <Card className="bg-gradient-to-br from-sky-50/50 to-surface border-sky-200/80 shadow-subtle">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Detected Recurring Theme</span>
                </div>
                <CardTitle className="text-lg font-bold">{emergingTheme.theme}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-secondary leading-relaxed">
                  {emergingTheme.summary}
                </p>
                {emergingTheme.suggestedReflection && (
                  <div className="p-3 rounded-xl bg-white border border-sky-100 text-xs text-primary-dark">
                    <span className="font-semibold text-accent block mb-1">Suggested Reflection:</span>
                    "{emergingTheme.suggestedReflection}"
                  </div>
                )}
                <Link to="/insights" className="block pt-1">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-sky-200 text-accent hover:bg-sky-50">
                    Explore All Insights <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-slate-50 to-surface border-border shadow-subtle">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-muted">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Theme Analysis Pending</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-secondary leading-relaxed">
                  Record more journals and decisions to allow MindVault to detect patterns and generate insights.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Graph Visualization Callout */}
          <Card className="bg-gradient-to-br from-purple-50/40 to-surface border-purple-200/70 shadow-subtle">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-purple-600">
                <Network className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Topology</span>
              </div>
              <CardTitle className="text-lg font-bold">Your Memory Network</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-secondary leading-relaxed">
                MindVault automatically models relationships between your memories, decisions, and goals as an interconnected graph.
              </p>
              <Link to="/memory-graph" className="block">
                <Button variant="default" size="sm" className="w-full text-xs gap-1.5 bg-purple-700 hover:bg-purple-800 text-white">
                  Open Interactive Graph <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
