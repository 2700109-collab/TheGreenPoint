/**
 * Scene 6: Compliance & Security — Technical credibility showcase.
 * Hash chain visualization, RLS diagram, compliance engine, encryption.
 * Duration: ~11.5s (345 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  GradientBorderCard,
  GradientLine,
  SAFlagStripe,
} from "../components/Animations";

export const ComplianceSecurity: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline
  const titleProgress = spring({ frame: frame - 5, fps, config: springs.smooth });
  const chainProgress = spring({ frame: frame - 40, fps, config: springs.smooth });
  const rulesProgress = spring({ frame: frame - 130, fps, config: springs.smooth });
  const rlsProgress = spring({ frame: frame - 210, fps, config: springs.smooth });

  // Hash chain blocks
  const hashBlocks = [
    { event: "plant.created", hash: "a3f8c2...e91b", time: "14:23:01" },
    { event: "harvest.created", hash: "7d2e4f...c8a3", time: "14:23:45" },
    { event: "lab_result.pass", hash: "e1b9d6...4f27", time: "14:24:12" },
    { event: "transfer.created", hash: "94c3a1...d852", time: "14:25:33" },
    { event: "sale.completed", hash: "f6e8b2...1a94", time: "14:26:07" },
  ];

  // Key compliance rules
  const rules = [
    { id: "R002", name: "THC Limit Enforcement", type: "Real-time", severity: "CRITICAL", desc: "Hemp ≤0.2% THC. Auto-quarantine on violation." },
    { id: "R004", name: "Transfer Velocity Anomaly", type: "Real-time", severity: "WARNING", desc: "Flags >3σ transfer rate, unusual hours." },
    { id: "R006", name: "Wet-to-Dry Ratio", type: "Real-time", severity: "CRITICAL", desc: "Normal 3:1-5:1. Detects weight manipulation." },
    { id: "R007", name: "Mass Balance Check", type: "Daily", severity: "CRITICAL", desc: "Harvest - sold - transferred - destroyed = inventory." },
  ];

  return (
    <SceneContainer
      orbs={[
        { color: "#6366F1", x: 30, y: 30, size: 400 },
        { color: colors.green, x: 70, y: 60, size: 350 },
        { color: colors.red, x: 50, y: 80, size: 200 },
      ]}
      meshOpacity={0.1}
    >
      {/* Header */}
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <FadeInUp delay={5}>
          <div style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 600, color: colors.green, letterSpacing: "0.4em", textTransform: "uppercase" }}>
            Security Architecture
          </div>
        </FadeInUp>
        <StaggeredText
          text="Cryptographic Trust. Zero Compromise."
          fontSize={40}
          fontWeight={800}
          color={colors.white}
          delay={10}
          staggerFrames={4}
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Hash Chain Visualization */}
      <div
        style={{
          padding: "24px 80px 0",
          opacity: interpolate(chainProgress, [0, 1], [0, 1]),
        }}
      >
        <div style={{ fontSize: 13, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 14 }}>
          🔗 Tamper-Evident SHA-256 Hash Chain — 26 Audited Event Types
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {hashBlocks.map((block, i) => {
            const blockDelay = 50 + i * 18;
            const bp = spring({ frame: frame - blockDelay, fps, config: springs.snappy });
            const connDelay = blockDelay + 8;
            const cp = i > 0 ? interpolate(frame - connDelay, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

            return (
              <React.Fragment key={i}>
                {/* Connector arrow */}
                {i > 0 && (
                  <div style={{ width: 40, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <div style={{
                      width: `${cp * 100}%`, height: 2,
                      background: `linear-gradient(90deg, ${colors.green}80, ${colors.green})`,
                      borderRadius: 1,
                    }} />
                    <div style={{
                      position: "absolute", right: 0, width: 0, height: 0,
                      borderTop: "4px solid transparent",
                      borderBottom: "4px solid transparent",
                      borderLeft: `6px solid ${colors.green}`,
                      opacity: cp > 0.8 ? 1 : 0,
                    }} />
                  </div>
                )}
                {/* Block */}
                <div
                  style={{
                    flex: 1,
                    background: colors.glassBg,
                    border: `1px solid ${interpolate(bp, [0, 1], [0, 1]) > 0.5 ? colors.glassBorderHeavy : colors.glassBorder}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    backdropFilter: "blur(16px)",
                    opacity: interpolate(bp, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(bp, [0, 1], [0.85, 1])})`,
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.green, marginBottom: 4 }}>
                    {block.event}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: fonts.mono, color: colors.textDim }}>
                    SHA-256: {block.hash}
                  </div>
                  <div style={{ fontSize: 8, fontFamily: fonts.mono, color: colors.textDim, marginTop: 2 }}>
                    {block.time} SAST
                  </div>
                  {i === 0 && (
                    <div style={{ fontSize: 8, fontFamily: fonts.mono, color: colors.gold, marginTop: 3 }}>
                      prev: GENESIS
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom row: Compliance Rules + RLS + Encryption */}
      <div style={{ flex: 1, display: "flex", gap: 16, padding: "20px 80px 40px" }}>
        {/* Compliance Rules */}
        <div
          style={{
            flex: 1.3,
            background: colors.glassBg,
            border: `1px solid ${colors.glassBorder}`,
            borderRadius: 14,
            padding: 18,
            backdropFilter: "blur(16px)",
            opacity: interpolate(rulesProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(rulesProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 13, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 12 }}>
            🛡️ 14-Rule Compliance Engine (Strategy Pattern)
          </div>
          {rules.map((rule, j) => {
            const rd = 140 + j * 15;
            const rp = spring({ frame: frame - rd, fps, config: springs.snappy });
            return (
              <div
                key={j}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: j < rules.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                  opacity: interpolate(rp, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rp, [0, 1], [12, 0])}px)`,
                }}
              >
                <span style={{
                  fontSize: 9, fontFamily: fonts.mono, fontWeight: 700,
                  color: colors.blue,
                  background: colors.blueSoft,
                  padding: "2px 6px", borderRadius: 3, flexShrink: 0, marginTop: 2,
                }}>
                  {rule.id}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: fonts.heading, fontWeight: 600, color: colors.white }}>
                      {rule.name}
                    </span>
                    <span style={{
                      fontSize: 8, fontFamily: fonts.mono,
                      color: rule.severity === "CRITICAL" ? colors.red : colors.gold,
                      background: rule.severity === "CRITICAL" ? colors.redSoft : colors.goldSoft,
                      padding: "1px 5px", borderRadius: 3,
                    }}>
                      {rule.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted, marginTop: 3, lineHeight: 1.4 }}>
                    {rule.desc}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 10, fontFamily: fonts.mono, color: colors.textDim }}>
            + 10 more rules: Permit Expiry, Production Limits, Lab Frequency, Zone Capacity, Reporting Deadlines...
          </div>
        </div>

        {/* Right column: RLS + Encryption */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* RLS Visualization */}
          <div
            style={{
              flex: 1,
              background: colors.glassBg,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 14,
              padding: 16,
              backdropFilter: "blur(16px)",
              opacity: interpolate(rlsProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(rlsProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 13, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 12 }}>
              🔐 Row-Level Security (13 Tables)
            </div>
            {/* RLS diagram */}
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { role: "Operator A", data: "Own data only", icon: "🏭", color: colors.green },
                { role: "Operator B", data: "Own data only", icon: "🏭", color: colors.gold },
                { role: "SAHPRA", data: "All national data", icon: "🏛️", color: colors.blue },
              ].map((item, k) => {
                const rlsDelay = 220 + k * 15;
                const rlsp = spring({ frame: frame - rlsDelay, fps, config: springs.snappy });
                return (
                  <div
                    key={k}
                    style={{
                      flex: 1,
                      background: `${item.color}08`,
                      border: `1px solid ${item.color}25`,
                      borderRadius: 8,
                      padding: 10,
                      textAlign: "center",
                      opacity: interpolate(rlsp, [0, 1], [0, 1]),
                      transform: `scale(${interpolate(rlsp, [0, 1], [0.9, 1])})`,
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                    <div style={{ fontSize: 11, fontFamily: fonts.heading, fontWeight: 600, color: item.color }}>
                      {item.role}
                    </div>
                    <div style={{ fontSize: 9, fontFamily: fonts.body, color: colors.textMuted, marginTop: 4 }}>
                      {item.data}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 9, fontFamily: fonts.mono, color: colors.textDim, marginTop: 10, textAlign: "center" }}>
              Database-level isolation — impossible to bypass at application layer
            </div>
          </div>

          {/* Encryption badges */}
          <div
            style={{
              background: colors.glassBg,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 14,
              padding: 14,
              backdropFilter: "blur(16px)",
              opacity: interpolate(rlsProgress, [0, 1], [0, 1]),
            }}
          >
            <div style={{ fontSize: 12, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 10 }}>
              🔒 Encryption Stack
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                "AES-256-GCM", "SHA-256 Hash Chain", "HMAC-SHA256 QR Signing",
                "bcrypt (12 rounds)", "TLS 1.3", "AWS KMS", "POPIA Compliant",
                "MISS/MIOS Classified",
              ].map((badge, b) => {
                const bd = 230 + b * 5;
                const bbp = spring({ frame: frame - bd, fps, config: springs.snappy });
                return (
                  <span
                    key={b}
                    style={{
                      fontSize: 9,
                      fontFamily: fonts.mono,
                      color: colors.green,
                      background: colors.greenSoft,
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: `1px solid ${colors.green}20`,
                      opacity: interpolate(bbp, [0, 1], [0, 1]),
                    }}
                  >
                    {badge}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 4 Diversion Detection */}
          <div
            style={{
              background: colors.glassBg,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: 14,
              padding: 14,
              backdropFilter: "blur(16px)",
              opacity: interpolate(rlsProgress, [0, 1], [0, 1]),
            }}
          >
            <div style={{ fontSize: 12, fontFamily: fonts.heading, fontWeight: 600, color: colors.textSecondary, marginBottom: 8 }}>
              🚨 4 Diversion Detection Algorithms
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { name: "Mass Balance", icon: "⚖️" },
                { name: "Wet:Dry Ratio", icon: "💧" },
                { name: "Transfer Velocity", icon: "⚡" },
                { name: "QR Scan Pattern", icon: "📊" },
              ].map((algo, a) => (
                <div
                  key={a}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 6,
                    padding: "6px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{algo.icon}</div>
                  <div style={{ fontSize: 9, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 1.3 }}>
                    {algo.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
