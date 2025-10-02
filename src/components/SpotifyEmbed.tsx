import { useState } from 'react'

interface SpotifyEmbedProps {
  trackId: string
  compact?: boolean
  height?: number
}

export function SpotifyEmbed({ trackId, compact = false, height = 352 }: SpotifyEmbedProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const embedHeight = compact ? 152 : height
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">Preview not available</p>
        <a 
          href={`https://open.spotify.com/track/${trackId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
        >
          Open in Spotify
        </a>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center"
          style={{ height: embedHeight }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      )}
      <iframe
        data-testid="embed-iframe"
        style={{ borderRadius: '12px' }}
        src={embedUrl}
        width="100%"
        height={embedHeight}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        title="Spotify player"
      />
    </div>
  )
}