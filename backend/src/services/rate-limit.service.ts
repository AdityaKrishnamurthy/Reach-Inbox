import { redis } from '../config/redis';

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

    // 2. Check minimum delay spacing
    const lastSendStr = await redis.get(lastSendKey);
    const now = Date.now();

    if (lastSendStr) {
      const lastSend = parseInt(lastSendStr, 10);
      const elapsed = now - lastSend;

      if (elapsed < delayMs) {
        // Minimum delay has not passed yet: wait the remainder
        const waitMs = delayMs - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    // Update last send timestamp with 24 hour TTL
    await redis.set(lastSendKey, Date.now().toString(), 'EX', 86400);

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
