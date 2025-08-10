import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSpotifySearch } from '@/hooks/useSpotify'
import { useSuggestSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { 
  Search, 
  ArrowLeft, 
  Music, 
  Play, 
  Plus,
  Clock,
  ExternalLink
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
  
  const { data: band } = useBand(bandId!)
  const { query, setQuery, tracks, isLoading, hasQuery } = useSpotifySearch()
  const suggestSong = useSuggestSong()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ManualSongForm>()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSpotifySuggest = async (track: any) => {
    await suggestSong.mutateAsync({ bandId: bandId!, track })
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/band/${bandId}`)}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Music className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Search Songs</h1>
                <p className="text-xs text-gray-500">{band?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Search section */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Search Spotify</h2>
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {showManualForm ? 'Search Spotify' : 'Add Manually'}
              </button>
            </div>

            {!showManualForm ? (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Search for songs, artists, or albums..."
                  />
                </div>

                {/* Loading state */}
                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Searching...</p>
                  </div>
                )}

                {/* Search results */}
                {!isLoading && hasQuery && tracks.length === 0 && (
                  <div className="text-center py-8">
                    <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No songs found</p>
                  </div>
                )}

                {tracks.length > 0 && (
                  <div className="space-y-4">
                    {tracks.map((track) => (
                      <div key={track.spotify_track_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          {track.album_art_url ? (
                            <img
                              src={track.album_art_url}
                              alt={track.album}
                              className="w-16 h-16 rounded-md mr-4"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-300 rounded-md mr-4 flex items-center justify-center">
                              <Music className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{track.title}</h3>
                            <p className="text-gray-600">{track.artist}</p>
                            <p className="text-sm text-gray-500">{track.album}</p>
                            <div className="flex items-center mt-1 space-x-4">
                              {track.duration_ms && (
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDuration(track.duration_ms)}
                                </span>
                              )}
                              {track.preview_url && (
                                <button className="text-xs text-primary-600 hover:text-primary-700 flex items-center">
                                  <Play className="w-3 h-3 mr-1" />
                                  Preview
                                </button>
                              )}
                              <a
                                href={track.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Spotify
                              </a>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSpotifySuggest(track)}
                          disabled={suggestSong.isPending}
                          className="btn-primary flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Suggest
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!hasQuery && !isLoading && (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Songs</h3>
                    <p className="text-gray-600 mb-4">
                      Search Spotify's catalog to find and suggest songs for your band
                    </p>
                    <p className="text-sm text-gray-500">
                      Can't find what you're looking for?{' '}
                      <button
                        onClick={() => setShowManualForm(true)}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Add it manually
                      </button>
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Manual form */
              <form onSubmit={handleSubmit(handleManualSuggest)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Song Title *
                    </label>
                    <input
                      {...register('title', { required: 'Song title is required' })}
                      className="input-field"
                      placeholder="Bohemian Rhapsody"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artist *
                    </label>
                    <input
                      {...register('artist', { required: 'Artist is required' })}
                      className="input-field"
                      placeholder="Queen"
                    />
                    {errors.artist && (
                      <p className="mt-1 text-sm text-red-600">{errors.artist.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Album
                    </label>
                    <input
                      {...register('album')}
                      className="input-field"
                      placeholder="A Night at the Opera (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <input
                      {...register('notes')}
                      className="input-field"
                      placeholder="Any additional notes (optional)"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualForm(false)
                      reset()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={suggestSong.isPending}
                    className="btn-primary"
                  >
                    {suggestSong.isPending ? 'Suggesting...' : 'Suggest Song'}
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