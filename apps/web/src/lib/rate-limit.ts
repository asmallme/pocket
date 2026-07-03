export type RateLimitRule = {
  /** 时间窗口内允许的最大请求数 */
  limit: number;
  /** 窗口长度（毫秒） */
  windowMs: number;
};

export type RateLimitRoute =
  | "ai/enrich"
  | "ai/suggest"
  | "unfurl"
  | "feed"
  | "extension-token"
  | "mobile-share";

type RouteRateLimitConfig = {
  /** 已登录用户（按 uid） */
  rules: RateLimitRule[];
  /** 未登录用户（按 IP，仅 feed 等公开接口） */
  anonymousRules?: RateLimitRule[];
};

/**
 * 各接口按 uid 的限流阈值。
 * 设计原则：正常批量收藏 / 滚动浏览不受影响，但能挡住脚本刷接口。
 */
export const API_RATE_LIMITS: Record<RateLimitRoute, RouteRateLimitConfig> = {
  "ai/enrich": {
    rules: [
      { limit: 20, windowMs: 60_000 },
      { limit: 150, windowMs: 3_600_000 },
    ],
  },
  "ai/suggest": {
    rules: [
      { limit: 15, windowMs: 60_000 },
      { limit: 80, windowMs: 3_600_000 },
    ],
  },
  unfurl: {
    rules: [
      { limit: 40, windowMs: 60_000 },
      { limit: 300, windowMs: 3_600_000 },
    ],
  },
  feed: {
    rules: [{ limit: 120, windowMs: 60_000 }],
    anonymousRules: [{ limit: 60, windowMs: 60_000 }],
  },
  "extension-token": {
    rules: [
      { limit: 5, windowMs: 60_000 },
      { limit: 20, windowMs: 3_600_000 },
    ],
  },
  "mobile-share": {
    rules: [
      { limit: 30, windowMs: 60_000 },
      { limit: 240, windowMs: 3_600_000 },
    ],
  },
};

export type RateLimitCheckResult =
  | { ok: true; remaining: number; resetAt: number; limit: number }
  | {
      ok: false;
      remaining: 0;
      resetAt: number;
      limit: number;
      retryAfterSec: number;
    };

type WindowStore = Map<string, number[]>;

const globalStore: WindowStore = new Map();
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const MAX_STORE_KEYS = 20_000;

function pruneStore(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  for (const [key, timestamps] of globalStore) {
    const latest = timestamps[timestamps.length - 1];
    if (!latest || now - latest > 3_600_000) {
      globalStore.delete(key);
    }
  }

  if (globalStore.size > MAX_STORE_KEYS) {
    const overflow = globalStore.size - MAX_STORE_KEYS;
    const keys = globalStore.keys();
    for (let i = 0; i < overflow; i++) {
      const next = keys.next();
      if (next.done) break;
      globalStore.delete(next.value);
    }
  }
}

function checkRule(
  storeKey: string,
  rule: RateLimitRule,
  now: number
): RateLimitCheckResult {
  const bucketKey = `${storeKey}:${rule.windowMs}`;
  const windowStart = now - rule.windowMs;
  const prev = globalStore.get(bucketKey) ?? [];
  const active = prev.filter((ts) => ts > windowStart);

  if (active.length >= rule.limit) {
    const resetAt = active[0]! + rule.windowMs;
    return {
      ok: false,
      remaining: 0,
      resetAt,
      limit: rule.limit,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  active.push(now);
  globalStore.set(bucketKey, active);

  return {
    ok: true,
    remaining: rule.limit - active.length,
    resetAt: now + rule.windowMs,
    limit: rule.limit,
  };
}

/** 滑动窗口限流：同一 client + route 下所有规则均需满足。 */
export function checkRateLimit(
  clientId: string,
  route: RateLimitRoute,
  options?: { anonymous?: boolean }
): RateLimitCheckResult {
  const now = Date.now();
  pruneStore(now);

  const config = API_RATE_LIMITS[route];
  const rules =
    options?.anonymous && config.anonymousRules
      ? config.anonymousRules
      : config.rules;

  const storeKey = `${route}:${clientId}`;
  let tightest: RateLimitCheckResult | null = null;

  for (const rule of rules) {
    const result = checkRule(storeKey, rule, now);
    if (!result.ok) return result;
    if (
      !tightest ||
      result.remaining < tightest.remaining ||
      (result.remaining === tightest.remaining && result.resetAt < tightest.resetAt)
    ) {
      tightest = result;
    }
  }

  return (
    tightest ?? {
      ok: true,
      remaining: rules[0]?.limit ?? 0,
      resetAt: now + (rules[0]?.windowMs ?? 60_000),
      limit: rules[0]?.limit ?? 0,
    }
  );
}

/** 测试用：清空内存计数器 */
export function resetRateLimitStore() {
  globalStore.clear();
  lastCleanupAt = 0;
}
