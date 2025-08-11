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

  // Clever way to extract metadata from Spotify URL using web scraping
  const extractTrackInfo = async (spotifyUrl: string): Promise<SpotifyTrack> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const trackId = extractSpotifyTrackId(spotifyUrl)
      if (!trackId) {
        throw new Error('Invalid Spotify URL')
      }

      // Try multiple proxy services for better reliability
      const proxyServices = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(spotifyUrl)}`,
        `https://cors-anywhere.herokuapp.com/${spotifyUrl}`,
        `https://thingproxy.freeboard.io/fetch/${spotifyUrl}`
      ]

      let html = ''
      let success = false

      // Try each proxy service until one works
      for (const proxyUrl of proxyServices) {
        try {
          const response = await fetch(proxyUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          })
          
          if (response.ok) {
            if (proxyUrl.includes('allorigins.win')) {
              const data = await response.json()
              html = data.contents
            } else {
              html = await response.text()
            }
            success = true
            break
          }
        } catch (err) {
          console.log(`Proxy ${proxyUrl} failed, trying next...`)
          continue
        }
      }

      if (!success || !html) {
        throw new Error('All proxy services failed')
      }

      // Extract title from the page
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? 
        titleMatch[1].replace(' | Spotify', '').replace(' - Spotify', '').trim() : 
        'Track from Spotify'

      // Extract artist from the page (look for artist links and metadata)
      let artist = 'Artist from Spotify'
      
      // Method 1: Try Open Graph title (most reliable)
      const artistMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
      if (artistMatch) {
        const ogTitle = artistMatch[1]
        // Spotify OG titles are usually "Song Name - Artist Name"
        const parts = ogTitle.split(' - ')
        if (parts.length >= 2) {
          artist = parts[parts.length - 1].trim() // Last part is usually the artist
        }
      }

      // Method 2: Try music:musician meta tag
      const artistMetaMatch = html.match(/<meta\s+name="music:musician"\s+content="([^"]+)"/i)
      if (artistMetaMatch) {
        artist = artistMetaMatch[1].trim()
      }

      // Method 3: Try to find artist in the page content
      const artistContentMatch = html.match(/<a[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)<\/a>/i)
      if (artistContentMatch) {
        artist = artistContentMatch[1].trim()
      }

      // Method 4: Look for artist in breadcrumb navigation
      const breadcrumbMatch = html.match(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/is)
      if (breadcrumbMatch) {
        artist = breadcrumbMatch[1].trim()
      }

      // Extract album info if available
      let album = 'Album from Spotify'
      const albumMatch = html.match(/<meta\s+property="music:album"\s+content="([^"]+)"/i)
      if (albumMatch) {
        album = albumMatch[1].trim()
      }

      // Clean up extracted data
      const cleanTitle = title.replace(/[^\w\s\-'()&.,!?]/g, '').trim()
      const cleanArtist = artist.replace(/[^\w\s\-'()&.,!?]/g, '').trim()
      const cleanAlbum = album.replace(/[^\w\s\-'()&.,!?]/g, '').trim()

      const track: SpotifyTrack = {
        spotify_track_id: trackId,
        title: cleanTitle || 'Track from Spotify',
        artist: cleanArtist || 'Artist from Spotify',
        album: cleanAlbum || 'Album from Spotify',
        duration_ms: null,
        album_art_url: null,
        preview_url: null,
        external_url: `https://open.spotify.com/track/${trackId}`,
        popularity: 0
      }
      
      setTrack(track)
      return track
    } catch (err) {
      // Fallback to basic extraction if scraping fails
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
