import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SpotifyTrack {
  spotify_track_id: string
  title: string
  artist: string
  album: string
  duration_ms: number | null
  album_art_url: string | null
  preview_url: string | null
  external_url: string
  popularity: number
}

export function useSpotifySearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const debounce = (fn: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  const updateDebouncedQuery = debounce((q: string) => {
    setDebouncedQuery(q)
  }, 300)

  const setQueryValue = (q: string) => {
    setQuery(q)
    updateDebouncedQuery(q)
  }

  const { data: tracks, isLoading, error } = useQuery({
    queryKey: ['spotify-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return []

      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { query: debouncedQuery, limit: 20 }
      })

      if (error) throw error
      return data.tracks as SpotifyTrack[]
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  return {
    query,
    setQuery: setQueryValue,
    tracks: tracks || [],
    isLoading,
    error,
    hasQuery: debouncedQuery.length > 0,
  }
}