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

  // Update daily count - use SQL increment function if available, otherwise manual increment
  // Try using the database function first (more efficient and handles RLS better)
  const { data: functionResult, error: functionError } = await supabase.rpc('increment_action_count', {
    p_user_id: userId,
    p_action_type: action,
    p_date: today
  });

  if (!functionError && functionResult !== null) {
    // Function worked, return success
    return true;
  }

  // Fallback to manual increment if function doesn't exist or fails
  const { data: existingRecord } = await supabase
    .from('user_action_limits')
    .select('action_count')
    .eq('user_id', userId)
    .eq('action_type', action)
    .eq('date', today)
    .maybeSingle(); // Use maybeSingle to handle no rows found gracefully

  const newCount = (existingRecord?.action_count || 0) + 1;

  const { error } = await supabase
    .from('user_action_limits')
    .upsert({
      user_id: userId,
      action_type: action,
      date: today,
      action_count: newCount
    }, {
      onConflict: 'user_id,action_type,date',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error recording action:', error);
    // Don't fail if table doesn't exist or RLS blocks - just log and allow (graceful degradation)
    if (error.code === '42P01' || error.message?.includes('does not exist') || 
        error.code === '42501' || error.message?.includes('permission denied') ||
        error.code === 'PGRST301' || error.message?.includes('new row violates row-level security')) {
      console.warn('Rate limit recording failed (RLS or table issue), allowing action:', error.message);
      return true; // Allow action if we can't record (graceful degradation)
    }
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
