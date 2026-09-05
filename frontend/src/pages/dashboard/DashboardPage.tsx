import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  BookText,
  BrainCircuit,
  Target,
  GitMerge,
  Plus,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Clock,
} from 'lucide-react';
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
        const [journalsSnap, memoriesSnap, goalsSnap] = await Promise.all([
          getCountFromServer(collection(db, `users/${currentUser.uid}/journals`)).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(collection(db, `users/${currentUser.uid}/memories`)).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(collection(db, `users/${currentUser.uid}/goals`)).catch(() => ({ data: () => ({ count: 0 }) })),
        ]);
        
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
          memories: memoriesSnap.data().count,
          goals: goalsSnap.data().count,
          decisions: decisionsCount,
        });

        const activities: any[] = [];
        
        const qJ = query(collection(db, `users/${currentUser.uid}/journals`), orderBy('createdAt', 'desc'), limit(3));
        const jSnap = await getDocs(qJ).catch(() => ({ forEach: () => {} }));
        jSnap.forEach((doc: any) => {
           activities.push({
             id: doc.id,
             title: doc.data().title || 'Journal Entry',
             time: doc.data().date || (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleDateString() : 'Recent'),
             type: 'journal',
             snippet: doc.data().content,
             timestamp: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : 0,
           });
        });

        const qM = query(collection(db, `users/${currentUser.uid}/memories`), orderBy('createdAt', 'desc'), limit(2));
        const mSnap = await getDocs(qM).catch(() => ({ forEach: () => {} }));
        mSnap.forEach((doc: any) => {
           activities.push({
             id: doc.id,
             title: doc.data().title || 'Atomic Memory',
             time: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleDateString() : 'Recent',
             type: 'memory',
             snippet: doc.data().content || doc.data().fact,
             timestamp: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : 0,
           });
        });

        const qG = query(collection(db, `users/${currentUser.uid}/goals`), orderBy('createdAt', 'desc'), limit(2));
        const gSnap = await getDocs(qG).catch(() => ({ forEach: () => {} }));
        gSnap.forEach((doc: any) => {
           activities.push({
             id: doc.id,
             title: doc.data().title || 'Goal Milestone',
             time: doc.data().targetDate || (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleDateString() : 'Active'),
             type: 'goal',
             snippet: doc.data().description || `Status: ${doc.data().status || 'active'}`,
             timestamp: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : 0,
           });
        });

        decs.slice(0, 2).forEach(d => {
           activities.push({
             id: d.id,
             title: d.decision,
             time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
             type: 'decision',
             snippet: d.reasoning,
             timestamp: d.createdAt ? new Date(d.createdAt).getTime() : 0,
           });
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);
        setRecentActivities(activities.slice(0, 4));

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
    <div className="h-full flex flex-col justify-between gap-3 sm:gap-4 animate-fade-in min-h-0 overflow-hidden">
      {/* Header and Quick Actions (Compact) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-3 border-b border-border/60 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight font-display text-foreground leading-tight">
            {greeting}, {displayName}.
          </h1>
          <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 leading-normal">
            Your second brain is active and cryptographically isolated.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link to="/chat">
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-full text-xs font-medium gap-1.5 border-border/70 hover:bg-muted/50">
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </Button>
          </Link>
          <Link to="/journal">
            <Button size="sm" className="h-9 px-4 rounded-full text-xs font-medium gap-1.5 shadow-sm">
              <Plus className="h-3.5 w-3.5" /> New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Vault Status Overview (Compact Horizontal Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
        {[
          { icon: BookText, label: 'Journals', value: stats.journals, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10', href: '/journal' },
          { icon: BrainCircuit, label: 'Memories', value: stats.memories, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10', href: '/memories' },
          { icon: Target, label: 'Goals', value: stats.goals, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10', href: '/goals' },
          { icon: GitMerge, label: 'Decisions', value: stats.decisions, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10', href: '/decisions' },
        ].map((stat, i) => (
          <Link key={i} to={stat.href} className="block group">
            <div className="p-3 rounded-[18px] border border-border/70 bg-card hover:bg-muted/40 transition-all flex items-center gap-3 shadow-sm hover:border-border">
              <div className={`h-9 w-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0 border border-current/15`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold font-display text-foreground leading-none">{stat.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mt-1 truncate">{stat.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Split: Balanced 3-Column Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 flex-1 min-h-0 items-stretch overflow-hidden">
        {/* Column 1: Ask My Memory RAG (5 cols) */}
        <div className="lg:col-span-5 h-full min-h-0 flex flex-col">
          <AskMemoryCard />
        </div>

        {/* Column 2: Recent Vault Activity (4 cols) */}
        <div className="lg:col-span-4 h-full min-h-0 flex flex-col rounded-[22px] border border-border/70 bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-border">
          <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
            <div>
              <h2 className="text-sm sm:text-[15px] font-semibold text-foreground font-display leading-none">
                Recent Vault Activity
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                Audit log of latest encrypted records
              </p>
            </div>
            <Link to="/journal">
              <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground">
                All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-0.5 min-h-0 scrollbar-none">
            {recentActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">No recent activity yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Write a journal entry or chat to start logging.</p>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex items-start gap-2.5"
                >
                  <div className="h-7 w-7 rounded-lg bg-foreground/5 border border-border/70 flex items-center justify-center shrink-0 mt-0.5">
                    {act.type === 'journal' ? (
                      <BookText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    ) : act.type === 'memory' ? (
                      <BrainCircuit className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                    ) : act.type === 'goal' ? (
                      <Target className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <GitMerge className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground truncate">{act.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{act.snippet}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Emerging Themes (3 cols) */}
        <div className="lg:col-span-3 h-full min-h-0 flex flex-col justify-between rounded-[22px] border border-border/70 bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-border">
          <div className="pb-3 border-b border-border/60 shrink-0">
            <h2 className="text-sm sm:text-[15px] font-semibold text-foreground font-display flex items-center gap-2 leading-none">
              <BrainCircuit className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              Emerging Themes
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
              AI synthesis from your reflections
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center pt-3 min-h-0 overflow-hidden">
            {emergingTheme ? (
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold uppercase tracking-wider border border-purple-500/20">
                  <Sparkles className="h-3 w-3" /> Active Synthesis
                </div>
                <h3 className="font-semibold text-sm text-foreground line-clamp-2">{emergingTheme.theme || emergingTheme.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{emergingTheme.summary || emergingTheme.description}</p>
                
                {emergingTheme.tags && (
                   <div className="flex flex-wrap gap-1 pt-1">
                      {emergingTheme.tags.slice(0, 3).map((t: string) => (
                         <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50">{t}</span>
                      ))}
                   </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-foreground">Awaiting pattern detection</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                  Log more journal entries and dialogues to synthesize emerging behavioral patterns.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/60 shrink-0">
            <Link to="/insights" className="block">
              <Button variant="outline" size="sm" className="w-full text-xs h-8 rounded-xl border-border/70 hover:bg-muted/50 gap-1">
                Explore Patterns <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
