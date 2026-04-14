-- ============================================================
-- CMA CONNECT — Migration 017
-- Fix: Allow anonymous users to select active promotions and activities for registration
-- ============================================================

-- Add policy for anonymous users to view active promotions during registration
CREATE POLICY promotions_select_anon ON promotions
  FOR SELECT TO anon
  USING (status = 'active');

-- Add policy for anonymous users to view activities during registration
CREATE POLICY activities_select_anon ON activities
  FOR SELECT TO anon
  USING (true);