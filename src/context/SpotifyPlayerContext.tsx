import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

interface SpotifyPlayerContextType {
  currentTrack: string | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  play: (trackId: string, previewUrl?: string) => void
  pause: () => void
  setVolume: (volume: number) => void
  togglePlayPause: (trackId: string, previewUrl?: string) => void
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | undefined>(undefined)

export function SpotifyPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackUrlsRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio()
    audioRef.current.volume = volume
    
    // Add event listeners
    const audio = audioRef.current
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    const handleError = (e: Event) => {
      console.error('Audio playback error:', e)
      setIsPlaying(false)
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const fetchPreviewUrl = async (trackId: string): Promise<string | null> => {
    // Check cache first
    if (trackUrlsRef.current.has(trackId)) {
      return trackUrlsRef.current.get(trackId) || null
    }

    try {
      // Use Spotify Web API to get track preview
      // Note: This requires Spotify API credentials which should be handled server-side
      // For now, we'll construct the embed URL which can be used in an iframe
      // In production, you'd want to use the Spotify Web API with proper authentication
      
      // For demonstration, we'll use the oEmbed endpoint which doesn't require auth
      const response = await fetch(`https://open.spotify.com/oembed?url=spotify:track:${trackId}`)
      if (response.ok) {
        const data = await response.json()
        // The oEmbed doesn't provide preview_url directly
        // In a real implementation, you'd need to use the Spotify Web API
        
        // For now, return null and suggest using the Spotify Web API
        console.log('Track data:', data)
      }
    } catch (error) {
      console.error('Error fetching track preview:', error)
    }
    
    return null
  }

  const play = async (trackId: string, previewUrl?: string) => {
    if (!audioRef.current) return
    
    try {
      // If switching to a different track
      if (currentTrack !== trackId) {
        // Get the preview URL
        let url = previewUrl
        
        if (!url) {
          // Try to fetch it if not provided
          url = await fetchPreviewUrl(trackId) || undefined
        }
        
        if (!url) {
          // If still no URL, we can't play
          console.warn(`No preview URL available for track ${trackId}`)
          // Open Spotify instead
          window.open(`https://open.spotify.com/track/${trackId}`, '_blank')
          return
        }
        
        // Store the URL for future use
        if (url) {
          trackUrlsRef.current.set(trackId, url)
        }
        
        // Load the new track
        audioRef.current.src = url
        setCurrentTrack(trackId)
        setCurrentTime(0)
      }
      
      // Play the audio
      await audioRef.current.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsPlaying(false)
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume
    }
  }

  const togglePlayPause = (trackId: string, previewUrl?: string) => {
    if (currentTrack === trackId && isPlaying) {
      pause()
    } else {
      play(trackId, previewUrl)
    }
  }

  return (
    <SpotifyPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        currentTime,
        duration,
        play,
        pause,
        setVolume,
        togglePlayPause
      }}
    >
      {children}
    </SpotifyPlayerContext.Provider>
  )
}

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext)
  if (context === undefined) {
    throw new Error('useSpotifyPlayer must be used within a SpotifyPlayerProvider')
  }
  return context
}