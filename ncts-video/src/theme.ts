/**
 * NCTS Video — Premium Design Token System
 * Inspired by Linear, Stripe, and Vercel dark-mode aesthetics
 */

export const colors = {
  // Backgrounds — layered depth (never flat black)
  bg: "#060B18",
  bgAlt: "#0A1628",
  bgCard: "#0F1D32",
  bgElevated: "#142640",

  // Text hierarchy
  white: "#F8FAFC",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  textDim: "#475569",

  // Brand accents
  green: "#00C853",
  greenDark: "#009624",
  greenSoft: "#00C85320",
  greenGlow: "#00C85340",
  gold: "#FFB81C",
  goldSoft: "#FFB81C20",
  goldGlow: "#FFB81C35",
  blue: "#3B82F6",
  blueSoft: "#3B82F620",
  blueGlow: "#3B82F640",
  red: "#EF4444",
  redSoft: "#EF444420",
  orange: "#F97316",

  // Government deep blue
  primary: "#1B3A5C",
  primaryLight: "#2A5B8C",

  // Glassmorphism
  glassBg: "rgba(255, 255, 255, 0.04)",
  glassBgMedium: "rgba(255, 255, 255, 0.06)",
  glassBgHeavy: "rgba(255, 255, 255, 0.10)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glassBorderLight: "rgba(255, 255, 255, 0.05)",
  glassBorderHeavy: "rgba(255, 255, 255, 0.15)",

  // SA Flag
  saGreen: "#007A4D",
  saGold: "#FFB81C",
  saRed: "#DE3831",
  saBlue: "#002395",
} as const;

export const fonts = {
  heading: "Inter, system-ui, -apple-system, sans-serif",
  body: "Inter, system-ui, -apple-system, sans-serif",
  mono: "JetBrains Mono, Fira Code, monospace",
} as const;

/** Spring presets for different animation feels */
export const springs = {
  snappy: { damping: 20, stiffness: 200, mass: 0.5 },
  smooth: { damping: 15, stiffness: 80, mass: 0.8 },
  heavy: { damping: 25, stiffness: 60, mass: 1.2 },
  bouncy: { damping: 8, stiffness: 120, mass: 0.6 },
  gentle: { damping: 18, stiffness: 50, mass: 1.0 },
} as const;

/** Shadow scale */
export const shadows = {
  sm: "0 2px 8px rgba(0,0,0,0.2)",
  md: "0 4px 16px rgba(0,0,0,0.3)",
  lg: "0 8px 32px rgba(0,0,0,0.4)",
  xl: "0 16px 48px rgba(0,0,0,0.5)",
  glow: (color: string) => `0 0 40px ${color}, 0 0 80px ${color}`,
  glowSoft: (color: string) => `0 0 20px ${color}, 0 0 60px ${color}`,
} as const;

/** Glassmorphism presets */
export const glass = {
  card: {
    background: colors.glassBg,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${colors.glassBorder}`,
    borderRadius: 16,
    boxShadow: shadows.lg,
  } as React.CSSProperties,
  cardMedium: {
    background: colors.glassBgMedium,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${colors.glassBorderHeavy}`,
    borderRadius: 16,
    boxShadow: shadows.lg,
  } as React.CSSProperties,
  panel: {
    background: colors.glassBgHeavy,
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    border: `1px solid ${colors.glassBorderHeavy}`,
    borderRadius: 20,
    boxShadow: shadows.xl,
  } as React.CSSProperties,
} as const;

import React from "react";
