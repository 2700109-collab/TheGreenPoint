/**
 * Scene 4: Portal Showcase — Premium UI mockup of the operator dashboard.
 * Shows the actual NCTS portal interface with real features.
 * Duration: ~13.5s (405 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs, shadows } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  SlideIn,
  PremiumCounter,
  ProgressRing,
  SAFlagStripe,
  ShimmerHighlight,
} from "../components/Animations";

export const PortalShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline
  const browserProgress = spring({ frame: frame - 20, fps, config: springs.smooth });
  const sidebarProgress = spring({ frame: frame - 50, fps, config: springs.smooth });
  const kpiProgress = spring({ frame: frame - 85, fps, config: springs.smooth });
  const contentProgress = spring({ frame: frame - 140, fps, config: springs.smooth });
  const feedProgress = spring({ frame: frame - 210, fps, config: springs.smooth });

  const browserScale = interpolate(browserProgress, [0, 1], [0.92, 1]);
  const browserOpacity = interpolate(browserProgress, [0, 1], [0, 1]);

  const kpis = [
    { label: "Active Plants", value: 342, icon: "🌱", color: colors.green, trend: "+12%" },
    { label: "Pending Transfers", value: 12, icon: "🚛", color: colors.gold, trend: "3 incoming" },
    { label: "Monthly Sales", value: "R2.4M", icon: "💰", color: colors.blue, trend: "+8.2%" },
    { label: "Compliance Score", value: 91, icon: "🛡️", color: colors.green, suffix: "%", isRing: true },
  ];

  const sidebarItems = [
    { icon: "📊", label: "Dashboard", active: true },
    { icon: "🌿", label: "Plants" },
    { icon: "📦", label: "Batches" },
    { icon: "✂️", label: "Harvests" },
    { icon: "🧪", label: "Lab Results" },
    { icon: "🚛", label: "Transfers" },
    { icon: "🛒", label: "Sales" },
    { icon: "📋", label: "Compliance" },
  ];

  const activityFeed = [
    { time: "2 min ago", event: "Plant NCTS-ZA-2026-000342 → flowering", color: colors.green },
    { time: "15 min ago", event: "Transfer TRF-20260223-018 accepted", color: colors.blue },
    { time: "1 hr ago", event: "Lab result: Batch BTH-004 — PASSED", color: colors.green },
    { time: "3 hr ago", event: "Harvest recorded: 2.4kg wet weight", color: colors.gold },
    { time: "5 hr ago", event: "Sale SAL-20260223-007 completed: R1,850", color: colors.blue },
  ];

  return (
    <SceneContainer
      orbs={[
        { color: colors.blue, x: 50, y: 40, size: 450 },
        { color: colors.green, x: 25, y: 70, size: 300 },
      ]}
      meshOpacity={0.1}
    >
      {/* Section label */}
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <FadeInUp delay={5}>
          <div
            style={{
              fontSize: 14,
              fontFamily: fonts.body,
              fontWeight: 600,
              color: colors.green,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
            }}
          >
            Operator Portal
          </div>
        </FadeInUp>
        <StaggeredText
          text="Your Entire Operation. One Dashboard."
          fontSize={38}
          fontWeight={800}
          color={colors.white}
          delay={15}
          staggerFrames={4}
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Browser chrome mockup */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "24px 60px 40px",
          opacity: browserOpacity,
          transform: `scale(${browserScale})`,
        }}
      >
        <div
          style={{
            width: 1600,
            height: 820,
            borderRadius: 16,
            overflow: "hidden",
            background: colors.bgCard,
            border: `1px solid ${colors.glassBorder}`,
            boxShadow: `${shadows.xl}, 0 0 100px rgba(0,0,0,0.5)`,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Browser top bar */}
          <div
            style={{
              height: 36,
              background: "#0D1520",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: 8,
              borderBottom: `1px solid ${colors.glassBorder}`,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E" }} />
            </div>
            <div
              style={{
                flex: 1,
                height: 22,
                borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontFamily: fonts.mono,
                color: colors.textMuted,
              }}
            >
              🔒 https://portal.ncts.gov.za/dashboard
            </div>
          </div>

          {/* Government masthead */}
          <div
            style={{
              height: 32,
              background: colors.primary,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🏛️</span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: fonts.body,
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 500,
                }}
              >
                Republic of South Africa — SAHPRA Cannabis Tracking
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: fonts.mono,
                color: colors.gold,
                background: "rgba(255,186,28,0.15)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              PILOT PHASE
            </div>
          </div>

          {/* Main content area */}
          <div style={{ flex: 1, display: "flex" }}>
            {/* Sidebar */}
            <div
              style={{
                width: 200,
                background: "#080E1A",
                borderRight: `1px solid ${colors.glassBorder}`,
                padding: "16px 0",
                opacity: interpolate(sidebarProgress, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(sidebarProgress, [0, 1], [-20, 0])}px)`,
              }}
            >
              {/* Logo */}
              <div
                style={{
                  padding: "0 16px 16px",
                  borderBottom: `1px solid ${colors.glassBorder}`,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: colors.green,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  🌿
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontFamily: fonts.heading,
                    fontWeight: 700,
                    color: colors.white,
                  }}
                >
                  NCTS Portal
                </span>
              </div>

              {sidebarItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontFamily: fonts.body,
                    color: item.active ? colors.white : colors.textMuted,
                    background: item.active ? "rgba(0,200,83,0.1)" : "transparent",
                    borderLeft: item.active ? `2px solid ${colors.green}` : "2px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>

            {/* Dashboard content */}
            <div style={{ flex: 1, padding: 20, overflow: "hidden" }}>
              {/* Welcome header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  opacity: interpolate(kpiProgress, [0, 1], [0, 1]),
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: fonts.heading,
                      fontWeight: 700,
                      color: colors.white,
                    }}
                  >
                    Welcome, Cape Flora Botanicals
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: fonts.body,
                      color: colors.textMuted,
                      marginTop: 2,
                    }}
                  >
                    Operator Dashboard · Last updated 2 minutes ago
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      background: colors.green,
                      fontSize: 12,
                      fontFamily: fonts.body,
                      fontWeight: 600,
                      color: colors.white,
                    }}
                  >
                    + Register Plant
                  </div>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      background: colors.glassBgHeavy,
                      border: `1px solid ${colors.glassBorder}`,
                      fontSize: 12,
                      fontFamily: fonts.body,
                      color: colors.textSecondary,
                    }}
                  >
                    + Record Harvest
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {kpis.map((kpi, i) => {
                  const kpiDelay = 85 + i * 12;
                  const kp = spring({ frame: frame - kpiDelay, fps, config: springs.snappy });
                  return (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 10,
                        padding: 14,
                        border: `1px solid ${colors.glassBorder}`,
                        opacity: interpolate(kp, [0, 1], [0, 1]),
                        transform: `translateY(${interpolate(kp, [0, 1], [15, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {kpi.label}
                        </span>
                        <span style={{ fontSize: 16 }}>{kpi.icon}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        <span
                          style={{
                            fontSize: typeof kpi.value === "number" ? 28 : 24,
                            fontWeight: 800,
                            fontFamily: fonts.heading,
                            color: colors.white,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {typeof kpi.value === "number"
                            ? kpi.value.toLocaleString()
                            : kpi.value}
                          {kpi.suffix || ""}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: fonts.body,
                            color: kpi.color,
                            marginBottom: 4,
                          }}
                        >
                          {kpi.trend}
                        </span>
                      </div>
                      {/* Mini sparkline */}
                      <svg width="100%" height={24} style={{ marginTop: 6 }}>
                        <polyline
                          points={Array.from({ length: 12 }, (_, j) => {
                            const x = (j / 11) * 100 + "%";
                            const y = 20 - Math.sin((j + i * 3) * 0.7) * 8 - Math.random() * 4;
                            return `${(j / 11) * 300},${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke={kpi.color}
                          strokeWidth={1.5}
                          opacity={0.5}
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>

              {/* Content row: Chart + Activity Feed */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr",
                  gap: 12,
                  opacity: interpolate(contentProgress, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(contentProgress, [0, 1], [15, 0])}px)`,
                }}
              >
                {/* Plant lifecycle chart */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 10,
                    padding: 16,
                    border: `1px solid ${colors.glassBorder}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontFamily: fonts.heading,
                      fontWeight: 600,
                      color: colors.textSecondary,
                      marginBottom: 16,
                    }}
                  >
                    Plant Lifecycle Distribution
                  </div>
                  {/* Bar chart */}
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 140, paddingTop: 0 }}>
                    {[
                      { label: "Seed", count: 45, color: "#4CAF50" },
                      { label: "Seedling", count: 78, color: "#66BB6A" },
                      { label: "Vegetative", count: 124, color: "#81C784" },
                      { label: "Flowering", count: 63, color: "#FDD835" },
                      { label: "Harvested", count: 32, color: "#42A5F5" },
                    ].map((bar, j) => {
                      const barDelay = 150 + j * 8;
                      const bp = spring({ frame: frame - barDelay, fps, config: springs.snappy });
                      const barHeight = interpolate(bp, [0, 1], [0, (bar.count / 130) * 120]);
                      return (
                        <div key={j} style={{ flex: 1, textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontFamily: fonts.mono,
                              color: colors.textMuted,
                              marginBottom: 6,
                            }}
                          >
                            {bar.count}
                          </div>
                          <div
                            style={{
                              height: barHeight,
                              background: `linear-gradient(180deg, ${bar.color}, ${bar.color}60)`,
                              borderRadius: "4px 4px 0 0",
                              transition: "height 0.3s",
                            }}
                          />
                          <div
                            style={{
                              fontSize: 9,
                              fontFamily: fonts.body,
                              color: colors.textMuted,
                              marginTop: 6,
                            }}
                          >
                            {bar.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Activity Feed */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 10,
                    padding: 16,
                    border: `1px solid ${colors.glassBorder}`,
                    opacity: interpolate(feedProgress, [0, 1], [0, 1]),
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontFamily: fonts.heading,
                      fontWeight: 600,
                      color: colors.textSecondary,
                      marginBottom: 12,
                    }}
                  >
                    Recent Activity
                  </div>
                  {activityFeed.map((item, j) => {
                    const itemDelay = 220 + j * 10;
                    const ip = spring({ frame: frame - itemDelay, fps, config: springs.snappy });
                    return (
                      <div
                        key={j}
                        style={{
                          display: "flex",
                          gap: 10,
                          padding: "8px 0",
                          borderBottom:
                            j < activityFeed.length - 1
                              ? `1px solid rgba(255,255,255,0.04)`
                              : "none",
                          opacity: interpolate(ip, [0, 1], [0, 1]),
                          transform: `translateX(${interpolate(ip, [0, 1], [15, 0])}px)`,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: item.color,
                            marginTop: 5,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontFamily: fonts.mono,
                              color: colors.textSecondary,
                              lineHeight: 1.3,
                            }}
                          >
                            {item.event}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              fontFamily: fonts.body,
                              color: colors.textDim,
                              marginTop: 2,
                            }}
                          >
                            {item.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer effect across the browser */}
          <ShimmerHighlight width={1600} height={820} delay={90} />
        </div>
      </div>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
