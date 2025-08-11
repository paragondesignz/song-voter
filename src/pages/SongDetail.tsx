import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { useSongSuggestions } from '@/hooks/useSongs'
import { Header } from '@/components/Header'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { StarRating } from '@/components/StarRating'
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Music,
  User,
  MessageSquare
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function SongDetail() {
  const { bandId, songId } = useParams<{ bandId: string; songId: string }>()
  const navigate = useNavigate()
  const [showDiscussionForm, setShowDiscussionForm] = useState(false)
  const [discussionContent, setDiscussionContent] = useState('')
  
  const { data: band } = useBand(bandId!)
  const { data: suggestions } = useSongSuggestions(bandId!)
  
  const song = suggestions?.find(s => s.id === songId)

  useEffect(() => {
    if (suggestions && !song) {
      // Song not found, redirect back
      navigate(`/band/${bandId}/suggestions`)
    }
  }, [suggestions, song, bandId, navigate])

  if (!song) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading song details...</p>
          </div>
        </main>
      </div>
    )
  }

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleBackClick = () => {
    navigate(`/band/${bandId}/suggestions`)
  }

  const handleDiscussionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (discussionContent.trim()) {
      // TODO: Implement discussion submission
      console.log('Submitting discussion:', discussionContent)
      setDiscussionContent('')
      setShowDiscussionForm(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button and Page Title */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Suggestions
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{song.title}</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Song Information Card */}
            <div className="card">
              <div className="flex items-start space-x-6">
                {/* Album Art */}
                <div className="flex-shrink-0">
                  {song.album_art_url ? (
                    <img
                      src={song.album_art_url}
                      alt={`Album art for ${song.title}`}
                      className="w-32 h-32 rounded-lg object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Music className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Song Details */}
                <div className="flex-1 min-w-0">
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{song.title}</h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {song.duration_ms && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDuration(song.duration_ms)}
                          </div>
                        )}
                        {song.spotify_track_id && (
                          <a
                            href={`https://open.spotify.com/track/${song.spotify_track_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-green-600 hover:text-green-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open in Spotify
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">BPM</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {song.bpm || '—'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Key</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {song.musical_key || '—'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vocal Type</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {song.vocal_type ? song.vocal_type.charAt(0).toUpperCase() + song.vocal_type.slice(1) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {song.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">Notes</h3>
                        <p className="text-blue-900">{song.notes}</p>
                      </div>
                    )}

                    {/* Suggested By */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Suggested by {song.suggested_by_user?.display_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(song.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spotify Player */}
            {song.spotify_track_id && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Listen to Song</h3>
                <SpotifyEmbed trackId={song.spotify_track_id} height={152} />
              </div>
            )}

            {/* Rating Section */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate This Song</h3>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <StarRating
                    rating={song.user_rating || null}
                    onRate={(rating) => {
                      // TODO: Implement rating functionality
                      console.log('Rating song:', rating)
                    }}
                    size="lg"
                  />
                  <p className="text-sm text-gray-600 mt-2">Your Rating</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Discussion Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Discussion</h3>
                <button
                  onClick={() => setShowDiscussionForm(!showDiscussionForm)}
                  className="btn-primary text-sm flex items-center"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </button>
              </div>

              {/* Discussion Form */}
              {showDiscussionForm && (
                <form onSubmit={handleDiscussionSubmit} className="mb-6">
                  <textarea
                    value={discussionContent}
                    onChange={(e) => setDiscussionContent(e.target.value)}
                    placeholder="Share your thoughts about this song..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-600"
                    rows={4}
                    required
                  />
                  <div className="flex justify-end space-x-3 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowDiscussionForm(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-sm"
                      disabled={!discussionContent.trim()}
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
              )}

              {/* Discussion List */}
              <div className="space-y-4">
                {/* TODO: Implement discussion display */}
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/band/${bandId}/suggestions`)}
                  className="w-full btn-secondary text-sm flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Suggestions
                </button>
                {song.spotify_track_id && (
                  <a
                    href={`https://open.spotify.com/track/${song.spotify_track_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-primary text-sm flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Spotify
                  </a>
                )}
              </div>
            </div>

            {/* Song Status */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Status</span>
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
                  <span className="text-sm text-gray-600">Total Ratings</span>
                  <span className="text-sm font-medium text-gray-900">{song.total_ratings || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Rating</span>
                  <span className="text-sm font-medium text-gray-900">
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
