/**
 * Scene 10: Call to Action — Professional close with CSIR branding.
 * Funding ask, live URLs, partnership pitch, SA flag elements.
 * Duration: ~27.5s (825 frames @ 30fps) — extended final scene.
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs, shadows } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  GradientBorderCard,
  ScaleIn,
  GradientLine,
  SAFlagStripe,
} from "../components/Animations";

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline — slow, deliberate, premium pacing
  const heroProgress = spring({ frame: frame - 20, fps, config: springs.heavy });
  const subProgress = spring({ frame: frame - 60, fps, config: springs.smooth });
  const cardProgress = spring({ frame: frame - 110, fps, config: springs.smooth });
  const urlsProgress = spring({ frame: frame - 200, fps, config: springs.smooth });
  const footerProgress = spring({ frame: frame - 300, fps, config: springs.smooth });

  // Pulsing glow behind CTA
  const glowPulse = 0.15 + Math.sin(frame * 0.03) * 0.05;

  return (
    <SceneContainer
      orbs={[
        { color: colors.green, x: 50, y: 40, size: 600 },
        { color: colors.gold, x: 30, y: 55, size: 350 },
        { color: colors.blue, x: 70, y: 65, size: 300 },
      ]}
      meshOpacity={glowPulse}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 120px",
        }}
      >
        {/* NCTS Logo */}
        <ScaleIn delay={10} glowColor={colors.greenGlow}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 38,
              boxShadow: `0 0 40px ${colors.greenGlow}, 0 0 80px ${colors.greenSoft}`,
            }}
          >
            🌿
          </div>
        </ScaleIn>

        {/* Hero headline */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <StaggeredText
            text="Let's Build South Africa's Cannabis Future"
            fontSize={48}
            fontWeight={800}
            color={colors.white}
            delay={25}
            staggerFrames={5}
            style={{ letterSpacing: "-0.01em" }}
          />
        </div>

        {/* Sub-headline */}
        <FadeInUp delay={60} distance={20}>
          <div
            style={{
              fontSize: 20,
              fontFamily: fonts.body,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: 700,
              marginTop: 16,
            }}
          >
            Built by the CSIR for SAHPRA — NCTS transforms South Africa's
            cannabis industry into a{" "}
            <span style={{ color: colors.green }}>transparent</span>,{" "}
            <span style={{ color: colors.gold }}>traceable</span>, and{" "}
            <span style={{ color: colors.blue }}>fully regulated</span> ecosystem.
          </div>
        </FadeInUp>

        {/* Key cards row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
            opacity: interpolate(cardProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* CSIR card */}
          <GradientBorderCard
            delay={110}
            colors={[colors.blue, colors.green, colors.blue]}
            style={{ width: 280 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${colors.blue} 0%, #1D4ED8 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🏛️
              </div>
              <div>
                <div style={{ fontSize: 14, fontFamily: fonts.heading, fontWeight: 700, color: colors.white }}>
                  CSIR
                </div>
                <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted }}>
                  Development Partner
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 1.5 }}>
              Digital Solutions & Services cluster. 80 years of government tech delivery. 3,000+ researchers.
            </div>
          </GradientBorderCard>

          {/* Funding card */}
          <GradientBorderCard
            delay={130}
            colors={[colors.gold, colors.green, colors.gold]}
            style={{ width: 280 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${colors.gold} 0%, #D97706 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                💰
              </div>
              <div>
                <div style={{ fontSize: 14, fontFamily: fonts.heading, fontWeight: 700, color: colors.white }}>
                  R4.85 Million
                </div>
                <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted }}>
                  CSIR Development Budget
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 1.5 }}>
              18-month delivery timeline. 58+ jobs created. Self-sustaining SaaS by Year 2.
            </div>
          </GradientBorderCard>

          {/* Timeline card */}
          <GradientBorderCard
            delay={150}
            colors={[colors.green, colors.blue, colors.green]}
            style={{ width: 280 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🚀
              </div>
              <div>
                <div style={{ fontSize: 14, fontFamily: fonts.heading, fontWeight: 700, color: colors.white }}>
                  Production Ready
                </div>
                <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted }}>
                  Deployment Target
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 1.5 }}>
              AWS af-south-1 (Cape Town). Multi-AZ. Terraform IaC. ncts.gov.za ready.
            </div>
          </GradientBorderCard>
        </div>

        {/* Live URLs */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 24,
            opacity: interpolate(urlsProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(urlsProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          {[
            { url: "portal.ncts.gov.za", label: "Operator Portal", icon: "🌐" },
            { url: "sahpra.ncts.gov.za", label: "SAHPRA Dashboard", icon: "🏛️" },
            { url: "verify.ncts.gov.za", label: "Public Verification", icon: "📱" },
          ].map((link, i) => {
            const ld = 210 + i * 12;
            const lp = spring({ frame: frame - ld, fps, config: springs.snappy });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(lp, [0, 1], [0, 1]),
                }}
              >
                <span style={{ fontSize: 16 }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontFamily: fonts.mono, color: colors.green, fontWeight: 500 }}>
                    {link.url}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: fonts.body, color: colors.textDim }}>
                    {link.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "20px 80px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: interpolate(footerProgress, [0, 1], [0, 1]),
        }}
      >
        <div style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textDim }}>
          © 2026 CSIR — Council for Scientific and Industrial Research
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.textDim }}>
            National Cannabis Tracking System
          </div>
          <div style={{ display: "flex", gap: 0, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: 16, height: 8, background: colors.saGreen }} />
            <div style={{ width: 16, height: 8, background: colors.saGold }} />
            <div style={{ width: 16, height: 8, background: colors.saRed }} />
            <div style={{ width: 16, height: 8, background: colors.saBlue }} />
          </div>
        </div>
      </div>

      <SAFlagStripe delay={10} height={5} />
    </SceneContainer>
  );
};
