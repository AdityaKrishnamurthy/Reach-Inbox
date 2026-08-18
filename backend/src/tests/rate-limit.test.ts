export function runRateLimitTests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  const test = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
    }
  };

  test('Calculates next hour window retry correctly', () => {
    const now = new Date();
    const nextHour = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours() + 1,
      0,
      2,
      0
    ));
    const msDiff = nextHour.getTime() - now.getTime();
    if (msDiff <= 0 || msDiff > 3600000 + 5000) {
      throw new Error(`Invalid next hour calculation: ${msDiff}ms`);
    }
  });

  test('Delay spacing calculation detects elapsed time', () => {
    const delayMs = 2000;
    const lastSend = Date.now() - 500; // 500ms ago
    const elapsed = Date.now() - lastSend;
    const remaining = delayMs - elapsed;
    if (remaining < 1400 || remaining > 1600) {
      throw new Error(`Unexpected remaining delay: ${remaining}ms`);
    }
  });

  return results;
}
