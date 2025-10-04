import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useSongDetails, useUpdateSong, useRateSong } from '@/hooks/useSongs'
import { useSongComments } from '@/hooks/useComments'
import { Save, Trash2, Music, Clock, User, FileText, Star, MessageCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { StarRating } from '@/components/StarRating'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { Header } from '@/components/Header'
import { CommentList } from '@/components/CommentList'
import { CommentForm } from '@/components/CommentForm'
import { formatDistanceToNow } from 'date-fns'

interface SongEditForm {
  title: string
  artist: string
  album?: string
  duration_ms?: number
  preview_url?: string
  spotify_track_id?: string
  notes?: string
  status?: 'suggested' | 'in_rehearsal' | 'practiced'
  bpm?: number
  musical_key?: string
  vocal_type?: 'male' | 'female' | 'duet' | 'instrumental' | ''
}

export function SongEdit() {
  const { bandId, songId } = useParams<{ bandId: string; songId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: song, isLoading } = useSongDetails(songId!)
  const { data: comments = [], isLoading: commentsLoading } = useSongComments(songId!)
  const updateSong = useUpdateSong()
  const rateSong = useRateSong()
  const [isDeleting, setIsDeleting] = useState(false)
  const [votingOnSong, setVotingOnSong] = useState<boolean>(false)

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
        preview_url: song.preview_url || '',
        spotify_track_id: song.spotify_track_id || '',
        notes: song.notes || '',
        status: song.status || 'suggested',
        bpm: song.bpm || undefined,
        musical_key: song.musical_key || '',
        vocal_type: song.vocal_type || '',
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
          bpm: data.bpm ? Number(data.bpm) : null,
          vocal_type: data.vocal_type === '' ? null : data.vocal_type as 'male' | 'female' | 'duet' | 'instrumental' | null,
        },
      })
      navigate(`/band/${bandId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update song')
    }
  }

  const handleRate = async (rating: number | null) => {
    try {
      setVotingOnSong(true)
      await rateSong.mutateAsync({
        songId: songId!,
        bandId: bandId!,
        rating
      })

      // Invalidate song details to refetch with new rating
      await queryClient.invalidateQueries({ queryKey: ['song-details', songId] })

      toast.success('Rating updated successfully')
    } catch (error) {
      toast.error('Failed to update rating')
    } finally {
      setVotingOnSong(false)
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
      navigate(`/band/${bandId}`)
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
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isDirty && (
          <div className="mb-4 text-center">
            <span className="text-sm text-orange-400">
              You have unsaved changes
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Song Title and Actions */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">{song.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span className="font-medium">Suggested by:</span>
                      <span className="ml-1">{song.suggested_by_user?.display_name || 'Unknown'}</span>
                    </div>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(song.created_at), { addSuffix: true })}</span>
                    {song.duration_ms && (
                      <>
                        <span>•</span>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDuration(song.duration_ms)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 border border-red-500/50 flex items-center disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Song'}
                </button>
              </div>

              {/* Basic Song Info */}
              <div className="space-y-4">
                {song.notes && (
                  <div className="bg-blue-50/50 border border-blue-200/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-300 mb-2">Notes</h3>
                    <p className="text-[var(--color-text)]">{song.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rating Section */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Rate This Song</h3>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <StarRating
                    rating={song.user_rating || null}
                    onRate={handleRate}
                    readonly={votingOnSong}
                    size="lg"
                  />
                  <p className="text-sm text-gray-400 mt-2">Your Rating</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--color-text)]">
                    {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                  </div>
                  <p className="text-sm text-gray-400">
                    {song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center mb-4">
                <MessageCircle className="h-5 w-5 mr-2 text-primary-500" />
                Comments ({comments.length})
              </h3>

              <div className="mb-6">
                <CommentForm songId={songId!} bandId={bandId!} />
              </div>

              {commentsLoading ? (
                <div className="text-center py-4 text-gray-400">Loading comments...</div>
              ) : (
                <CommentList comments={comments} songId={songId!} bandId={bandId!} />
              )}
            </div>

            {/* Edit Form */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] flex items-center mb-6">
                <Music className="h-5 w-5 mr-2 text-primary-500" />
                Edit Song Details
              </h2>

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
                  Album
                </label>
                <input
                  type="text"
                  id="album"
                  {...register('album')}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* BPM */}
              <div>
                <label htmlFor="bpm" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  BPM
                </label>
                <input
                  type="number"
                  id="bpm"
                  {...register('bpm')}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Musical Key */}
              <div>
                <label htmlFor="musical_key" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Musical Key
                </label>
                <input
                  type="text"
                  id="musical_key"
                  {...register('musical_key')}
                  placeholder="e.g., C major, A minor"
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Vocal Type */}
              <div>
                <label htmlFor="vocal_type" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Vocal Type
                </label>
                <select
                  id="vocal_type"
                  {...register('vocal_type')}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select vocal type...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="duet">Duet</option>
                  <option value="instrumental">Instrumental</option>
                </select>
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


            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate(`/band/${bandId}`)}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Spotify Player */}
            {song.spotify_track_id && (
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Listen on Spotify</h3>
                <SpotifyEmbed trackId={song.spotify_track_id} height={352} />
              </div>
            )}

            {/* Song Status */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-secondary)]">Current Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    song.status === 'suggested' ? 'bg-blue-100 text-blue-800' :
                    song.status === 'in_rehearsal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {song.status === 'suggested' ? 'Suggested' :
                     song.status === 'in_rehearsal' ? 'In Rehearsal' :
                     'Practiced'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-secondary)]">Total Ratings</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">{song.total_ratings || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-secondary)]">Average Rating</span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}