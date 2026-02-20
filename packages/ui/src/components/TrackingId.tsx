interface TrackingIdProps {
  id: string;
}

export function TrackingId({ id }: TrackingIdProps) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        letterSpacing: '0.02em',
      }}
    >
      {id}
    </span>
  );
}
