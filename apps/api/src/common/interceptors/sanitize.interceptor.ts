import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Section 9.1 — XSS Sanitization Interceptor
 *
 * Strips ALL HTML tags from incoming string fields in request bodies.
 * Defence-in-depth: even though Prisma parameterises queries, we strip
 * any HTML to prevent stored-XSS if data is rendered in a browser.
 *
 * Applied globally via APP_INTERCEPTOR in AppModule.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (request.body) {
      request.body = this.sanitizeDeep(request.body);
    }
    // RC-907: Also sanitize query parameters to prevent reflected-XSS
    if (request.query) {
      request.query = this.sanitizeDeep(request.query);
    }
    return next.handle();
  }

  /**
   * Recursively strip HTML tags from all string values in an object.
   * Uses a regex-based approach to avoid an external dependency.
   */
  private sanitizeDeep(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.stripHtml(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.sanitizeDeep(item));
    }
    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      // Note: Object.fromEntries loses prototype chain — intentional for plain DTO bodies
      return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, this.sanitizeDeep(v)]),
      );
    }
    return obj;
  }

  /**
   * Strip HTML tags from input.
   * RC-901 fix: decode HTML entities FIRST, then strip tags.
   * This prevents bypass via `&lt;script&gt;` → decoded → `<script>` → stripped.
   */
  private stripHtml(input: string): string {
    return input
      // Step 1: Decode HTML entities first (prevents entity-encoded XSS bypass)
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&#x2F;/gi, '/')
      // Step 2: Now strip all HTML tags (including any that were entity-encoded)
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
