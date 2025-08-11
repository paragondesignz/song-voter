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
            voter_id,
            vote_type
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

      if (voteType) {
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
      // Invalidate and refetch immediately for better UX
      queryClient.invalidateQueries({ queryKey: ['song-suggestions', bandId] })
      queryClient.refetchQueries({ queryKey: ['song-suggestions', bandId] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', bandId] })
      queryClient.invalidateQueries({ queryKey: ['vote-stats', bandId] })
      queryClient.invalidateQueries({ queryKey: ['user-vote-stats', bandId] })
      // Clear any stale rate limit queries that might still be cached
      queryClient.removeQueries({ queryKey: ['vote-rate-limit'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to vote')
    },
  })
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