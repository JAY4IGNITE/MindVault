import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  sidebarContainer,
  sidebarItem,
  drawerVariants,
  overlayVariants,
  transitions,
} from '../../lib/motion';

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
      <motion.div variants={sidebarItem}>
        <Link
          to={item.path}
          className={cn(
            'flex items-center justify-between rounded-[14px] px-3.5 py-3 text-[15px] font-medium transition-all duration-200 ease-out group',
            isActive
              ? 'bg-foreground/10 text-foreground font-semibold shadow-sm'
              : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
            <span>{item.label}</span>
          </div>
          {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
        </Link>
      </motion.div>
    );
  };

  const userInitial = (currentUser?.email || 'User').charAt(0).toUpperCase();

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background flex flex-col lg:flex-row relative">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden shrink-0 flex items-center justify-between p-4 border-b border-foreground/10 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-[12px] md:gap-[16px]">
          <div className="shrink-0 flex items-center justify-center w-[40px] h-[40px]">
            <img src="/logo.png" alt="MindVault AI Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-tight leading-none mt-0.5">MindVault AI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="hover:bg-foreground/10 text-foreground">
          <AnimatePresence mode="wait" initial={false}>
            {isMobileMenuOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={transitions.micro}>
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={transitions.micro}>
                <Menu className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.fast}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <>
        {/* Mobile: AnimatePresence drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.aside
              key="mobile-sidebar"
              variants={drawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden"
            >
              <SidebarContent
                navItems={navItems}
                secondaryNavItems={secondaryNavItems}
                NavLink={NavLink}
                userInitial={userInitial}
                currentUser={currentUser}
                handleSignOut={handleSignOut}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Desktop: always visible */}
        <motion.aside
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="hidden lg:flex lg:relative lg:p-4 lg:w-[320px] shrink-0"
        >
          <SidebarContent
            navItems={navItems}
            secondaryNavItems={secondaryNavItems}
            NavLink={NavLink}
            userInitial={userInitial}
            currentUser={currentUser}
            handleSignOut={handleSignOut}
          />
        </motion.aside>
      </>

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10"
      >
        <div className={cn("flex-1 p-3 sm:p-5 md:p-6 lg:p-8 flex flex-col min-h-0", (location.pathname === '/chat' || location.pathname === '/memory-graph') ? "overflow-hidden" : "overflow-y-auto")}>
          <div className={cn("mx-auto w-full flex-1 flex flex-col min-h-0", location.pathname === '/chat' ? "max-w-5xl h-full" : "max-w-[1240px] h-full")}>
            {children}
          </div>
        </div>
      </motion.main>
    </div>
  );
};

// Extracted sidebar content so it works for both mobile drawer and desktop
interface SidebarContentProps {
  navItems: any[];
  secondaryNavItems: any[];
  NavLink: React.ComponentType<{ item: any }>;
  userInitial: string;
  currentUser: any;
  handleSignOut: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ navItems, secondaryNavItems, NavLink, userInitial, currentUser, handleSignOut }) => (
  <div className="flex-1 h-full flex flex-col bg-background/60 lg:bg-foreground/[0.02] backdrop-blur-2xl border border-foreground/[0.05] rounded-[24px] shadow-2xl overflow-hidden">
    <div className="p-6 hidden lg:flex items-center gap-[14px]">
      <div className="shrink-0 flex items-center justify-center w-[40px] h-[40px]">
        <img src="/logo.png" alt="MindVault AI Logo" className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-col justify-center mt-[1px]">
        <span className="font-display font-bold text-[19px] tracking-tight text-foreground leading-none">MindVault AI</span>
        <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-[0.1em] mt-1 leading-none">Zero-Trust AI Brain</span>
      </div>
    </div>

    <motion.div
      className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-hide"
      variants={sidebarContainer}
      initial="initial"
      animate="animate"
    >
      {navItems.map((item: any) => (
        <NavLink key={item.path} item={item} />
      ))}

      <div className="mt-8 mb-4">
        <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">System Controls</div>
        {secondaryNavItems.map((item: any) => (
          <NavLink key={item.path} item={item} />
        ))}
      </div>
    </motion.div>

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
        className="w-full justify-start gap-2.5 h-10 rounded-xl border-foreground/10 bg-foreground/[0.03] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-foreground font-medium text-xs sm:text-[13px] transition-all duration-200 ease-out shadow-none"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
        <span>Lock Vault</span>
      </Button>
    </div>
  </div>
);
