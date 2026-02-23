/**
 * NCTS Proposal Video — Main Composition
 *
 * 10 cinematic scenes with crossfade transitions (15-frame overlap).
 * 1920×1080 @ 30fps · 3600 frames (~2 minutes)
 *
 * Scene Map:
 * ─────────────────────────────────────────────
 *  1. Cold Open        0-180     (6.0s)   Hook with R28.4B stat
 *  2. Introducing NCTS 165-420   (8.5s)   Logo + CSIR partnership
 *  3. Seed-to-Sale     405-810   (13.5s)  Pipeline hero sequence
 *  4. Portal Showcase  795-1200  (13.5s)  Operator dashboard
 *  5. Gov Dashboard    1185-1560 (12.5s)  SAHPRA national oversight
 *  6. Compliance       1545-1890 (11.5s)  Security & compliance engine
 *  7. Verification     1875-2190 (10.5s)  Public QR verification
 *  8. Differentiators  2175-2490 (10.5s)  Why NCTS / CSIR
 *  9. Revenue          2475-2790 (10.5s)  Business model & impact
 * 10. Call to Action   2775-3600 (27.5s)  Professional close
 * ─────────────────────────────────────────────
 */
import React from "react";
import { Sequence, interpolate, useCurrentFrame } from "remotion";

import { OpeningHook } from "./scenes/OpeningHook";
import { IntroducingNcts } from "./scenes/IntroducingNcts";
import { SeedToSalePipeline } from "./scenes/SeedToSalePipeline";
import { PortalShowcase } from "./scenes/PortalShowcase";
import { GovernmentDashboard } from "./scenes/GovernmentDashboard";
import { ComplianceSecurity } from "./scenes/ComplianceSecurity";
import { PublicVerification } from "./scenes/PublicVerification";
import { KeyDifferentiators } from "./scenes/KeyDifferentiators";
import { RevenueImpact } from "./scenes/RevenueImpact";
import { CallToAction } from "./scenes/CallToAction";

/**
 * Crossfade wrapper — handles entrance and exit opacity.
 */
const SceneWithFade: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeFrames?: number;
}> = ({ children, durationInFrames, fadeFrames = 15 }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return <div style={{ opacity, width: 1920, height: 1080 }}>{children}</div>;
};

const scenes = [
  { from: 0,    duration: 180,  Component: OpeningHook },
  { from: 165,  duration: 255,  Component: IntroducingNcts },
  { from: 405,  duration: 405,  Component: SeedToSalePipeline },
  { from: 795,  duration: 405,  Component: PortalShowcase },
  { from: 1185, duration: 375,  Component: GovernmentDashboard },
  { from: 1545, duration: 345,  Component: ComplianceSecurity },
  { from: 1875, duration: 315,  Component: PublicVerification },
  { from: 2175, duration: 315,  Component: KeyDifferentiators },
  { from: 2475, duration: 315,  Component: RevenueImpact },
  { from: 2775, duration: 825,  Component: CallToAction },
] as const;

export const NctsProposal: React.FC = () => (
  <div style={{ width: 1920, height: 1080, background: "#060B18", position: "relative" }}>
    {scenes.map(({ from, duration, Component }, i) => (
      <Sequence key={i} from={from} durationInFrames={duration} layout="none">
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <SceneWithFade durationInFrames={duration}>
            <Component />
          </SceneWithFade>
        </div>
      </Sequence>
    ))}
  </div>
);
