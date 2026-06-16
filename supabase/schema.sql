-- ===========================================================================
-- Trippy — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- It creates one generic `documents` table plus Row Level Security so that:
--   • profiles are readable by any signed-in user (needed for friend lookup)
--   • friend rows are visible to both parties
--   • trip data is visible/editable only to that trip's members
-- ===========================================================================

create table if not exists public.documents (
  id          text primary key,
  collection  text not null,
  owner_id    text,
  trip_id     text,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

create index if not exists documents_collection_idx on public.documents (collection);
create index if not exists documents_trip_idx        on public.documents (trip_id);
create index if not exists documents_owner_idx        on public.documents (owner_id);

alter table public.documents enable row level security;

-- Table-level privileges. RLS still governs *which rows* are visible/writable,
-- but without these grants even signed-in users get "permission denied".
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

-- Is the current user a member (owner or invited) of the given trip?
-- security definer so it can read the trips row regardless of the caller's RLS.
create or replace function public.is_trip_member(tid text)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.documents d
    where d.collection = 'trips' and d.id = tid and d.deleted = false
      and (
        d.owner_id = auth.uid()::text
        or d.data->'members' @> jsonb_build_array(jsonb_build_object('userId', auth.uid()::text))
      )
  );
$$;

-- The access rules are expressed directly as policies below.

-- SELECT --------------------------------------------------------------------
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select
to authenticated using (
  owner_id = auth.uid()::text            -- anything you own (your trips, templates, etc.)
  or collection = 'profiles'             -- profiles are public to signed-in users
  or (collection = 'friends' and (data->>'friendId') = auth.uid()::text)
  or (trip_id is not null and is_trip_member(trip_id)) -- shared trips you belong to
  or (collection = 'trips' and is_trip_member(id))
);

-- INSERT --------------------------------------------------------------------
-- You may insert any row you own. (Visibility is still governed by the SELECT
-- policy below, so this can't leak other people's trips.) Keeping this simple
-- avoids a chicken-and-egg where a brand-new trip can't be created because the
-- membership check needs the trip to already exist.
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert
to authenticated with check (owner_id = auth.uid()::text);

-- UPDATE --------------------------------------------------------------------
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update
to authenticated using (
  owner_id = auth.uid()::text            -- edit/soft-delete anything you own
  or (collection = 'friends' and (data->>'friendId') = auth.uid()::text) -- accept a request
  or (trip_id is not null and is_trip_member(trip_id)) -- editors on a shared trip
  or (collection = 'trips' and is_trip_member(id))
);

-- DELETE --------------------------------------------------------------------
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete
to authenticated using (
  owner_id = auth.uid()::text
  or (collection = 'friends' and (data->>'friendId') = auth.uid()::text)
  or (trip_id is not null and is_trip_member(trip_id))
);

-- Realtime: broadcast row changes so other devices update live.
alter publication supabase_realtime add table public.documents;
