-- Allow an authenticated rider to delete only rides they created.
-- Run this in Supabase SQL Editor if RLS is enabled on public.rides.
drop policy if exists "Ride creators can delete their own rides" on public.rides;

create policy "Ride creators can delete their own rides"
on public.rides
for delete
to authenticated
using ((select auth.uid()) = creator_id);
