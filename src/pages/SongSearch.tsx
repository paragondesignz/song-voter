import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSpotifyEmbed, type SpotifyTrack } from '@/hooks/useSpotify'
import { useSuggestSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { 
  Music, 
  Plus,
  ExternalLink,
  Link
} from 'lucide-react'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'

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
  const [editableTrack, setEditableTrack] = useState<SpotifyTrack | null>(null)
  
  const { data: band } = useBand(bandId!)
  const { isLoading, error, handleUrlSubmit } = useSpotifyEmbed()
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
      // Set the editable track for user modification
      setEditableTrack(trackData)
    }
  }

  const handleSpotifySuggest = async () => {
    if (!editableTrack) return
    
    await suggestSong.mutateAsync({ 
      bandId: bandId!, 
      track: {
        title: editableTrack.title,
        artist: editableTrack.artist,
        album: editableTrack.album,
        spotify_track_id: editableTrack.spotify_track_id,
        duration_ms: editableTrack.duration_ms,
        album_art_url: editableTrack.album_art_url,
        preview_url: editableTrack.preview_url
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
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Songs</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>
        
        <div className="space-y-8">
          {/* Instructions */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">How to add songs to your band</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• <strong>Spotify songs:</strong> Paste a Spotify track URL to automatically get song details</p>
                  <p>• <strong>Manual entry:</strong> Click "Add Manually" to enter song details yourself</p>
                  <p>• <strong>Preview songs:</strong> Listen to 30-second previews before suggesting</p>
                  <p>• <strong>Add notes:</strong> Include practice notes or why you think the band should learn it</p>
                  <p>• <strong>After suggesting:</strong> You'll be taken to see all song suggestions and can start voting</p>
                </div>
              </div>
            </div>
          </div>

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
                {editableTrack && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Track Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Song Title
                          </label>
                          <input
                            type="text"
                            value={editableTrack.title}
                            onChange={(e) => setEditableTrack({ ...editableTrack, title: e.target.value })}
                            className="input-field w-full"
                            placeholder="Enter song title"
                          />
                          {editableTrack.title !== 'Track from Spotify' && (
                            <p className="text-xs text-green-600 mt-1">✓ Extracted from Spotify</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Artist
                          </label>
                          <input
                            type="text"
                            value={editableTrack.artist}
                            onChange={(e) => setEditableTrack({ ...editableTrack, artist: e.target.value })}
                            className="input-field w-full"
                            placeholder="Enter artist name"
                          />
                          {editableTrack.artist !== 'Artist from Spotify' && (
                            <p className="text-xs text-green-600 mt-1">✓ Extracted from Spotify</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Album (optional)
                          </label>
                          <input
                            type="text"
                            value={editableTrack.album}
                            onChange={(e) => setEditableTrack({ ...editableTrack, album: e.target.value })}
                            className="input-field w-full"
                            placeholder="Enter album name"
                          />
                          {editableTrack.album !== 'Album from Spotify' && (
                            <p className="text-xs text-green-600 mt-1">✓ Extracted from Spotify</p>
                          )}
                        </div>
                        
                        {editableTrack.duration_ms && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Duration
                            </label>
                            <p className="text-gray-600 font-mono">{formatDuration(editableTrack.duration_ms)}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Right Column - Spotify Player & Actions */}
                      <div className="space-y-4">
                        {/* Spotify Player */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preview
                          </label>
                          <SpotifyEmbed 
                            trackId={editableTrack.spotify_track_id} 
                            compact={false}
                            height={80}
                          />
                        </div>
                        
                        {/* External Link */}
                        <div>
                          <a
                            href={editableTrack.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open in Spotify
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSpotifySuggest}
                        disabled={!editableTrack.title.trim() || !editableTrack.artist.trim()}
                        className="btn-primary px-6 py-2"
                      >
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