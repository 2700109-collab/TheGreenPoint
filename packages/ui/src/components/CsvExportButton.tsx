/**
 * CsvExportButton — Export tabular data as a CSV file with column config.
 *
 * Per FrontEnd.md §2.19.
 */

import { useCallback, type CSSProperties } from 'react';
import { Button, Modal, message } from 'antd';
import { Download } from 'lucide-react';
import { fontFamily } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

export interface CsvExportButtonProps {
  data: Record<string, any>[];
  columns: CsvColumn[];
  filename: string;
  label?: string;
  loading?: boolean;
  maxRows?: number;
  disabled?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines. */
function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvString(data: Record<string, any>[], columns: CsvColumn[]): string {
  const headerRow = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const formatted = col.formatter ? col.formatter(raw) : raw;
        return escapeCsvCell(formatted);
      })
      .join(','),
  );
  return [headerRow, ...dataRows].join('\r\n');
}

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const btnStyle: CSSProperties = {
  fontFamily: fontFamily.body,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CsvExportButton({
  data,
  columns,
  filename,
  label = 'Export CSV',
  loading = false,
  maxRows = 10_000,
  disabled = false,
  className,
}: CsvExportButtonProps) {
  const count = data.length;

  const doExport = useCallback(() => {
    const csv = buildCsvString(data, columns);
    triggerDownload(csv, filename);
    message.success(`Exported ${count} record${count === 1 ? '' : 's'} to CSV`);
  }, [data, columns, filename, count]);

  const handleClick = useCallback(() => {
    if (count > maxRows) {
      Modal.confirm({
        title: 'Large export',
        content: `You are about to export ${count.toLocaleString()} rows. This may take a moment and produce a large file. Continue?`,
        okText: 'Export',
        cancelText: 'Cancel',
        onOk: doExport,
      });
      return;
    }
    doExport();
  }, [count, maxRows, doExport]);

  return (
    <Button
      type="default"
      icon={<Download size={16} />}
      loading={loading}
      disabled={disabled || loading}
      onClick={handleClick}
      className={className}
      style={btnStyle}
      aria-label={`Export ${count} record${count === 1 ? '' : 's'} as CSV file`}
    >
      {loading ? 'Exporting...' : label}
    </Button>
  );
}
