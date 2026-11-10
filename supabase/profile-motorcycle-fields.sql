-- Run once in Supabase Dashboard → SQL Editor.
-- Adds optional motorcycle details used by rider profiles and community filters.
alter table public.profiles
  add column if not exists bike_model text,
  add column if not exists bike_type text;

comment on column public.profiles.bike_model is 'Motorcycle make/model, for example Kawasaki Z650';
comment on column public.profiles.bike_type is 'Motorcycle category, for example Chopper, Sportbike, or Enduro';
