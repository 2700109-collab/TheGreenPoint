/**
 * NCTS Video — Premium Animation Component Library
 * Cinematic-quality reusable animation primitives
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs, glass, shadows } from "../theme";

/* ═══════════════════════════════════════════════════════════
   BACKGROUND EFFECTS
   ═══════════════════════════════════════════════════════════ */

/**
 * Animated gradient mesh — 3-4 large blurred orbs that drift slowly.
 * This single component transforms flat backgrounds into premium depth.
 */
export const GradientMesh: React.FC<{
  orbs?: Array<{ color: string; x: number; y: number; size?: number }>;
  speed?: number;
  opacity?: number;
}> = ({
  orbs = [
    { color: colors.green, x: 25, y: 30 },
    { color: colors.gold, x: 75, y: 60 },
    { color: colors.blue, x: 50, y: 80 },
  ],
  speed = 0.003,
  opacity = 0.25,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {orbs.map((orb, i) => {
        const phase = (i * Math.PI * 2) / orbs.length;
        const x = orb.x + Math.sin(frame * speed + phase) * 8;
        const y = orb.y + Math.cos(frame * speed * 0.7 + phase) * 6;
        const size = orb.size || 400;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: orb.color,
              filter: `blur(${size * 0.35}px)`,
              opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Floating ambient particles — adds subtle life to any background.
 * Uses golden angle distribution for natural-looking spread.
 */
export const Particles: React.FC<{
  count?: number;
  color?: string;
  speed?: number;
  maxOpacity?: number;
}> = ({ count = 25, color = colors.white, speed = 0.008, maxOpacity = 0.3 }) => {
  const frame = useCurrentFrame();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  const particles = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = i * goldenAngle;
        const r = Math.sqrt(i / count) * 50;
        return {
          baseX: 50 + r * Math.cos(angle),
          baseY: 50 + r * Math.sin(angle),
          size: 1.5 + (i % 5) * 1.2,
          speedMult: 0.5 + (i % 7) * 0.15,
          phase: (i * 1.7) % (Math.PI * 2),
          opacityMult: 0.3 + (i % 4) * 0.2,
        };
      }),
    [count]
  );

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {particles.map((p, i) => {
        const x = p.baseX + Math.sin(frame * speed * p.speedMult + p.phase) * 3;
        const y = p.baseY + Math.cos(frame * speed * p.speedMult * 0.8 + p.phase) * 2.5;
        const pulse = 0.7 + Math.sin(frame * 0.03 + p.phase) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: maxOpacity * p.opacityMult * pulse,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * SVG noise overlay — subtle film grain for premium analog depth.
 */
export const NoiseOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.025 }) => (
  <svg
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }}
  >
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   TEXT ANIMATIONS
   ═══════════════════════════════════════════════════════════ */

/**
 * Staggered text reveal — words animate in sequence with blur dissolve.
 * The signature "premium tech video" text animation.
 */
export const StaggeredText: React.FC<{
  text: string;
  delay?: number;
  staggerFrames?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  letterSpacing?: string;
  fontFamily?: string;
  textAlign?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
}> = ({
  text,
  delay = 0,
  staggerFrames = 4,
  fontSize = 48,
  fontWeight = 700,
  color = colors.white,
  letterSpacing,
  fontFamily = fonts.heading,
  textAlign = "center",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: textAlign === "center" ? "center" : "flex-start", gap: fontSize * 0.22, ...style }}>
      {words.map((word, i) => {
        const wordDelay = delay + i * staggerFrames;
        const progress = spring({
          frame: frame - wordDelay,
          fps,
          config: springs.snappy,
        });
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const y = interpolate(progress, [0, 1], [12, 0]);
        const blur = interpolate(progress, [0, 1], [6, 0]);

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight,
              color,
              fontFamily,
              letterSpacing,
              opacity,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              display: "inline-block",
              lineHeight: 1.2,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Mask reveal — text revealed via clip-path wipe from left to right.
 */
export const MaskReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: "left" | "right" | "up" | "down";
}> = ({ children, delay = 0, duration = 20, direction = "left" }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const clipPaths: Record<string, string> = {
    left: `inset(0 ${100 - progress}% 0 0)`,
    right: `inset(0 0 0 ${100 - progress}%)`,
    up: `inset(0 0 ${100 - progress}% 0)`,
    down: `inset(${100 - progress}% 0 0 0)`,
  };

  return <div style={{ clipPath: clipPaths[direction] }}>{children}</div>;
};

/**
 * TypeWriter — character-by-character reveal with blinking cursor.
 */
export const TypeWriter: React.FC<{
  text: string;
  delay?: number;
  speed?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  showCursor?: boolean;
}> = ({
  text,
  delay = 0,
  speed = 2,
  fontSize = 20,
  color = colors.textSecondary,
  fontFamily = fonts.mono,
  showCursor = true,
}) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.min(
    Math.max(Math.floor((frame - delay) / speed), 0),
    text.length
  );
  const cursorVisible = Math.floor(frame * 0.06) % 2 === 0;

  return (
    <span style={{ fontSize, color, fontFamily, letterSpacing: "0.03em" }}>
      {text.slice(0, charsToShow)}
      {showCursor && charsToShow < text.length && (
        <span style={{ opacity: cursorVisible ? 1 : 0, color: colors.green }}>▋</span>
      )}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   ENTRANCE ANIMATIONS
   ═══════════════════════════════════════════════════════════ */

/**
 * Fade-in with upward drift and optional blur dissolve.
 */
export const FadeInUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  blur?: boolean;
  springConfig?: typeof springs.smooth;
}> = ({ children, delay = 0, distance = 30, blur = true, springConfig = springs.smooth }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springConfig });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [distance, 0]);
  const blurVal = blur ? interpolate(progress, [0, 1], [8, 0]) : 0;

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, filter: blurVal > 0.1 ? `blur(${blurVal}px)` : undefined }}>
      {children}
    </div>
  );
};

/**
 * Scale-in with glow pulse on arrival.
 */
export const ScaleIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  glowColor?: string;
}> = ({ children, delay = 0, glowColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springs.bouncy });
  const scale = interpolate(progress, [0, 1], [0.3, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const glowOpacity = glowColor ? interpolate(progress, [0, 0.8, 1], [0, 0.6, 0.3]) : 0;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        filter: glowColor && glowOpacity > 0 ? `drop-shadow(0 0 30px ${glowColor})` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Slide in from direction with spring physics.
 */
export const SlideIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  from?: "left" | "right" | "top" | "bottom";
  distance?: number;
}> = ({ children, delay = 0, from = "left", distance = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springs.smooth });
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const transforms: Record<string, string> = {
    left: `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)`,
    right: `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)`,
    top: `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)`,
    bottom: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };

  return <div style={{ opacity, transform: transforms[from] }}>{children}</div>;
};

/* ═══════════════════════════════════════════════════════════
   DATA VISUALISATION
   ═══════════════════════════════════════════════════════════ */

/**
 * Premium animated counter with scale-punch on arrival.
 */
export const PremiumCounter: React.FC<{
  value: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
  format?: (n: number) => string;
}> = ({
  value,
  delay = 0,
  prefix = "",
  suffix = "",
  fontSize = 64,
  color = colors.white,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 100, mass: 0.7 } });
  const count = Math.round(interpolate(progress, [0, 1], [0, value]));

  // Scale punch: overshoot to 1.08 then settle to 1
  const scalePunch = progress > 0.9
    ? interpolate(progress, [0.9, 0.95, 1], [1, 1.08, 1], { extrapolateRight: "clamp" })
    : 1;

  const formatted = format ? format(count) : count.toLocaleString();

  return (
    <span
      style={{
        fontSize,
        fontWeight: 800,
        fontFamily: fonts.heading,
        color,
        transform: `scale(${scalePunch})`,
        display: "inline-block",
        letterSpacing: "-0.02em",
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

/**
 * Animated progress ring — circular gauge with gradient stroke.
 */
export const ProgressRing: React.FC<{
  progress: number; // 0-100
  delay?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}> = ({ progress: target, delay = 0, size = 100, strokeWidth = 6, color = colors.green, bgColor = "rgba(255,255,255,0.06)" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const animProgress = spring({ frame: frame - delay, fps, config: springs.smooth });
  const current = interpolate(animProgress, [0, 1], [0, target]);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - current / 100);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/**
 * Glassmorphism card — the premium container.
 */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  variant?: "subtle" | "medium" | "heavy";
  padding?: number;
  glow?: string;
}> = ({ children, delay = 0, style, variant = "subtle", padding = 24, glow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springs.smooth });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [20, 0]);

  const presets = {
    subtle: glass.card,
    medium: glass.cardMedium,
    heavy: glass.panel,
  };

  return (
    <div
      style={{
        ...presets[variant],
        padding,
        opacity,
        transform: `translateY(${y}px)`,
        ...(glow ? { boxShadow: `${shadows.lg}, ${shadows.glowSoft(glow)}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Gradient border card — animated rotating conic gradient edge.
 */
export const GradientBorderCard: React.FC<{
  children: React.ReactNode;
  delay?: number;
  colors?: string[];
  borderWidth?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  delay = 0,
  colors: gradColors = [colors.green, colors.gold, colors.blue, colors.green],
  borderWidth = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springs.smooth });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const rotation = frame * 1.5;

  return (
    <div
      style={{
        opacity,
        position: "relative",
        borderRadius: 16,
        padding: borderWidth,
        background: `conic-gradient(from ${rotation}deg, ${gradColors.join(", ")})`,
        ...style,
      }}
    >
      <div
        style={{
          background: colors.bgCard,
          borderRadius: 15,
          padding: 24,
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * SA Flag stripe — animated multi-color stripe bar.
 */
export const SAFlagStripe: React.FC<{
  height?: number;
  position?: "top" | "bottom";
  delay?: number;
}> = ({ height = 4, position = "bottom", delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springs.snappy });
  const width = interpolate(progress, [0, 1], [0, 100]);

  return (
    <div
      style={{
        position: "absolute",
        [position]: 0,
        left: 0,
        right: 0,
        height,
        display: "flex",
        overflow: "hidden",
        clipPath: `inset(0 ${100 - width}% 0 0)`,
      }}
    >
      <div style={{ flex: 1, background: colors.saGreen }} />
      <div style={{ flex: 1, background: colors.saGold }} />
      <div style={{ flex: 1, background: colors.saRed }} />
      <div style={{ flex: 1, background: colors.saBlue }} />
    </div>
  );
};

/**
 * Shimmer highlight — a moving shine effect across a surface.
 */
export const ShimmerHighlight: React.FC<{
  width?: number;
  height?: number;
  delay?: number;
}> = ({ width = 1920, height = 1080, delay = 0 }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame - delay, [0, 60], [-400, width + 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: x,
        width: 200,
        height,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",
        transform: "skewX(-15deg)",
        pointerEvents: "none",
      }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════
   SCENE UTILITIES
   ═══════════════════════════════════════════════════════════ */

/**
 * Standard scene wrapper with gradient mesh background, particles, and noise.
 * Provides consistent premium look across all scenes.
 */
export const SceneContainer: React.FC<{
  children: React.ReactNode;
  orbs?: Array<{ color: string; x: number; y: number; size?: number }>;
  particleColor?: string;
  meshOpacity?: number;
  background?: string;
}> = ({
  children,
  orbs,
  particleColor = colors.white,
  meshOpacity = 0.2,
  background = `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgAlt} 50%, ${colors.bg} 100%)`,
}) => (
  <div
    style={{
      width: 1920,
      height: 1080,
      background,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <GradientMesh orbs={orbs} opacity={meshOpacity} />
    <Particles color={particleColor} />
    <NoiseOverlay />
    <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  </div>
);

/**
 * Horizontal divider line with gradient fade.
 */
export const GradientLine: React.FC<{
  color?: string;
  width?: string;
  delay?: number;
}> = ({ color = colors.green, width = "60%", delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: springs.snappy });
  const scaleX = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width,
        height: 1,
        margin: "0 auto",
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        transform: `scaleX(${scaleX})`,
        opacity: 0.5,
      }}
    />
  );
};
