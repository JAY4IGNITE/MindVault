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
          'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-primary text-white shadow-sm font-semibold'
            : 'text-secondary hover:bg-slate-100 hover:text-primary'
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div className="flex items-center gap-3">
          <item.icon className={cn('h-4 w-4 transition-transform group-hover:scale-105', isActive ? 'text-white' : 'text-slate-500')} />
          <span>{item.label}</span>
        </div>
        {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
      </Link>
    );
  };

  const userInitial = (currentUser?.email || 'User').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-surface sticky top-0 z-30 shadow-subtle">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <span className="font-display font-bold text-lg text-primary-dark">MindVault AI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 transform flex-col bg-surface border-r border-border transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex shadow-sm',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-6 hidden lg:flex items-center gap-3 border-b border-border/50">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-subtle">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-primary-dark block leading-none">MindVault AI</span>
              <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">Private Second Brain</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-5 px-3.5 flex flex-col gap-6">
            <nav className="flex flex-col gap-1">
              <p className="px-3 text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Vault Workspace</p>
              {navItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </nav>

            <nav className="flex flex-col gap-1">
              <p className="px-3 text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Privacy & Protocol</p>
              {secondaryNavItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </nav>
          </div>

          {/* User footer */}
          <div className="p-4 border-t border-border bg-slate-50/50">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center text-sm font-bold shadow-subtle">
                {userInitial}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-semibold text-primary truncate leading-tight">{currentUser?.email}</p>
                <span className="text-[10px] text-muted flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                  Encrypted Session
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 text-xs font-medium" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 animate-fade-in">
          <div className="mx-auto max-w-6xl h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
