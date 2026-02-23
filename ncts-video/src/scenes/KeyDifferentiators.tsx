/**
 * Scene 8: Key Differentiators — Why NCTS + CSIR is the answer.
 * Technical credibility grid with impressive stats.
 * Duration: ~10.5s (315 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GradientBorderCard,
  SAFlagStripe,
  GradientLine,
} from "../components/Animations";

export const KeyDifferentiators: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const differentiators = [
    {
      number: "01",
      icon: "🔗",
      title: "Tamper-Evident Audit Trail",
      stat: "26 Event Types",
      desc: "SHA-256 hash-chained log with genesis block. Any modification detected instantly. 10-year regulatory retention.",
      accent: colors.green,
    },
    {
      number: "02",
      icon: "🛡️",
      title: "14-Rule Compliance Engine",
      stat: "4 Diversion Algorithms",
      desc: "Strategy pattern for dynamic rules. Real-time + batch + scheduled evaluation. Auto-suspend permits on critical violations.",
      accent: colors.gold,
    },
    {
      number: "03",
      icon: "📱",
      title: "Offline-First Mobile",
      stat: "Works With Zero Connectivity",
      desc: "WatermelonDB sync with 5 entity-specific conflict resolution strategies. Field inspectors work anywhere in SA.",
      accent: colors.blue,
    },
    {
      number: "04",
      icon: "🏛️",
      title: "Built by the CSIR",
      stat: "80 Years · 3,000+ Researchers",
      desc: "Africa's largest R&D organisation. Dedicated Digital Solutions & Services cluster. Proven government tech delivery.",
      accent: "#8B5CF6",
    },
  ];

  // Architecture stats
  const archStats = [
    { label: "Database Models", value: "28" },
    { label: "API Endpoints", value: "86" },
    { label: "NestJS Modules", value: "28" },
    { label: "React Pages", value: "56" },
    { label: "UI Components", value: "21" },
    { label: "Query Hooks", value: "62" },
    { label: "Prisma Schema", value: "799 lines" },
    { label: "RBAC Roles", value: "7" },
    { label: "Cron Jobs", value: "9" },
    { label: "SA Languages", value: "11" },
  ];

  return (
    <SceneContainer
      orbs={[
        { color: "#8B5CF6", x: 25, y: 35, size: 400 },
        { color: colors.green, x: 75, y: 55, size: 350 },
        { color: colors.gold, x: 50, y: 80, size: 200 },
      ]}
      meshOpacity={0.1}
    >
      {/* Header */}
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <FadeInUp delay={5}>
          <div style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 600, color: colors.green, letterSpacing: "0.4em", textTransform: "uppercase" }}>
            Why NCTS
          </div>
        </FadeInUp>
        <StaggeredText
          text="Not Just Software. A National Platform."
          fontSize={40}
          fontWeight={800}
          color={colors.white}
          delay={10}
          staggerFrames={4}
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Differentiator cards — 2x2 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          padding: "24px 80px 0",
          flex: 1,
        }}
      >
        {differentiators.map((diff, i) => {
          const cardDelay = 40 + i * 20;
          const cp = spring({ frame: frame - cardDelay, fps, config: springs.smooth });
          return (
            <GradientBorderCard
              key={i}
              delay={cardDelay}
              colors={[diff.accent, `${diff.accent}60`, `${diff.accent}20`, diff.accent]}
              style={{ overflow: "hidden" }}
            >
              <div style={{ display: "flex", gap: 16 }}>
                {/* Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${diff.accent}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {diff.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: fonts.mono, color: diff.accent, opacity: 0.5 }}>
                      {diff.number}
                    </span>
                    <span style={{ fontSize: 16, fontFamily: fonts.heading, fontWeight: 700, color: colors.white }}>
                      {diff.title}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontFamily: fonts.mono,
                      fontWeight: 600,
                      color: diff.accent,
                      marginBottom: 6,
                    }}
                  >
                    {diff.stat}
                  </div>
                  <div style={{ fontSize: 12, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 1.5 }}>
                    {diff.desc}
                  </div>
                </div>
              </div>
            </GradientBorderCard>
          );
        })}
      </div>

      {/* Architecture stats ticker */}
      <FadeInUp delay={140}>
        <div style={{ padding: "16px 80px 20px" }}>
          <GradientLine delay={140} color={colors.blue} width="100%" />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 14,
              padding: "0 20px",
            }}
          >
            {archStats.map((stat, i) => {
              const sd = 150 + i * 5;
              const sp = spring({ frame: frame - sd, fps, config: springs.snappy });
              return (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    opacity: interpolate(sp, [0, 1], [0, 1]),
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: fonts.heading, color: colors.green, letterSpacing: "-0.02em" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 8, fontFamily: fonts.body, color: colors.textDim, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FadeInUp>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
