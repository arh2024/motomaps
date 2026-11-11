-- Run once in Supabase Dashboard → SQL Editor.
-- Stores the rider's motorcycle club for their profile and community card.
alter table public.profiles
  add column if not exists club_name text;

comment on column public.profiles.club_name is 'Motorcycle club or riding group name';
