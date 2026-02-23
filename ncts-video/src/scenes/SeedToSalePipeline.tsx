/**
 * Scene 3: Seed-to-Sale Pipeline — The hero visual.
 * Connected pathway with glowing nodes that light up sequentially.
 * Shows real NCTS data at each stage.
 * Duration: ~13.5s (405 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  GradientLine,
  SAFlagStripe,
} from "../components/Animations";

const stages = [
  {
    icon: "🌱",
    title: "Cultivation",
    detail: "NCTS-ZA-2026-000001",
    sub: "Plant registered with unique tracking ID",
    color: "#4CAF50",
  },
  {
    icon: "🌿",
    title: "Growth",
    detail: "seed → seedling → vegetative → flowering",
    sub: "State machine — no backward transitions",
    color: "#66BB6A",
  },
  {
    icon: "✂️",
    title: "Harvest",
    detail: "Wet: 2.4kg → Dry: 0.6kg (4:1 ratio)",
    sub: "Batch auto-created, wet-to-dry ratio monitored",
    color: "#FDD835",
  },
  {
    icon: "🧪",
    title: "Lab Testing",
    detail: "THC 0.3% · CBD 18.4% · ✓ Passed",
    sub: "SAHPRA limits enforced, auto-quarantine on fail",
    color: "#42A5F5",
  },
  {
    icon: "🚛",
    title: "Transfer",
    detail: "Signed manifest + QR verification",
    sub: "Transfer velocity anomaly detection active",
    color: "#AB47BC",
  },
  {
    icon: "🛒",
    title: "Sale",
    detail: "R1,850.00 · Excise auto-calculated",
    sub: "Consumer can verify via QR scan",
    color: "#EF5350",
  },
];

export const SeedToSalePipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stageSpacing = 48; // frames between each stage lighting up

  return (
    <SceneContainer
      orbs={[
        { color: colors.green, x: 20, y: 30, size: 350 },
        { color: colors.blue, x: 80, y: 50, size: 300 },
        { color: colors.gold, x: 50, y: 75, size: 250 },
      ]}
      meshOpacity={0.12}
    >
      {/* Title section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 60,
        }}
      >
        <FadeInUp delay={5}>
          <div
            style={{
              fontSize: 14,
              fontFamily: fonts.body,
              fontWeight: 600,
              color: colors.green,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Complete Lifecycle Tracking
          </div>
        </FadeInUp>

        <StaggeredText
          text="Every Step. Every Gram. Every Transaction."
          fontSize={44}
          fontWeight={800}
          color={colors.white}
          delay={15}
          staggerFrames={4}
          style={{ letterSpacing: "-0.02em" }}
        />

        <FadeInUp delay={40}>
          <div
            style={{
              fontSize: 18,
              fontFamily: fonts.body,
              color: colors.textMuted,
              marginTop: 12,
              textAlign: "center",
            }}
          >
            Cryptographically audited from seed to sale — powered by SHA-256 hash chains
          </div>
        </FadeInUp>
      </div>

      {/* Pipeline visualization */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            position: "relative",
            width: "100%",
            maxWidth: 1700,
          }}
        >
          {stages.map((stage, i) => {
            const stageDelay = 60 + i * stageSpacing;
            const stageProgress = spring({
              frame: frame - stageDelay,
              fps,
              config: springs.snappy,
            });
            const isActive = stageProgress > 0.1;
            const opacity = interpolate(stageProgress, [0, 1], [0, 1]);
            const scale = interpolate(stageProgress, [0, 0.8, 1], [0.8, 1.03, 1]);
            const glowIntensity = interpolate(stageProgress, [0, 1], [0, 0.8]);

            // Connector line progress (from previous stage to this one)
            const connectorDelay = stageDelay - 20;
            const connectorProgress =
              i > 0
                ? interpolate(frame - connectorDelay, [0, 25], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;

            // Travelling particle
            const particleX = connectorProgress * 100;
            const particleOpacity =
              connectorProgress > 0 && connectorProgress < 1 ? 0.9 : 0;

            return (
              <React.Fragment key={i}>
                {/* Connector line */}
                {i > 0 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      position: "relative",
                      marginTop: -60,
                    }}
                  >
                    {/* Track */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 1,
                      }}
                    />
                    {/* Active fill */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: `${connectorProgress * 100}%`,
                        height: 2,
                        background: `linear-gradient(90deg, ${stages[i - 1].color}, ${stage.color})`,
                        borderRadius: 1,
                        boxShadow:
                          connectorProgress > 0
                            ? `0 0 8px ${stage.color}40`
                            : "none",
                      }}
                    />
                    {/* Travelling particle */}
                    <div
                      style={{
                        position: "absolute",
                        top: -3,
                        left: `${particleX}%`,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: colors.white,
                        boxShadow: `0 0 12px ${colors.white}`,
                        opacity: particleOpacity,
                        transform: "translateX(-50%)",
                      }}
                    />
                  </div>
                )}

                {/* Stage card */}
                <div
                  style={{
                    width: 230,
                    flexShrink: 0,
                    opacity,
                    transform: `scale(${scale})`,
                    textAlign: "center",
                  }}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: isActive
                        ? `${stage.color}20`
                        : "rgba(255,255,255,0.04)",
                      border: `2px solid ${isActive ? stage.color : "rgba(255,255,255,0.08)"}`,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      margin: "0 auto",
                      fontSize: 28,
                      boxShadow: isActive
                        ? `0 0 24px ${stage.color}30, 0 0 48px ${stage.color}15`
                        : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {stage.icon}
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: 16,
                      fontFamily: fonts.heading,
                      fontWeight: 700,
                      color: isActive ? colors.white : colors.textDim,
                      marginTop: 12,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {stage.title}
                  </div>

                  {/* Detail */}
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: fonts.mono,
                      color: isActive ? stage.color : colors.textDim,
                      marginTop: 8,
                      lineHeight: 1.4,
                      padding: "0 8px",
                    }}
                  >
                    {stage.detail}
                  </div>

                  {/* Sub-detail */}
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: fonts.body,
                      color: colors.textMuted,
                      marginTop: 6,
                      lineHeight: 1.3,
                      padding: "0 4px",
                      opacity: interpolate(stageProgress, [0, 0.5, 1], [0, 0, 1]),
                    }}
                  >
                    {stage.sub}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom bar — "Every transition audited" */}
      <FadeInUp delay={350}>
        <div
          style={{
            textAlign: "center",
            paddingBottom: 40,
          }}
        >
          <GradientLine delay={350} color={colors.green} width="50%" />
          <div
            style={{
              fontSize: 15,
              fontFamily: fonts.mono,
              color: colors.textMuted,
              marginTop: 16,
              letterSpacing: "0.1em",
            }}
          >
            🔗 EVERY TRANSITION → SHA-256 HASH-CHAINED → TAMPER-EVIDENT AUDIT TRAIL
          </div>
        </div>
      </FadeInUp>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
