import { createSupabaseServer } from './supabase/server';

// In-memory cooldown tracking
const cooldowns = new Map<string, number>();

interface RateLimitOptions {
  cooldownMs: number;
  dailyLimit: number;
}

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  resetTime?: number;
}

/**
 * Check if user can perform an action based on cooldown and daily limits
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return { allowed: false, reason: 'Database not available' };
  }

  const actionKey = `${userId}:${action}`;
  const now = Date.now();

  // Check cooldown
  const lastAction = cooldowns.get(actionKey);
  if (lastAction && (now - lastAction) < options.cooldownMs) {
    const remaining = options.cooldownMs - (now - lastAction);
    return {
      allowed: false,
      reason: 'Cooldown active',
      remaining: Math.ceil(remaining / 1000),
      resetTime: lastAction + options.cooldownMs
    };
  }

  // Check daily limit
  const today = new Date().toISOString().split('T')[0];
  const { data: limitRecord, error } = await supabase
    .from('user_action_limits')
    .select('action_count')
    .eq('user_id', userId)
    .eq('action_type', action)
    .eq('date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error checking daily limit:', error);
    return { allowed: false, reason: 'Database error' };
  }

  const currentCount = limitRecord?.action_count || 0;
  if (currentCount >= options.dailyLimit) {
    return {
      allowed: false,
      reason: 'Daily limit reached',
      remaining: 0,
      resetTime: new Date().setHours(23, 59, 59, 999) // End of today
    };
  }

  return {
    allowed: true,
    remaining: options.dailyLimit - currentCount - 1
  };
}

/**
 * Record that a user performed an action
 */
export async function recordAction(
  userId: string,
  action: string,
  options: RateLimitOptions
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return false;
  }

  const actionKey = `${userId}:${action}`;
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // Update cooldown
  cooldowns.set(actionKey, now);

  // Update daily count
  const { error } = await supabase
    .from('user_action_limits')
    .upsert({
      user_id: userId,
      action_type: action,
      date: today,
      action_count: 1
    }, {
      onConflict: 'user_id,action_type,date',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error recording action:', error);
    return false;
  }

  return true;
}

/**
 * Check rate limit and record action if allowed
 */
export async function checkAndRecordAction(
  userId: string,
  action: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const checkResult = await checkRateLimit(userId, action, options);
  
  if (checkResult.allowed) {
    const recorded = await recordAction(userId, action, options);
    if (!recorded) {
      return {
        allowed: false,
        reason: 'Failed to record action'
      };
    }
  }

  return checkResult;
}

/**
 * Get user's action count for today
 */
export async function getActionCount(
  userId: string,
  action: string
): Promise<number> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return 0;
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: limitRecord } = await supabase
    .from('user_action_limits')
    .select('action_count')
    .eq('user_id', userId)
    .eq('action_type', action)
    .eq('date', today)
    .single();

  return limitRecord?.action_count || 0;
}

/**
 * Clear expired cooldowns (call this periodically)
 */
export function clearExpiredCooldowns(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, timestamp] of cooldowns.entries()) {
    if (now - timestamp > maxAge) {
      cooldowns.delete(key);
    }
  }
}

// Clear expired cooldowns every hour
setInterval(clearExpiredCooldowns, 60 * 60 * 1000);
