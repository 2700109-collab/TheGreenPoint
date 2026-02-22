/**
 * AuthLayout — Two-column auth layout per FrontEnd.md §9.
 *
 * Left panel (60%): SA government navy branding with coat of arms.
 * Right panel (40%): white background, centered card for auth form content.
 * Mobile: single column (form only, branding panel hidden).
 */

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { GovMasthead, PhaseBanner, GovFooter, useBreakpoint } from '@ncts/ui';

const { Title, Text } = Typography;

const NAVY = '#1B3A5C';
const GOLD = '#FFB81C';

/* Subtle topographic-style CSS pattern at 0.03 opacity */
const topoBg = [
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px)',
  'repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px)',
  'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)',
].join(', ');

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <GovMasthead />
      <PhaseBanner phase="beta" />

      <div style={{ flex: 1, display: 'flex' }}>
        {/* ---------- Left branding panel (hidden on mobile) ---------- */}
        {!isMobile && (
          <div
            style={{
              width: '60%',
              background: NAVY,
              backgroundImage: topoBg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <SafetyCertificateOutlined
              style={{ fontSize: 72, color: GOLD, marginBottom: 24 }}
              aria-hidden
            />
            <Title
              level={2}
              style={{
                color: '#fff',
                textAlign: 'center',
                margin: '0 0 12px',
                fontWeight: 700,
              }}
            >
              National Cannabis Tracking System
            </Title>
            <Text
              style={{
                color: 'rgba(255,255,255,0.75)',
                textAlign: 'center',
                maxWidth: 400,
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              The official Republic of South Africa platform for seed-to-sale
              cannabis tracking, regulatory compliance, and public verification.
            </Text>
          </div>
        )}

        {/* ---------- Right form panel ---------- */}
        <div
          style={{
            width: isMobile ? '100%' : '40%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 24 : 48,
          }}
        >
          <div style={{ width: '100%', maxWidth: 420 }}>
            {children}
          </div>
        </div>
      </div>

      <GovFooter />
    </div>
  );
}
