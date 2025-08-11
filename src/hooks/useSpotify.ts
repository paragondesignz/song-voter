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

  // Extract basic info from Spotify URL (no API calls)
  const extractTrackInfo = async (spotifyUrl: string): Promise<SpotifyTrack> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const trackId = extractSpotifyTrackId(spotifyUrl)
      if (!trackId) {
        throw new Error('Invalid Spotify URL')
      }

      // Create a basic track object with the info we can extract
      const track: SpotifyTrack = {
        spotify_track_id: trackId,
        title: 'Track from Spotify', // Generic title since we don't have API access
        artist: 'Artist from Spotify', // Generic artist
        album: 'Album from Spotify', // Generic album
        duration_ms: null,
        album_art_url: null,
        preview_url: null,
        external_url: `https://open.spotify.com/track/${trackId}`,
        popularity: 0
      }
      
      setTrack(track)
      return track
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process Spotify URL'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlSubmit = async (spotifyUrl: string) => {
    setUrl(spotifyUrl)
    
    try {
      const trackData = await extractTrackInfo(spotifyUrl)
      return trackData
    } catch (err) {
      // Error already set in extractTrackInfo
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
