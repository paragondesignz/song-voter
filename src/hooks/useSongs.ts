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
  vote_count?: number
  user_voted?: boolean
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

      return data.map((song: any) => ({
        ...song,
        vote_count: song.votes?.length || 0,
        user_voted: song.votes?.some((vote: any) => vote.voter_id === user?.id) || false,
      })) as SongSuggestion[]
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
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      songId,
      bandId,
      isVoting,
    }: {
      songId: string
      bandId: string
      isVoting: boolean
    }) => {
      if (isVoting) {
        // Add vote
        const { error } = await supabase
          .from('song_votes')
          .insert({
            band_id: bandId,
            song_suggestion_id: songId,
            voter_id: user?.id,
            vote_type: 'upvote',
          })

        if (error) throw error
      } else {
        // Remove vote
        const { error } = await supabase
          .from('song_votes')
          .delete()
          .eq('song_suggestion_id', songId)
          .eq('voter_id', user?.id)

        if (error) throw error
      }
    },
    onSuccess: (_, { bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['song-suggestions', bandId] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', bandId] })
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('You have already voted for this song')
      } else {
        toast.error(error.message || 'Failed to vote')
      }
    },
  })
}