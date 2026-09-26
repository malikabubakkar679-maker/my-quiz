const buckets = new Map<string, { count: number; reset: number }>();

/** Fixed-window in-memory limiter. Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
