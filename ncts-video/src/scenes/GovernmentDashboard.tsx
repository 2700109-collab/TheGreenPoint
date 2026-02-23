/**
 * Scene 5: SAHPRA Government Dashboard — National oversight visualization.
 * SA map with province data, compliance heatmap, real-time KPIs.
 * Duration: ~12.5s (375 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs, shadows } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  PremiumCounter,
  SAFlagStripe,
  GradientLine,
} from "../components/Animations";

export const GovernmentDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerProgress = spring({ frame: frame - 10, fps, config: springs.smooth });
  const mapProgress = spring({ frame: frame - 50, fps, config: springs.smooth });
  const kpiProgress = spring({ frame: frame - 30, fps, config: springs.smooth });
  const tableProgress = spring({ frame: frame - 120, fps, config: springs.smooth });
  const alertProgress = spring({ frame: frame - 200, fps, config: springs.smooth });

  const nationalKpis = [
    { label: "Licensed Operators", value: "342", icon: "🏭" },
    { label: "Active Permits", value: "1,247", icon: "📋" },
    { label: "Plants Tracked", value: "21,920", icon: "🌱" },
    { label: "Active Transfers", value: "3,847", icon: "🚛" },
    { label: "Monthly Excise", value: "R12.4M", icon: "💰" },
    { label: "Avg Compliance", value: "87.3%", icon: "🛡️" },
  ];

  const provinces = [
    { name: "Western Cape", operators: 87, compliance: 92, alerts: 3, color: colors.green },
    { name: "Gauteng", operators: 64, compliance: 88, alerts: 5, color: colors.green },
    { name: "KwaZulu-Natal", operators: 52, compliance: 85, alerts: 7, color: colors.gold },
    { name: "Eastern Cape", operators: 38, compliance: 81, alerts: 4, color: colors.gold },
    { name: "Limpopo", operators: 31, compliance: 79, alerts: 6, color: colors.orange },
    { name: "Mpumalanga", operators: 28, compliance: 83, alerts: 2, color: colors.green },
    { name: "Free State", operators: 22, compliance: 90, alerts: 1, color: colors.green },
    { name: "North West", operators: 12, compliance: 76, alerts: 3, color: colors.orange },
    { name: "Northern Cape", operators: 8, compliance: 94, alerts: 0, color: colors.green },
  ];

  const alerts = [
    { level: "CRITICAL", msg: "Mass balance variance >5% — Facility GP-0142, Gauteng", time: "3 min ago", color: colors.red },
    { level: "WARNING", msg: "Transfer velocity anomaly — 6 transfers in 4 hours", time: "18 min ago", color: colors.gold },
    { level: "INFO", msg: "Permit WC-2026-0087 expires in 30 days", time: "1 hr ago", color: colors.blue },
  ];

  return (
    <SceneContainer
      orbs={[
        { color: colors.primary, x: 30, y: 35, size: 500 },
        { color: colors.green, x: 70, y: 50, size: 350 },
        { color: colors.gold, x: 50, y: 75, size: 250 },
      ]}
      meshOpacity={0.12}
    >
      {/* Header */}
      <div style={{ padding: "36px 80px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <FadeInUp delay={5}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🏛️</span>
              <span style={{ fontSize: 12, fontFamily: fonts.body, fontWeight: 600, color: colors.green, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                SAHPRA Regulator Dashboard
              </span>
            </div>
          </FadeInUp>
          <StaggeredText
            text="Real-Time National Cannabis Oversight"
            fontSize={36}
            fontWeight={800}
            color={colors.white}
            delay={15}
            staggerFrames={3}
          />
        </div>
        {/* Live badge */}
        <FadeInUp delay={20}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 30 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: colors.green,
              boxShadow: `0 0 12px ${colors.green}`,
              animation: "pulse 2s infinite",
            }} />
            <span style={{ fontSize: 12, fontFamily: fonts.mono, color: colors.green, letterSpacing: "0.1em" }}>
              LIVE
            </span>
          </div>
        </FadeInUp>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "20px 80px",
          opacity: interpolate(kpiProgress, [0, 1], [0, 1]),
        }}
      >
        {nationalKpis.map((kpi, i) => {
          const kd = 30 + i * 8;
          const kp = spring({ frame: frame - kd, fps, config: springs.snappy });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: colors.glassBg,
                border: `1px solid ${colors.glassBorder}`,
                borderRadius: 10,
                padding: "10px 14px",
                backdropFilter: "blur(16px)",
                opacity: interpolate(kp, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(kp, [0, 1], [12, 0])}px)`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {kpi.label}
                </span>
                <span style={{ fontSize: 14 }}>{kpi.icon}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: fonts.heading, color: colors.white, marginTop: 4, letterSpacing: "-0.02em" }}>
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content: Map + Province table + Alerts */}
      <div style={{ flex: 1, display: "flex", gap: 16, padding: "0 80px 40px" }}>
        {/* SA Map visualization */}
        <div
          style={{
            flex: 1.2,
            background: colors.glassBg,
            border: `1px solid ${colors.glassBorder}`,
            borderRadius: 14,
            padding: 20,
            backdropFilter: "blur(16px)",
            position: "relative",
            overflow: "hidden",
            opacity: interpolate(mapProgress, [0, 1], [0, 1]),
          }}
        >
          <div style={{ fontSize: 13, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 12 }}>
            Facility Distribution — 9 Provinces
          </div>

          {/* Simplified SA outline */}
          <svg viewBox="0 0 400 320" style={{ width: "100%", height: "auto", maxHeight: 380 }}>
            {/* SA silhouette (simplified polygon) */}
            <path
              d="M80,40 L150,25 L220,30 L280,20 L340,35 L360,70 L370,120 L360,170 L340,210 L300,250 L250,280 L200,290 L160,280 L130,250 L100,230 L80,200 L60,160 L50,120 L55,80 Z"
              fill="none"
              stroke={colors.glassBorderHeavy}
              strokeWidth="1.5"
              opacity={0.4}
            />
            {/* Province dots with varied sizes and colors */}
            {[
              { x: 120, y: 240, size: 14, label: "WC", count: 87, color: colors.green },
              { x: 250, y: 100, size: 12, label: "GP", count: 64, color: colors.green },
              { x: 310, y: 160, size: 10, label: "KZN", count: 52, color: colors.gold },
              { x: 200, y: 230, size: 8, label: "EC", count: 38, color: colors.gold },
              { x: 270, y: 55, size: 7, label: "LP", count: 31, color: colors.orange },
              { x: 310, y: 100, size: 7, label: "MP", count: 28, color: colors.green },
              { x: 170, y: 160, size: 6, label: "FS", count: 22, color: colors.green },
              { x: 180, y: 100, size: 5, label: "NW", count: 12, color: colors.orange },
              { x: 100, y: 140, size: 4, label: "NC", count: 8, color: colors.green },
            ].map((dot, j) => {
              const dotDelay = 60 + j * 10;
              const dp = spring({ frame: frame - dotDelay, fps, config: springs.bouncy });
              const dotScale = interpolate(dp, [0, 1], [0, 1]);
              const pulse = 0.8 + Math.sin(frame * 0.05 + j) * 0.2;
              return (
                <g key={j}>
                  {/* Glow */}
                  <circle
                    cx={dot.x} cy={dot.y} r={dot.size * 2}
                    fill={dot.color} opacity={0.08 * dotScale * pulse}
                  />
                  {/* Dot */}
                  <circle
                    cx={dot.x} cy={dot.y} r={dot.size * dotScale}
                    fill={dot.color} opacity={0.7 * dotScale}
                  />
                  {/* Label */}
                  <text
                    x={dot.x} y={dot.y - dot.size - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily={fonts.mono}
                    fill={colors.textMuted}
                    opacity={dotScale}
                  >
                    {dot.label} ({dot.count})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Province table + Alerts */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Province compliance table */}
          <div
            style={{
              flex: 1,
              background: colors.glassBg,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 14,
              padding: 16,
              backdropFilter: "blur(16px)",
              overflow: "hidden",
              opacity: interpolate(tableProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(tableProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 13, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 10 }}>
              Province Compliance Heatmap
            </div>
            {/* Table header */}
            <div style={{ display: "flex", padding: "6px 0", borderBottom: `1px solid ${colors.glassBorder}`, marginBottom: 4 }}>
              <span style={{ flex: 2, fontSize: 10, fontFamily: fonts.body, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Province</span>
              <span style={{ flex: 1, fontSize: 10, fontFamily: fonts.body, color: colors.textDim, textTransform: "uppercase", textAlign: "center" }}>Operators</span>
              <span style={{ flex: 1, fontSize: 10, fontFamily: fonts.body, color: colors.textDim, textTransform: "uppercase", textAlign: "center" }}>Score</span>
              <span style={{ flex: 1, fontSize: 10, fontFamily: fonts.body, color: colors.textDim, textTransform: "uppercase", textAlign: "center" }}>Alerts</span>
            </div>
            {provinces.map((prov, j) => {
              const rowDelay = 125 + j * 6;
              const rp = spring({ frame: frame - rowDelay, fps, config: springs.snappy });
              const scoreColor = prov.compliance >= 90 ? colors.green : prov.compliance >= 80 ? colors.gold : colors.orange;
              return (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 0",
                    borderBottom: j < provinces.length - 1 ? `1px solid rgba(255,255,255,0.03)` : "none",
                    opacity: interpolate(rp, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(rp, [0, 1], [10, 0])}px)`,
                  }}
                >
                  <span style={{ flex: 2, fontSize: 12, fontFamily: fonts.body, color: colors.textSecondary }}>
                    {prov.name}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: fonts.mono, color: colors.textSecondary, textAlign: "center" }}>
                    {prov.operators}
                  </span>
                  <span style={{ flex: 1, textAlign: "center" }}>
                    <span style={{
                      fontSize: 11, fontFamily: fonts.mono, fontWeight: 600,
                      color: scoreColor,
                      background: `${scoreColor}15`,
                      padding: "2px 8px", borderRadius: 4,
                    }}>
                      {prov.compliance}%
                    </span>
                  </span>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: fonts.mono, color: prov.alerts > 4 ? colors.red : colors.textMuted, textAlign: "center" }}>
                    {prov.alerts}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Real-time alerts */}
          <div
            style={{
              background: colors.glassBg,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 14,
              padding: 14,
              backdropFilter: "blur(16px)",
              opacity: interpolate(alertProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(alertProgress, [0, 1], [12, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 12, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 10 }}>
              ⚡ Live Compliance Alerts
            </div>
            {alerts.map((alert, j) => {
              const ad = 210 + j * 15;
              const ap = spring({ frame: frame - ad, fps, config: springs.snappy });
              return (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: j < alerts.length - 1 ? `1px solid rgba(255,255,255,0.03)` : "none",
                    opacity: interpolate(ap, [0, 1], [0, 1]),
                  }}
                >
                  <span style={{
                    fontSize: 9, fontFamily: fonts.mono, fontWeight: 700,
                    color: alert.color,
                    background: `${alert.color}15`,
                    padding: "2px 6px", borderRadius: 3, flexShrink: 0, marginTop: 1,
                  }}>
                    {alert.level}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 1.3 }}>
                      {alert.msg}
                    </div>
                    <div style={{ fontSize: 9, fontFamily: fonts.mono, color: colors.textDim, marginTop: 2 }}>
                      {alert.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
