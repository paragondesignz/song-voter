-- Temporary broad read policies to restore UI immediately
-- NOTE: These are safe to keep briefly; we will tighten after verification

create policy if not exists "debug_read bands"
on public.bands for select using (auth.role() = 'authenticated');

create policy if not exists "debug_read band_members"
on public.band_members for select using (auth.role() = 'authenticated');

create policy if not exists "debug_read profiles"
on public.profiles for select using (auth.role() = 'authenticated');

create policy if not exists "debug_read rehearsals"
on public.rehearsals for select using (auth.role() = 'authenticated');

create policy if not exists "debug_read rehearsal_setlists"
on public.rehearsal_setlists for select using (auth.role() = 'authenticated');

create policy if not exists "debug_read songs"
on public.song_suggestions for select using (auth.role() = 'authenticated');

create policy if not exists "debug_read votes"
on public.song_votes for select using (auth.role() = 'authenticated');


