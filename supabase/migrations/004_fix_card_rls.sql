-- Migration: Fix card and profile RLS and PostgREST schema cache
-- File: supabase/migrations/004_fix_card_rls.sql

-- 1. Ensure published column exists on cards with default true
ALTER TABLE public.cards 
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

-- Update any null values to true
UPDATE public.cards SET published = true WHERE published IS NULL;

-- 2. Ensure role column exists on profiles with proper check constraint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'creator', 'manager'));

-- 3. Replace card SELECT policy to allow anyone to read published cards, and managers to read all cards
DROP POLICY IF EXISTS "Anyone can read cards" ON public.cards;
DROP POLICY IF EXISTS "Authenticated users can read cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can read published cards" ON public.cards;

CREATE POLICY "Anyone can read published cards"
  ON public.cards FOR SELECT
  USING (
    published = true
    OR
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
      )
    )
  );

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

