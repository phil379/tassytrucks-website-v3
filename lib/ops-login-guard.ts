import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Brute-force lockout for the shared-password /ops gate.
 *
 * Failures are counted in the existing `audit_log` table through the service-role client (no schema
 * change), so the count is shared by every serverless instance. audit_log is already used this way by
 * TassyOps (e.g. `driver_signin_link.rate_limited_email`). Its columns fit: action, entity_type, notes.
 *
 * Each attempt writes its row BEFORE the password is checked, as `ops_login.failed`, then counts the
 * rows in the window. Writing first is what stops a burst of parallel guesses from all passing the
 * check at once: every concurrent request sees the others' rows. After the check the row is relabelled:
 * `ops_login.ok` on a correct password, `ops_login.refused` when locked out - so only real failures
 * (and attempts still in flight) count, and a legitimate login or a refused request never extends a
 * lockout. Rows hold a salted hash of the client IP, never the IP itself and never the password.
 *
 * Limits: 5 failures per IP and 30 for the whole gate, per rolling 15 minutes. Refused attempts are
 * answered with one generic message. If the database cannot be reached, a per-instance in-memory
 * counter takes over (weaker on serverless, but never open).
 */
export const AUDIT_LOG_TABLE = 'audit_log';
export const LOGIN_FAILED = 'ops_login.failed';
export const LOGIN_OK = 'ops_login.ok';
export const LOGIN_REFUSED = 'ops_login.refused';
const ENTITY = 'ops_login';

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_IP = 5;
export const MAX_FAILURES_GLOBAL = 30;
/** Constant pause after a wrong password, to slow guessing down. */
export const FAILURE_DELAY_MS = 800;

/** A short salted hash: enough to bucket by IP, not enough to recover the address. */
export function ipFingerprint(ip: string): string {
  return createHash('sha256').update(`ops-login:${process.env.OPS_PASSWORD ?? ''}:${ip}`).digest('hex').slice(0, 16);
}

// ── in-memory fallback (database unreachable) ───────────────────────────────
const memory = new Map<string, number[]>();

function memoryFailures(key: string, now: number): number[] {
  const fresh = (memory.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  memory.set(key, fresh);
  return fresh;
}

export function __resetOpsLoginMemory() {
  memory.clear();
}

export type LoginAttempt = {
  /** True when this attempt may check the password. */
  allowed: boolean;
  /** Call once the password has been checked (or the attempt refused). Never throws. */
  finish: (outcome: 'ok' | 'failed' | 'refused') => Promise<void>;
};

export async function beginOpsLogin(
  getDb: () => SupabaseClient,
  ip: string,
  now: number = Date.now(),
): Promise<LoginAttempt> {
  const fp = ipFingerprint(ip);
  const note = `ip:${fp}`;
  const since = new Date(now - WINDOW_MS).toISOString();

  let db: SupabaseClient | null = null;
  let rowId: string | null = null;
  let ipCount: number | null = null;
  let globalCount: number | null = null;

  try {
    db = getDb();
    const inserted = await db
      .from(AUDIT_LOG_TABLE)
      .insert({ action: LOGIN_FAILED, entity_type: ENTITY, notes: note })
      .select('id')
      .single();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'no row');
    rowId = (inserted.data as { id: string }).id;

    const [ipRes, globalRes] = await Promise.all([
      db.from(AUDIT_LOG_TABLE).select('id', { count: 'exact', head: true }).eq('action', LOGIN_FAILED).eq('notes', note).gte('created_at', since),
      db.from(AUDIT_LOG_TABLE).select('id', { count: 'exact', head: true }).eq('action', LOGIN_FAILED).gte('created_at', since),
    ]);
    if (ipRes.error || globalRes.error || ipRes.count == null || globalRes.count == null) {
      throw new Error(ipRes.error?.message ?? globalRes.error?.message ?? 'no count');
    }
    ipCount = ipRes.count;
    globalCount = globalRes.count;
  } catch (e) {
    console.error('[ops-login] lockout store unavailable, using in-memory counters:', e instanceof Error ? e.message : e);
    ipCount = null;
  }

  let allowed: boolean;
  if (ipCount !== null && globalCount !== null) {
    // The count includes this attempt's own row, so the 6th failure from one IP is the first refusal.
    allowed = ipCount <= MAX_FAILURES_PER_IP && globalCount <= MAX_FAILURES_GLOBAL;
  } else {
    allowed =
      memoryFailures(fp, now).length < MAX_FAILURES_PER_IP && memoryFailures('*', now).length < MAX_FAILURES_GLOBAL;
  }

  const finish: LoginAttempt['finish'] = async (outcome) => {
    if (outcome === 'failed') {
      // Already stored as a failure; keep the in-memory view in step for the fallback path.
      memoryFailures(fp, now).push(now);
      memoryFailures('*', now).push(now);
      return;
    }
    if (!rowId || !db) return;
    try {
      await db
        .from(AUDIT_LOG_TABLE)
        .update({ action: outcome === 'ok' ? LOGIN_OK : LOGIN_REFUSED })
        .eq('id', rowId);
    } catch (e) {
      console.error('[ops-login] could not relabel an attempt:', e instanceof Error ? e.message : e);
    }
  };

  return { allowed, finish };
}
