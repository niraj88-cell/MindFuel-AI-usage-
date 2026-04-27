// lib/audit-log.ts — Server-side audit trail for sensitive operations
// Logs security events, rate-limit hits, and suspicious activity.
// In production, these logs feed into Supabase for real-time monitoring.

type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'auth.token_refresh'
  | 'api.rate_limited'
  | 'api.unauthorized'
  | 'api.prompt_injection_detected'
  | 'api.xss_detected'
  | 'api.daily_limit_reached'
  | 'api.content_policy_flag'
  | 'data.export_requested'
  | 'data.export_completed'
  | 'profile.tier_changed'

interface AuditEvent {
  type: AuditEventType
  userId?: string
  ip?: string
  fingerprint?: string
  metadata?: Record<string, unknown>
  severity: 'info' | 'warn' | 'critical'
}

/**
 * Log a security/audit event.
 * Currently outputs to structured console logs (stdout → Vercel log drain).
 * Swap `logToConsole` for `logToSupabase` when the `audit_logs` table is ready.
 */
export function auditLog(event: AuditEvent): void {
  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  }

  // Structured JSON log — picked up by Vercel log drain / DataDog
  const logFn =
    event.severity === 'critical'
      ? console.error
      : event.severity === 'warn'
      ? console.warn
      : console.log

  logFn(`[AUDIT] ${JSON.stringify(entry)}`)
}

// ── Pre-built audit helpers ────────────────────────────────────────────────

export function auditRateLimited(userId: string, route: string, ip?: string) {
  auditLog({
    type: 'api.rate_limited',
    userId,
    ip,
    metadata: { route },
    severity: 'warn',
  })
}

export function auditUnauthorized(route: string, ip?: string, fingerprint?: string) {
  auditLog({
    type: 'api.unauthorized',
    ip,
    fingerprint,
    metadata: { route },
    severity: 'warn',
  })
}

export function auditPromptInjection(userId: string, route: string, snippet: string) {
  auditLog({
    type: 'api.prompt_injection_detected',
    userId,
    metadata: { route, snippet: snippet.substring(0, 100) },
    severity: 'critical',
  })
}

export function auditXSS(userId: string | undefined, route: string) {
  auditLog({
    type: 'api.xss_detected',
    userId,
    metadata: { route },
    severity: 'critical',
  })
}

export function auditDataExport(userId: string, format: string, recordCount: number) {
  auditLog({
    type: 'data.export_requested',
    userId,
    metadata: { format, recordCount },
    severity: 'info',
  })
}
