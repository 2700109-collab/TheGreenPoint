import { Tag } from 'antd';

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
}

const defaultColorMap: Record<string, string> = {
  compliant: 'green',
  active: 'green',
  pass: 'green',
  success: 'green',
  warning: 'orange',
  pending: 'gold',
  non_compliant: 'red',
  fail: 'red',
  expired: 'red',
  revoked: 'red',
  suspended: 'orange',
  under_review: 'blue',
};

export function StatusBadge({ status, colorMap }: StatusBadgeProps) {
  const map = { ...defaultColorMap, ...colorMap };
  const color = map[status] || 'default';
  const label = status.replace(/_/g, ' ').toUpperCase();

  return <Tag color={color}>{label}</Tag>;
}
