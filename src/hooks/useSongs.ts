import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'
import type { SpotifyTrack } from './useSpotify'

export interface SongSuggestion {
  id: string
  band_id: string
  suggested_by: string
  spotify_track_id: string | null
  title: string
  artist: string
  album: string | null
  duration_ms: number | null
  album_art_url: string | null
  preview_url: string | null
  notes: string | null
  status: 'suggested' | 'in_rehearsal' | 'practiced'
  created_at: string
  suggested_by_user?: {
    display_name: string
    avatar_url?: string
  }
  vote_count?: number // Net score (upvotes - downvotes)
  upvote_count?: number
  downvote_count?: number
  user_voted?: 'upvote' | 'downvote' | null
}

export interface SongVote {
  id: string
  band_id: string
  song_suggestion_id: string
  voter_id: string
  vote_type: string
  created_at: string
  updated_at: string
}

export function useSongSuggestions(bandId: string, options?: {
  sortBy?: 'newest' | 'votes' | 'alphabetical' | 'trending'
}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['song-suggestions', bandId, options?.sortBy, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('song_suggestions')
        .select(`
          *,
          suggested_by_user:profiles!song_suggestions_suggested_by_fkey (
            display_name,
            avatar_url
          ),
          votes:song_votes (
            id,
            voter_id
          )
        `)
        .eq('band_id', bandId)

      // Apply sorting
      switch (options?.sortBy) {
        case 'alphabetical':
          query = query.order('title')
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error

      return data.map((song: any) => {
        const userVote = song.votes?.find((vote: any) => vote.voter_id === user?.id)
        const upvotes = song.votes?.filter((vote: any) => vote.vote_type === 'upvote').length || 0
        const downvotes = song.votes?.filter((vote: any) => vote.vote_type === 'downvote').length || 0
        const netScore = upvotes - downvotes
        
        return {
          ...song,
          vote_count: netScore,
          upvote_count: upvotes,
          downvote_count: downvotes,
          user_voted: userVote?.vote_type || null, // 'upvote', 'downvote', or null
        }
      }) as SongSuggestion[]
    },
    enabled: !!bandId && !!user,
  })
}

export function useLeaderboard(bandId: string, timeFrame: 'all' | 'month' | 'week' = 'all') {
  return useQuery({
    queryKey: ['leaderboard', bandId, timeFrame],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_leaderboard')
        .select('*')
        .eq('band_id', bandId)
        .order('vote_count', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
    enabled: !!bandId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useSuggestSong() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      bandId,
      track,
      notes = null,
    }: {
      bandId: string
      track: SpotifyTrack | { title: string; artist: string; album?: string }
      notes?: string | null
    }) => {
      const songData = {
        band_id: bandId,
        suggested_by: user?.id,
        ...(('spotify_track_id' in track) ? {
          spotify_track_id: track.spotify_track_id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration_ms: track.duration_ms,
          album_art_url: track.album_art_url,
          preview_url: track.preview_url,
        } : {
          spotify_track_id: null,
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          duration_ms: null,
          album_art_url: null,
          preview_url: null,
        }),
        notes,
      }

      const { data, error } = await supabase
        .from('song_suggestions')
        .insert(songData)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('This song has already been suggested for this band')
        }
        throw error
      }

      return data
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-suggestions', bandId] })
      toast.success('Song suggested successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to suggest song')
    },
  })
}

export function useVoteSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      songId,
      bandId,
      voteType
    }: {
      songId: string
      bandId: string
      voteType: 'upvote' | 'downvote' | null // null means remove vote
    }) => {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to vote')
      }

      // Check rate limit only when adding/changing votes
      if (voteType) {
        await checkVoteRateLimit(session.user.id, bandId)
      }

      if (voteType) {
        // Check if user already has a vote
        const { data: existingVote } = await supabase
          .from('song_votes')
          .select('id')
          .eq('song_suggestion_id', songId)
          .eq('voter_id', session.user.id)
          .single()

        // Add or update vote using upsert
        const { error } = await supabase
          .from('song_votes')
          .upsert({
            band_id: bandId,
            song_suggestion_id: songId,
            voter_id: session.user.id,
            vote_type: voteType,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'song_suggestion_id,voter_id'
          })

        if (error) throw error

        // Update rate limit only for new votes (not updates)
        if (!existingVote) {
          await updateVoteRateLimit(session.user.id, bandId)
        }
      } else {
        // Remove vote
        const { error } = await supabase
          .from('song_votes')
          .delete()
          .eq('song_suggestion_id', songId)
          .eq('voter_id', session.user.id)

        if (error) throw error
      }
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-suggestions', bandId] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', bandId] })
      queryClient.invalidateQueries({ queryKey: ['vote-stats', bandId] })
    },
    onError: (error: any) => {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        toast.error('You have reached your voting limit. Try again later.')
      } else {
        toast.error(error.message || 'Failed to vote')
      }
    },
  })
}

// Rate limiting functions
async function checkVoteRateLimit(userId: string, bandId: string) {
  const windowDuration = 60 * 60 * 1000 // 1 hour in milliseconds
  const maxVotes = 50 // Max votes per hour
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowDuration)

  const { data, error } = await supabase
    .from('vote_rate_limits')
    .select('vote_count, window_start')
    .eq('user_id', userId)
    .eq('band_id', bandId)
    .single()

  if (error && error.code !== 'PGRST116') throw error

  if (data) {
    const windowStartTime = new Date(data.window_start)
    if (windowStartTime > windowStart && data.vote_count >= maxVotes) {
      throw new Error('RATE_LIMIT_EXCEEDED')
    }
  }
}

async function updateVoteRateLimit(userId: string, bandId: string) {
  const windowDuration = 60 * 60 * 1000 // 1 hour in milliseconds
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowDuration)

  const { data, error } = await supabase
    .from('vote_rate_limits')
    .select('vote_count, window_start')
    .eq('user_id', userId)
    .eq('band_id', bandId)
    .single()

  if (error && error.code !== 'PGRST116') throw error

  if (data) {
    const windowStartTime = new Date(data.window_start)
    if (windowStartTime > windowStart) {
      // Within current window, increment count
      await supabase
        .from('vote_rate_limits')
        .update({ vote_count: data.vote_count + 1 })
        .eq('user_id', userId)
        .eq('band_id', bandId)
    } else {
      // New window, reset count
      await supabase
        .from('vote_rate_limits')
        .update({ 
          vote_count: 1, 
          window_start: now.toISOString()
        })
        .eq('user_id', userId)
        .eq('band_id', bandId)
    }
  } else {
    // First vote, create record
    await supabase
      .from('vote_rate_limits')
      .insert({
        user_id: userId,
        band_id: bandId,
        vote_count: 1,
        window_start: now.toISOString()
      })
  }
}

export function useVoteStats(bandId: string) {
  return useQuery({
    queryKey: ['vote-stats', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_votes')
        .select(`
          id,
          vote_type,
          created_at,
          song_suggestion_id,
          song_suggestion:song_suggestion_id (
            title,
            artist
          )
        `)
        .eq('band_id', bandId)

      if (error) throw error

      const totalVotes = data.length
      const upvotes = data.filter(v => v.vote_type === 'upvote').length
      const downvotes = data.filter(v => v.vote_type === 'downvote').length
      const recentVotes = data.filter(v => {
        const voteDate = new Date(v.created_at)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return voteDate > weekAgo
      }).length

      return {
        totalVotes,
        upvotes,
        downvotes,
        recentVotes,
        votes: data
      }
    },
    enabled: !!bandId,
  })
}

export function useUserVoteStats(bandId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-vote-stats', bandId, user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('song_votes')
        .select('*')
        .eq('band_id', bandId)
        .eq('voter_id', user.id)

      if (error) throw error

      const totalVotes = data.length
      const upvotes = data.filter(v => v.vote_type === 'upvote').length
      const downvotes = data.filter(v => v.vote_type === 'downvote').length

      return {
        totalVotes,
        upvotes,
        downvotes,
        votes: data
      }
    },
    enabled: !!bandId && !!user,
  })
}

export function useVoteRateLimit(bandId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['vote-rate-limit', bandId, user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('vote_rate_limits')
        .select('*')
        .eq('band_id', bandId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const maxVotes = 50
      const windowDuration = 60 * 60 * 1000 // 1 hour
      const now = new Date()

      if (!data) {
        return {
          votesRemaining: maxVotes,
          windowStart: now,
          voteCount: 0,
          resetTime: new Date(now.getTime() + windowDuration)
        }
      }

      const windowStart = new Date(data.window_start)
      const windowEnd = new Date(windowStart.getTime() + windowDuration)
      const isCurrentWindow = now < windowEnd

      if (isCurrentWindow) {
        return {
          votesRemaining: Math.max(0, maxVotes - data.vote_count),
          windowStart,
          voteCount: data.vote_count,
          resetTime: windowEnd
        }
      } else {
        return {
          votesRemaining: maxVotes,
          windowStart: now,
          voteCount: 0,
          resetTime: new Date(now.getTime() + windowDuration)
        }
      }
    },
    enabled: !!bandId && !!user,
    refetchInterval: 60000, // Refetch every minute
  })
}

export function useVoteHistory(bandId: string, limit = 50) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['vote-history', bandId, user?.id, limit],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('song_votes')
        .select(`
          *,
          song_suggestion:song_suggestion_id (
            title,
            artist,
            album,
            album_art_url
          )
        `)
        .eq('band_id', bandId)
        .eq('voter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    },
    enabled: !!bandId && !!user,
  })
}

export function useRemoveSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      suggestionId 
    }: { 
      suggestionId: string
      bandId: string 
    }) => {
      const { error } = await supabase
        .from('song_suggestions')
        .delete()
        .eq('id', suggestionId)

      if (error) throw error
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-suggestions', bandId] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', bandId] })
      toast.success('Song suggestion removed successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove suggestion')
    },
  })
}