/**
 * 限流逻辑冒烟测试（不依赖 Next / Supabase）。
 * 用法：node --import tsx scripts/rate-limit-check.mjs
 */
import {
  API_RATE_LIMITS,
  checkRateLimit,
  resetRateLimitStore,
} from "../apps/web/src/lib/rate-limit.ts";

let failures = 0;

function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  -- ${extra}` : ""}`);
  if (!ok) failures++;
}

resetRateLimitStore();

const uid = "uid:test-user";
const route = "ai/enrich";
const minuteLimit = API_RATE_LIMITS[route].rules[0].limit;

for (let i = 0; i < minuteLimit; i++) {
  const r = checkRateLimit(uid, route);
  check(`enrich 第 ${i + 1} 次应通过`, r.ok);
}

const blocked = checkRateLimit(uid, route);
check("超出分钟配额应被限流", !blocked.ok);
check(
  "限流响应包含 retryAfterSec",
  !blocked.ok && blocked.retryAfterSec > 0
);

resetRateLimitStore();

const feedUid = "uid:feed-user";
for (let i = 0; i < 5; i++) {
  checkRateLimit(feedUid, "feed");
}
const feedResult = checkRateLimit(feedUid, "feed");
check("feed 正常请求后仍有剩余额度", feedResult.ok && feedResult.remaining >= 0);

resetRateLimitStore();

const anonIp = "ip:203.0.113.1";
const anonLimit = API_RATE_LIMITS.feed.anonymousRules[0].limit;
for (let i = 0; i < anonLimit; i++) {
  checkRateLimit(anonIp, "feed", { anonymous: true });
}
const anonBlocked = checkRateLimit(anonIp, "feed", { anonymous: true });
check("匿名 feed 超出配额应被限流", !anonBlocked.ok);

console.log(failures ? `\n${failures} failed` : "\nAll rate-limit checks passed");
process.exit(failures ? 1 : 0);
