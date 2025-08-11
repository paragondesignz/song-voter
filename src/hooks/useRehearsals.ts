import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export interface Rehearsal {
  id: string
  band_id: string
  created_by: string
  name: string
  rehearsal_date: string
  start_time: string | null
  location: string | null
  songs_to_learn: number
  selection_deadline: string | null
  description: string | null
  status: 'planning' | 'songs_selected' | 'completed'
  created_at: string
}

export interface RehearsalSetlistItem {
  id: string
  rehearsal_id: string
  song_suggestion_id: string
  selection_reason: string | null
  position: number
  vote_count_at_selection: number | null
  created_at: string
  song_suggestion?: {
    title: string
    artist: string
    album: string | null
    album_art_url: string | null
    spotify_track_id: string | null
    vote_count: number
  }
}

export function useBandRehearsals(bandId: string) {
  return useQuery({
    queryKey: ['rehearsals', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehearsals')
        .select('*')
        .eq('band_id', bandId)
        .order('rehearsal_date', { ascending: false })

      if (error) throw error
      return data as Rehearsal[]
    },
    enabled: !!bandId,
  })
}

export function useRehearsal(rehearsalId: string) {
  return useQuery({
    queryKey: ['rehearsal', rehearsalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehearsals')
        .select('*')
        .eq('id', rehearsalId)
        .single()

      if (error) throw error
      return data as Rehearsal
    },
    enabled: !!rehearsalId,
  })
}

export function useRehearsalSetlist(rehearsalId: string) {
  return useQuery({
    queryKey: ['rehearsal-setlist', rehearsalId],
    queryFn: async () => {
      // Fetch setlist items without embedded joins
      const { data: setlist, error } = await supabase
        .from('rehearsal_setlists')
        .select('*')
        .eq('rehearsal_id', rehearsalId)
        .order('position', { ascending: true })

      if (error) throw error

      if (!setlist || setlist.length === 0) return setlist as unknown as RehearsalSetlistItem[]

      // Fetch song details separately
      const songIds = setlist.map(item => item.song_suggestion_id)
      const { data: songs } = await supabase
        .from('song_suggestions')
        .select('id, title, artist, album, album_art_url, spotify_track_id')
        .in('id', songIds)

      const songMap = new Map((songs || []).map(s => [s.id, s]))

      // Compute vote counts separately
      const { data: voteCounts } = await supabase
        .from('song_votes')
        .select('song_suggestion_id')
        .in('song_suggestion_id', songIds)

      const voteCountMap = (voteCounts || []).reduce((acc, vote) => {
        acc[vote.song_suggestion_id] = (acc[vote.song_suggestion_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return setlist.map(item => ({
        ...item,
        song_suggestion: {
          ...(songMap.get(item.song_suggestion_id) as any),
          vote_count: voteCountMap[item.song_suggestion_id] || 0,
        }
      })) as RehearsalSetlistItem[]
    },
    enabled: !!rehearsalId,
  })
}

export function useCreateRehearsal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rehearsal: {
      band_id: string
      name: string
      rehearsal_date: string
      start_time?: string
      location?: string
      songs_to_learn: number
      selection_deadline?: string
      description?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('You must be logged in to create a rehearsal')
      }

      const { data, error } = await supabase
        .from('rehearsals')
        .insert({
          ...rehearsal,
          created_by: session.user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Rehearsal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsals', data.band_id] })
      toast.success('Rehearsal scheduled successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule rehearsal')
    },
  })
}

export function useUpdateRehearsal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      rehearsalId, 
      updates 
    }: { 
      rehearsalId: string
      updates: Partial<Rehearsal>
    }) => {
      const { data, error } = await supabase
        .from('rehearsals')
        .update(updates)
        .eq('id', rehearsalId)
        .select()
        .single()

      if (error) throw error
      return data as Rehearsal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal', data.id] })
      queryClient.invalidateQueries({ queryKey: ['rehearsals', data.band_id] })
      toast.success('Rehearsal updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update rehearsal')
    },
  })
}

export function useDeleteRehearsal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rehearsalId: string) => {
      const { error } = await supabase
        .from('rehearsals')
        .delete()
        .eq('id', rehearsalId)

      if (error) throw error
    },
    onSuccess: (_, rehearsalId) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal', rehearsalId] })
      queryClient.invalidateQueries({ queryKey: ['rehearsals'] })
      toast.success('Rehearsal deleted successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete rehearsal')
    },
  })
}

export function useAutoSelectSongs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      rehearsalId, 
      bandId 
    }: { 
      rehearsalId: string
      bandId: string 
    }) => {
      const { data: rehearsal, error: rehearsalError } = await supabase
        .from('rehearsals')
        .select('songs_to_learn')
        .eq('id', rehearsalId)
        .single()

      if (rehearsalError) throw rehearsalError

      // Get top-rated songs (star rating system)
      const { data: topSongs, error: songsError } = await supabase
        .from('song_leaderboard')
        .select('*')
        .eq('band_id', bandId)
        .order('average_rating', { ascending: false })
        .order('total_ratings', { ascending: false })
        .limit(rehearsal.songs_to_learn)

      if (songsError) throw songsError

      if (!topSongs || topSongs.length === 0) {
        throw new Error('No songs available for selection')
      }

      // Clear existing setlist
      await supabase
        .from('rehearsal_setlists')
        .delete()
        .eq('rehearsal_id', rehearsalId)

      // Add songs to setlist
      const setlistItems = topSongs.map((song: any, index: number) => ({
        rehearsal_id: rehearsalId,
        song_suggestion_id: song.id,
        position: index + 1,
        selection_reason: 'Auto-selected from leaderboard',
        vote_count_at_selection: song.total_ratings
      }))

      const { error: insertError } = await supabase
        .from('rehearsal_setlists')
        .insert(setlistItems)

      if (insertError) throw insertError

      // Update rehearsal status
      const { error: updateError } = await supabase
        .from('rehearsals')
        .update({ status: 'songs_selected' })
        .eq('id', rehearsalId)

      if (updateError) throw updateError

      return setlistItems
    },
    onSuccess: (_, { rehearsalId, bandId }) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-setlist', rehearsalId] })
      queryClient.invalidateQueries({ queryKey: ['rehearsal', rehearsalId] })
      queryClient.invalidateQueries({ queryKey: ['rehearsals', bandId] })
      toast.success('Songs selected automatically!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to select songs')
    },
  })
}

export function useUpdateSetlistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      setlistItemId,
      updates
    }: { 
      setlistItemId: string
      updates: Partial<RehearsalSetlistItem>
    }) => {
      const { data, error } = await supabase
        .from('rehearsal_setlists')
        .update(updates)
        .eq('id', setlistItemId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-setlist', data.rehearsal_id] })
      toast.success('Setlist updated!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update setlist')
    },
  })
}

export function useRemoveFromSetlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (setlistItemId: string) => {
      const { data, error } = await supabase
        .from('rehearsal_setlists')
        .delete()
        .eq('id', setlistItemId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-setlist', data.rehearsal_id] })
      toast.success('Song removed from setlist!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove song from setlist')
    },
  })
}