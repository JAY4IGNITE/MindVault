/**
 * MindVault AI — Centralized Motion System
 * All reusable animation variants live here.
 * Import these across components for consistent motion language.
 */

import type { Variants, Transition } from 'motion/react';

// ─── Duration Tokens ──────────────────────────────────────────────────────────
export const duration = {
  micro: 0.15,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  enter: 0.6,
} as const;

// ─── Easing Tokens ────────────────────────────────────────────────────────────
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

// ─── Base Transitions ─────────────────────────────────────────────────────────
export const transitions = {
  micro: { duration: duration.micro, ease: ease.out } satisfies Transition,
  fast: { duration: duration.fast, ease: ease.out } satisfies Transition,
  normal: { duration: duration.normal, ease: ease.out } satisfies Transition,
  slow: { duration: duration.slow, ease: ease.out } satisfies Transition,
  enter: { duration: duration.enter, ease: ease.out } satisfies Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } satisfies Transition,
  springSnappy: { type: 'spring', stiffness: 400, damping: 35 } satisfies Transition,
} as const;

// ─── Page Transition ──────────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
  duration: duration.normal,
  ease: ease.out,
};

// ─── Fade Up — Primary entrance pattern ──────────────────────────────────────
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export const fadeUpTransition: Transition = {
  duration: duration.slow,
  ease: ease.out,
};

// ─── Fade In — Simple opacity entrance ────────────────────────────────────────
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Scale Fade — Card / modal entrance ───────────────────────────────────────
export const scaleFade: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 },
};

// ─── Stagger Container ────────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.0,
    },
  },
};

// ─── Stagger Item ─────────────────────────────────────────────────────────────
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.out },
  },
};

// ─── Navigation Entrance ──────────────────────────────────────────────────────
export const navEntrance: Variants = {
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

// ─── Sidebar Item Stagger ─────────────────────────────────────────────────────
export const sidebarContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const sidebarItem: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal, ease: ease.out },
  },
};

// ─── Mobile Drawer ────────────────────────────────────────────────────────────
export const drawerVariants: Variants = {
  initial: { x: '-100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Auth Card ────────────────────────────────────────────────────────────────
export const authCard: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export const authCardTransition: Transition = {
  duration: duration.slow,
  ease: ease.out,
};

// ─── Error / Toast Entrance ───────────────────────────────────────────────────
export const errorEntrance: Variants = {
  initial: { opacity: 0, y: -6, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -4, height: 0 },
};

// ─── Section Reveal (scroll-triggered) ───────────────────────────────────────
export const sectionReveal: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export const sectionRevealTransition: Transition = {
  duration: duration.slow,
  ease: ease.out,
};

// ─── Viewport config ──────────────────────────────────────────────────────────
export const defaultViewport = { once: true, amount: 0.2 as number };
