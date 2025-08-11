import { useState } from 'react'

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

export interface ManualSongTrack {
  title: string
  artist: string
  album?: string
  notes?: string
}

export function useSpotifyEmbed() {
  const [url, setUrl] = useState('')
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract track ID from Spotify URL
  const extractSpotifyTrackId = (url: string): string | null => {
    const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  // Create embed URL
  const createEmbedUrl = (trackId: string): string => {
    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
  }

  // Fetch track metadata from Spotify embed
  const fetchTrackMetadata = async (trackId: string): Promise<SpotifyTrack> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // For now, we'll create a basic track object
      // In a real implementation, you might want to scrape the embed page
      // or use a different approach to get metadata
      const track: SpotifyTrack = {
        spotify_track_id: trackId,
        title: 'Track Title', // This would be extracted from the embed
        artist: 'Artist Name', // This would be extracted from the embed
        album: 'Album Name', // This would be extracted from the embed
        duration_ms: null,
        album_art_url: null,
        preview_url: null,
        external_url: `https://open.spotify.com/track/${trackId}`,
        popularity: 0
      }
      
      setTrack(track)
      return track
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch track metadata'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlSubmit = async (spotifyUrl: string) => {
    setUrl(spotifyUrl)
    const trackId = extractSpotifyTrackId(spotifyUrl)
    
    if (!trackId) {
      setError('Invalid Spotify URL. Please paste a valid Spotify track URL.')
      return null
    }

    try {
      const trackData = await fetchTrackMetadata(trackId)
      return trackData
    } catch (err) {
      // Error already set in fetchTrackMetadata
      return null
    }
  }

  const clearTrack = () => {
    setTrack(null)
    setUrl('')
    setError(null)
  }

  return {
    url,
    track,
    isLoading,
    error,
    handleUrlSubmit,
    clearTrack,
    createEmbedUrl: track ? createEmbedUrl(track.spotify_track_id) : null
  }
}
