-- Comprehensive RLS policy fix for all tables
-- This creates a balanced approach: users can see content in their bands, with some public visibility

-- Enable RLS on all tables
alter table if exists public.bands enable row level security;
alter table if exists public.band_members enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.rehearsals enable row level security;
alter table if exists public.rehearsal_setlists enable row level security;
alter table if exists public.song_suggestions enable row level security;
alter table if exists public.song_votes enable row level security;

-- ============================================
-- BANDS TABLE POLICIES
-- ============================================

-- Drop all existing band policies
drop policy if exists "Band members can view their bands" on public.bands;
drop policy if exists "Band members can create bands" on public.bands;
drop policy if exists "Band admins can update bands" on public.bands;
drop policy if exists "debug_read bands" on public.bands;
drop policy if exists "Authenticated users can create bands" on public.bands;
drop policy if exists "Admins can update their bands" on public.bands;

-- Read: Users can see bands they're members of
create policy "users_read_member_bands" on public.bands
for select using (
  auth.role() = 'authenticated' AND
  id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Read: Allow checking invite codes (needed for joining)
create policy "users_check_invite_codes" on public.bands
for select using (
  auth.role() = 'authenticated'
);

-- Insert: Authenticated users can create bands
create policy "users_create_bands" on public.bands
for insert with check (
  auth.role() = 'authenticated' AND
  created_by = auth.uid()
);

-- Update: Admins can update their bands
create policy "admins_update_bands" on public.bands
for update using (
  auth.role() = 'authenticated' AND
  id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
) with check (
  auth.role() = 'authenticated' AND
  id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
);

-- ============================================
-- BAND_MEMBERS TABLE POLICIES
-- ============================================

-- Drop all existing band_members policies
drop policy if exists "Band members can view members of their bands" on public.band_members;
drop policy if exists "Users can view their own memberships" on public.band_members;
drop policy if exists "Band admins can manage members" on public.band_members;
drop policy if exists "debug_read band_members" on public.band_members;
drop policy if exists "Band members can view all members in their bands" on public.band_members;
drop policy if exists "Users can create their own memberships" on public.band_members;
drop policy if exists "Users can join bands as members" on public.band_members;
drop policy if exists "Admins can remove members" on public.band_members;
drop policy if exists "Users can leave bands" on public.band_members;
drop policy if exists "Admins can update member roles" on public.band_members;

-- Read: Users can see members in their bands
create policy "users_read_band_members" on public.band_members
for select using (
  auth.role() = 'authenticated' AND
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Insert: Users can add themselves to bands (for joining)
create policy "users_join_bands" on public.band_members
for insert with check (
  auth.role() = 'authenticated' AND
  user_id = auth.uid()
);

-- Update: Admins can update member roles
create policy "admins_update_members" on public.band_members
for update using (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
) with check (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Delete: Users can remove themselves OR admins can remove others
create policy "users_leave_or_admins_remove" on public.band_members
for delete using (
  auth.role() = 'authenticated' AND (
    user_id = auth.uid() OR
    band_id in (
      select band_id from public.band_members 
      where user_id = auth.uid() and role = 'admin'
    )
  )
);

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Drop all existing profiles policies
drop policy if exists "Band members can view profiles in their bands" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "debug_read profiles" on public.profiles;
drop policy if exists "Profiles can be viewed by band members" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Profiles are created on signup" on public.profiles;

-- Read: All authenticated users can view all profiles (needed for member lists)
create policy "users_read_all_profiles" on public.profiles
for select using (
  auth.role() = 'authenticated'
);

-- Insert: System creates profiles (handled by trigger)
create policy "system_create_profiles" on public.profiles
for insert with check (
  auth.uid() = id
);

-- Update: Users can update their own profile
create policy "users_update_own_profile" on public.profiles
for update using (
  auth.uid() = id
) with check (
  auth.uid() = id
);

-- ============================================
-- SONG_SUGGESTIONS TABLE POLICIES
-- ============================================

-- Drop all existing song_suggestions policies
drop policy if exists "Band members can view their band's songs" on public.song_suggestions;
drop policy if exists "Band members can suggest songs" on public.song_suggestions;
drop policy if exists "debug_read songs" on public.song_suggestions;
drop policy if exists "Band members can view songs" on public.song_suggestions;
drop policy if exists "Band members can add songs" on public.song_suggestions;
drop policy if exists "Suggesters can delete their suggestions" on public.song_suggestions;
drop policy if exists "Admins can delete any suggestion" on public.song_suggestions;

-- Read: Members can see songs in their bands
create policy "members_read_songs" on public.song_suggestions
for select using (
  auth.role() = 'authenticated' AND
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Insert: Members can suggest songs to their bands
create policy "members_suggest_songs" on public.song_suggestions
for insert with check (
  auth.role() = 'authenticated' AND
  band_id in (select band_id from public.band_members where user_id = auth.uid()) AND
  suggested_by = auth.uid()
);

-- Update: Admins can update songs in their bands
create policy "admins_update_songs" on public.song_suggestions
for update using (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
) with check (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Delete: Users can delete their own suggestions OR admins can delete any
create policy "users_delete_own_or_admins_any" on public.song_suggestions
for delete using (
  auth.role() = 'authenticated' AND (
    suggested_by = auth.uid() OR
    band_id in (
      select band_id from public.band_members 
      where user_id = auth.uid() and role = 'admin'
    )
  )
);

-- ============================================
-- SONG_VOTES TABLE POLICIES
-- ============================================

-- Drop all existing song_votes policies
drop policy if exists "Band members can view votes" on public.song_votes;
drop policy if exists "Band members can vote on songs" on public.song_votes;
drop policy if exists "debug_read votes" on public.song_votes;
drop policy if exists "Band members can view all votes" on public.song_votes;
drop policy if exists "Users can manage their own votes" on public.song_votes;
drop policy if exists "Users can update their own votes" on public.song_votes;
drop policy if exists "Users can delete their own votes" on public.song_votes;

-- Read: Members can see votes in their bands
create policy "members_read_votes" on public.song_votes
for select using (
  auth.role() = 'authenticated' AND
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Insert: Members can vote on songs in their bands
create policy "members_create_votes" on public.song_votes
for insert with check (
  auth.role() = 'authenticated' AND
  band_id in (select band_id from public.band_members where user_id = auth.uid()) AND
  voter_id = auth.uid()
);

-- Update: Users can update their own votes
create policy "users_update_own_votes" on public.song_votes
for update using (
  auth.role() = 'authenticated' AND
  voter_id = auth.uid()
) with check (
  auth.role() = 'authenticated' AND
  voter_id = auth.uid()
);

-- Delete: Users can delete their own votes
create policy "users_delete_own_votes" on public.song_votes
for delete using (
  auth.role() = 'authenticated' AND
  voter_id = auth.uid()
);

-- ============================================
-- REHEARSALS TABLE POLICIES
-- ============================================

-- Drop all existing rehearsals policies
drop policy if exists "Band members can view rehearsals" on public.rehearsals;
drop policy if exists "Band admins can manage rehearsals" on public.rehearsals;
drop policy if exists "debug_read rehearsals" on public.rehearsals;

-- Read: Members can see rehearsals in their bands
create policy "members_read_rehearsals" on public.rehearsals
for select using (
  auth.role() = 'authenticated' AND
  band_id in (select band_id from public.band_members where user_id = auth.uid())
);

-- Insert: Admins can create rehearsals for their bands
create policy "admins_create_rehearsals" on public.rehearsals
for insert with check (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Update: Admins can update rehearsals in their bands
create policy "admins_update_rehearsals" on public.rehearsals
for update using (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
) with check (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Delete: Admins can delete rehearsals in their bands
create policy "admins_delete_rehearsals" on public.rehearsals
for delete using (
  auth.role() = 'authenticated' AND
  band_id in (
    select band_id from public.band_members 
    where user_id = auth.uid() and role = 'admin'
  )
);

-- ============================================
-- REHEARSAL_SETLISTS TABLE POLICIES
-- ============================================

-- Drop all existing rehearsal_setlists policies
drop policy if exists "Band members can view setlists" on public.rehearsal_setlists;
drop policy if exists "Band admins can manage setlists" on public.rehearsal_setlists;
drop policy if exists "debug_read rehearsal_setlists" on public.rehearsal_setlists;

-- Read: Members can see setlists for rehearsals in their bands
create policy "members_read_setlists" on public.rehearsal_setlists
for select using (
  auth.role() = 'authenticated' AND
  rehearsal_id in (
    select id from public.rehearsals
    where band_id in (select band_id from public.band_members where user_id = auth.uid())
  )
);

-- Insert: System/admins can create setlists
create policy "admins_create_setlists" on public.rehearsal_setlists
for insert with check (
  auth.role() = 'authenticated' AND
  rehearsal_id in (
    select id from public.rehearsals
    where band_id in (
      select band_id from public.band_members 
      where user_id = auth.uid() and role = 'admin'
    )
  )
);

-- Update: Admins can update setlists
create policy "admins_update_setlists" on public.rehearsal_setlists
for update using (
  auth.role() = 'authenticated' AND
  rehearsal_id in (
    select id from public.rehearsals
    where band_id in (
      select band_id from public.band_members 
      where user_id = auth.uid() and role = 'admin'
    )
  )
) with check (
  auth.role() = 'authenticated' AND
  rehearsal_id in (
    select id from public.rehearsals
    where band_id in (
      select band_id from public.band_members 
      where user_id = auth.uid() and role = 'admin'
    )
  )
);

-- Delete: Admins can delete setlists
create policy "admins_delete_setlists" on public.rehearsal_setlists
for delete using (
  auth.role() = 'authenticated' AND
  rehearsal_id in (
    select id from public.rehearsals
    where band_id in (
      select band_id from public.band_members 
      where user_id = auth.uid() and role = 'admin'
    )
  )
);