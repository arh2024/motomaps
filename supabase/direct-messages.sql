-- Run once in Supabase Dashboard → SQL Editor.
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint direct_messages_no_self_message check (sender_id <> recipient_id)
);

alter table public.direct_messages
  add column if not exists is_read boolean not null default true;
alter table public.direct_messages
  alter column is_read set default false;

create index if not exists direct_messages_conversation_time_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists direct_messages_recipient_time_idx
  on public.direct_messages (recipient_id, sender_id, created_at);

alter table public.direct_messages enable row level security;

drop policy if exists "Participants can read direct messages" on public.direct_messages;
create policy "Participants can read direct messages"
  on public.direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send direct messages" on public.direct_messages;
create policy "Users can send direct messages"
  on public.direct_messages for insert to authenticated
    with check (auth.uid() = sender_id and auth.uid() <> recipient_id);

drop policy if exists "Recipients can mark direct messages read" on public.direct_messages;
create policy "Recipients can mark direct messages read"
  on public.direct_messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

grant select, insert on public.direct_messages to authenticated;
revoke update on table public.direct_messages from authenticated;
grant update (is_read) on public.direct_messages to authenticated;
