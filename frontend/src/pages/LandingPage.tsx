import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Brain, Shield, Sparkles, Lock, ArrowRight, Network, CheckCircle2, ShieldCheck } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-accent/20">
      {/* Header */}
      <header className="py-5 px-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto w-full border-b border-border/60 bg-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-subtle">
            <Brain className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-primary-dark block leading-none">MindVault AI</span>
            <span className="text-[10px] uppercase font-semibold text-accent tracking-wider">Zero-Trust AI Brain</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/signup">
            <Button variant="default" size="sm" className="gap-1.5 shadow-sm">
              Open Vault <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="py-20 md:py-28 px-6 text-center max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-light/60 border border-sky-200 text-accent text-xs font-semibold uppercase tracking-wider mb-8 shadow-subtle">
            <ShieldCheck className="h-4 w-4" /> Cryptographically Isolated Second Brain
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-primary-dark mb-6 font-display leading-[1.1]">
            Your private AI second brain. <br />
            <span className="text-accent">Zero compromises.</span>
          </h1>
          <p className="text-lg md:text-xl text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Reflect, journal, and synthesize long-term memories with an AI assistant strictly bound by a Non-Negotiable Security Constitution. Your thoughts are never trained on.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <Button size="lg" variant="default" className="px-8 shadow-premium gap-2 text-base">
                Start Your Private Vault <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#constitution">
              <Button size="lg" variant="outline" className="px-6 text-base">
                Read Security Constitution
              </Button>
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-xs text-muted font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Strict UID Data Isolation</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Zero Browser Keys</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Prompt Injection Protected</span>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-surface w-full border-y border-border">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-border bg-background/50 hover:bg-surface hover:shadow-premium transition-all duration-200 space-y-4">
              <div className="h-12 w-12 bg-sky-50 text-accent rounded-xl flex items-center justify-center border border-sky-100">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Intelligent Reflection</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Transform daily journaling into structured memories, active goals, and atomic facts automatically via Gemini 1.5.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-background/50 hover:bg-surface hover:shadow-premium transition-all duration-200 space-y-4">
              <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                <Network className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Memory Graph Visualizer</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Explore a 2D interactive force-directed graph illustrating how your memories, projects, and decisions connect across time.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-background/50 hover:bg-surface hover:shadow-premium transition-all duration-200 space-y-4">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">Ask My Memory (RAG)</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Query your past decisions, feelings, and goals in plain language with explicit, verifiable source citations.
              </p>
            </div>
          </div>
        </section>

        {/* Security Constitution Section */}
        <section id="constitution" className="py-24 px-6 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-primary-dark text-xs font-semibold uppercase tracking-wider mb-6">
            <Lock className="h-3.5 w-3.5 text-accent" /> Non-Negotiable Architecture
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-display text-primary-dark">
            Built on cryptographic trust.
          </h2>
          <p className="text-secondary text-base md:text-lg leading-relaxed mb-12 max-w-2xl mx-auto">
            MindVault AI separates the untrusted browser from our GCP Cloud Run backend. Secrets are managed in Google Secret Manager, database writes are restricted by UID, and inputs are sanitized.
          </p>

          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-subtle max-w-2xl mx-auto text-left space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary uppercase tracking-wider pb-3 border-b border-border">
              <span>Untrusted Client</span>
              <span>API Firewalled Zone</span>
              <span>Private Firestore</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Every request transmits a short-lived Firebase Bearer Token. The backend validates token signatures with Firebase Admin before ever querying Firestore or invoking Google Generative AI models.
            </p>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-muted bg-surface border-t border-border">
        © {new Date().getFullYear()} MindVault AI. All rights reserved. Built with privacy-first engineering.
      </footer>
    </div>
  );
};

export default LandingPage;
