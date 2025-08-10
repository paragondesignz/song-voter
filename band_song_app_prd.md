# Band Song Selection App - Product Requirements Document

## 1. Product Overview

### 1.1 Product Vision
A collaborative song selection platform that enables band members to suggest, vote on, and curate setlists for upcoming rehearsals through an intuitive web application integrated with Spotify's music database.

### 1.2 Product Goals
- Streamline the song selection process for band rehearsals
- Enable democratic voting on song choices
- Integrate with Spotify for comprehensive music search
- Provide clear visibility into song suggestions and voting results
- Reduce time spent in meetings deciding what to practice

### 1.3 Success Metrics
- Time reduction in rehearsal planning (target: 50% reduction)
- User engagement (daily/weekly active users)
- Songs successfully learned and performed
- User satisfaction scores

## 2. User Personas

### 2.1 Band Admin/Leader
- **Role**: Primary organizer, sets rehearsal schedules, manages voting sessions
- **Needs**: Control over rehearsal planning, ability to set voting parameters, overview of all activity
- **Pain Points**: Coordinating schedules, getting consensus on song choices

### 2.2 Band Members
- **Role**: Contributors and voters
- **Needs**: Easy song suggestion, fair voting process, visibility into what's being practiced
- **Pain Points**: Ideas getting lost, feeling unheard in song selection

## 3. Core Features & User Stories

### 3.1 Authentication & User Management

#### 3.1.1 User Registration/Login
**As a band member, I want to create an account so that I can access the band's song selection platform.**

**Acceptance Criteria:**
- Users can register with email/password
- Email verification required
- Users can log in with email/password
- Password reset functionality via email
- Session management with secure tokens

**Technical Requirements:**
- Use Supabase Auth for authentication
- Implement email verification flow
- Store user profiles in `profiles` table
- Secure password requirements (min 8 chars, special chars)

#### 3.1.2 Band Creation & Invitation
**As a band admin, I want to create a band and invite members so that we can start collaborating.**

**Acceptance Criteria:**
- Admin can create a new band with a unique name
- Admin can generate invitation links/codes
- Members can join via invitation link or code
- Band has a maximum of 10 members
- Admin can remove members if needed

**Technical Requirements:**
- `bands` table with unique band codes
- `band_members` junction table with roles
- Invitation system with expiring codes
- Email invitations with join links

### 3.2 Song Suggestion System

#### 3.2.1 Spotify Integration & Search
**As a band member, I want to search for songs using Spotify so that I can suggest accurate, detailed song information.**

**Acceptance Criteria:**
- Real-time search of Spotify catalog
- Display: song title, artist, album, duration, album art
- Preview audio clips (30-second snippets)
- Handle rate limiting gracefully
- Fallback for songs not on Spotify (manual entry)

**Technical Requirements:**
- Spotify Web API integration
- Client credentials flow for app-level access
- Search endpoint: `/search?type=track`
- Store Spotify track IDs for future reference
- Implement debounced search (300ms delay)

#### 3.2.2 Song Suggestion Submission
**As a band member, I want to suggest songs so that the band can consider them for future rehearsals.**

**Acceptance Criteria:**
- Members can add songs from Spotify search results
- Members can manually add songs not on Spotify
- Optional notes/comments with each suggestion
- Prevent duplicate suggestions within the band
- Suggestions are immediately visible to all members

**Technical Requirements:**
- `song_suggestions` table structure:
  ```sql
  id (uuid, primary key)
  band_id (uuid, foreign key)
  suggested_by (uuid, foreign key to profiles)
  spotify_track_id (text, nullable)
  title (text, required)
  artist (text, required)
  album (text, nullable)
  duration_ms (integer, nullable)
  album_art_url (text, nullable)
  preview_url (text, nullable)
  notes (text, nullable)
  created_at (timestamp)
  ```

#### 3.2.3 Interactive Suggestion Queue
**As a band member, I want to view and interact with all song suggestions so that I can participate in the continuous voting process.**

**Acceptance Criteria:**
- Display all suggestions with real-time vote counts
- One-click upvoting with visual feedback
- Show who suggested each song and who has voted
- Sort by: newest, most voted, trending, alphabetical
- Filter by suggester, date range, or search term
- Pagination for large lists (20 songs per page)
- Visual indicators for songs in current rehearsal rotation

**Technical Requirements:**
- Real-time updates using Supabase realtime subscriptions
- Optimistic UI updates for immediate feedback
- Vote count aggregation with efficient caching
- Debounced voting to prevent accidental spam
- Mobile-optimized interaction design

### 3.3 Continuous Voting & Leaderboard System

#### 3.3.1 Continuous Song Voting
**As a band member, I want to upvote songs in the suggestion queue at any time so that the most popular songs naturally rise to the top.**

**Acceptance Criteria:**
- Members can upvote any song in the suggestion queue at any time
- One vote per member per song (no spam voting)
- Members can change their vote (upvote/remove vote)
- Cannot vote on own suggestions
- Real-time vote count updates visible to all members
- Vote history preserved for analytics

**Technical Requirements:**
- `song_votes` table structure:
  ```sql
  id (uuid, primary key)
  band_id (uuid, foreign key)
  song_suggestion_id (uuid, foreign key)
  voter_id (uuid, foreign key to profiles)
  vote_type (text, default 'upvote') -- future: could add 'downvote'
  created_at (timestamp)
  updated_at (timestamp)
  ```
- Unique constraint on (song_suggestion_id, voter_id)
- Real-time vote aggregation with proper indexing
- Anti-spam measures: rate limiting (max 10 votes per minute)

#### 3.3.2 Dynamic Song Leaderboard
**As a band member, I want to see a real-time leaderboard of the most popular songs so that I know what the band is gravitating toward.**

**Acceptance Criteria:**
- Display songs ranked by total upvotes (descending)
- Show vote count and voting trend (rising/falling indicators)
- Filter leaderboard by time period (all time, last month, last week)
- Visual indicators for songs with momentum (recently gaining votes)
- Pagination for large song lists
- Mobile-optimized leaderboard view

**Technical Requirements:**
- Materialized view for vote counts with periodic refresh
- Real-time updates using Supabase realtime subscriptions
- Trending algorithm based on recent vote velocity
- Efficient caching of leaderboard data

#### 3.3.3 Rehearsal Song Selection
**As a band admin, I want to easily select songs for upcoming rehearsals from the most popular songs so that I can leverage the band's collective preferences.**

**Acceptance Criteria:**
- Admin can create rehearsal sessions with date, time, location
- Set number of songs to learn for the rehearsal
- Quick-select from top X songs on leaderboard
- Option to manually override selections
- "Lock in" selections to create final setlist
- Notify members of final song selections

**Technical Requirements:**
- `rehearsals` table structure:
  ```sql
  id (uuid, primary key)
  band_id (uuid, foreign key)
  created_by (uuid, foreign key to profiles)
  name (text, required)
  rehearsal_date (date, required)
  start_time (time, nullable)
  location (text, nullable)
  songs_to_learn (integer, required, min 1, max 10)
  selection_deadline (timestamp, nullable)
  description (text, nullable)
  status (text, default 'planning') -- 'planning', 'songs_selected', 'completed'
  created_at (timestamp)
  ```

#### 3.3.4 Smart Selection Algorithms
**As a band admin, I want intelligent song recommendations so that I can make informed decisions about what to practice.**

**Acceptance Criteria:**
- Algorithm considers: vote count, recent voting trends, song variety
- Suggest balanced setlists (avoid all songs from same artist/genre)
- Factor in song difficulty and band member preferences
- Option to see "alternative picks" if admin wants variety
- Explanation of why songs were recommended

**Technical Requirements:**
- Weighted scoring algorithm combining multiple factors
- Song metadata analysis for variety recommendations
- Configurable algorithm parameters for different band preferences
- A/B testing capability for algorithm improvements

### 3.4 Dashboard & Analytics

#### 3.4.1 Member Dashboard
**As a band member, I want a dashboard overview so that I can quickly see current activity and participate in ongoing voting.**

**Acceptance Criteria:**
- Show upcoming rehearsals and selected songs
- Display current leaderboard top 10
- Show my recent suggestions and voting activity
- Quick access to suggest new songs and vote
- Trending songs section (recently gaining votes)
- Personal voting statistics
- Mobile-responsive design

#### 3.4.2 Admin Dashboard
**As a band admin, I want administrative controls and insights so that I can manage the band effectively.**

**Acceptance Criteria:**
- Band member management (add/remove/role changes)
- Rehearsal scheduling and song selection tools
- Voting analytics and member engagement metrics
- Band activity overview and leaderboard trends
- Export capabilities for setlists and voting data
- Song suggestion moderation tools

#### 3.4.3 Leaderboard Analytics
**As a band member, I want to see voting trends and patterns so that I can understand the band's musical direction.**

**Acceptance Criteria:**
- Historical leaderboard changes over time
- Member voting patterns and preferences
- Song suggestion success rates by member
- Trending analysis (velocity of vote changes)
- Genre/artist distribution in top votes
- Rehearsal selection patterns from leaderboard

## 4. Technical Architecture

### 4.1 Technology Stack
- **Frontend**: React with TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **External API**: Spotify Web API
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Deployment**: Vercel

### 4.2 Database Schema

```sql
-- Core tables
CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE band_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, user_id)
);

-- Song suggestion tables
CREATE TABLE song_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  suggested_by uuid REFERENCES profiles(id),
  spotify_track_id text,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  duration_ms integer,
  album_art_url text,
  preview_url text,
  notes text,
  status text DEFAULT 'suggested', -- 'suggested', 'in_rehearsal', 'practiced'
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, spotify_track_id) -- Prevent duplicate Spotify tracks
);

-- Continuous voting system
CREATE TABLE song_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  song_suggestion_id uuid REFERENCES song_suggestions(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text DEFAULT 'upvote', -- Future: could add 'downvote'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(song_suggestion_id, voter_id)
);

-- Materialized view for leaderboard performance
CREATE MATERIALIZED VIEW song_leaderboard AS
SELECT 
  ss.id,
  ss.band_id,
  ss.title,
  ss.artist,
  ss.album_art_url,
  ss.suggested_by,
  COUNT(sv.id) as vote_count,
  COUNT(CASE WHEN sv.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_votes,
  ss.created_at as suggested_at
FROM song_suggestions ss
LEFT JOIN song_votes sv ON ss.id = sv.song_suggestion_id
GROUP BY ss.id, ss.band_id, ss.title, ss.artist, ss.album_art_url, ss.suggested_by, ss.created_at;

-- Refresh the materialized view periodically
CREATE OR REPLACE FUNCTION refresh_song_leaderboard()
RETURNS void AS $
BEGIN
  REFRESH MATERIALIZED VIEW song_leaderboard;
END;
$ LANGUAGE plpgsql;

-- Rehearsal tables (simplified)
CREATE TABLE rehearsals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  rehearsal_date date NOT NULL,
  start_time time,
  location text,
  songs_to_learn integer NOT NULL CHECK (songs_to_learn >= 1 AND songs_to_learn <= 10),
  selection_deadline timestamp with time zone,
  description text,
  status text DEFAULT 'planning', -- 'planning', 'songs_selected', 'completed'
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE rehearsal_setlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id uuid REFERENCES rehearsals(id) ON DELETE CASCADE,
  song_suggestion_id uuid REFERENCES song_suggestions(id),
  selection_reason text, -- 'leaderboard_top', 'admin_override', 'trending'
  position integer NOT NULL,
  vote_count_at_selection integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Vote rate limiting table
CREATE TABLE vote_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  band_id uuid REFERENCES bands(id),
  vote_count integer DEFAULT 0,
  window_start timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, band_id)
);
```

### 4.3 API Integration

#### 4.3.1 Spotify Web API
- **Authentication**: Client Credentials Flow
- **Endpoints Used**:
  - `GET /search` - Song search functionality
  - `GET /tracks/{id}` - Detailed track information
- **Rate Limiting**: 100 requests per minute
- **Error Handling**: Graceful degradation when API is unavailable

### 4.4 Security Considerations

#### 4.4.1 Row Level Security (RLS)
```sql
-- Band members can only see their band's data
CREATE POLICY "Band members can view their band's songs" ON song_suggestions
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

-- Users can only vote in their band and not on their own suggestions
CREATE POLICY "Members can vote in their band" ON song_votes
  FOR INSERT WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
    AND song_suggestion_id NOT IN (
      SELECT id FROM song_suggestions WHERE suggested_by = auth.uid()
    )
  );

-- Prevent vote spam through rate limiting
CREATE POLICY "Rate limit voting" ON song_votes
  FOR INSERT WITH CHECK (
    (
      SELECT vote_count FROM vote_rate_limits 
      WHERE user_id = auth.uid() 
      AND band_id = (SELECT band_id FROM song_suggestions WHERE id = song_suggestion_id)
      AND window_start > NOW() - INTERVAL '1 minute'
    ) < 10
  );

-- Members can update their own votes
CREATE POLICY "Members can update their votes" ON song_votes
  FOR UPDATE USING (voter_id = auth.uid());

-- Leaderboard is viewable by band members
CREATE POLICY "Band members can view leaderboard" ON song_leaderboard
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );
```

#### 4.4.2 Anti-Spam Measures
- **Rate Limiting**: Maximum 10 votes per minute per user
- **Vote Validation**: Cannot vote on own suggestions
- **Unique Constraint**: One vote per song per user
- **Debounced UI**: 500ms delay before vote registration
- **Activity Monitoring**: Track suspicious voting patterns

## 5. User Interface Requirements

### 5.1 Design Principles
- **Mobile-first**: Responsive design for all screen sizes
- **Intuitive Navigation**: Clear information hierarchy
- **Real-time Updates**: Live updates without page refresh
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Fast loading times (<3 seconds)

### 5.2 Key UI Components

#### 5.2.1 Song Search Interface
- Search bar with debounced input
- Results grid with album art, song details
- Play button for preview snippets
- "Add to Suggestions" button with immediate feedback
- Loading states and error handling

#### 5.2.2 Interactive Suggestion Queue
- Card-based layout with upvote buttons
- Real-time vote counters with smooth animations
- Member avatars showing who suggested and voted
- Sort controls (Most Voted, Trending, Newest, A-Z)
- Filter options (by member, time period, search)
- Infinite scroll with lazy loading
- Visual voting feedback (heart animations, color changes)

#### 5.2.3 Dynamic Leaderboard
- Top 10 songs prominently displayed
- Vote count badges with trending indicators (↗️ ↘️)
- "Rising Star" highlights for recently trending songs
- Time period filters (All Time, This Month, This Week)
- Visual vote momentum indicators
- Quick rehearsal selection from leaderboard

#### 5.2.4 Rehearsal Planning Interface
- Calendar view for scheduling rehearsals
- "Auto-select from Top X" quick action buttons
- Drag-and-drop song selection from leaderboard
- Manual override options for admins
- Visual setlist builder with song previews
- Member notification controls

### 5.3 Responsive Breakpoints
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

## 6. Testing Requirements

### 6.1 Unit Testing
- Authentication flows
- Database operations
- Vote counting algorithms
- Spotify API integration

### 6.2 Integration Testing
- End-to-end user workflows
- Real-time functionality
- Email delivery
- Cross-browser compatibility

### 6.3 Performance Testing
- Load testing with multiple concurrent users
- Database query optimization
- API response times
- Mobile performance

## 7. Deployment & DevOps

### 7.1 Environment Setup
- **Development**: Local Supabase instance
- **Staging**: Supabase staging project
- **Production**: Supabase production project

### 7.2 CI/CD Pipeline
- Automated testing on pull requests
- Database migration scripts
- Environment variable management
- Automated deployment to Vercel

### 7.3 Monitoring & Logging
- Error tracking (Sentry)
- Performance monitoring
- Database query monitoring
- User analytics

## 8. Future Enhancements

### 8.1 Advanced Features
- Integration with music learning platforms
- Song difficulty ratings
- Practice progress tracking
- Setlist templates and reuse
- Integration with calendar apps

### 8.2 Social Features
- Song recommendation engine
- Band collaboration features
- Public setlist sharing
- Integration with streaming platforms

## 9. Success Criteria & KPIs

### 9.1 User Engagement
- Monthly active users > 80% of band members
- Average session duration > 5 minutes
- Song suggestions per user per month > 3

### 9.2 Product Effectiveness
- Rehearsal planning time reduction > 50%
- User satisfaction score > 4.5/5
- Feature adoption rate > 70%

### 9.3 Technical Performance
- Page load times < 3 seconds
- 99.9% uptime
- API response times < 500ms
- Zero critical security vulnerabilities

---

## Appendix A: Spotify API Reference

### A.1 Required Spotify App Configuration
```javascript
const spotifyConfig = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  baseUrl: 'https://api.spotify.com/v1',
  authUrl: 'https://accounts.spotify.com/api/token'
};
```

### A.2 Search Implementation Example
```javascript
async function searchTracks(query, limit = 20) {
  const response = await fetch(
    `${spotifyConfig.baseUrl}/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.json();
}
```

## Appendix B: Email Templates

### B.1 Band Invitation Email
```html
<h2>You've been invited to join [Band Name]!</h2>
<p>Click the link below to join and start suggesting songs for your next rehearsal:</p>
<a href="[JOIN_LINK]">Join [Band Name]</a>
```

### B.2 Voting Reminder Email
```html
<h2>Voting is now open for [Rehearsal Name]</h2>
<p>Vote for the songs you'd like to practice at the upcoming rehearsal on [Date].</p>
<p>Voting closes: [Deadline]</p>
<a href="[VOTING_LINK]">Cast Your Votes</a>
```

---

*This PRD serves as the complete specification for implementing the Band Song Selection App. All requirements are designed to be implementable using Supabase as the backend infrastructure with modern web development practices.*