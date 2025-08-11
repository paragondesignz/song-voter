-- Ensure RLS is enabled on all relevant tables
alter table if exists public.bands enable row level security;
alter table if exists public.band_members enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.rehearsals enable row level security;
alter table if exists public.rehearsal_setlists enable row level security;
alter table if exists public.song_suggestions enable row level security;
alter table if exists public.song_votes enable row level security;

-- Bands: members can view their bands
drop policy if exists "Band members can view their bands" on public.bands;
create policy "Band members can view their bands" on public.bands
for select using (
  id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Band members: members can view members in their bands
drop policy if exists "Band members can view members of their bands" on public.band_members;
create policy "Band members can view members of their bands" on public.band_members
for select using (
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Profiles: members can view profiles of users in their bands
drop policy if exists "Band members can view profiles in their bands" on public.profiles;
create policy "Band members can view profiles in their bands" on public.profiles
for select using (
  id in (
    select bm2.user_id
    from public.band_members bm2
    where bm2.band_id in (
      select bm.band_id from public.band_members bm where bm.user_id = auth.uid()
    )
  )
);

-- Rehearsals: members can view rehearsals in their bands
drop policy if exists "Band members can view rehearsals" on public.rehearsals;
create policy "Band members can view rehearsals" on public.rehearsals
for select using (
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Rehearsal setlists: members can view setlists for their bands
drop policy if exists "Band members can view setlists" on public.rehearsal_setlists;
create policy "Band members can view setlists" on public.rehearsal_setlists
for select using (
  rehearsal_id in (
    select id from public.rehearsals
    where band_id in (select band_id from public.band_members where user_id = auth.uid())
  )
);

-- Song suggestions: members can view songs in their bands
drop policy if exists "Band members can view their band's songs" on public.song_suggestions;
create policy "Band members can view their band's songs" on public.song_suggestions
for select using (
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Song votes: members can view votes in their bands
drop policy if exists "Band members can view votes" on public.song_votes;
create policy "Band members can view votes" on public.song_votes
for select using (
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);


