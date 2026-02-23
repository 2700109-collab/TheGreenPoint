/**
 * Scene 1: Cold Open — Cinematic hook with impactful statistics.
 * Purpose: Grab attention in the first 3 seconds.
 * Duration: ~6s (180 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs } from "../theme";
import {
  SceneContainer,
  StaggeredText,
  PremiumCounter,
  FadeInUp,
  GradientLine,
  SAFlagStripe,
} from "../components/Animations";

export const OpeningHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance timeline
  const heroProgress = spring({ frame: frame - 15, fps, config: springs.heavy });
  const subProgress = spring({ frame: frame - 50, fps, config: springs.smooth });
  const zeroProgress = spring({ frame: frame - 85, fps, config: springs.heavy });
  const taglineProgress = spring({ frame: frame - 120, fps, config: springs.smooth });
  const untilProgress = spring({ frame: frame - 150, fps, config: springs.snappy });

  return (
    <SceneContainer
      orbs={[
        { color: colors.green, x: 50, y: 40, size: 500 },
        { color: "#00963420", x: 30, y: 70, size: 300 },
      ]}
      meshOpacity={0.15}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 160px",
        }}
      >
        {/* Hero stat — R28.4 Billion */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              opacity: interpolate(heroProgress, [0, 1], [0, 1]),
              transform: `scale(${interpolate(heroProgress, [0, 1], [0.8, 1])})`,
              filter: `blur(${interpolate(heroProgress, [0, 1], [12, 0])}px)`,
            }}
          >
            <PremiumCounter
              value={28.4}
              prefix="R"
              suffix=" Billion"
              fontSize={96}
              color={colors.green}
              delay={15}
              format={(n) => n.toFixed(1)}
            />
          </div>
          <FadeInUp delay={35} distance={20}>
            <div
              style={{
                fontSize: 24,
                fontFamily: fonts.body,
                color: colors.textSecondary,
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 8,
              }}
            >
              Estimated Illicit Cannabis Market
            </div>
          </FadeInUp>
        </div>

        {/* Divider */}
        <div style={{ margin: "32px 0", width: "100%" }}>
          <GradientLine delay={50} color={colors.green} width="40%" />
        </div>

        {/* Zero stat — dramatic */}
        <div
          style={{
            opacity: interpolate(zeroProgress, [0, 1], [0, 1]),
            transform: `scale(${interpolate(zeroProgress, [0, 1], [0.7, 1])})`,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              fontFamily: fonts.heading,
              color: colors.white,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Zero
          </span>
          <FadeInUp delay={95} distance={15}>
            <div
              style={{
                fontSize: 22,
                fontFamily: fonts.body,
                color: colors.textMuted,
                fontWeight: 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: 8,
              }}
            >
              Digital Tracking Infrastructure
            </div>
          </FadeInUp>
        </div>

        {/* Tagline */}
        <div style={{ marginTop: 48 }}>
          <div
            style={{
              opacity: interpolate(taglineProgress, [0, 1], [0, 1]),
              textAlign: "center",
            }}
          >
            <StaggeredText
              text="No tracking. No oversight. No transparency."
              fontSize={26}
              fontWeight={400}
              color={colors.textSecondary}
              delay={120}
              staggerFrames={5}
            />
          </div>
        </div>

        {/* "Until now" kicker */}
        <div
          style={{
            marginTop: 48,
            opacity: interpolate(untilProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(untilProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              fontFamily: fonts.heading,
              color: colors.gold,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Until now.
          </span>
        </div>
      </div>

      <SAFlagStripe delay={10} />
    </SceneContainer>
  );
};
