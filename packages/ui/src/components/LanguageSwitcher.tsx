import React from 'react';
import { Select } from 'antd';
import { Globe } from 'lucide-react';
import { primary, neutral, text as textTokens, fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LanguageSwitcherProps {
  currentLanguage: string;
  onLanguageChange: (langCode: string) => void;
  variant?: 'dropdown' | 'inline';
  className?: string;
}

// ---------------------------------------------------------------------------
// Language data — 11 SA Official Languages
// ---------------------------------------------------------------------------

interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
  enabled: boolean;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en',  nativeName: 'English',           englishName: 'English',        enabled: true },
  { code: 'af',  nativeName: 'Afrikaans',         englishName: 'Afrikaans',      enabled: false },
  { code: 'zu',  nativeName: 'isiZulu',           englishName: 'Zulu',           enabled: false },
  { code: 'xh',  nativeName: 'isiXhosa',          englishName: 'Xhosa',         enabled: false },
  { code: 'st',  nativeName: 'Sesotho',           englishName: 'Sotho',          enabled: false },
  { code: 'tn',  nativeName: 'Setswana',          englishName: 'Tswana',         enabled: false },
  { code: 'ss',  nativeName: 'Siswati',           englishName: 'Swati',          enabled: false },
  { code: 've',  nativeName: 'Tshiven\u1E13a',    englishName: 'Venda',          enabled: false },
  { code: 'ts',  nativeName: 'Xitsonga',          englishName: 'Tsonga',         enabled: false },
  { code: 'nso', nativeName: 'Sesotho sa Leboa',  englishName: 'Northern Sotho', enabled: false },
  { code: 'nr',  nativeName: 'isiNdebele',        englishName: 'Ndebele',        enabled: false },
];

// ---------------------------------------------------------------------------
// Styles — inline to avoid external CSS dependency
// ---------------------------------------------------------------------------

const styles = {
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fontFamily.body,
  } as React.CSSProperties,
  globeIcon: {
    color: primary[500],
    flexShrink: 0,
  } as React.CSSProperties,
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  } as React.CSSProperties,
  nativeName: {
    fontWeight: 500,
    color: textTokens.primary,
  } as React.CSSProperties,
  englishName: {
    fontSize: 12,
    color: textTokens.secondary,
  } as React.CSSProperties,
  comingSoonTag: {
    fontSize: 11,
    color: neutral[400],
    fontStyle: 'italic' as const,
    marginLeft: 'auto',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  inlineList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    listStyle: 'none',
    padding: 0,
    margin: 0,
  } as React.CSSProperties,
  inlineItem: (isActive: boolean, enabled: boolean): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    color: !enabled ? neutral[400] : isActive ? '#FFFFFF' : primary[500],
    background: isActive ? primary[500] : 'transparent',
    border: `1px solid ${isActive ? primary[500] : neutral[300]}`,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.6,
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLanguage,
  onLanguageChange,
  variant = 'dropdown',
  className,
}) => {
  if (variant === 'inline') {
    return (
      <div
        style={styles.wrapper}
        className={className}
        role="group"
        aria-label="Select language"
      >
        <Globe size={16} style={styles.globeIcon} aria-hidden />
        <ul style={styles.inlineList}>
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === currentLanguage;
            return (
              <li key={lang.code}>
                <button
                  type="button"
                  lang={lang.code}
                  style={styles.inlineItem(isActive, lang.enabled)}
                  disabled={!lang.enabled}
                  title={
                    lang.enabled
                      ? `${lang.nativeName} (${lang.englishName})`
                      : `${lang.nativeName} — Coming soon`
                  }
                  aria-pressed={isActive}
                  onClick={() => onLanguageChange(lang.code)}
                >
                  {lang.code.toUpperCase()}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Default: dropdown variant
  const selectOptions = LANGUAGES.map((lang) => ({
    value: lang.code,
    label: `${lang.nativeName} (${lang.englishName})`,
    disabled: !lang.enabled,
    nativeName: lang.nativeName,
    englishName: lang.englishName,
    enabled: lang.enabled,
  }));

  return (
    <div style={styles.wrapper} className={className}>
      <Globe size={16} style={styles.globeIcon} aria-hidden />
      <Select
        value={currentLanguage}
        onChange={onLanguageChange}
        aria-label="Select language"
        style={{ minWidth: 200 }}
        popupMatchSelectWidth={false}
        options={selectOptions}
        optionRender={(option) => {
          const { nativeName, englishName, enabled } = option.data as {
            nativeName: string;
            englishName: string;
            enabled: boolean;
          };
          return (
            <div style={styles.optionRow} lang={option.data.value as string}>
              <span>
                <span style={styles.nativeName}>{nativeName}</span>{' '}
                <span style={styles.englishName}>({englishName})</span>
              </span>
              {!enabled && (
                <span style={styles.comingSoonTag}>Coming soon</span>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};
