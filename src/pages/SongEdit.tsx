import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSongDetails, useUpdateSong } from '@/hooks/useSongs'
import { ArrowLeft, Save, Trash2, Music, Clock, Album, User, Link, FileText, Star } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface SongEditForm {
  title: string
  artist: string
  album?: string
  duration_ms?: number
  album_art_url?: string
  preview_url?: string
  spotify_track_id?: string
  notes?: string
  status?: 'suggested' | 'in_rehearsal' | 'practiced'
}

export function SongEdit() {
  const { bandId, songId } = useParams<{ bandId: string; songId: string }>()
  const navigate = useNavigate()
  const { data: song, isLoading } = useSongDetails(songId!)
  const updateSong = useUpdateSong()
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SongEditForm>()

  useEffect(() => {
    if (song) {
      reset({
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        duration_ms: song.duration_ms || undefined,
        album_art_url: song.album_art_url || '',
        preview_url: song.preview_url || '',
        spotify_track_id: song.spotify_track_id || '',
        notes: song.notes || '',
        status: song.status || 'suggested',
      })
    }
  }, [song, reset])

  const onSubmit = async (data: SongEditForm) => {
    try {
      await updateSong.mutateAsync({
        songId: songId!,
        bandId: bandId!,
        updates: {
          ...data,
          duration_ms: data.duration_ms ? Number(data.duration_ms) : null,
        },
      })
      toast.success('Song updated successfully')
      navigate(`/band/${bandId}/dashboard`)
    } catch (error) {
      toast.error('Failed to update song')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this song? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      // We'll use the existing removeSuggestion mutation
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('song_suggestions')
        .delete()
        .eq('id', songId)

      if (error) throw error

      toast.success('Song deleted successfully')
      navigate(`/band/${bandId}/dashboard`)
    } catch (error) {
      toast.error('Failed to delete song')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const parseDuration = (str: string) => {
    const parts = str.split(':')
    if (parts.length !== 2) return undefined
    const minutes = parseInt(parts[0])
    const seconds = parseInt(parts[1])
    if (isNaN(minutes) || isNaN(seconds)) return undefined
    return (minutes * 60 + seconds) * 1000
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading song details...</div>
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Song not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(`/band/${bandId}/dashboard`)}
              className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>

            {isDirty && (
              <span className="text-sm text-orange-400">
                You have unsaved changes
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center">
              <Music className="h-6 w-6 mr-2 text-primary-500" />
              Edit Song Details
            </h1>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 border border-red-500/50 flex items-center disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Song'}
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Song Title *
                </label>
                <input
                  type="text"
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
                )}
              </div>

              {/* Artist */}
              <div>
                <label htmlFor="artist" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Artist *
                </label>
                <input
                  type="text"
                  id="artist"
                  {...register('artist', { required: 'Artist is required' })}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.artist && (
                  <p className="mt-1 text-sm text-red-400">{errors.artist.message}</p>
                )}
              </div>

              {/* Album */}
              <div>
                <label htmlFor="album" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  <Album className="h-4 w-4 inline mr-1" />
                  Album
                </label>
                <input
                  type="text"
                  id="album"
                  {...register('album')}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Duration (mm:ss)
                </label>
                <input
                  type="text"
                  id="duration"
                  placeholder="3:45"
                  defaultValue={formatDuration(song.duration_ms || undefined)}
                  onChange={(e) => {
                    const ms = parseDuration(e.target.value)
                    if (ms) {
                      register('duration_ms').onChange({ target: { value: ms } })
                    }
                  }}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  <Star className="h-4 w-4 inline mr-1" />
                  Status
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="suggested">Suggested</option>
                  <option value="in_rehearsal">In Rehearsal</option>
                  <option value="practiced">Practiced</option>
                </select>
              </div>

              {/* Spotify Track ID */}
              <div>
                <label htmlFor="spotify_track_id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  <Music className="h-4 w-4 inline mr-1" />
                  Spotify Track ID or URL
                </label>
                <input
                  type="text"
                  id="spotify_track_id"
                  {...register('spotify_track_id', {
                    setValueAs: (value) => {
                      if (!value) return value
                      // Extract track ID from URL if it's a full URL
                      const urlMatch = value.match(/track\/([a-zA-Z0-9]{22})/)
                      return urlMatch ? urlMatch[1] : value
                    }
                  })}
                  placeholder="e.g., 3n3Ppam7vgaVa1iaRUc9Lp or https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp"
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Album Art URL */}
            <div>
              <label htmlFor="album_art_url" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                <Link className="h-4 w-4 inline mr-1" />
                Album Art URL
              </label>
              <input
                type="url"
                id="album_art_url"
                {...register('album_art_url')}
                placeholder="https://example.com/album-art.jpg"
                className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Preview URL */}
            <div>
              <label htmlFor="preview_url" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                <Link className="h-4 w-4 inline mr-1" />
                Preview URL (30-second audio preview)
              </label>
              <input
                type="url"
                id="preview_url"
                {...register('preview_url')}
                placeholder="https://example.com/preview.mp3"
                className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                <FileText className="h-4 w-4 inline mr-1" />
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                {...register('notes')}
                placeholder="Add any notes about this song..."
                className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Album Art Preview */}
            {song.album_art_url && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Current Album Art
                </label>
                <img
                  src={song.album_art_url}
                  alt={`${song.title} album art`}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--color-text-secondary)]">
                <div>
                  <User className="h-4 w-4 inline mr-1" />
                  Suggested by: {song.suggested_by || 'Unknown'}
                </div>
                <div>
                  Created: {new Date(song.created_at).toLocaleDateString()}
                </div>
                {song.average_rating && (
                  <div>
                    <Star className="h-4 w-4 inline mr-1" />
                    Average Rating: {song.average_rating.toFixed(1)} ({song.total_ratings} ratings)
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(`/band/${bandId}/dashboard`)}
                className="px-6 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-surface-2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateSong.isPending || !isDirty}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSong.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}