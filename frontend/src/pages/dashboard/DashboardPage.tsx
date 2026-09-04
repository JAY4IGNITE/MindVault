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
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight font-display text-foreground">
            {greeting}, {displayName}.
          </h1>
          <p className="text-base text-muted-foreground mt-2">
            Your second brain is active and cryptographically isolated.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link to="/chat" className="w-full md:w-auto">
            <Button variant="outline" className="w-full gap-2 rounded-full h-11 px-5 border-white/10">
              <MessageSquare className="h-4 w-4" /> Chat
            </Button>
          </Link>
          <Link to="/journal" className="w-full md:w-auto">
            <Button className="w-full gap-2 rounded-full h-11 px-5">
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Vault Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookText, label: 'Journals', value: stats.journals, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: BrainCircuit, label: 'Memories', value: stats.memories, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: Target, label: 'Goals', value: stats.goals, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: GitMerge, label: 'Decisions', value: stats.decisions, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="border-white/5 bg-white/5 backdrop-blur-md shadow-sm hover:bg-white/10 transition-colors">
            <CardContent className="p-5 flex flex-col items-start gap-4">
              <div className={`h-10 w-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Split: Ask My Memory RAG + Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Ask My Memory + Recent Activity */}
        <div className="lg:col-span-7 space-y-6">
          <AskMemoryCard />

          <Card className="border-white/5 bg-white/5 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
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
            <CardContent className="pt-6">
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-black/20 border border-white/5 flex items-center justify-center text-foreground shrink-0 mt-0.5">
                      {act.type === 'journal' ? (
                        <BookText className="h-4 w-4 text-blue-400" />
                      ) : act.type === 'memory' ? (
                        <BrainCircuit className="h-4 w-4 text-purple-400" />
                      ) : (
                        <GitMerge className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground truncate">{act.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{act.snippet}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Emerging Themes & Graph Callout */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="h-full border-white/5 bg-white/5 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-purple-400" />
                Emerging Themes
              </CardTitle>
              <CardDescription>Patterns synthesized from your recent activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {emergingTheme ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" /> Synthesis Active
                  </div>
                  <h4 className="font-semibold text-lg text-foreground">{emergingTheme.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{emergingTheme.description}</p>
                  
                  {emergingTheme.tags && (
                     <div className="flex flex-wrap gap-2 pt-2">
                        {emergingTheme.tags.map((t: string) => (
                           <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-muted-foreground">{t}</span>
                        ))}
                     </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Log more entries to generate insights.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
