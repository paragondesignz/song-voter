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

  // Fetch track metadata from Spotify API via our edge function
  const fetchTrackMetadata = async (trackId: string): Promise<SpotifyTrack> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Use our get-track-metadata edge function to get track details
      const response = await fetch('/functions/v1/get-track-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch track metadata from Spotify')
      }

      const data = await response.json()
      
      if (!data.track) {
        throw new Error('Track not found on Spotify')
      }

      const spotifyTrack = data.track
      
      const track: SpotifyTrack = {
        spotify_track_id: trackId,
        title: spotifyTrack.title,
        artist: spotifyTrack.artist,
        album: spotifyTrack.album,
        duration_ms: spotifyTrack.duration_ms,
        album_art_url: spotifyTrack.album_art_url,
        preview_url: spotifyTrack.preview_url,
        external_url: spotifyTrack.external_url,
        popularity: spotifyTrack.popularity
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
