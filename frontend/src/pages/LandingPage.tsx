import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { Brain, Shield, Sparkles, Lock, ArrowRight, Network, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  navEntrance,
  staggerContainer,
  staggerItem,
  sectionReveal,
  sectionRevealTransition,
  defaultViewport,
  transitions,
  fadeUp,
  fadeIn,
} from '../lib/motion';

const LandingPage: React.FC = () => {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-transparent font-sans selection:bg-accent/20 relative"
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitions.normal}
    >
      <AnimatedBackground />

      {/* Floating Nav */}
      <motion.header
        className="mt-5 md:mt-6 mx-auto w-[calc(100%-32px)] md:w-[calc(100%-64px)] max-w-7xl py-3 md:py-4 px-6 md:px-8 flex justify-between items-center bg-background/90 md:bg-foreground/[0.02] backdrop-blur-xl border border-foreground/[0.08] shadow-sm rounded-[28px] md:rounded-[34px] lg:rounded-[40px] sticky top-5 md:top-6 z-50"
        variants={navEntrance}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-[14px] md:gap-[16px]">
          <div className="shrink-0 flex items-center justify-center w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] md:w-[56px] md:h-[56px]">
            <img src="/logo-128.webp" width={56} height={56} alt="MindVault AI Logo" className="w-full h-full object-contain" fetchPriority="high" />
          </div>
          <div className="flex flex-col justify-center mt-[2px]">
            <span className="font-display font-bold text-xl md:text-[22px] tracking-tight text-foreground leading-none">MindVault AI</span>
            <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-[0.1em] mt-1 leading-none">Zero-Trust AI Brain</span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="mr-[24px] md:mr-[32px]">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-[12px] sm:gap-[16px]">
            <Link to="/login" className="inline-flex items-center">
              <Button variant="ghost" size="sm" className="h-9 hover:bg-foreground/5 text-foreground font-medium">
                Sign In
              </Button>
            </Link>
            <Link to="/signup" className="inline-flex items-center">
              <Button variant="default" size="sm" className="h-9 gap-1.5 shadow-sm font-medium">
                Open Vault <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="flex-1 flex flex-col items-center relative z-10">
        {/* Hero Section — Staggered entrance */}
        <motion.section
          className="pt-12 pb-20 md:pt-16 md:pb-28 px-6 text-center max-w-4xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Security Badge */}
          <motion.div
            variants={staggerItem}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 text-foreground text-xs font-semibold uppercase tracking-wider mb-8 shadow-subtle"
          >
            <ShieldCheck className="h-4 w-4" /> Cryptographically Isolated Second Brain
          </motion.div>

          {/* Hero Heading */}
          <motion.h1
            variants={staggerItem}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground mb-6 font-display leading-[1.1]"
          >
            Your private AI second brain. <br />
            <span className="text-muted-foreground">Zero compromises.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={staggerItem}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Reflect, journal, and synthesize long-term memories with an AI assistant strictly bound by a Non-Negotiable Security Constitution. Your thoughts are never trained on.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/signup">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                <Button size="lg" variant="default" className="px-8 shadow-premium gap-2 text-base">
                  Start Your Private Vault <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <a href="#constitution">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
                <Button size="lg" variant="outline" className="px-6 text-base">
                  Read Security Constitution
                </Button>
              </motion.div>
            </a>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            variants={staggerItem}
            className="mt-12 flex flex-wrap justify-center items-center gap-6 text-xs text-muted-foreground font-medium"
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Strict UID Data Isolation</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero Browser Keys</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Prompt Injection Protected</span>
          </motion.div>
        </motion.section>

        {/* Features Grid — scroll-triggered with stagger */}
        <motion.section
          className="py-20 bg-background w-full border-y border-foreground/10"
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={defaultViewport}
          transition={sectionRevealTransition}
        >
          <motion.div
            className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={defaultViewport}
          >
            {[
              {
                icon: Sparkles,
                title: 'Intelligent Reflection',
                desc: 'Transform daily journaling into structured memories, active goals, and atomic facts automatically via Gemini 1.5.',
              },
              {
                icon: Network,
                title: 'Memory Graph Visualizer',
                desc: 'Explore a 2D interactive force-directed graph illustrating how your memories, projects, and decisions connect across time.',
              },
              {
                icon: Shield,
                title: 'Ask My Memory (RAG)',
                desc: 'Query your past decisions, feelings, and goals in plain language with explicit, verifiable source citations.',
              },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={staggerItem}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="p-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:shadow-premium transition-colors duration-200 space-y-4 cursor-default"
              >
                <div className="h-12 w-12 bg-foreground/10 text-foreground rounded-xl flex items-center justify-center border border-foreground/5">
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Security Constitution Section */}
        <motion.section
          id="constitution"
          className="py-24 px-6 max-w-4xl mx-auto text-center"
          variants={sectionReveal}
          initial="initial"
          whileInView="animate"
          viewport={defaultViewport}
          transition={sectionRevealTransition}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 text-foreground text-xs font-semibold uppercase tracking-wider mb-6">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Non-Negotiable Architecture
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-display text-foreground">
            Built on cryptographic trust.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-12 max-w-2xl mx-auto">
            MindVault AI separates the untrusted browser from our GCP Cloud Run backend. Secrets are managed in Google Secret Manager, database writes are restricted by UID, and inputs are sanitized.
          </p>

          <motion.div
            className="bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-6 sm:p-8 shadow-subtle max-w-2xl mx-auto text-left space-y-4"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 border-b border-foreground/10">
              <span>Untrusted Client</span>
              <span>API Firewalled Zone</span>
              <span>Private Firestore</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every request transmits a short-lived Firebase Bearer Token. The backend validates token signatures with Firebase Admin before ever querying Firestore or invoking Google Generative AI models.
            </p>
          </motion.div>
        </motion.section>
      </main>

      <footer className="py-8 text-center text-xs text-muted-foreground bg-background border-t border-foreground/10">
        © {new Date().getFullYear()} MindVault AI. All rights reserved. Built with privacy-first engineering.
      </footer>
    </motion.div>
  );
};

export default LandingPage;
