/**
 * SearchGlobal — Command palette style global search.
 *
 * Opens a modal with keyboard-navigable search results grouped by entity type.
 * Per FrontEnd.md §2.21.
 */

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { Modal, Input, Skeleton } from 'antd';
import {
  Search,
  Sprout,
  Building2,
  Truck,
  Users,
  FileCheck,
  ShoppingCart,
  Wheat,
  Clock,
  X,
} from 'lucide-react';
import { fontFamily, text as textTokens, primary, neutral } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  type: 'plant' | 'facility' | 'transfer' | 'operator' | 'permit' | 'sale' | 'harvest';
  title: string;
  subtitle?: string;
  path: string;
}

export interface SearchGlobalProps {
  /** Async search function */
  onSearch: (query: string) => Promise<SearchResult[]>;
  /** Keyboard shortcut display hint */
  shortcut?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Router-agnostic navigation callback */
  onNavigate?: (path: string) => void;
  /** Additional class */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RECENT_KEY = 'ncts-recent-searches';
const MAX_RECENT = 5;
const MAX_RESULTS = 20;
const DEBOUNCE_MS = 300;

type EntityType = SearchResult['type'];

const TYPE_ICONS: Record<EntityType, React.FC<{ size: number }>> = {
  plant: Sprout,
  facility: Building2,
  transfer: Truck,
  operator: Users,
  permit: FileCheck,
  sale: ShoppingCart,
  harvest: Wheat,
};

const TYPE_LABELS: Record<EntityType, string> = {
  plant: 'Plants',
  facility: 'Facilities',
  transfer: 'Transfers',
  operator: 'Operators',
  permit: 'Permits',
  sale: 'Sales',
  harvest: 'Harvests',
};

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const prev = getRecent().filter((q) => q !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)));
  } catch {
    // ignore storage errors
  }
}

function groupResults(results: SearchResult[]): [EntityType, SearchResult[]][] {
  const map = new Map<EntityType, SearchResult[]>();
  for (const r of results.slice(0, MAX_RESULTS)) {
    const list = map.get(r.type) ?? [];
    list.push(r);
    map.set(r.type, list);
  }
  return Array.from(map.entries());
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const triggerBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  border: `1px solid ${neutral[300]}`,
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontFamily: fontFamily.body,
  fontSize: 13,
  color: textTokens.secondary,
  transition: 'border-color 200ms',
};

const shortcutBadge: CSSProperties = {
  fontSize: 11,
  padding: '1px 6px',
  borderRadius: 4,
  background: neutral[100],
  border: `1px solid ${neutral[300]}`,
  color: textTokens.tertiary,
  fontFamily: fontFamily.mono,
};

const resultItem = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  background: active ? primary[50] : 'transparent',
  transition: 'background 100ms',
});

const groupHeader: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: textTokens.tertiary,
  padding: '10px 12px 4px',
  fontFamily: fontFamily.body,
};

const footerHint: CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  padding: '8px 0 0',
  borderTop: `1px solid ${neutral[200]}`,
  fontSize: 12,
  color: textTokens.tertiary,
  fontFamily: fontFamily.body,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchGlobal({
  onSearch,
  shortcut = 'Ctrl+K',
  placeholder = 'Search plants, facilities, operators...',
  onNavigate,
  className,
}: SearchGlobalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load recent on open
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecent());
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setActiveIndex(0);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(query.trim())
        .then((r) => {
          setResults(r.slice(0, MAX_RESULTS));
          setLoading(false);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [query, onSearch]);

  const flatResults = results;

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      if (query.trim()) saveRecent(query.trim());
      onNavigate?.(path);
    },
    [onNavigate, query],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[activeIndex]) {
            navigate(flatResults[activeIndex].path);
          }
          break;
        case 'Escape':
          setOpen(false);
          break;
      }
    },
    [flatResults, activeIndex, navigate],
  );

  const grouped = groupResults(flatResults);

  // Build a flat index map so activeIndex maps correctly across groups
  let flatIdx = 0;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        className={className}
        style={triggerBtn}
        onClick={() => setOpen(true)}
        aria-label="Open global search"
      >
        <Search size={16} />
        <span>Search…</span>
        <kbd style={shortcutBadge}>{shortcut}</kbd>
      </button>

      {/* Search modal */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        closable={false}
        width={560}
        style={{ top: '15%' }}
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        <div
          role="dialog"
          aria-label="Global search"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${neutral[200]}` }}>
            <Input
              ref={inputRef as React.Ref<any>}
              prefix={<Search size={18} style={{ color: textTokens.tertiary }} />}
              suffix={
                query ? (
                  <X
                    size={16}
                    style={{ cursor: 'pointer', color: textTokens.tertiary }}
                    onClick={() => setQuery('')}
                  />
                ) : null
              }
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              variant="borderless"
              size="large"
              role="combobox"
              aria-expanded={flatResults.length > 0}
              aria-autocomplete="list"
              aria-controls="search-results-list"
              aria-activedescendant={
                flatResults[activeIndex]
                  ? `search-result-${flatResults[activeIndex].id}`
                  : undefined
              }
            />
          </div>

          {/* Results area */}
          <div
            id="search-results-list"
            role="listbox"
            aria-label="Search results"
            style={{ maxHeight: 400, overflowY: 'auto', padding: '4px 8px 8px' }}
          >
            {/* Loading skeleton */}
            {loading && (
              <div style={{ padding: '8px 12px' }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    active
                    title={false}
                    paragraph={{ rows: 1, width: '80%' }}
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </div>
            )}

            {/* No query — show recent */}
            {!query && !loading && recentSearches.length > 0 && (
              <>
                <div style={groupHeader}>Recent Searches</div>
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    style={{ ...resultItem(false), cursor: 'pointer' }}
                    onClick={() => setQuery(term)}
                  >
                    <Clock size={14} style={{ color: textTokens.tertiary }} />
                    <span style={{ fontSize: 14, color: textTokens.primary, fontFamily: fontFamily.body }}>
                      {term}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* No results */}
            {query && !loading && flatResults.length === 0 && (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: textTokens.tertiary,
                  fontSize: 14,
                  fontFamily: fontFamily.body,
                }}
              >
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Grouped results */}
            {!loading &&
              grouped.map(([type, items]) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <div style={groupHeader}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon size={12} /> {TYPE_LABELS[type]}
                      </span>
                    </div>
                    {items.map((item) => {
                      const idx = flatIdx++;
                      const isActive = idx === activeIndex;
                      return (
                        <div
                          key={item.id}
                          id={`search-result-${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          style={resultItem(isActive)}
                          onClick={() => navigate(item.path)}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <span style={{ color: primary[500], flexShrink: 0, display: 'flex' }}>
                            <Icon size={16} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: textTokens.primary,
                                fontFamily: fontFamily.body,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: textTokens.tertiary,
                                  fontFamily: fontFamily.body,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Footer hints */}
          <div style={footerHint}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
