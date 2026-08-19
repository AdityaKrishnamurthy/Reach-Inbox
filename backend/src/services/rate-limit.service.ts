// Redis-backed, per-sender rate limiting shared by all worker processes.
// Enforces both a rolling hourly send cap (atomic INCR-based counter per
// UTC hour) and a minimum delay between consecutive sends (atomic Lua-script
// slot reservation), so concurrent workers never race each other into
// exceeding either limit.

import { redis } from '../config/redis';

// Atomically reserves the next allowed send slot: KEYS[1]=lastSendKey,
// ARGV[1]=now(ms), ARGV[2]=delayMs, ARGV[3]=ttlSeconds. Returns the reserved
// slot timestamp (ms). The caller must wait until that timestamp before sending.
const RESERVE_SLOT_SCRIPT = `
local lastReserved = tonumber(redis.call('GET', KEYS[1]))
local now = tonumber(ARGV[1])
local delayMs = tonumber(ARGV[2])
local nextSlot = now
if lastReserved and (lastReserved + delayMs) > now then
  nextSlot = lastReserved + delayMs
end
redis.call('SET', KEYS[1], nextSlot, 'EX', ARGV[3])
return nextSlot
`;

export interface SendSlotResult {
  allowed: boolean;
  retryAfterMs?: number;
  reason?: 'HOURLY_LIMIT_REACHED' | 'DELAY_SPACING';
  currentHourCount?: number;
}

export class RateLimitService {
  /**
   * Generates the Redis key for the hourly window of a sender
   */
  private static getHourlyKey(senderId: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    return `ratelimit:sender:${senderId}:hour:${year}${month}${day}${hour}`;
  }

  /**
   * Generates the Redis key for tracking the last send timestamp of a sender
   */
  private static getLastSendKey(senderId: string): string {
    return `ratelimit:sender:${senderId}:last_send`;
  }

  /**
   * Calculates milliseconds until the start of the next hour
   */
  private static getMsUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours() + 1,
      0,
      2, // 2 second buffer into the next hour
      0
    ));
    return Math.max(1000, nextHour.getTime() - now.getTime());
  }

  /**
   * Atomically acquires a send slot for a sender, checking both hourly limits and delay spacing
   */
  static async acquireSendSlot(
    senderId: string,
    hourlyLimit: number,
    delayMs: number
  ): Promise<SendSlotResult> {
    const hourlyKey = this.getHourlyKey(senderId);
    const lastSendKey = this.getLastSendKey(senderId);

    // 1. Check & increment hourly limit atomically
    const count = await redis.incr(hourlyKey);
    if (count === 1) {
      // Set 2-hour expiration on the new hour key
      await redis.expire(hourlyKey, 7200);
    }

    if (count > hourlyLimit) {
      // Quota exceeded: roll back counter and calculate retry delay
      await redis.decr(hourlyKey);
      const retryAfterMs = this.getMsUntilNextHour();
      return {
        allowed: false,
        retryAfterMs,
        reason: 'HOURLY_LIMIT_REACHED',
        currentHourCount: count - 1,
      };
    }

    // 2. Atomically reserve the next available send slot for minimum delay spacing.
    // A plain GET -> sleep -> SET is not atomic: concurrent workers for the same
    // sender could all read the same lastSendKey before any of them writes an
    // updated value, and all fire at once. This Lua script reserves a forward-only
    // slot (now, or lastReservedSlot + delayMs, whichever is later) in one round
    // trip, so concurrent callers serialize correctly instead of racing.
    const now = Date.now();
    const nextSlot = (await redis.eval(
      RESERVE_SLOT_SCRIPT,
      1,
      lastSendKey,
      now,
      delayMs,
      86400
    )) as number;

    const waitMs = Math.max(0, nextSlot - now);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return {
      allowed: true,
      currentHourCount: count,
    };
  }

  /**
   * Inspects current rate limit usage for a sender
   */
  static async getUsage(senderId: string): Promise<{ currentHourCount: number; lastSendAt: number | null }> {
    const hourlyKey = this.getHourlyKey(senderId);
    const lastSendKey = this.getLastSendKey(senderId);

    const [countStr, lastSendStr] = await Promise.all([
      redis.get(hourlyKey),
      redis.get(lastSendKey),
    ]);

    return {
      currentHourCount: countStr ? parseInt(countStr, 10) : 0,
      lastSendAt: lastSendStr ? parseInt(lastSendStr, 10) : null,
    };
  }
}
