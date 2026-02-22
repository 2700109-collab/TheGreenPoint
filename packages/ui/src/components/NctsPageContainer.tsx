import React, { useState, useEffect, useCallback } from 'react';
import { breakpoints, typeScale, spacing, text as textColors, fontFamily } from '../tokens';

export interface NctsPageContainerProps {
  title: React.ReactNode;
  subTitle?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

type ScreenSize = 'desktop' | 'tablet' | 'mobile';

function getScreenSize(width: number): ScreenSize {
  if (width >= breakpoints.lg) return 'desktop';
  if (width >= breakpoints.md) return 'tablet';
  return 'mobile';
}

const paddingMap: Record<ScreenSize, number> = {
  desktop: spacing[6],  // 24
  tablet: spacing[4],   // 16
  mobile: spacing[3],   // 12
};

export const NctsPageContainer: React.FC<NctsPageContainerProps> = ({
  title,
  subTitle,
  extra,
  children,
  className,
}) => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() =>
    typeof window !== 'undefined' ? getScreenSize(window.innerWidth) : 'desktop',
  );

  const handleResize = useCallback(() => {
    setScreenSize(getScreenSize(window.innerWidth));
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const pad = paddingMap[screenSize];
  const titleStyle = screenSize === 'desktop' ? typeScale['heading-2'] : typeScale['heading-3'];
  const subTitleStyle = typeScale['body'];

  return (
    <section className={className} style={{ padding: pad }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: spacing[4],
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: fontFamily.body,
              fontSize: titleStyle.fontSize,
              fontWeight: titleStyle.fontWeight,
              lineHeight: titleStyle.lineHeight,
              letterSpacing: titleStyle.letterSpacing,
              color: textColors.primary,
            }}
          >
            {title}
          </h2>

          {subTitle && (
            <p
              style={{
                margin: '4px 0 0',
                fontFamily: fontFamily.body,
                fontSize: subTitleStyle.fontSize,
                fontWeight: subTitleStyle.fontWeight,
                lineHeight: subTitleStyle.lineHeight,
                letterSpacing: subTitleStyle.letterSpacing,
                color: textColors.secondary,
              }}
            >
              {subTitle}
            </p>
          )}
        </div>

        {extra && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {extra}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </section>
  );
};
