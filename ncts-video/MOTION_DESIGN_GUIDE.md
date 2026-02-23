# Premium Motion Design Guide for Remotion Tech Proposal Videos

> **Target**: 1920×1080 @ 30fps | React + inline styles | `interpolate()` + `spring()`  
> **Reference tier**: Apple keynotes, Stripe animations, Linear.app, Vercel ship videos

---

## 1. Color & Visual Hierarchy

### What Makes Dark-Mode Look Premium vs Cheap

**Cheap dark mode**: Pure `#000000` background, saturated neon colors, uniform gray text.  
**Premium dark mode**: Layered near-blacks with subtle blue/purple undertones, desaturated accent colors, multiple text luminance levels.

#### The Layered Dark Background System

Never use flat black. Use at minimum 3 depth layers:

```tsx
// PREMIUM DARK PALETTE — layered depth
const darkLayers = {
  void:    '#06080C',  // Deepest — behind everything
  surface: '#0C1018',  // Card backgrounds
  raised:  '#141C28',  // Elevated cards, modals
  border:  '#1E2A3A',  // Subtle borders (NOT gray — blue-tinted)
  
  // Text hierarchy (4 levels minimum)
  textPrimary:   '#F0F2F5',  // Headlines — NOT pure white (#FFF is harsh)
  textSecondary: '#A0AAB8',  // Body text
  textTertiary:  '#5C6A7A',  // Labels, captions
  textMuted:     '#3A4656',  // Disabled, watermarks
};
```

#### Apple/Stripe Color Strategy: "One Hero Color"

The rule: **one saturated accent, everything else desaturated**. Your existing green (`#007A4D`) is the hero. Everything else should be muted.

```tsx
// Accent usage ratio
// 5% of screen area: hero green (#007A4D / #00A86B)
// 3%: gold accent (#FFB81C) — secondary only
// 92%: dark navy + white/gray text

// WRONG: Multiple bright colors competing
// RIGHT: One green glow focal point pulling the eye
```

#### Gradient Rules (Stripe/Linear Style)

Premium gradients are **long and subtle** — not two contrasting colors:

```tsx
// BAD: Hard gradient
background: 'linear-gradient(135deg, #007A4D 0%, #FFB81C 100%)'

// GOOD: Ultra-subtle ambient glow  
background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #007A4D12 0%, transparent 70%)'

// GOOD: Barely-there directional shift
background: 'linear-gradient(180deg, #0C1018 0%, #0E1525 50%, #0C1018 100%)'
```

#### The "Glow" Technique (What Makes Apple Keynotes Look Expensive)

Large, blurred, low-opacity radial elements behind focal points:

```tsx
// Hero glow — place BEHIND key content
<div style={{
  position: 'absolute',
  width: 800,
  height: 800,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #007A4D40 0%, #007A4D00 70%)',
  filter: 'blur(120px)',  // KEY: much larger blur than you'd expect
  opacity: 0.6,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}} />

// Animate the glow slowly (parallax with content)
const glowX = interpolate(frame, [0, 300], [-100, 100]);
const glowScale = 1 + Math.sin(frame * 0.02) * 0.08; // Subtle breathing
```

---

## 2. Typography Animation

### Technique 1: Staggered Word Reveal (Most Versatile)

Each word fades in + slides up with a stagger delay. This is Linear/Vercel's signature.

```tsx
export const StaggeredText: React.FC<{
  text: string;
  delay?: number;
  staggerFrames?: number;  // frames between each word
  style?: React.CSSProperties;
}> = ({ text, delay = 0, staggerFrames = 4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0 12px', ...style }}>
      {words.map((word, i) => {
        const wordDelay = delay + i * staggerFrames;
        const progress = spring({
          frame: frame - wordDelay,
          fps,
          config: { damping: 20, stiffness: 120, mass: 0.5 },
          // ↑ HIGH stiffness + LOW mass = snappy, not floaty
        });
        const y = interpolate(progress, [0, 1], [24, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        return (
          <span key={i} style={{
            display: 'inline-block',
            opacity,
            transform: `translateY(${y}px)`,
          }}>
            {word}
          </span>
        );
      })}
    </span>
  );
};

// Usage: staggerFrames=4 at 30fps = 133ms per word
// A 6-word title completes in ~0.8s total — fast, punchy
```

### Technique 2: Clip-Path Mask Reveal (Apple Keynote Style)

Text appears by a rectangular mask sliding across. More cinematic than fade-in.

```tsx
export const MaskReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  durationFrames?: number;
}> = ({ children, delay = 0, direction = 'left', durationFrames = 20 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame - delay,
    [0, durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  // Apply easeOut cubic
  const eased = 1 - Math.pow(1 - progress, 3);

  const clipPaths: Record<string, string> = {
    left:  `inset(0 ${100 - eased * 100}% 0 0)`,
    right: `inset(0 0 0 ${100 - eased * 100}%)`,
    up:    `inset(0 0 ${100 - eased * 100}% 0)`,
    down:  `inset(${100 - eased * 100}% 0 0 0)`,
  };

  return (
    <div style={{ clipPath: clipPaths[direction] }}>
      {children}
    </div>
  );
};
```

### Technique 3: Character-by-Character (For Hero Numbers/Stat Lines)

Best for revealing a single dramatic number like "R2.3 Billion".

```tsx
export const CharReveal: React.FC<{
  text: string;
  delay?: number;
  frameDuration?: number; // total frames for all chars
  style?: React.CSSProperties;
}> = ({ text, delay = 0, frameDuration = 30, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <span style={{ display: 'inline-flex', ...style }}>
      {text.split('').map((char, i) => {
        const charDelay = delay + (i / text.length) * frameDuration * 0.6;
        const progress = spring({
          frame: frame - charDelay,
          fps,
          config: { damping: 14, stiffness: 160, mass: 0.4 },
        });
        const y = interpolate(progress, [0, 1], [40, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const blur = interpolate(progress, [0, 0.5, 1], [4, 1, 0]);
        return (
          <span key={i} style={{
            display: 'inline-block',
            opacity,
            transform: `translateY(${y}px)`,
            filter: `blur(${blur}px)`,
            minWidth: char === ' ' ? '0.3em' : undefined,
          }}>
            {char}
          </span>
        );
      })}
    </span>
  );
};
```

### Technique 4: Accent Color Wipe on Text

A highlight color sweeps through the text, leaving it colored.

```tsx
export const ColorWipe: React.FC<{
  text: string;
  delay?: number;
  baseColor?: string;
  accentColor?: string;
}> = ({ text, delay = 0, baseColor = '#F0F2F5', accentColor = '#00A86B' }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 30], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const eased = 1 - Math.pow(1 - progress / 100, 2.5);
  const pos = eased * 100;

  return (
    <span style={{
      backgroundImage: `linear-gradient(90deg, ${accentColor} ${pos - 5}%, ${baseColor} ${pos + 5}%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>
      {text}
    </span>
  );
};
```

### Typography Sizing Rules (1920×1080)

| Role | Size | Weight | Letter Spacing | Line Height |
|------|------|--------|----------------|-------------|
| Hero stat (R2.3B) | 96–120px | 800 | -2px | 1.0 |
| Section title | 48–56px | 700–800 | -1px | 1.15 |
| Subtitle | 24–28px | 500–600 | 0px | 1.4 |
| Body text | 18–20px | 400 | 0.2px | 1.5 |
| Label/overline | 12–14px | 600 | 3–4px | 1.3 |
| Micro caption | 11–12px | 500 | 0.5px | 1.3 |

**Critical**: Negative letter-spacing on large text (-1 to -3px) is what makes headings look premium. Positive tracking (3–5px) on ALL-CAPS labels.

---

## 3. Data Visualization Animation

### Animated Counter (Improved Version)

Your current `AnimatedCounter` uses a single spring. Premium counters use **easeOut with overshoot** and a **trailing decimal blur**:

```tsx
export const PremiumCounter: React.FC<{
  target: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  decimals?: number;
  style?: React.CSSProperties;
}> = ({ target, prefix = '', suffix = '', delay = 0, decimals = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use two-phase animation: fast ramp-up + slow settle
  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 28,      // Higher damping = no bounce
      stiffness: 50,    // Lower stiffness = slower settle (feels weighty)
      mass: 1.2,        // Higher mass = more momentum
    },
  });

  const value = interpolate(progress, [0, 1], [0, target]);
  
  // Scale punch on arrival
  const scaleProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.3 },
  });
  const scale = interpolate(scaleProgress, [0, 0.8, 1], [0.85, 1.08, 1]);

  return (
    <span style={{
      display: 'inline-block',
      transform: `scale(${scale})`,
      ...style,
    }}>
      {prefix}
      {value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      {suffix}
    </span>
  );
};

// Timing guide:
// Counter starts: delay frames after scene start
// Duration to reach ~90%: about 25 frames (0.83s) 
// Full settle: ~45 frames (1.5s)
// Hold on screen after settle: minimum 45 frames (1.5s) for reading
```

### KPI Card Entrance (Dashboard Style)

Stagger KPI cards in a grid with delay cascade:

```tsx
// Stagger pattern for 2×2 KPI grid:
// Card positions:  [0] [1]
//                  [2] [3]
// Delays (frames):  0   5
//                   8  13
// This creates a diagonal cascade (top-left → bottom-right)

const cardStagger = (row: number, col: number) => row * 8 + col * 5;
```

### Donut Chart Animation

```tsx
export const AnimatedDonut: React.FC<{
  segments: { value: number; color: string; label: string }[];
  size?: number;
  delay?: number;
}> = ({ segments, size = 200, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 30, stiffness: 40, mass: 1.5 },
  });

  let accumulated = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const segmentLength = (seg.value / total) * circumference;
        const offset = accumulated;
        accumulated += segmentLength;
        
        const segProgress = interpolate(
          progress,
          [i / segments.length, Math.min(1, (i + 1.2) / segments.length)],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength * segProgress} ${circumference}`}
            strokeDashoffset={-offset * progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </svg>
  );
};
```

### Bar Chart Growth Animation

```tsx
// Premium bar animation: bars grow from bottom with stagger
const BarChart: React.FC<{ data: number[]; delay?: number }> = ({ data, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxVal = Math.max(...data);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
      {data.map((val, i) => {
        const barProgress = spring({
          frame: frame - delay - i * 4,  // 4-frame stagger per bar
          fps,
          config: { damping: 15, stiffness: 120, mass: 0.6 },
        });
        const height = interpolate(barProgress, [0, 1], [0, (val / maxVal) * 180]);
        
        return (
          <div key={i} style={{
            width: 32,
            height,
            borderRadius: '6px 6px 0 0',
            background: `linear-gradient(180deg, #00A86B 0%, #007A4D 100%)`,
            opacity: interpolate(barProgress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
          }} />
        );
      })}
    </div>
  );
};
```

### Timing Rules for Data Viz

| Element | Entrance Duration | Hold Time | Notes |
|---------|------------------|-----------|-------|
| Single KPI number | 25–35 frames | 45+ frames | Let it breathe after landing |
| KPI card grid (4 cards) | 13 frames stagger total | 50+ frames | All visible for reading |
| Progress bar fill | 30 frames | 30+ frames | Linear easeOut, not spring |
| Donut chart draw | 40–60 frames | 40+ frames | Slow & smooth |
| Bar chart (6 bars) | 20–frame stagger total | 40+ frames | Fast stagger, slow settle |

---

## 4. Particle & Ambient Effects

### Technique 1: Floating Micro-Particles (Improved)

Your current particles are static circles. Premium particles have **varied sizes, drift, and subtle pulsing**:

```tsx
export const AmbientParticles: React.FC<{
  count?: number;
  color?: string;
  maxSize?: number;
  drift?: number;
}> = ({ count = 40, color = '#007A4D', maxSize = 4, drift = 30 }) => {
  const frame = useCurrentFrame();

  // Pre-generate stable positions using golden angle distribution
  const particles = React.useMemo(() => 
    Array.from({ length: count }, (_, i) => {
      const goldenAngle = 137.508;
      const r = Math.sqrt(i / count);
      const theta = i * goldenAngle * (Math.PI / 180);
      return {
        baseX: 960 + r * 900 * Math.cos(theta),
        baseY: 540 + r * 500 * Math.sin(theta),
        size: 1 + (i % 4) * (maxSize / 4),
        phase: (i * 2.399) % (Math.PI * 2), // Golden angle for phase offset
        speedX: 0.008 + (i % 7) * 0.003,
        speedY: 0.005 + (i % 5) * 0.004,
        opacityBase: 0.04 + (i % 3) * 0.03,
      };
    }), [count, maxSize]);

  return (
    <>
      {particles.map((p, i) => {
        const x = p.baseX + Math.sin(frame * p.speedX + p.phase) * drift;
        const y = p.baseY + Math.cos(frame * p.speedY + p.phase) * drift * 0.7;
        const opacity = p.opacityBase + Math.sin(frame * 0.03 + p.phase) * 0.02;
        
        return (
          <div key={i} style={{
            position: 'absolute',
            left: x,
            top: y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            opacity,
            willChange: 'transform',
          }} />
        );
      })}
    </>
  );
};
```

### Technique 2: Gradient Mesh / Ambient Blobs (Stripe Style)

Large, ultra-blurred, slowly moving color blobs. This is what gives Stripe/Vercel backgrounds their "alive" feeling:

```tsx
export const GradientMesh: React.FC<{
  colors?: string[];
  speed?: number;
}> = ({ colors: blobColors = ['#007A4D', '#1B3A5C', '#FFB81C'], speed = 1 }) => {
  const frame = useCurrentFrame();

  const blobs = blobColors.map((color, i) => {
    const angle = (i / blobColors.length) * Math.PI * 2;
    const x = 960 + Math.sin(frame * 0.008 * speed + angle) * 400;
    const y = 540 + Math.cos(frame * 0.006 * speed + angle * 1.3) * 250;
    
    return (
      <div key={i} style={{
        position: 'absolute',
        left: x - 400,
        top: y - 400,
        width: 800,
        height: 800,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        filter: 'blur(150px)',   // VERY large blur
        opacity: 0.4,
        mixBlendMode: 'screen' as const,
      }} />
    );
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {blobs}
    </div>
  );
};
```

### Technique 3: Animated Grid / Dot Matrix

Subtle grid that pulses near content:

```tsx
export const AnimatedGrid: React.FC<{
  spacing?: number;
  dotSize?: number;
  color?: string;
}> = ({ spacing = 40, dotSize = 1.5, color = '#FFFFFF' }) => {
  const frame = useCurrentFrame();
  const cols = Math.ceil(1920 / spacing);
  const rows = Math.ceil(1080 / spacing);

  return (
    <svg style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          // Distance from center for radial pulse
          const dx = (c * spacing - 960) / 960;
          const dy = (r * spacing - 540) / 540;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pulse = Math.sin(frame * 0.04 - dist * 3) * 0.5 + 0.5;
          
          return (
            <circle
              key={`${r}-${c}`}
              cx={c * spacing}
              cy={r * spacing}
              r={dotSize + pulse * 0.8}
              fill={color}
              opacity={0.3 + pulse * 0.5}
            />
          );
        })
      )}
    </svg>
  );
};
```

### Technique 4: Noise Texture Overlay

Apply via a static SVG filter or a semi-transparent noisy PNG. This adds "film grain" that makes flat colors feel tactile:

```tsx
// SVG noise overlay — add as last child of scene
export const NoiseOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => (
  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);
```

### Ambient Effect Opacity Guidelines

| Effect | Opacity | Blur | Movement Speed |
|--------|---------|------|----------------|
| Background glow blob | 0.2–0.4 | 100–180px | 0.005–0.01 rad/frame |
| Floating particles | 0.04–0.12 | none | 0.003–0.01 rad/frame |
| Dot grid | 0.05–0.1 | none | 0.02–0.06 rad/frame (pulse) |
| Noise texture | 0.02–0.05 | none | static |
| Color gradient mesh | 0.3–0.5 | 120–200px | 0.006–0.01 rad/frame |

**Rule**: If you notice the ambient effect while watching, it's too strong. Reduce by 30%.

---

## 5. Camera & Composition

### Simulated Camera Movements in 2D

#### Slow Ken Burns (Parallax Zoom)

Apply a gentle scale animation to the entire scene. Different layers scale at different rates:

```tsx
const CameraZoom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  
  // Background layer: slow zoom
  const bgScale = interpolate(frame, [0, 300], [1.0, 1.05], {
    extrapolateRight: 'clamp',
  });
  // Foreground: slightly faster zoom creates parallax
  const fgScale = interpolate(frame, [0, 300], [1.0, 1.02], {
    extrapolateRight: 'clamp',
  });
  
  // Subtle drift (not perfectly centered)
  const driftX = interpolate(frame, [0, 300], [0, -20]);
  const driftY = interpolate(frame, [0, 300], [0, -10]);

  return (
    <div style={{
      transform: `scale(${bgScale}) translate(${driftX}px, ${driftY}px)`,
      transformOrigin: '55% 45%',  // Off-center = more natural
    }}>
      {children}
    </div>
  );
};
```

#### Parallax Depth Layers

Assign Z-layers to elements. Move them at different rates to simulate 3D depth:

```tsx
// Layer system — each layer has a different parallax rate
const useParallax = (layer: number) => {
  const frame = useCurrentFrame();
  // Layer 0 = background (moves slowest)
  // Layer 1 = midground
  // Layer 2 = foreground (moves fastest)
  const rate = 0.3 + layer * 0.15;
  const x = Math.sin(frame * 0.008) * 30 * rate;
  const y = Math.cos(frame * 0.006) * 15 * rate;
  return { transform: `translate(${x}px, ${y}px)` };
};

// Usage:
// <div style={useParallax(0)}>  — background grid barely moves
// <div style={useParallax(1)}>  — mid-layer content
// <div style={useParallax(2)}>  — foreground cards move more
```

#### Rack Focus Blur (Depth-of-Field)

Blur background when showing foreground detail:

```tsx
// Transition from scene overview → focused detail
const rackFocusProgress = interpolate(frame, [30, 50], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});

// Background blurs OUT
const bgBlur = interpolate(rackFocusProgress, [0, 1], [0, 8]);
// Foreground blurs IN (was blurry, becomes sharp)
const fgBlur = interpolate(rackFocusProgress, [0, 1], [6, 0]);

// <div style={{ filter: `blur(${bgBlur}px)` }}>  background
// <div style={{ filter: `blur(${fgBlur}px)` }}>  foreground detail
```

### Composition Rules for 1920×1080

```
┌────────────────────────────────────────┐
│ 80px padding top                       │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │     CONTENT SAFE ZONE            │  │
│  │     120px horizontal padding     │  │
│  │                                  │  │
│  │     For hero text:               │  │
│  │     Center vertically OR         │  │
│  │     Place at 38% from top        │  │
│  │     (golden ratio = premium)     │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│ 80px padding bottom                    │
└────────────────────────────────────────┘
```

- **Padding**: 80–120px horizontal, 60–80px vertical
- **Golden ratio vertical placement**: Key content at 38% from top (≈ 410px from top)
- **Rule of thirds**: Place focal elements at intersection of ⅓ gridlines (640px and 1280px horizontal, 360px and 720px vertical)
- **Asymmetric layouts feel more premium**: 60/40 splits > perfect 50/50

---

## 6. Transition Design

### Transition 1: Directional Wipe with Blur Edge

```tsx
export const DirectionalWipe: React.FC<{
  direction?: 'left' | 'right' | 'up' | 'down';
  progress: number;  // 0 to 1
  color?: string;
}> = ({ direction = 'right', progress, color = '#007A4D' }) => {
  // Ease the progress for smooth feel
  const eased = 1 - Math.pow(1 - progress, 3);
  
  const transforms: Record<string, string> = {
    right: `translateX(${interpolate(eased, [0, 1], [-1920, 0])}px)`,
    left:  `translateX(${interpolate(eased, [0, 1], [1920, 0])}px)`,
    down:  `translateY(${interpolate(eased, [0, 1], [-1080, 0])}px)`,
    up:    `translateY(${interpolate(eased, [0, 1], [1080, 0])}px)`,
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: color,
      transform: transforms[direction],
      // Soft edge via box-shadow on the leading edge
      boxShadow: direction === 'right' 
        ? '-80px 0 60px -20px rgba(0,0,0,0.5)' 
        : '80px 0 60px -20px rgba(0,0,0,0.5)',
    }} />
  );
};

// Use in transition: 
// Wipe covers old scene (frames 0-12), hold (2 frames), reveal new scene (12-24)
// Total: ~24 frames (0.8s) for a clean wipe transition
```

### Transition 2: Scale-Blur Zoom Transition

Old scene scales up + blurs, new scene scales from 0.9 + sharpens:

```tsx
// Apply to outgoing scene
const exitScale = interpolate(frame, [0, 15], [1, 1.15], { extrapolateRight: 'clamp' });
const exitBlur = interpolate(frame, [0, 15], [0, 12], { extrapolateRight: 'clamp' });
const exitOpacity = interpolate(frame, [0, 15], [1, 0], { extrapolateRight: 'clamp' });

// Apply to incoming scene (starts at frame ~8 for overlap)
const enterScale = interpolate(frame, [8, 22], [0.92, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const enterBlur = interpolate(frame, [8, 22], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const enterOpacity = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
```

### Transition 3: Morphing Shape Transition

A circle or rounded rect grows from the focal point to fill the screen:

```tsx
export const CircleWipe: React.FC<{
  progress: number;
  originX?: number;
  originY?: number;
}> = ({ progress, originX = 960, originY = 540 }) => {
  // Need enough radius to cover all corners from origin
  const maxRadius = Math.sqrt(
    Math.max(originX, 1920 - originX) ** 2 + Math.max(originY, 1080 - originY) ** 2
  );
  const eased = 1 - Math.pow(1 - progress, 2.5);
  const radius = eased * maxRadius;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      clipPath: `circle(${radius}px at ${originX}px ${originY}px)`,
    }} />
  );
};
```

### Transition 4: Split/Reveal (Doors Opening)

Two halves slide apart to reveal the new scene:

```tsx
// Left half slides left, right half slides right
const splitProgress = spring({
  frame: frame - transitionStart,
  fps,
  config: { damping: 20, stiffness: 100, mass: 0.7 },
});

const leftX = interpolate(splitProgress, [0, 1], [0, -960]);
const rightX = interpolate(splitProgress, [0, 1], [0, 960]);

// Old scene left half:
<div style={{ clipPath: 'inset(0 50% 0 0)', transform: `translateX(${leftX}px)` }}>
// Old scene right half:  
<div style={{ clipPath: 'inset(0 0 0 50%)', transform: `translateX(${rightX}px)` }}>
```

### Recommended Transition Timing

| Transition Type | Duration (frames) | Duration (seconds) | Best For |
|----------------|-------------------|--------------------|-----------------------|
| Crossfade (overlap) | 12–18 | 0.4–0.6 | Same-mood scenes |
| Directional wipe | 18–24 | 0.6–0.8 | Topic change |
| Scale-blur zoom | 18–24 | 0.6–0.8 | Zoom into detail |
| Circle/shape reveal | 20–30 | 0.67–1.0 | Dramatic reveals |
| Split/doors | 20–25 | 0.67–0.83 | Before/after |
| Hard cut | 0–2 | 0–0.067 | On beat, high energy |

---

## 7. Pacing & Rhythm

### 2-Minute Proposal Video Beat Pattern

Your video is 3600 frames (120 seconds). Here's the optimal pacing structure:

```
PHASE 1: HOOK (0–6s / 0–180 frames)
├── Beat 1 (0-2s):    Dramatic statement or question
├── Beat 2 (2-4s):    Shocking statistic  
└── Beat 3 (4-6s):    "There's a better way" pivot

PHASE 2: SOLUTION (6–14s / 180–420 frames)
├── Beat 4 (6-9s):    Brand reveal + tagline
└── Beat 5 (9-14s):   Core concept (what it does)

PHASE 3: PROOF (14–60s / 420–1800 frames) — Longest section
├── Beat 6 (14-26s):  Feature showcase #1 (pipeline)
├── Beat 7 (26-38s):  Feature showcase #2 (dashboard)  
├── Beat 8 (38-48s):  Feature showcase #3 (verification)
└── Beat 9 (48-60s):  Security/compliance proof

PHASE 4: DIFFERENTIATION (60–80s / 1800–2400 frames)
├── Beat 10 (60-68s): Why us vs alternatives
└── Beat 11 (68-80s): Business case / revenue numbers

PHASE 5: CLOSE (80–120s / 2400–3600 frames)
├── Beat 12 (80-90s): Investment ask
├── Beat 13 (90-100s): Key takeaway repeat
└── Beat 14 (100-120s): Contact/logo hold
```

### Screen Time Rules

| Content Type | Minimum On-Screen | Recommended | Maximum |
|-------------|-------------------|-------------|---------|
| Single stat/number | 1.5s (45 frames) | 2–3s (60–90) | 4s (120) |
| Title card | 2s (60) | 3s (90) | 5s (150) |
| 4-KPI dashboard | 3s (90) | 4–5s (120–150) | 6s (180) |
| Complex diagram | 4s (120) | 6–8s (180–240) | 10s (300) |
| Body text (≤20 words) | 2s (60) | 3s (90) | 4s (120) |
| Logo/brand hold | 3s (90) | 5–8s (150–240) | n/a |

### Entrance/Exit Cadence Per Scene

```
Scene duration: ~300 frames (10 seconds)
├── Entrance zone:   frames 0–30   (1s)   — Elements animate in
├── Stagger window:  frames 0–45   (1.5s) — Last element finishes entering
├── Hold zone:       frames 45–240 (6.5s) — Content is readable
├── Exit prep:       frames 240–270(1s)   — Nothing new enters
└── Fade out:        frames 270–300(1s)   — Scene fades

KEY RULE: Never have elements entering AND exiting simultaneously.
The "hold zone" should be at least 50% of scene duration.
```

### Spring Config Cheat Sheet by Feel

```tsx
// SNAPPY (UI elements, buttons, small movements)
{ damping: 20, stiffness: 200, mass: 0.4 }
// Settles in ~12 frames (0.4s), slight overshoot

// SMOOTH (text entrances, standard animations)  
{ damping: 18, stiffness: 80, mass: 0.8 }
// Settles in ~22 frames (0.73s), gentle ease

// DRAMATIC (hero reveals, big moments)
{ damping: 12, stiffness: 60, mass: 1.0 }
// Settles in ~35 frames (1.17s), visible overshoot

// HEAVY (counters, data that feels weighty)
{ damping: 30, stiffness: 50, mass: 1.5 }
// Settles in ~45 frames (1.5s), no overshoot, slow decel

// BOUNCY (celebration, achievement, badge)
{ damping: 8, stiffness: 150, mass: 0.5 }
// Settles in ~30 frames (1s), multiple bounces

// LINEAR (progress bars, wipes — avoid spring)
// Use interpolate() with manual easeOut instead:
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
```

---

## 8. Glassmorphism & Modern UI Effects

### Glassmorphism Card (Frosted Glass)

The key ingredients: **backdrop-filter blur + semi-transparent background + subtle border + inner shadow**.

```tsx
export const GlassCard: React.FC<{
  children: React.ReactNode;
  blur?: number;
  opacity?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}> = ({ children, blur = 20, opacity = 0.08, borderRadius = 20, style }) => {
  return (
    <div style={{
      background: `rgba(255, 255, 255, ${opacity})`,
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      borderRadius,
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.08)
      `,
      // ↑ Inset top highlight simulates light reflection
      ...style,
    }}>
      {children}
    </div>
  );
};

// SPECIFIC VALUES for premium look:
// blur: 16–24px  (below 12 looks cheap, above 30 is overkill)
// background opacity: 0.05–0.12 (more = more visible card; less = more see-through)
// border opacity: 0.08–0.15
// shadow: 8–32px blur, 0.2–0.4 alpha
// border-radius: 16–24px (12 is fine for smaller cards)
```

### Dark Glass Card Variant (For Dark Backgrounds)

```tsx
export const DarkGlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div style={{
    background: 'rgba(12, 16, 24, 0.6)',          // Dark base
    backdropFilter: 'blur(20px) saturate(150%)',   // saturate boosts the behind-color
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.06)', // Barely visible
    boxShadow: `
      0 4px 24px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.04)
    `,
    padding: '28px 32px',
    ...style,
  }}>
    {children}
  </div>
);
```

### Neumorphism (Soft UI)

Best for buttons and small interactive elements in mockup UIs. Use sparingly — works on light backgrounds only:

```tsx
export const NeuCard: React.FC<{
  children: React.ReactNode;
  pressed?: boolean;
  style?: React.CSSProperties;
}> = ({ children, pressed = false, style }) => {
  // Base background must match parent background closely
  const bg = '#E8ECF1';
  
  return (
    <div style={{
      background: bg,
      borderRadius: 16,
      padding: '24px 28px',
      boxShadow: pressed
        ? `inset 4px 4px 8px rgba(0, 0, 0, 0.12), 
           inset -4px -4px 8px rgba(255, 255, 255, 0.7)`
        : `6px 6px 14px rgba(0, 0, 0, 0.12), 
           -6px -6px 14px rgba(255, 255, 255, 0.8)`,
      border: 'none',  // No borders in neumorphism
      ...style,
    }}>
      {children}
    </div>
  );
};

// Neumorphism values:
// Shadow offset: 4–8px
// Shadow blur: 12–20px 
// Dark shadow alpha: 0.08–0.15
// Light shadow alpha: 0.6–0.9
// Border radius: 12–24px
// CRITICAL: Background color should be very close to parent bg (#E0E5EC range)
```

### Animated Glassmorphism (Glass that Responds to Content)

```tsx
export const AnimatedGlass: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 80, mass: 0.7 },
  });

  // Glass fades in: blur increases, bg opacity increases
  const blur = interpolate(progress, [0, 1], [0, 20]);
  const bgOpacity = interpolate(progress, [0, 1], [0, 0.08]);
  const borderOpacity = interpolate(progress, [0, 1], [0, 0.12]);
  const scale = interpolate(progress, [0, 1], [0.95, 1]);
  const y = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div style={{
      background: `rgba(255, 255, 255, ${bgOpacity})`,
      backdropFilter: `blur(${blur}px)`,
      WebkitBackdropFilter: `blur(${blur}px)`,
      borderRadius: 20,
      border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, ${0.3 * progress})`,
      transform: `scale(${scale}) translateY(${y}px)`,
      opacity: interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
      padding: '28px 32px',
    }}>
      {children}
    </div>
  );
};
```

### Gradient Border (Premium Card Edge Effect)

```tsx
// Animated gradient border — simulates light traveling around the card edge
export const GradientBorderCard: React.FC<{
  children: React.ReactNode;
  borderWidth?: number;
}> = ({ children, borderWidth = 1 }) => {
  const frame = useCurrentFrame();
  const angle = (frame * 2) % 360; // Rotates 2°/frame = 12°/s

  return (
    <div style={{
      position: 'relative',
      borderRadius: 20,
      padding: borderWidth,
      background: `conic-gradient(from ${angle}deg, #007A4D, #FFB81C, #007A4D30, #007A4D)`,
    }}>
      <div style={{
        background: '#0C1018',
        borderRadius: 20 - borderWidth,
        padding: '28px 32px',
      }}>
        {children}
      </div>
    </div>
  );
};
```

### Shimmer / Loading Effect

```tsx
export const ShimmerEffect: React.FC<{
  width: number;
  height: number;
  delay?: number;
  borderRadius?: number;
}> = ({ width, height, delay = 0, borderRadius = 8 }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  
  // Shimmer position sweeps across
  const shimmerX = interpolate(
    adjustedFrame % 60,  // Loop every 60 frames (2s)
    [0, 60],
    [-width, width * 2],
  );

  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: '#1E2A3A',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: shimmerX,
        width: width * 0.4,
        height: '100%',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        filter: 'blur(10px)',
      }} />
    </div>
  );
};
```

---

## 9. Complete Effect Reference Matrix

### When to Use Each Technique

| Scene Type | Background | Text Anim | Data Viz | Ambient | Transition In |
|-----------|-----------|-----------|----------|---------|---------------|
| Opening Hook | Gradient mesh + glow | Char reveal for stat, staggered for headline | Single hero number | Particles + noise | Hard cut (first scene) |
| Brand/Logo Reveal | Centered glow | Scale in + mask reveal | None | Slow particles | Circle wipe from center |
| Feature Showcase | Dark glass cards | Staggered word reveal | KPI cards, progress bars | Dot grid | Directional wipe |
| Dashboard Mockup | Subtle grid | Standard fade-in-up | Full dashboard with counters | None (UI is complex enough) | Scale-blur zoom |
| Stats/Impact | Gradient mesh | Char reveal for numbers | Bar chart + donut | Glow behind key stat | Crossfade |
| Call to Action | Single hero glow | Color wipe on key text | None | Breathing glow | Crossfade |

### Z-Index Layering Order

```
z-index: 0   — Background gradient
z-index: 1   — Gradient mesh blobs
z-index: 2   — Grid / dot matrix
z-index: 3   — Noise overlay
z-index: 5   — Glow effects (behind content)
z-index: 10  — Main content (cards, text, charts)
z-index: 20  — Foreground accents (floating badges)
z-index: 30  — Transition overlays
z-index: 50  — Debug overlays
```

---

## 10. Performance Tips for Remotion

1. **`useMemo` all particle/grid arrays** — They're recalculated every frame otherwise
2. **Limit particles to 30–50** — More than 60 divs with per-frame transforms tanks render performance
3. **Use SVG for grids/charts** — Fewer DOM nodes than individual divs
4. **`backdrop-filter` is expensive** — Limit to 2–3 glass cards per scene max
5. **Avoid `filter: blur()` on large elements** — Pre-blur in the gradient definition instead:
   ```tsx
   // SLOW: <div style={{ width: 800, filter: 'blur(100px)' }} />
   // FAST: <div style={{ width: 800, background: 'radial-gradient(circle, #007A4D40 0%, transparent 70%)' }} />
   ```
6. **Use `willChange: 'transform'`** on elements that move every frame
7. **Pre-compute trigonometry** in `useMemo` when possible — `Math.sin()` per frame per particle adds up

---

## Quick Copy-Paste Cheat Card

```tsx
// === PREMIUM SPRING CONFIGS ===
const SNAPPY  = { damping: 20, stiffness: 200, mass: 0.4 };
const SMOOTH  = { damping: 18, stiffness: 80,  mass: 0.8 };
const DRAMATIC= { damping: 12, stiffness: 60,  mass: 1.0 };
const HEAVY   = { damping: 30, stiffness: 50,  mass: 1.5 };
const BOUNCY  = { damping: 8,  stiffness: 150, mass: 0.5 };

// === PREMIUM SHADOWS ===
const SHADOW_SM = '0 2px 8px rgba(0,0,0,0.12)';
const SHADOW_MD = '0 4px 16px rgba(0,0,0,0.2)';
const SHADOW_LG = '0 8px 32px rgba(0,0,0,0.3)';
const SHADOW_GLOW = (color: string) => `0 0 40px ${color}40, 0 0 80px ${color}20`;

// === STANDARD STAGGER DELAYS (frames) ===
const STAGGER_FAST = 3;   // 100ms — for related items
const STAGGER_MED  = 6;   // 200ms — for card grids
const STAGGER_SLOW = 10;  // 333ms — for distinct sections

// === EASING FUNCTIONS (for interpolate) ===
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
```
