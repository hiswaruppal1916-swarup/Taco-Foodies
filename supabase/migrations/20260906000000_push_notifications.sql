-- ==============================================================================
-- TACO Foodies — Secure Web Push Notification Subscriptions & Hardened RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('owner', 'customer')),
    order_number TEXT NULL,
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON public.push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_order_number ON public.push_subscriptions(order_number);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clean up any prior permissive policies
DROP POLICY IF EXISTS "Allow anon and authenticated to insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow anon and authenticated to update push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated to select push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow anon to select push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow anon and authenticated to delete push subscriptions" ON public.push_subscriptions;

DROP POLICY IF EXISTS "Allow anon to insert customer push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated to insert owner push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow anon to update customer push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated to update owner push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated to select own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated to delete own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow anon to delete customer push subscriptions" ON public.push_subscriptions;

-- ==============================================================================
-- HARDENED RLS POLICIES
-- ==============================================================================

-- 1. INSERT POLICIES
-- Anonymous customers can only insert their own customer subscription tied to an order
CREATE POLICY "Allow anon to insert customer push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO anon
WITH CHECK (
    role = 'customer' 
    AND order_number IS NOT NULL
    AND user_id IS NULL
);

-- Authenticated Owner can only insert subscriptions for their own user_id with role = 'owner'
CREATE POLICY "Allow authenticated to insert owner push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
    role = 'owner' 
    AND (user_id = (SELECT auth.uid()) OR user_id IS NULL)
);

-- 2. UPDATE POLICIES (Required for ON CONFLICT DO UPDATE upserts)
-- Anonymous customers can only update customer rows
CREATE POLICY "Allow anon to update customer push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO anon
USING (role = 'customer')
WITH CHECK (
    role = 'customer' 
    AND order_number IS NOT NULL 
    AND user_id IS NULL
);

-- Authenticated Owner can only update their own owner device rows
CREATE POLICY "Allow authenticated to update owner push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (role = 'owner' AND (user_id = (SELECT auth.uid()) OR user_id IS NULL))
WITH CHECK (role = 'owner');

-- 3. SELECT POLICIES (Data Privacy & Protection)
-- ZERO SELECT policy for 'anon': Anonymous users CANNOT read or list any push subscriptions!
-- Authenticated Owner can ONLY select their own registered devices
CREATE POLICY "Allow authenticated to select own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);

-- 4. DELETE POLICIES
-- Authenticated Owner can delete/deregister their own device subscriptions
CREATE POLICY "Allow authenticated to delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
);

-- Anonymous customers can unsubscribe their customer subscription if needed
CREATE POLICY "Allow anon to delete customer push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO anon
USING (
    role = 'customer'
);
