// Simple in-memory rate limiter for AI API endpoints
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private defaultWindowMs: number = 60 * 1000; // 1 minute
  private defaultMaxRequests: number = 10; // 10 requests per minute

  constructor() {
    // Clean up expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  check(
    identifier: string, 
    maxRequests: number = this.defaultMaxRequests,
    windowMs: number = this.defaultWindowMs
  ): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number; 
    retryAfter?: number;
  } {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    
    let entry = this.store.get(key);
    
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      this.store.set(key, entry);
    }

    if (now > entry.resetTime) {
      // Reset the counter
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    entry.count++;
    
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  // Different rate limits for different AI endpoints
  checkAIDailyContent(userId: string) {
    return this.check(`ai:daily:${userId}`, 5, 60 * 1000); // 5 per minute
  }

  checkAIMilestone(userId: string) {
    return this.check(`ai:milestone:${userId}`, 5, 60 * 1000); // 5 per minute
  }

  checkAIInsights(userId: string) {
    return this.check(`ai:insights:${userId}`, 3, 5 * 60 * 1000); // 3 per 5 minutes
  }

  checkAIKnowledgeCards(userId: string) {
    return this.check(`ai:knowledge:${userId}`, 10, 60 * 1000); // 10 per minute
  }

  // General AI endpoint limiter
  checkAIGeneral(userId: string) {
    return this.check(`ai:general:${userId}`, 20, 60 * 1000); // 20 total AI requests per minute
  }
}

export const rateLimiter = new RateLimiter();

// Helper function to create rate limit response
export function createRateLimitResponse(result: ReturnType<RateLimiter['check']>) {
  return new Response(
    JSON.stringify({
      error: '请求过于频繁，请稍后再试',
      details: {
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString()
      }
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': result.retryAfter?.toString() || '60'
      }
    }
  );
}