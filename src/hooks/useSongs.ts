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
  bpm: number | null
  musical_key: string | null
  vocal_type: 'male' | 'female' | 'duet' | 'instrumental' | null
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
  sortBy?: 'newest' | 'votes' | 'alphabetical' | 'your_votes'
}) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['song-suggestions', bandId, options?.sortBy, user?.id],
    queryFn: async () => {
      // Base suggestions query without embedded joins to avoid schema introspection under RLS
      let query = supabase
        .from('song_suggestions')
        .select('*')
        .eq('band_id', bandId)
        .neq('status', 'practiced')

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

      const suggestions = data as any[]

      // Fetch ratings for these suggestions to compute ratings
      const songIds = suggestions.map(s => s.id)
      let ratings: any[] = []
      if (songIds.length > 0) {
        const { data: ratingsData } = await supabase
          .from('song_ratings')
          .select('song_suggestion_id, user_id, rating, created_at')
          .in('song_suggestion_id', songIds)
        ratings = ratingsData || []
      }

      // Fetch suggester profiles (best-effort; tolerate RLS)
      const suggesterIds = Array.from(new Set(suggestions.map(s => s.suggested_by)))
      let profileMap: Record<string, { display_name: string; avatar_url?: string }> = {}
      if (suggesterIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', suggesterIds)
        for (const p of profilesData || []) {
          profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }
        }
      }

      const groupedRatings = ratings.reduce((acc, r) => {
        const arr = acc[r.song_suggestion_id] || (acc[r.song_suggestion_id] = [])
        arr.push(r)
        return acc
      }, {} as Record<string, any[]>)

      return suggestions.map((song: any) => {
        const songRatings = groupedRatings[song.id] || []
        const userRating = songRatings.find((rating: any) => rating.user_id === user?.id)
        const ratingValues = songRatings.map((rating: any) => rating.rating).filter((rating: number) => !isNaN(rating))
        const totalRatings = ratingValues.length
        const averageRating = totalRatings > 0 ? ratingValues.reduce((sum: number, rating: number) => sum + rating, 0) / totalRatings : 0

        return {
          ...song,
          suggested_by_user: profileMap[song.suggested_by],
          average_rating: Math.round(averageRating * 10) / 10,
          total_ratings: totalRatings,
          user_rating: userRating ? userRating.rating : null,
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
      // Fetch suggestions without embedded joins
      const { data: suggestions, error } = await supabase
        .from('song_suggestions')
        .select('*')
        .eq('band_id', bandId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const songIds = (suggestions || []).map(s => s.id)
      let votes: any[] = []
      if (songIds.length > 0) {
        const { data: votesData } = await supabase
          .from('song_votes')
          .select('song_suggestion_id, voter_id, vote_type, created_at')
          .eq('band_id', bandId)
          .in('song_suggestion_id', songIds)
        votes = votesData || []
      }

      const groupedVotes = votes.reduce((acc, v) => {
        const arr = acc[v.song_suggestion_id] || (acc[v.song_suggestion_id] = [])
        arr.push(v)
        return acc
      }, {} as Record<string, any[]>)

      // Process and filter songs with ratings
      const processedSongs = (suggestions || []).map((song: any) => {
        const songVotes = groupedVotes[song.id] || []
        const userVote = songVotes.find((vote: any) => vote.voter_id === user?.id)
        const ratings = songVotes.map((vote: any) => parseInt(vote.vote_type)).filter((rating: number) => !isNaN(rating))
        const totalRatings = ratings.length
        const averageRating = totalRatings > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalRatings : 0
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentVotes = songVotes.filter((vote: any) => new Date(vote.created_at) > weekAgo).length

        return {
          ...song,
          id: song.id,
          song_suggestion_id: song.id,
          average_rating: Math.round(averageRating * 10) / 10,
          total_ratings: totalRatings,
          user_rating: userVote ? parseInt(userVote.vote_type) || null : null,
          weighted_score: averageRating * totalRatings,
          recent_votes: recentVotes,
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to suggest song')
    },
  })
}

export function useRateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      songId,
      bandId: _bandId,
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
        
        // Add or update rating using upsert in the song_ratings table
        const { error } = await supabase
          .from('song_ratings')
          .upsert({
            song_suggestion_id: songId,
            user_id: session.user.id,
            rating: rating,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'song_suggestion_id,user_id'
          })

        if (error) throw error
      } else {
        // Remove rating from song_ratings table
        const { error } = await supabase
          .from('song_ratings')
          .delete()
          .eq('song_suggestion_id', songId)
          .eq('user_id', session.user.id)

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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to rate song')
    },
  })
}

// Backward compatibility
export const useVoteSong = useRateSong

export function useCleanupRehearsalSongs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cleanup_rehearsal_songs')
      if (error) throw error
      return data
    },
    onSuccess: (updatedCount) => {
      // Invalidate all song-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['song-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      
      if (updatedCount > 0) {
        toast.success(`${updatedCount} song${updatedCount !== 1 ? 's' : ''} moved to practiced status`)
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cleanup rehearsal songs')
    },
  })
}

export function useSongDetails(songId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['song-details', songId, user?.id],
    queryFn: async () => {
      // Get song details without embedded joins to avoid RLS issues
      const { data: song, error } = await supabase
        .from('song_suggestions')
        .select('*')
        .eq('id', songId)
        .single()

      if (error) throw error

      // Fetch ratings for this song
      const { data: ratingsData } = await supabase
        .from('song_ratings')
        .select('user_id, rating')
        .eq('song_suggestion_id', songId)

      const ratings = ratingsData || []

      // Fetch suggester profile
      let suggested_by_user = null
      if (song.suggested_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', song.suggested_by)
          .single()

        suggested_by_user = profileData
      }

      // Calculate ratings
      const userRating = user ? ratings.find((r: any) => r.user_id === user.id) : null
      const ratingValues = ratings.map((rating: any) => rating.rating).filter((rating: number) => !isNaN(rating))
      const totalRatings = ratingValues.length
      const averageRating = totalRatings > 0 ? ratingValues.reduce((sum: number, rating: number) => sum + rating, 0) / totalRatings : 0

      return {
        ...song,
        suggested_by_user,
        average_rating: Math.round(averageRating * 10) / 10,
        total_ratings: totalRatings,
        user_rating: userRating ? userRating.rating : null,
      }
    },
    enabled: !!songId && !!user,
  })
}

export function useUpdateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      songId,
      bandId: _bandId,
      updates
    }: {
      songId: string
      bandId: string
      updates: {
        title?: string
        artist?: string
        album?: string | null
        duration_ms?: number | null
        album_art_url?: string | null
        preview_url?: string | null
        spotify_track_id?: string | null
        notes?: string | null
        status?: 'suggested' | 'in_rehearsal' | 'practiced'
        bpm?: number | null
        musical_key?: string | null
        vocal_type?: 'male' | 'female' | 'duet' | 'instrumental' | null
      }
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in')
      }

      const { data, error } = await supabase
        .from('song_suggestions')
        .update(updates)
        .eq('id', songId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-suggestions', bandId] })
      queryClient.invalidateQueries({ queryKey: ['song-details'] })
      toast.success('Song updated successfully')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update song')
    },
  })
}

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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update song suggester')
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

      const totalRatings = data.length
      const ratings = data.map(v => parseInt(v.vote_type)).filter(rating => !isNaN(rating))
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
      const highRatings = data.filter(v => parseInt(v.vote_type) >= 4).length
      const lowRatings = data.filter(v => parseInt(v.vote_type) <= 2).length
      const recentRatings = data.filter(v => {
        const voteDate = new Date(v.created_at)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return voteDate > weekAgo
      }).length

      // Distribution of ratings (1-5 stars)
      const ratingDistribution = {
        1: data.filter(v => v.vote_type === '1').length,
        2: data.filter(v => v.vote_type === '2').length,
        3: data.filter(v => v.vote_type === '3').length,
        4: data.filter(v => v.vote_type === '4').length,
        5: data.filter(v => v.vote_type === '5').length,
      }

      return {
        totalRatings,
        averageRating: Math.round(averageRating * 10) / 10,
        highRatings,
        lowRatings,
        recentRatings,
        ratingDistribution,
        ratings: data
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

      const totalRatings = data.length
      const ratings = data.map(v => parseInt(v.vote_type)).filter(rating => !isNaN(rating))
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
      const highRatings = data.filter(v => parseInt(v.vote_type) >= 4).length
      const lowRatings = data.filter(v => parseInt(v.vote_type) <= 2).length

      return {
        totalRatings,
        averageRating: Math.round(averageRating * 10) / 10,
        highRatings,
        lowRatings,
        ratings: data
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

      // Fetch votes without embedded joins
      const { data: votes, error } = await supabase
        .from('song_votes')
        .select('*')
        .eq('band_id', bandId)
        .eq('voter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const songIds = (votes || []).map(v => v.song_suggestion_id)
      let songMap: Record<string, any> = {}
      if (songIds.length > 0) {
        const { data: songs } = await supabase
          .from('song_suggestions')
          .select('id, title, artist, album, album_art_url')
          .in('id', songIds)
        for (const s of songs || []) {
          songMap[s.id] = s
        }
      }

      return (votes || []).map(v => ({
        ...v,
        song_suggestion: songMap[v.song_suggestion_id],
      }))
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
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove suggestion')
    },
  })
}