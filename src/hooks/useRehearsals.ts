import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { RecurringRehearsalData } from '@/components/RecurringRehearsalForm'

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

export function useAddToSetlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rehearsalId,
      songId,
      position
    }: {
      rehearsalId: string
      songId: string
      position?: number
    }) => {
      // Get current setlist count for position
      const { data: currentSetlist } = await supabase
        .from('rehearsal_setlists')
        .select('position')
        .eq('rehearsal_id', rehearsalId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = position ?? ((currentSetlist?.[0]?.position ?? 0) + 1)

      const { data, error } = await supabase
        .from('rehearsal_setlists')
        .insert({
          rehearsal_id: rehearsalId,
          song_suggestion_id: songId,
          position: nextPosition,
          selection_reason: 'Manually added'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-setlist', data.rehearsal_id] })
      toast.success('Song added to setlist!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add song to setlist')
    },
  })
}

export function useReorderSetlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rehearsalId,
      reorderedItems
    }: {
      rehearsalId: string
      reorderedItems: { id: string; position: number }[]
    }) => {
      // Update all positions in a single transaction
      const updates = reorderedItems.map(item =>
        supabase
          .from('rehearsal_setlists')
          .update({ position: item.position })
          .eq('id', item.id)
      )

      await Promise.all(updates)

      return rehearsalId
    },
    onSuccess: (rehearsalId) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-setlist', rehearsalId] })
      toast.success('Setlist reordered!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder setlist')
    },
  })
}

// Recurring Rehearsal Interfaces
export interface RehearsalSeries {
  id: string
  band_id: string
  created_by: string
  series_name: string
  template_name: string
  template_start_time: string | null
  template_location: string | null
  template_songs_to_learn: number
  template_selection_deadline_hours: number | null
  template_description: string | null
  recurrence_type: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom'
  recurrence_interval: number
  recurrence_days: string[]
  start_date: string
  end_type: 'never' | 'after_count' | 'end_date'
  occurrence_count: number | null
  end_date: string | null
  exceptions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Hook to get all rehearsal series for a band
export function useBandRehearsalSeries(bandId: string) {
  return useQuery({
    queryKey: ['rehearsal-series', bandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehearsal_series')
        .select('*')
        .eq('band_id', bandId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as RehearsalSeries[]
    },
    enabled: !!bandId,
  })
}

// Hook to get a specific rehearsal series
export function useRehearsalSeries(seriesId: string) {
  return useQuery({
    queryKey: ['rehearsal-series', seriesId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehearsal_series')
        .select('*')
        .eq('id', seriesId)
        .single()

      if (error) throw error
      return data as RehearsalSeries
    },
    enabled: !!seriesId,
  })
}

// Hook to create a recurring rehearsal series
export function useCreateRehearsalSeries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RecurringRehearsalData & { bandId: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Create the series
      const { data: series, error: seriesError } = await supabase
        .from('rehearsal_series')
        .insert({
          band_id: data.bandId,
          created_by: session.user.id,
          series_name: data.seriesName,
          template_name: data.templateName,
          template_start_time: data.templateStartTime || null,
          template_location: data.templateLocation || null,
          template_songs_to_learn: data.templateSongsToLearn,
          template_selection_deadline_hours: data.templateSelectionDeadlineHours,
          template_description: data.templateDescription || null,
          recurrence_type: data.recurrenceType,
          recurrence_interval: data.recurrenceInterval,
          recurrence_days: data.recurrenceDays,
          start_date: data.startDate,
          end_type: data.endType,
          occurrence_count: data.occurrenceCount,
          end_date: data.endDate || null,
          exceptions: data.exceptions,
        })
        .select()
        .single()

      if (seriesError) throw seriesError

      // Generate initial rehearsals
      const { data: generatedCount, error: generateError } = await supabase
        .rpc('generate_rehearsals_from_series', {
          series_id_param: series.id,
          months_ahead: 3
        })

      if (generateError) throw generateError

      return { series, generatedCount }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-series'] })
      queryClient.invalidateQueries({ queryKey: ['rehearsals'] })
      toast.success(`Recurring series created! Generated ${result.generatedCount} rehearsals.`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create recurring series')
    },
  })
}

// Hook to update a rehearsal series
export function useUpdateRehearsalSeries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      seriesId,
      updates
    }: {
      seriesId: string
      updates: Partial<RehearsalSeries>
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('rehearsal_series')
        .update(updates)
        .eq('id', seriesId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-series'] })
      toast.success('Series updated successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update series')
    },
  })
}

// Hook to delete a rehearsal series
export function useDeleteRehearsalSeries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (seriesId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      // Delete the series (this will cascade to rehearsals)
      const { error } = await supabase
        .from('rehearsal_series')
        .delete()
        .eq('id', seriesId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rehearsal-series'] })
      queryClient.invalidateQueries({ queryKey: ['rehearsals'] })
      toast.success('Recurring series deleted successfully!')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete series')
    },
  })
}

// Hook to generate more rehearsals from a series
export function useGenerateRehearsalsFromSeries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      seriesId,
      monthsAhead = 3
    }: {
      seriesId: string
      monthsAhead?: number
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data: generatedCount, error } = await supabase
        .rpc('generate_rehearsals_from_series', {
          series_id_param: seriesId,
          months_ahead: monthsAhead
        })

      if (error) throw error
      return generatedCount
    },
    onSuccess: (generatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['rehearsals'] })
      toast.success(`Generated ${generatedCount} additional rehearsals!`)
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate rehearsals')
    },
  })
}