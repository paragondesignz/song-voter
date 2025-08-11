# Rehearsalist - Band Practice Management App

## Tech Stack
- **Framework**: React 18 + Vite + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (auto-deploy from GitHub)
- **State Management**: React Query + React Context
- **Icons**: Lucide React

## Project Architecture
- **Frontend**: SPA with React Router
- **Backend**: Supabase Edge Functions + RLS policies
- **Auth**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (avatar images)
- **Real-time**: Supabase real-time subscriptions

## Key Commands
- `npm run dev`: Development server (port 5173)
- `npm run build`: Production build 
- `npm run lint`: ESLint check
- `supabase start`: Local Supabase (requires Docker)
- `supabase db push`: Push migrations to production
- `supabase db pull`: Pull schema changes
- `supabase migration new <name>`: Create new migration

## CRITICAL: Production Workflow (MANDATORY)

**EVERY code change MUST follow this workflow:**
1. Make the code change
2. Test locally if needed
3. `npm run build` to verify no TypeScript errors
4. `git add -A && git commit -m "descriptive message"`
5. **IMMEDIATELY `git push origin main`** 
6. **NEVER batch multiple commits before pushing**

**This applies to**: Bug fixes, features, migrations, config changes, documentation updates

**WHY**: User pays for Claude Code and needs immediate production testing. Vercel auto-deploys from GitHub. No exceptions.

## Code Standards

### React Components
- Use functional components with hooks only
- Import icons from lucide-react: `import { IconName } from 'lucide-react'`
- Follow existing component patterns in src/pages/ and src/components/
- Use TypeScript strict mode - resolve all TS errors

### State Management
- React Query for server state (hooks in src/hooks/)
- React Context for auth state only
- Local state with useState/useReducer

### Styling
- Use existing Tailwind classes
- Follow component patterns: `className="btn-primary"`, `className="card"`
- Responsive design: mobile-first approach

### Database/Supabase
- **CRITICAL**: Use session-based auth for all mutations:
  ```typescript
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Not authenticated')
  // Use session.user.id for user references
  ```
- All tables have RLS policies - respect them
- Migrations go in `supabase/migrations/` with descriptive names
- Edge functions in `supabase/functions/`

## Project Structure
- `src/pages/`: Main application pages
- `src/components/`: Reusable components
- `src/hooks/`: React Query hooks for API calls
- `src/context/`: React context providers
- `src/lib/`: Utility functions and Supabase client
- `supabase/migrations/`: Database schema changes
- `supabase/functions/`: Edge functions (Spotify API)

## Business Logic
- **Bands**: Users can create/join bands with invite codes
- **Members**: Admin/member roles with different permissions
- **Songs**: Upvote/downvote system (democratic voting)
- **Rehearsals**: Admins schedule rehearsals with auto-selected songs
- **Voting**: Rate-limited (50 votes/hour), everyone can vote on all songs
- **Profiles**: Avatar uploads, account management

## Before Coding
1. **Read existing code** in relevant files to understand patterns
2. **Check imports** - never assume libraries are available
3. **Understand the data flow** - React Query → Supabase → RLS
4. **Ask clarifying questions** if requirements are unclear

## While Coding
1. **Follow existing patterns** - look at similar components first
2. **Use TypeScript properly** - define interfaces, handle null/undefined
3. **Handle loading states** and errors in UI
4. **Test authentication flows** - all mutations need auth
5. **Verify RLS policies** work correctly

## Quality Gates (MUST)
- **TypeScript compilation** must pass (`npm run build`)
- **No console errors** in browser dev tools  
- **Authentication flows** work correctly
- **RLS policies** enforce correct permissions
- **Responsive design** works on mobile/desktop

## DO NOT
- **Batch commits** before pushing to GitHub
- **Create new files** without checking existing patterns first
- **Use libraries** without verifying they exist in package.json
- **Skip authentication checks** in mutations
- **Break existing functionality** when adding features
- **Ignore TypeScript errors**
- **Create documentation files** (.md) unless explicitly requested
- **Use comments** in code unless specifically asked

## Current Feature Status
- ✅ User authentication and profiles
- ✅ Band creation and management  
- ✅ Song suggestions with Spotify integration
- ✅ Democratic upvote/downvote system
- ✅ Admin member management with roles
- ✅ Rehearsal scheduling system
- ✅ Avatar upload with Supabase Storage
- ✅ Rate limiting and voting analytics

## Emergency Fixes
If production is broken:
1. Identify the issue quickly
2. Make minimal fix
3. Test locally if possible
4. Commit and push IMMEDIATELY
5. Verify fix works in production
6. Follow up with proper solution if needed