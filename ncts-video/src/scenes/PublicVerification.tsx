/**
 * Scene 7: Public Verification — Citizen QR scan experience.
 * Phone mockup with QR scanner → verified product result.
 * Duration: ~10.5s (315 frames @ 30fps)
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, springs, shadows } from "../theme";
import {
  SceneContainer,
  FadeInUp,
  StaggeredText,
  GlassCard,
  GradientLine,
  SAFlagStripe,
} from "../components/Animations";

export const PublicVerification: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone animation
  const phoneProgress = spring({ frame: frame - 20, fps, config: springs.smooth });
  // Scan animation
  const scanLineY = interpolate(frame, [60, 120], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "extend" });
  const scanPulse = Math.sin(frame * 0.1) * 0.5 + 0.5;
  // Result reveal
  const resultProgress = spring({ frame: frame - 130, fps, config: springs.snappy });
  // Journey
  const journeyProgress = spring({ frame: frame - 190, fps, config: springs.smooth });
  // Trust badges
  const badgesProgress = spring({ frame: frame - 250, fps, config: springs.smooth });

  // Has scanned
  const hasScanned = frame > 125;

  return (
    <SceneContainer
      orbs={[
        { color: colors.green, x: 50, y: 45, size: 400 },
        { color: colors.blue, x: 30, y: 30, size: 250 },
      ]}
      meshOpacity={0.12}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 100px" }}>
        {/* Left side — Text */}
        <div style={{ flex: 1, paddingRight: 80 }}>
          <FadeInUp delay={5}>
            <div style={{ fontSize: 14, fontFamily: fonts.body, fontWeight: 600, color: colors.green, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 12 }}>
              Public Verification
            </div>
          </FadeInUp>

          <StaggeredText
            text="Any Citizen. Any Product. Instant Trust."
            fontSize={42}
            fontWeight={800}
            color={colors.white}
            delay={10}
            staggerFrames={4}
            textAlign="left"
          />

          <FadeInUp delay={45} distance={15}>
            <div style={{ fontSize: 18, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 1.6, marginTop: 20, maxWidth: 500 }}>
              Scan any NCTS QR code to verify product authenticity, 
              lab results, and the complete supply chain journey — 
              from seed to sale.
            </div>
          </FadeInUp>

          <FadeInUp delay={60} distance={15}>
            <div style={{ fontSize: 14, fontFamily: fonts.mono, color: colors.textMuted, marginTop: 20 }}>
              🌐 verify.ncts.gov.za
            </div>
          </FadeInUp>

          {/* Trust badges */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 12,
              opacity: interpolate(badgesProgress, [0, 1], [0, 1]),
            }}
          >
            {[
              { icon: "🏛️", label: "Government\nVerified" },
              { icon: "🛡️", label: "SAHPRA\nCompliant" },
              { icon: "⚡", label: "Real-time\nTracking" },
              { icon: "🔒", label: "HMAC-SHA256\nSigned" },
            ].map((badge, i) => {
              const bd = 255 + i * 8;
              const bp = spring({ frame: frame - bd, fps, config: springs.snappy });
              return (
                <div
                  key={i}
                  style={{
                    background: colors.glassBg,
                    border: `1px solid ${colors.glassBorder}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    textAlign: "center",
                    backdropFilter: "blur(12px)",
                    opacity: interpolate(bp, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(bp, [0, 1], [10, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{badge.icon}</div>
                  <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 1.3, whiteSpace: "pre-line" }}>
                    {badge.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side — Phone mockup */}
        <div
          style={{
            opacity: interpolate(phoneProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(phoneProgress, [0, 1], [40, 0])}px) scale(${interpolate(phoneProgress, [0, 1], [0.9, 1])})`,
          }}
        >
          {/* Phone frame */}
          <div
            style={{
              width: 340,
              height: 700,
              borderRadius: 36,
              background: "#111111",
              border: "3px solid #333",
              boxShadow: `${shadows.xl}, 0 0 80px rgba(0,0,0,0.6)`,
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Notch */}
            <div style={{
              position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
              width: 120, height: 28, background: "#111111", borderRadius: "0 0 16px 16px",
              zIndex: 20,
            }} />

            {/* Status bar */}
            <div style={{
              height: 44, padding: "14px 20px 0",
              display: "flex", justifyContent: "space-between",
              fontSize: 11, fontFamily: fonts.mono, color: colors.white,
            }}>
              <span>09:41</span>
              <span style={{ opacity: 0.6 }}>●●● WiFi 🔋</span>
            </div>

            {/* Phone content */}
            <div style={{ flex: 1, background: "#0A1628", padding: "0 16px 16px", display: "flex", flexDirection: "column" }}>
              {/* NCTS Header */}
              <div style={{
                textAlign: "center", padding: "12px 0 8px",
                borderBottom: `1px solid ${colors.glassBorder}`,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 12, fontFamily: fonts.heading, fontWeight: 700, color: colors.green, letterSpacing: "0.1em" }}>
                  🌿 NCTS VERIFY
                </div>
              </div>

              {!hasScanned ? (
                /* QR Scanner view */
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 16,
                      position: "relative",
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {/* Corner brackets */}
                    {[
                      { top: 0, left: 0, borderTop: `3px solid ${colors.green}`, borderLeft: `3px solid ${colors.green}` },
                      { top: 0, right: 0, borderTop: `3px solid ${colors.green}`, borderRight: `3px solid ${colors.green}` },
                      { bottom: 0, left: 0, borderBottom: `3px solid ${colors.green}`, borderLeft: `3px solid ${colors.green}` },
                      { bottom: 0, right: 0, borderBottom: `3px solid ${colors.green}`, borderRight: `3px solid ${colors.green}` },
                    ].map((pos, c) => (
                      <div
                        key={c}
                        style={{
                          position: "absolute",
                          width: 30,
                          height: 30,
                          borderRadius: c < 2 ? "8px 0 0 0" : "0 0 8px 0",
                          ...pos,
                        } as React.CSSProperties}
                      />
                    ))}

                    {/* Scanning line */}
                    <div
                      style={{
                        position: "absolute",
                        top: `${scanLineY % 100}%`,
                        left: 10,
                        right: 10,
                        height: 2,
                        background: `linear-gradient(90deg, transparent, ${colors.green}, transparent)`,
                        opacity: scanPulse,
                        boxShadow: `0 0 12px ${colors.green}60`,
                      }}
                    />

                    {/* Simulated QR grid */}
                    <div style={{ position: "absolute", inset: 30, opacity: 0.15, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3 }}>
                      {Array.from({ length: 64 }, (_, q) => (
                        <div key={q} style={{ background: Math.random() > 0.5 ? colors.white : "transparent", borderRadius: 1 }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: fonts.body, color: colors.textMuted, marginTop: 16, textAlign: "center" }}>
                    Point camera at product QR code
                  </div>
                </div>
              ) : (
                /* Verified result view */
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    opacity: interpolate(resultProgress, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(resultProgress, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {/* VERIFIED banner */}
                  <div
                    style={{
                      background: `${colors.green}15`,
                      border: `1px solid ${colors.green}40`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      textAlign: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 2 }}>✅</div>
                    <div style={{ fontSize: 18, fontFamily: fonts.heading, fontWeight: 800, color: colors.green, letterSpacing: "0.15em" }}>
                      VERIFIED
                    </div>
                    <div style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted, marginTop: 2 }}>
                      Product authenticity confirmed
                    </div>
                  </div>

                  {/* Product details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {[
                      { label: "Product", value: "Premium CBD Oil 30ml" },
                      { label: "Strain", value: "Durban Poison (Sativa)" },
                      { label: "Producer", value: "Cape Flora Botanicals" },
                      { label: "THC/CBD", value: "0.3% / 18.4%" },
                      { label: "Lab Tested", value: "22 Feb 2026 — PASSED ✓" },
                      { label: "Batch", value: "BTH-20260220-001" },
                      { label: "Tracking ID", value: "NCTS-ZA-2026-000342" },
                    ].map((row, r) => (
                      <div
                        key={r}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "7px 0",
                          borderBottom: `1px solid rgba(255,255,255,0.04)`,
                        }}
                      >
                        <span style={{ fontSize: 10, fontFamily: fonts.body, color: colors.textMuted }}>
                          {row.label}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.white, fontWeight: 500 }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Supply chain journey */}
                  <div
                    style={{
                      marginTop: 12,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      padding: 10,
                      opacity: interpolate(journeyProgress, [0, 1], [0, 1]),
                    }}
                  >
                    <div style={{ fontSize: 9, fontFamily: fonts.heading, fontWeight: 600, color: colors.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Supply Chain Journey
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {[
                        { icon: "🌱", label: "Cultivated", check: true },
                        { icon: "🧪", label: "Lab Tested", check: true },
                        { icon: "📦", label: "Transferred", check: true },
                        { icon: "🛒", label: "Sold", check: true },
                      ].map((step, s) => {
                        const sd = 200 + s * 12;
                        const sp = spring({ frame: frame - sd, fps, config: springs.snappy });
                        return (
                          <React.Fragment key={s}>
                            {s > 0 && (
                              <div style={{
                                flex: 1, height: 1,
                                background: colors.green,
                                opacity: interpolate(sp, [0, 1], [0, 0.4]),
                                margin: "0 4px",
                              }} />
                            )}
                            <div
                              style={{
                                textAlign: "center",
                                opacity: interpolate(sp, [0, 1], [0, 1]),
                                transform: `scale(${interpolate(sp, [0, 1], [0.8, 1])})`,
                              }}
                            >
                              <div style={{ fontSize: 18 }}>{step.icon}</div>
                              <div style={{ fontSize: 8, fontFamily: fonts.body, color: colors.green, marginTop: 2 }}>
                                {step.label} ✓
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SAFlagStripe delay={5} />
    </SceneContainer>
  );
};
