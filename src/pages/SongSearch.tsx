import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSpotifyEmbed } from '@/hooks/useSpotify'
import { useSuggestSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import {
  Music,
  Search,
  Loader2,
  Check,
  X
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
  const [editableTrack, setEditableTrack] = useState<{
    title: string
    artist: string
    album: string
    spotify_track_id: string | null
    duration_ms: number | null
    album_art_url: string | null
    preview_url: string | null
  } | null>(null)

  const { data: band } = useBand(bandId!)
  const { isLoading, error, handleUrlSubmit } = useSpotifyEmbed()
  const suggestSong = useSuggestSong()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ManualSongForm>()

  const fetchSpotifyData = async () => {
    if (!spotifyUrl.trim()) return

    try {
      const data = await handleUrlSubmit(spotifyUrl)
      if (data) {
        setEditableTrack({
          title: data.title,
          artist: data.artist,
          album: data.album,
          spotify_track_id: data.spotify_track_id,
          duration_ms: data.duration_ms,
          album_art_url: data.album_art_url,
          preview_url: data.preview_url
        })
      }
    } catch (err) {
      // Error already handled by useSpotifyEmbed hook
    }
  }

  const handleManualSubmit = async (data: ManualSongForm) => {
    try {
      await suggestSong.mutateAsync({
        bandId: bandId!,
        track: {
          title: data.title,
          artist: data.artist,
          album: data.album
        },
        notes: data.notes,
      })

      reset()
      setShowManualForm(false)
      navigate(`/band/${bandId}`)
    } catch (error) {
      // Error handling is done by the useSuggestSong hook via toast
    }
  }

  const confirmSpotifyTrack = async () => {
    if (!editableTrack) return

    try {
      await suggestSong.mutateAsync({
        bandId: bandId!,
        track: {
          spotify_track_id: editableTrack.spotify_track_id!,
          title: editableTrack.title,
          artist: editableTrack.artist,
          album: editableTrack.album,
          duration_ms: editableTrack.duration_ms,
          album_art_url: editableTrack.album_art_url,
          preview_url: editableTrack.preview_url,
          external_url: `https://open.spotify.com/track/${editableTrack.spotify_track_id}`,
          popularity: 0
        },
        notes: '',
      })

      setEditableTrack(null)
      setSpotifyUrl('')
      navigate(`/band/${bandId}`)
    } catch (error) {
      // Error handling is done by the useSuggestSong hook via toast
    }
  }

  const cancelSpotifyTrack = () => {
    setEditableTrack(null)
    setSpotifyUrl('')
  }

  return (
    <div className="min-h-screen theme-bg">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Suggest a Song for {band?.name}
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Add a song to your band's suggestion list for voting
          </p>
        </div>

        {/* Main Options */}
        <div className="space-y-6">
          {/* Spotify URL Search */}
          {!showManualForm && (
            <div className="card">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Add from Spotify
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Paste a Spotify song, album, or artist URL to get song details automatically
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="Paste Spotify URL here..."
                    className="input-field"
                    onKeyPress={(e) => e.key === 'Enter' && fetchSpotifyData()}
                  />
                </div>
                <button
                  onClick={fetchSpotifyData}
                  disabled={!spotifyUrl.trim() || isLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!showManualForm && (
            <div className="flex gap-4">
              <button
                onClick={() => setShowManualForm(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Music className="h-4 w-4" />
                Add Manually
              </button>
            </div>
          )}

          {/* Manual Form */}
          {showManualForm && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Add Song Manually</h2>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleManualSubmit)} className="space-y-4">
                <div>
                  <label className="label" htmlFor="title">Song Title *</label>
                  <input
                    {...register('title', { required: 'Song title is required' })}
                    type="text"
                    id="title"
                    className="input-field"
                    placeholder="Enter song title"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="artist">Artist *</label>
                  <input
                    {...register('artist', { required: 'Artist is required' })}
                    type="text"
                    id="artist"
                    className="input-field"
                    placeholder="Enter artist name"
                  />
                  {errors.artist && (
                    <p className="text-sm text-red-600 mt-1">{errors.artist.message}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="notes">Notes</label>
                  <textarea
                    {...register('notes')}
                    id="notes"
                    rows={3}
                    className="input-field"
                    placeholder="Add any notes about this song (optional)"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={suggestSong.isPending}
                    className="btn-primary flex items-center gap-2"
                  >
                    {suggestSong.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Add Song
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Spotify Track Confirmation */}
          {editableTrack && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                Confirm Song Details
              </h3>
              <div>
                <div className="flex-1">
                  <div className="space-y-3">
                    <div>
                      <label className="label">Title</label>
                      <input
                        type="text"
                        value={editableTrack.title}
                        onChange={(e) => setEditableTrack({ ...editableTrack, title: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">Artist</label>
                      <input
                        type="text"
                        value={editableTrack.artist}
                        onChange={(e) => setEditableTrack({ ...editableTrack, artist: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={confirmSpotifyTrack}
                  disabled={suggestSong.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {suggestSong.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Add Song
                </button>
                <button
                  onClick={cancelSpotifyTrack}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}