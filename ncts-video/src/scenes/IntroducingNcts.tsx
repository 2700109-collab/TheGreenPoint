/**
 * Scene 2: Introducing NCTS — Logo reveal + CSIR partnership.
 * Purpose: Establish what NCTS is and who's building it.
 * Duration: ~8.5s (255 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  ScaleIn,
  StaggeredText,
  GlassCard,
  GradientLine,
  SAFlagStripe,
  TypeWriter,
} from "../components/Animations";

export const IntroducingNcts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 90, mass: 0.7 } });
  const titleProgress = spring({ frame: frame - 40, fps, config: springs.smooth });
  const tagProgress = spring({ frame: frame - 70, fps, config: springs.smooth });
  const csirProgress = spring({ frame: frame - 100, fps, config: springs.smooth });
  const badgesProgress = spring({ frame: frame - 130, fps, config: springs.smooth });
  const statsProgress = spring({ frame: frame - 165, fps, config: springs.smooth });

  // Hexagonal accent spin
  const hexRotation = interpolate(frame, [0, 600], [0, 360]);
  const ringPulse = 0.9 + Math.sin(frame * 0.04) * 0.1;

  const techBadges = [
    "React 19", "TypeScript 5.7", "NestJS + Fastify",
    "PostgreSQL + PostGIS", "28 Modules", "86 API Endpoints",
  ];

  return (
    <SceneContainer
      orbs={[
        { color: colors.green, x: 50, y: 35, size: 450 },
        { color: colors.blue, x: 30, y: 65, size: 300 },
        { color: colors.gold, x: 70, y: 55, size: 250 },
      ]}
      meshOpacity={0.12}
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
        {/* Hexagonal accent ring */}
        <div
          style={{
            position: "absolute",
            opacity: 0.06 * interpolate(logoProgress, [0, 1], [0, 1]),
            transform: `rotate(${hexRotation}deg) scale(${ringPulse})`,
          }}
        >
          <svg width="500" height="500" viewBox="0 0 500 500">
            <polygon
              points="250,30 450,145 450,355 250,470 50,355 50,145"
              fill="none" stroke={colors.green} strokeWidth="1"
            />
            <polygon
              points="250,70 410,165 410,335 250,430 90,335 90,165"
              fill="none" stroke={colors.gold} strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* NCTS Logo — Shield icon */}
        <ScaleIn delay={10} glowColor={colors.greenGlow}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: `0 0 60px ${colors.greenGlow}, 0 0 120px ${colors.greenSoft}`,
            }}
          >
            <span style={{ fontSize: 52, lineHeight: 1 }}>🌿</span>
          </div>
        </ScaleIn>

        {/* Title block */}
        <div
          style={{
            textAlign: "center",
            marginTop: 28,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [25, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontFamily: fonts.body,
              fontWeight: 600,
              color: colors.green,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Introducing
          </div>
          <div
            style={{
              fontSize: 72,
              fontFamily: fonts.heading,
              fontWeight: 800,
              color: colors.white,
              letterSpacing: "-0.02em",
            }}
          >
            NCTS
          </div>
          <div
            style={{
              fontSize: 24,
              fontFamily: fonts.heading,
              fontWeight: 300,
              color: colors.textSecondary,
              marginTop: 4,
              letterSpacing: "0.15em",
            }}
          >
            National Cannabis Tracking System
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 20,
            opacity: interpolate(tagProgress, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontFamily: fonts.body,
              fontWeight: 400,
              color: colors.gold,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Seed-to-Sale Digital Infrastructure for SAHPRA
          </div>
        </div>

        {/* CSIR Partnership */}
        <FadeInUp delay={100} distance={20}>
          <GlassCard delay={100} variant="medium" padding={16} style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${colors.blue} 0%, #1D4ED8 100%)`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 20,
                }}
              >
                🏛️
              </div>
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontFamily: fonts.heading,
                    fontWeight: 700,
                    color: colors.white,
                    letterSpacing: "0.02em",
                  }}
                >
                  A CSIR Digital Solutions Initiative
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: fonts.body,
                    color: colors.textMuted,
                    marginTop: 2,
                  }}
                >
                  Council for Scientific and Industrial Research — Africa's largest R&D organisation
                </div>
              </div>
            </div>
          </GlassCard>
        </FadeInUp>

        {/* Tech badges */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 800,
            opacity: interpolate(badgesProgress, [0, 1], [0, 1]),
          }}
        >
          {techBadges.map((tech, i) => {
            const badgeDelay = 130 + i * 4;
            const bp = spring({ frame: frame - badgeDelay, fps, config: springs.snappy });
            return (
              <div
                key={i}
                style={{
                  padding: "7px 16px",
                  borderRadius: 20,
                  border: `1px solid ${colors.glassBorder}`,
                  background: colors.glassBg,
                  fontSize: 13,
                  fontFamily: fonts.mono,
                  color: colors.textSecondary,
                  fontWeight: 500,
                  opacity: interpolate(bp, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(bp, [0, 1], [10, 0])}px)`,
                }}
              >
                {tech}
              </div>
            );
          })}
        </div>

        {/* Impressive stats row */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            gap: 48,
            opacity: interpolate(statsProgress, [0, 1], [0, 1]),
          }}
        >
          {[
            { label: "Database Models", value: "28" },
            { label: "Compliance Rules", value: "14" },
            { label: "Audit Event Types", value: "26" },
            { label: "Official Languages", value: "11" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: fonts.heading,
                  color: colors.green,
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: fonts.body,
                  color: colors.textMuted,
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
