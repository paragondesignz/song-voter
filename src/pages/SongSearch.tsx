import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSpotifyEmbed } from '@/hooks/useSpotify'
import { useSuggestSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { 
  Music, 
  Plus,
  ExternalLink,
  Link
} from 'lucide-react'

interface ManualSongForm {
  title: string
  artist: string
  album: string
  notes: string
}

export function SongSearch() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [showManualForm, setShowManualForm] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  
  const { data: band } = useBand(bandId!)
  const { track, isLoading, error, handleUrlSubmit } = useSpotifyEmbed()
  const suggestSong = useSuggestSong()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ManualSongForm>()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSpotifyUrlSubmit = async () => {
    if (!spotifyUrl.trim()) return
    
    const trackData = await handleUrlSubmit(spotifyUrl)
    if (trackData) {
      // Track is now loaded and ready for suggestion
    }
  }

  const handleSpotifySuggest = async () => {
    if (!track) return
    
    await suggestSong.mutateAsync({ 
      bandId: bandId!, 
      track: {
        title: track.title,
        artist: track.artist,
        album: track.album,
        spotify_track_id: track.spotify_track_id,
        duration_ms: track.duration_ms,
        album_art_url: track.album_art_url,
        preview_url: track.preview_url
      }
    })
    navigate(`/band/${bandId}/suggestions`)
  }

  const handleManualSuggest = async (data: ManualSongForm) => {
    const track = {
      title: data.title,
      artist: data.artist,
      album: data.album || undefined,
    }
    
    await suggestSong.mutateAsync({ 
      bandId: bandId!, 
      track,
      notes: data.notes || null
    })
    
    reset()
    setShowManualForm(false)
    navigate(`/band/${bandId}/suggestions`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Search Songs"
        subtitle={band?.name}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Search section */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Add Spotify Song</h2>
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {showManualForm ? 'Add Spotify Song' : 'Add Manually'}
              </button>
            </div>

            {!showManualForm ? (
              <>
                <div className="mb-6">
                  <label htmlFor="spotify-url" className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Spotify Track URL
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="spotify-url"
                        type="url"
                        value={spotifyUrl}
                        onChange={(e) => setSpotifyUrl(e.target.value)}
                        className="input-field pl-10"
                        placeholder="https://open.spotify.com/track/..."
                      />
                    </div>
                    <button
                      onClick={handleSpotifyUrlSubmit}
                      disabled={!spotifyUrl.trim() || isLoading}
                      className="btn-primary px-4 py-2"
                    >
                      {isLoading ? 'Loading...' : 'Load Track'}
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-600 text-sm mt-2">{error}</p>
                  )}
                </div>

                {/* Track Preview */}
                {track && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{track.title}</h3>
                        <p className="text-gray-600 mb-1">
                          <span className="font-medium">Artist:</span> {track.artist}
                        </p>
                        {track.album && (
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Album:</span> {track.album}
                          </p>
                        )}
                        {track.duration_ms && (
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Duration:</span> {formatDuration(track.duration_ms)}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <a
                          href={track.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open in Spotify
                        </a>
                      </div>
                    </div>
                    
                    {/* Spotify Embed */}
                    <div className="mt-4">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${track.spotify_track_id}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title="Spotify player"
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSpotifySuggest}
                        disabled={suggestSong.isPending}
                        className="btn-primary flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Suggest Song
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="text-center py-8">
                  <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">How to Add Songs</h3>
                  <p className="text-gray-600 mb-4">
                    1. Go to Spotify and find the song you want to suggest<br/>
                    2. Copy the track URL from the address bar<br/>
                    3. Paste it above and click "Load Track"<br/>
                    4. Review the track details and click "Suggest Song"
                  </p>
                  <p className="text-sm text-gray-500">
                    Can't find what you're looking for? Use the "Add Manually" option above.
                  </p>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit(handleManualSuggest)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Song Title *
                    </label>
                    <input
                      id="title"
                      type="text"
                      {...register('title', { required: 'Title is required' })}
                      className="input-field"
                      placeholder="Enter song title"
                    />
                    {errors.title && (
                      <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-2">
                      Artist *
                    </label>
                    <input
                      id="artist"
                      type="text"
                      {...register('artist', { required: 'Artist is required' })}
                      className="input-field"
                      placeholder="Enter artist name"
                    />
                    {errors.artist && (
                      <p className="text-red-600 text-sm mt-1">{errors.artist.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="album" className="block text-sm font-medium text-gray-700 mb-2">
                    Album
                  </label>
                  <input
                    id="album"
                    type="text"
                    {...register('album')}
                    className="input-field"
                    placeholder="Enter album name (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    className="input-field"
                    placeholder="Any additional notes about this song..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={suggestSong.isPending}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Suggest Song
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}