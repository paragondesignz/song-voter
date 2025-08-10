# Band Song Voter

A collaborative song selection platform that enables band members to suggest, vote on, and curate setlists for upcoming rehearsals through an intuitive web application integrated with Spotify's music database.

## Features

- **Authentication**: Secure user registration and login with Supabase Auth
- **Band Management**: Create or join bands with invite codes (max 10 members)
- **Spotify Integration**: Search and suggest songs from Spotify's catalog
- **Continuous Voting**: Real-time voting on song suggestions
- **Dynamic Leaderboard**: View most popular songs with trending indicators  
- **Song Suggestions**: Add songs from Spotify or manually
- **Responsive UI**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live updates using Supabase Realtime

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions + Realtime)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query) + Zustand
- **External API**: Spotify Web API
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ 
- Docker Desktop (for local Supabase development)
- Spotify Developer Account (for API keys)
- Supabase Account

## Quick Start

### 1. Clone and Install Dependencies

\`\`\`bash
git clone <your-repo-url>
cd song-voter
npm install
\`\`\`

### 2. Set up Supabase

#### Option A: Use Existing Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Run the migration:
   \`\`\`bash
   # Install Supabase CLI first
   npm install -g @supabase/cli
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Push the database schema
   supabase db push
   \`\`\`

#### Option B: Local Development

1. Install Docker Desktop
2. Start local Supabase:
   \`\`\`bash
   supabase start
   \`\`\`
3. The local setup will automatically apply migrations

### 3. Configure Environment Variables

Create a \`.env.local\` file:

\`\`\`env
# For local development
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key

# For production, use your actual Supabase project
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key
\`\`\`

### 4. Set up Spotify API (Required for song search)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy your Client ID and Client Secret
4. Add these to your Supabase secrets:

For local development:
\`\`\`bash
supabase secrets set SPOTIFY_CLIENT_ID=your_client_id
supabase secrets set SPOTIFY_CLIENT_SECRET=your_client_secret
\`\`\`

For production (Supabase dashboard):
- Go to Project Settings > Edge Functions
- Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

### 5. Deploy Edge Functions (Required for Spotify integration)

\`\`\`bash
supabase functions deploy spotify-search
\`\`\`

### 6. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at http://localhost:5173

## Database Schema

The app uses the following main tables:

- **profiles**: User profile information
- **bands**: Band information with invite codes
- **band_members**: Junction table for band membership
- **song_suggestions**: Song suggestions with Spotify integration
- **song_votes**: Voting system with rate limiting
- **rehearsals**: Planned rehearsal sessions (basic implementation)
- **rehearsal_setlists**: Song selections for rehearsals

## User Flow

1. **Registration**: Users sign up with email/password
2. **Band Setup**: Create a new band or join with invite code
3. **Song Discovery**: Search Spotify catalog or add songs manually
4. **Voting**: Band members vote on suggested songs (can't vote on own suggestions)
5. **Leaderboard**: View most popular songs with real-time updates
6. **Rehearsal Planning**: Admins can schedule rehearsals (basic feature)

## Key Components

### Authentication
- Login/Register pages with form validation
- Password reset functionality
- Protected routes for authenticated users

### Band Management
- Create bands with auto-generated invite codes
- Join bands with invite codes (max 10 members)
- Member management with admin/member roles

### Song System
- Spotify API integration for song search
- Manual song entry for non-Spotify tracks
- Real-time voting with optimistic updates
- Leaderboard with filtering and sorting

### UI Components
- Responsive design for mobile/tablet/desktop
- Real-time updates without page refresh
- Loading states and error handling
- Accessible form controls and navigation

## Deployment

### Vercel (Recommended)

The app is configured for Vercel deployment:

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
\`\`\`

### Other Platforms

The app will work on any static hosting platform:

\`\`\`bash
npm run build
# Deploy the dist/ folder
\`\`\`

## Development

### Available Scripts

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run preview\`: Preview production build
- \`npm run lint\`: Run ESLint

### Project Structure

\`\`\`
src/
├── components/     # Reusable UI components
├── context/        # React context providers
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries
├── pages/          # Page components
├── types/          # TypeScript type definitions
└── utils/          # Helper functions

supabase/
├── config.toml     # Supabase configuration
├── functions/      # Edge functions
└── migrations/     # Database migrations
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the GitHub Issues
2. Review the Supabase and Spotify API documentation
3. Ensure all environment variables are set correctly
4. Verify database migrations have been applied

## Roadmap

- [ ] Enhanced rehearsal planning features
- [ ] Song difficulty ratings
- [ ] Practice progress tracking
- [ ] Calendar integration
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Band collaboration features
- [ ] Public setlist sharing