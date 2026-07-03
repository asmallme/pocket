import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  type RateLimitCheckResult,
  type RateLimitRoute,
} from "@/lib/rate-limit";

export function clientIdFromUser(userId: string) {
  return `uid:${userId}`;
}

export function clientIdFromIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
  return `ip:${ip}`;
}

function rateLimitHeaders(result: RateLimitCheckResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.ok
      ? {}
      : { "Retry-After": String(result.retryAfterSec) }),
  };
}

/** 按 uid（或匿名 IP）检查限流，单次计数。 */
export function checkApiRateLimit(
  request: NextRequest,
  route: RateLimitRoute,
  userId: string | null
): { blocked: NextResponse | null; result: RateLimitCheckResult } {
  const clientId = userId
    ? clientIdFromUser(userId)
    : clientIdFromIp(request);

  const result = checkRateLimit(clientId, route, {
    anonymous: !userId,
  });

  if (!result.ok) {
    return {
      blocked: NextResponse.json(
        {
          error: "请求过于频繁，请稍后再试",
          retry_after: result.retryAfterSec,
        },
        {
          status: 429,
          headers: rateLimitHeaders(result),
        }
      ),
      result,
    };
  }

  return { blocked: null, result };
}

export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitCheckResult
) {
  for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
    response.headers.set(key, value);
  }
  return response;
}
