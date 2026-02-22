import { describe, it, expect } from 'vitest';
import { SanitizeInterceptor } from '../interceptors/sanitize.interceptor';

// Access private methods via casting for unit testing
const interceptor = new SanitizeInterceptor();
const sanitizeDeep = (interceptor as unknown as { sanitizeDeep(obj: unknown): unknown }).sanitizeDeep.bind(interceptor);
const stripHtml = (interceptor as unknown as { stripHtml(s: string): string }).stripHtml.bind(interceptor);

describe('SanitizeInterceptor — stripHtml', () => {
  it('strips basic HTML tags', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('strips nested HTML', () => {
    expect(stripHtml('<div><b>bold</b></div>')).toBe('bold');
  });

  it('preserves plain text', () => {
    expect(stripHtml('Hello World')).toBe('Hello World');
  });

  it('trims whitespace', () => {
    expect(stripHtml('  hello  ')).toBe('hello');
  });

  // ── Entity-encoded XSS bypass (RC-901) ──
  it('decodes and strips entity-encoded script tags', () => {
    expect(stripHtml('&lt;script&gt;alert("xss")&lt;/script&gt;')).toBe('alert("xss")');
  });

  it('decodes &amp; correctly', () => {
    expect(stripHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
  });

  it('decodes &quot; correctly', () => {
    expect(stripHtml('say &quot;hello&quot;')).toBe('say "hello"');
  });

  it('decodes &#x27; (single quote)', () => {
    expect(stripHtml("it&#x27;s")).toBe("it's");
  });

  it('decodes &#x2F; (slash)', () => {
    expect(stripHtml('a&#x2F;b')).toBe('a/b');
  });

  it('handles double-encoded entities (only one level)', () => {
    // &amp;lt; → first decode &amp; → &lt; → not decoded again → stays &lt;
    const result = stripHtml('&amp;lt;script&amp;gt;');
    expect(result).toBe('&lt;script&gt;');
  });
});

describe('SanitizeInterceptor — sanitizeDeep', () => {
  it('sanitizes strings', () => {
    expect(sanitizeDeep('<b>test</b>')).toBe('test');
  });

  it('sanitizes nested objects', () => {
    const input = { name: '<script>x</script>', inner: { val: '<i>y</i>' } };
    const result = sanitizeDeep(input) as Record<string, unknown>;
    expect(result.name).toBe('x');
    expect((result.inner as Record<string, unknown>).val).toBe('y');
  });

  it('sanitizes arrays', () => {
    const input = ['<b>a</b>', '<i>b</i>'];
    expect(sanitizeDeep(input)).toEqual(['a', 'b']);
  });

  it('preserves numbers', () => {
    expect(sanitizeDeep(42)).toBe(42);
  });

  it('preserves booleans', () => {
    expect(sanitizeDeep(true)).toBe(true);
  });

  it('preserves null', () => {
    expect(sanitizeDeep(null)).toBe(null);
  });

  it('preserves Date objects', () => {
    const date = new Date('2025-01-01');
    expect(sanitizeDeep(date)).toEqual(date);
  });

  it('handles mixed nested structures', () => {
    const input = {
      tags: ['<b>safe</b>', 'plain'],
      metadata: { html: '<div>content</div>', count: 5, active: true },
    };
    const result = sanitizeDeep(input) as Record<string, unknown>;
    expect((result.tags as string[])[0]).toBe('safe');
    expect((result.metadata as Record<string, unknown>).html).toBe('content');
    expect((result.metadata as Record<string, unknown>).count).toBe(5);
  });
});
