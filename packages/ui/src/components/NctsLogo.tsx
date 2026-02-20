interface NctsLogoProps {
  size?: number;
  variant?: 'operator' | 'regulator' | 'verify';
}

export function NctsLogo({ size = 32, variant = 'operator' }: NctsLogoProps) {
  const colors = {
    operator: '#007A4D',
    regulator: '#1B3A5C',
    verify: '#FFB81C',
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: size * 0.5,
        fontWeight: 700,
        color: colors[variant],
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span style={{ fontSize: size }}>🌿</span>
      <span>NCTS</span>
    </div>
  );
}
