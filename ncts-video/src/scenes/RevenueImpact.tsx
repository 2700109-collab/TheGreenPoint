/**
 * Scene 9: Revenue & Impact — Business case and national impact stats.
 * SaaS tiers, funding, jobs, provinces.
 * Duration: ~10.5s (315 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  PremiumCounter,
  GradientLine,
  SAFlagStripe,
} from "../components/Animations";

export const RevenueImpact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tiersProgress = spring({ frame: frame - 40, fps, config: springs.smooth });
  const chartProgress = spring({ frame: frame - 120, fps, config: springs.smooth });
  const impactProgress = spring({ frame: frame - 200, fps, config: springs.smooth });

  const tiers = [
    { name: "Starter", price: "R2,500", period: "/mo", features: ["Up to 500 plants", "Basic reporting", "Email support"], color: colors.textSecondary },
    { name: "Growth", price: "R7,500", period: "/mo", features: ["Up to 5,000 plants", "Advanced analytics", "Priority support", "API access"], color: colors.green, highlight: true },
    { name: "Enterprise", price: "R15,000", period: "/mo", features: ["Unlimited plants", "Custom integrations", "Dedicated CSM", "SLA guarantee"], color: colors.gold },
  ];

  const revenueYears = [
    { year: "Year 1", value: 1.8, height: 25 },
    { year: "Year 2", value: 3.6, height: 50 },
    { year: "Year 3", value: 5.4, height: 75 },
    { year: "Year 4", value: 7.2, height: 100 },
  ];

  const impactStats = [
    { icon: "🇿🇦", value: "9", label: "Provinces Covered" },
    { icon: "💼", value: "58+", label: "Jobs Created" },
    { icon: "🏛️", value: "R4.85M", label: "CSIR Development Budget" },
    { icon: "📅", value: "18", label: "Month Timeline" },
    { icon: "🔐", value: "100%", label: "SA Data Sovereignty" },
    { icon: "🌐", value: "11", label: "Official Languages" },
  ];

  return (
    <SceneContainer
      orbs={[
        { color: colors.green, x: 30, y: 40, size: 400 },
        { color: colors.gold, x: 70, y: 50, size: 350 },
      ]}
      meshOpacity={0.1}
    >
      {/* Header */}
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <FadeInUp delay={5}>
          <div style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 600, color: colors.green, letterSpacing: "0.4em", textTransform: "uppercase" }}>
            Business Model
          </div>
        </FadeInUp>
        <StaggeredText
          text="Self-Sustaining. Revenue-Generating."
          fontSize={40}
          fontWeight={800}
          color={colors.white}
          delay={10}
          staggerFrames={4}
          style={{ marginTop: 8 }}
        />
        <FadeInUp delay={40}>
          <div style={{ fontSize: 16, fontFamily: fonts.body, color: colors.textMuted, marginTop: 8 }}>
            SAHPRA access is <span style={{ color: colors.green, fontWeight: 600 }}>FREE</span> — revenue comes from licensed operators
          </div>
        </FadeInUp>
      </div>

      {/* Main content: Tiers + Revenue Chart */}
      <div style={{ display: "flex", gap: 20, padding: "24px 80px 0", flex: 1 }}>
        {/* SaaS Tiers */}
        <div
          style={{
            flex: 1.2,
            display: "flex",
            gap: 12,
            opacity: interpolate(tiersProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tiersProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {tiers.map((tier, i) => {
            const td = 45 + i * 15;
            const tp = spring({ frame: frame - td, fps, config: springs.snappy });
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: tier.highlight ? `${colors.green}08` : colors.glassBg,
                  border: `1px solid ${tier.highlight ? `${colors.green}30` : colors.glassBorder}`,
                  borderRadius: 14,
                  padding: 18,
                  backdropFilter: "blur(16px)",
                  position: "relative",
                  overflow: "hidden",
                  opacity: interpolate(tp, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(tp, [0, 1], [15, 0])}px)`,
                }}
              >
                {tier.highlight && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, ${colors.green}, ${colors.gold})`,
                  }} />
                )}
                <div style={{ fontSize: 11, fontFamily: fonts.body, fontWeight: 600, color: tier.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  {tier.name}
                  {tier.highlight && (
                    <span style={{
                      marginLeft: 8, fontSize: 9, background: `${colors.green}20`,
                      color: colors.green, padding: "2px 6px", borderRadius: 3,
                    }}>
                      POPULAR
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, fontFamily: fonts.heading, color: colors.white, letterSpacing: "-0.02em" }}>
                    {tier.price}
                  </span>
                  <span style={{ fontSize: 13, fontFamily: fonts.body, color: colors.textDim }}>
                    {tier.period}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tier.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: colors.green }}>✓</span>
                      <span style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue projection chart */}
        <div
          style={{
            flex: 0.8,
            background: colors.glassBg,
            border: `1px solid ${colors.glassBorder}`,
            borderRadius: 14,
            padding: 20,
            backdropFilter: "blur(16px)",
            display: "flex",
            flexDirection: "column",
            opacity: interpolate(chartProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(chartProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 13, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 4 }}>
            Revenue Projection
          </div>
          <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textDim, marginBottom: 16 }}>
            Operator SaaS subscriptions
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 16, paddingBottom: 8 }}>
            {revenueYears.map((yr, i) => {
              const bd = 130 + i * 15;
              const bp = spring({ frame: frame - bd, fps, config: springs.snappy });
              const barH = interpolate(bp, [0, 1], [0, yr.height * 2.2]);
              return (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    fontSize: 12, fontFamily: fonts.mono, fontWeight: 700,
                    color: colors.green, marginBottom: 6,
                    opacity: interpolate(bp, [0, 1], [0, 1]),
                  }}>
                    R{yr.value}M
                  </div>
                  <div style={{
                    height: barH,
                    background: `linear-gradient(180deg, ${colors.green}, ${colors.greenDark})`,
                    borderRadius: "6px 6px 0 0",
                    boxShadow: `0 0 20px ${colors.greenSoft}`,
                  }} />
                  <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted, marginTop: 6 }}>
                    {yr.year}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Impact stats strip */}
      <div style={{ padding: "16px 80px 32px" }}>
        <GradientLine delay={200} color={colors.gold} width="100%" />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            opacity: interpolate(impactProgress, [0, 1], [0, 1]),
          }}
        >
          {impactStats.map((stat, i) => {
            const sd = 210 + i * 8;
            const sp = spring({ frame: frame - sd, fps, config: springs.snappy });
            return (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  opacity: interpolate(sp, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(sp, [0, 1], [10, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: fonts.heading, color: colors.white, letterSpacing: "-0.02em" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 9, fontFamily: fonts.body, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
