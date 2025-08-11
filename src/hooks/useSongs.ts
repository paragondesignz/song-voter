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
  average_rating?: number // Average star rating (1-5)
  total_ratings?: number
  user_rating?: number | null // User's star rating (1-5)
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
        const ratings = song.votes?.map((vote: any) => parseInt(vote.vote_type)).filter((rating: number) => !isNaN(rating)) || []
        const totalRatings = ratings.length
        const averageRating = totalRatings > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalRatings : 0
        
        return {
          ...song,
          average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          total_ratings: totalRatings,
          user_rating: userVote ? parseInt(userVote.vote_type) || null : null,
        }
      }) as SongSuggestion[]
    },
    enabled: !!bandId && !!user,
  })
}

export function useLeaderboard(bandId: string, timeFrame: 'all' | 'month' | 'week' = 'all') {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['leaderboard', bandId, timeFrame, user?.id],
    queryFn: async () => {
      // Use the same query as song suggestions but with vote filtering
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process and filter songs with ratings
      const processedSongs = data.map((song: any) => {
        const userVote = song.votes?.find((vote: any) => vote.voter_id === user?.id)
        const ratings = song.votes?.map((vote: any) => parseInt(vote.vote_type)).filter((rating: number) => !isNaN(rating)) || []
        const totalRatings = ratings.length
        const averageRating = totalRatings > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalRatings : 0
        
        return {
          ...song,
          id: song.id,
          song_suggestion_id: song.id, // For compatibility
          average_rating: Math.round(averageRating * 10) / 10,
          total_ratings: totalRatings,
          user_rating: userVote ? parseInt(userVote.vote_type) || null : null,
          // Calculate weighted score for better ranking
          weighted_score: averageRating * totalRatings,
          recent_votes: song.votes?.filter((vote: any) => {
            const voteDate = new Date(vote.created_at || song.created_at)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return voteDate > weekAgo
          }).length || 0
        }
      })
      
      // Filter only songs with ratings and sort by weighted score
      return processedSongs
        .filter((song: any) => song.total_ratings > 0)
        .sort((a: any, b: any) => {
          // First sort by average rating
          if (Math.abs(b.average_rating - a.average_rating) > 0.1) {
            return b.average_rating - a.average_rating
          }
          // Then by total ratings (more ratings = higher confidence)
          return b.total_ratings - a.total_ratings
        })
        .slice(0, 50)
    },
    enabled: !!bandId && !!user,
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

export function useRateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      songId,
      bandId,
      rating
    }: {
      songId: string
      bandId: string
      rating: number | null // 1-5 stars, null means remove rating
    }) => {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to vote')
      }

      if (rating) {
        // Validate rating is between 1-5
        if (rating < 1 || rating > 5) {
          throw new Error('Rating must be between 1 and 5 stars')
        }
        
        // Add or update rating using upsert
        const { error } = await supabase
          .from('song_votes')
          .upsert({
            band_id: bandId,
            song_suggestion_id: songId,
            voter_id: session.user.id,
            vote_type: rating.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'song_suggestion_id,voter_id'
          })

        if (error) throw error
      } else {
        // Remove rating
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
      toast.error(error.message || 'Failed to rate song')
    },
  })
}

// Backward compatibility
export const useVoteSong = useRateSong

export function useUpdateSongSuggester() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      songId,
      newSuggesterId
    }: {
      songId: string
      newSuggesterId: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in')
      }

      const { data, error } = await supabase.rpc('update_song_suggester', {
        p_song_id: songId,
        p_new_suggester_id: newSuggesterId,
        p_admin_user_id: session.user.id
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate queries after updating song suggester
      queryClient.invalidateQueries({ queryKey: ['song-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      toast.success('Song suggester updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update song suggester')
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