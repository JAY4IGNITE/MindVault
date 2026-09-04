import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  MessageSquareText,
  BookText,
  BrainCircuit,
  Target,
  GitMerge,
  Lightbulb,
  Network,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Brain,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: MessageSquareText, label: 'Dialogue & Chat', path: '/chat' },
  { icon: BookText, label: 'Journal & Reflections', path: '/journal' },
  { icon: BrainCircuit, label: 'Memories', path: '/memories' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: GitMerge, label: 'Decision Tracker', path: '/decisions' },
  { icon: Lightbulb, label: 'Insights & Patterns', path: '/insights' },
  { icon: Network, label: 'Memory Graph', path: '/memory-graph' },
];

const secondaryNavItems = [
  { icon: ShieldCheck, label: 'Security & Constitution', path: '/security' },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    return (
      <Link
        to={item.path}
        className={cn(
          'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out group',
          isActive
            ? 'bg-foreground/10 text-foreground shadow-subtle'
            : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div className="flex items-center gap-3.5">
          <item.icon className={cn('h-4 w-4 transition-transform group-hover:scale-110', isActive ? 'text-foreground' : '')} />
          <span>{item.label}</span>
        </div>
        {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
      </Link>
    );
  };

  const userInitial = (currentUser?.email || 'User').charAt(0).toUpperCase();

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background flex flex-col lg:flex-row relative">
      {/* Background ambient glow effects mapped to Apple style */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden shrink-0 flex items-center justify-between p-4 border-b border-foreground/10 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-foreground/10 flex items-center justify-center text-foreground border border-foreground/10">
            <Brain className="h-5 w-5" />
          </div>
          <span className="font-display font-semibold text-lg text-foreground tracking-tight">MindVault</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="hover:bg-foreground/10 text-foreground">
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Floating Glass Pane on Desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:relative lg:p-4 lg:w-[320px]'
        )}
      >
        <div className="flex-1 h-full flex flex-col bg-background/60 lg:bg-foreground/[0.02] backdrop-blur-2xl border border-foreground/[0.05] rounded-[24px] shadow-2xl overflow-hidden">
          <div className="p-6 hidden lg:flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-foreground/10 flex items-center justify-center text-foreground border border-foreground/10 shadow-glow">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <span className="block font-display font-semibold text-lg text-foreground tracking-tight leading-tight">MindVault</span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">Secure AI Vault</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-hide">
            {navItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}

            <div className="mt-8 mb-4">
              <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">System Controls</div>
              {secondaryNavItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-foreground/[0.04] bg-transparent">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-sm font-semibold border border-foreground/10 shadow-sm">
                  {userInitial}
                </div>
                <div className="flex flex-col min-w-0 flex-1 mr-2">
                  <span className="text-sm font-medium text-foreground truncate">{currentUser?.displayName || 'Vault User'}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{currentUser?.email}</span>
                </div>
              </div>
              <ThemeToggle />
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 rounded-full border-foreground/10 bg-foreground/[0.02] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all duration-200 ease-out shadow-none"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Lock Vault
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
