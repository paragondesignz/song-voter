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

  // Use Spotify's official oEmbed API to get real metadata
  const extractTrackInfo = async (spotifyUrl: string): Promise<SpotifyTrack> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const trackId = extractSpotifyTrackId(spotifyUrl)
      if (!trackId) {
        throw new Error('Invalid Spotify URL')
      }

      // Use Spotify's official oEmbed API (no CORS issues, no auth required)
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
      
      const response = await fetch(oembedUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch track metadata from Spotify')
      }

      const oembedData = await response.json()
      
      // Parse title and artist from oEmbed data
      let title = 'Track from Spotify'
      let artist = 'Artist from Spotify'
      let album = 'Album from Spotify'
      
      if (oembedData.title) {
        // oEmbed title is usually "Song Name - Artist Name"
        const titleParts = oembedData.title.split(' - ')
        if (titleParts.length >= 2) {
          title = titleParts[0].trim()
          artist = titleParts[1].trim()
        } else {
          title = oembedData.title.trim()
        }
      }
      
      // Try to get album info from description if available
      if (oembedData.description) {
        // Description might contain album info
        const descParts = oembedData.description.split(' by ')
        if (descParts.length >= 2) {
          const songInfo = descParts[0]
          // Look for album info in parentheses or after dash
          const albumMatch = songInfo.match(/.*?[-–]\s*(.+?)(?:\s*\(|$)/)
          if (albumMatch) {
            album = albumMatch[1].trim()
          }
        }
      }

      const track: SpotifyTrack = {
        spotify_track_id: trackId,
        title: title,
        artist: artist,
        album: album,
        duration_ms: null, // oEmbed doesn't provide duration
        album_art_url: oembedData.thumbnail_url || null,
        preview_url: null, // oEmbed doesn't provide preview URLs
        external_url: `https://open.spotify.com/track/${trackId}`,
        popularity: 0
      }
      
      setTrack(track)
      return track
    } catch (err) {
      // Fallback to basic extraction if oEmbed fails
      const trackId = extractSpotifyTrackId(spotifyUrl)
      if (trackId) {
        const track: SpotifyTrack = {
          spotify_track_id: trackId,
          title: 'Track from Spotify',
          artist: 'Artist from Spotify',
          album: 'Album from Spotify',
          duration_ms: null,
          album_art_url: null,
          preview_url: null,
          external_url: `https://open.spotify.com/track/${trackId}`,
          popularity: 0
        }
        
        setTrack(track)
        return track
      }
      
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
