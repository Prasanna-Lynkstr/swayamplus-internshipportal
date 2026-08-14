/**
 * Swap boundary for logging (Section 4.2): every module depends on this
 * interface, never on a concrete logging/observability library directly.
 * When SWAYAM Plus's own logging/observability stack is known, only
 * `nest-app-logger.service.ts` changes — every call site stays the same.
 * Structured (JSON) logs, no secrets/PII in log bodies.
 */
export interface AppLogger {
  log(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
}
