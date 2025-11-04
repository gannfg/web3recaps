-- Remove Duplicate Magazine Policy
-- Migration: 045_remove_duplicate_magazine_policy.sql
-- Remove the duplicate "Admins and Authors" policy that conflicts with "Admins and Builders"

-- Drop the duplicate policy (the one that says "Admins and Authors")
DROP POLICY IF EXISTS "Admins and Authors can manage all magazines" ON magazines;

-- Keep only the "Admins and Builders" policy which is the correct one
-- This policy already exists and is working correctly
