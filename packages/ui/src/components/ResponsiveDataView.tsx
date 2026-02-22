import React from 'react';
import { Card, List, Spin, Empty } from 'antd';
import type { TablePaginationConfig } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { useBreakpoint } from '../hooks/useBreakpoint';

/** Extends the standard Ant column with an optional responsive priority. */
export interface ResponsiveColumn<T> extends ColumnType<T> {
  /** Lower numbers = higher priority. Columns with higher numbers are hidden first on mobile. */
  responsivePriority?: number;
  /** If true, this column is searchable in ProTable's built-in column filter. */
  search?: boolean;
}

export interface ResponsiveDataViewProps<T extends Record<string, unknown>> {
  columns: ResponsiveColumn<T>[];
  dataSource?: T[];
  /** Custom card renderer for mobile view. Falls back to a label/value pair layout. */
  cardRender?: (record: T, index: number) => React.ReactNode;
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  rowKey?: string | ((record: T) => string);
  /** Optional toolbar title for desktop ProTable. */
  headerTitle?: string;
}

/**
 * Renders an Ant Design Table on desktop and a Card-list on mobile.
 * Uses `useBreakpoint()` to detect the current viewport size.
 */
export function ResponsiveDataView<T extends Record<string, unknown>>({
  columns,
  dataSource,
  cardRender,
  loading,
  pagination,
  rowKey,
  headerTitle,
}: ResponsiveDataViewProps<T>) {
  const { isMobile } = useBreakpoint();

  if (!isMobile) {
    // Map ResponsiveColumn to ProColumns — disable built-in search form
    const proColumns = columns.map((col) => ({
      ...col,
      title: col.title as React.ReactNode,
      search: false as const,
    }));

    return (
      <ProTable<T>
        columns={proColumns as ProColumns<T>[]}
        dataSource={dataSource}
        loading={loading}
        pagination={pagination}
        rowKey={rowKey}
        scroll={{ x: 'max-content' }}
        headerTitle={headerTitle}
        search={false}
        options={{
          density: true,
          fullScreen: false,
          reload: false,
          setting: true,
        }}
        cardBordered
      />
    );
  }

  // --- Mobile card view ---

  const defaultCardRender = (record: T) => (
    <Card size="small" style={{ marginBottom: 8 }}>
      {columns
        .filter((col) => col.title)
        .map((col, idx) => {
          const dataIndex = col.dataIndex as string | undefined;
          const value = dataIndex ? (record as Record<string, unknown>)[dataIndex] : undefined;
          const rendered = col.render
            ? col.render(value, record, idx)
            : value;
          return (
            <div
              key={dataIndex ?? idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span style={{ fontWeight: 500, color: '#595959', marginRight: 12 }}>
                {col.title as React.ReactNode}
              </span>
              <span style={{ textAlign: 'right' }}>{rendered as React.ReactNode}</span>
            </div>
          );
        })}
    </Card>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (!dataSource || dataSource.length === 0) {
    return <Empty />;
  }

  return (
    <List
      dataSource={dataSource}
      pagination={pagination === false ? false : (pagination as Record<string, unknown> | undefined)}
      renderItem={(record, index) => (
        <List.Item style={{ padding: 0, border: 'none' }}>
          {cardRender ? cardRender(record, index) : defaultCardRender(record)}
        </List.Item>
      )}
    />
  );
}
