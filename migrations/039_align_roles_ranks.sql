-- Align roles and ranks across the application
-- Changes:
-- 1) Ensure 'AUTHOR' exists in user_role enum (for news editing permissions)
-- 2) Normalize users.role values to the uppercase enum
-- 3) Drop duplicate/legacy users.current_rank column
-- 4) Optional: Normalize users.rank label from total_xp thresholds

-- 1) Add AUTHOR to enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'AUTHOR'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'AUTHOR';
  END IF;
END $$;

-- 2) Normalize users.role to uppercase enum
UPDATE public.users
SET role = UPPER(role::text)::user_role
WHERE role::text <> UPPER(role::text);

-- 3) Drop duplicate/legacy current_rank column if present
ALTER TABLE public.users DROP COLUMN IF EXISTS current_rank;

-- 4) Normalize rank label from XP (optional but helpful for consistency)
--    If you prefer to always compute rank in the API, you may skip this block.
UPDATE public.users
SET rank = (
  CASE
    WHEN COALESCE(total_xp, 0) >= 6000 THEN 'Solana Legend'
    WHEN COALESCE(total_xp, 0) >= 4000 THEN 'Master'
    WHEN COALESCE(total_xp, 0) >= 2500 THEN 'Expert'
    WHEN COALESCE(total_xp, 0) >= 1500 THEN 'Leader'
    WHEN COALESCE(total_xp, 0) >= 1000 THEN 'Innovator'
    WHEN COALESCE(total_xp, 0) >= 600 THEN 'Contributor'
    WHEN COALESCE(total_xp, 0) >= 300 THEN 'Builder'
    WHEN COALESCE(total_xp, 0) >= 100 THEN 'Explorer'
    ELSE 'Newcomer'
  END
) 
WHERE rank IS NULL OR rank = '';

-- Ensure a sensible default for rank going forward
ALTER TABLE public.users ALTER COLUMN rank SET DEFAULT 'Newcomer';

-- Optional: backfill author role for users who need it can be done manually or via application logic.
-- Example (commented):
-- UPDATE public.users SET role = 'AUTHOR'::user_role WHERE email IN ('editor@example.com');


