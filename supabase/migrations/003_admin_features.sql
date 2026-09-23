-- Migration: Add published column to cards and admin indexes
-- File: supabase/migrations/003_admin_features.sql

ALTER TABLE public.cards 
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

-- Update any existing rows without published set
UPDATE public.cards SET published = true WHERE published IS NULL;

-- Indexes for admin card listing & filtering
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON public.cards (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_published ON public.cards (published);

-- Indexes for admin user listing & filtering
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Update public SELECT policy on cards to only show published cards to regular viewers
DROP POLICY IF EXISTS "Anyone can read cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can read published cards" ON public.cards;
CREATE POLICY "Anyone can read published cards"
  ON public.cards FOR SELECT
  USING (published = true);

