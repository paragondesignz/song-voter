import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSongSuggestions, useVoteSong, useRemoveSuggestion, useVoteRateLimit } from '@/hooks/useSongs'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { 
  ArrowLeft, 
  Music, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  Filter,
  Search,
  Plus,
  User,
  ExternalLink,
  Trash2,
  BarChart3,
  Timer
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type SortOption = 'newest' | 'votes' | 'alphabetical' | 'trending'

export function Suggestions() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: band } = useBand(bandId!)
  const { data: suggestions, isLoading } = useSongSuggestions(bandId!, { sortBy })
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: rateLimit } = useVoteRateLimit(bandId!)
  const voteSong = useVoteSong()
  const removeSuggestion = useRemoveSuggestion()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleVote = async (songId: string, currentVote: 'upvote' | 'downvote' | null, newVoteType: 'upvote' | 'downvote') => {
    if (rateLimit && rateLimit.votesRemaining <= 0) {
      return // Don't allow voting if rate limit exceeded
    }

    // If clicking the same vote type, remove the vote; otherwise set the new vote type
    const voteType = currentVote === newVoteType ? null : newVoteType

    await voteSong.mutateAsync({
      songId,
      bandId: bandId!,
      voteType
    })
  }

  const handleRemoveSuggestion = async (suggestionId: string) => {
    if (window.confirm('Are you sure you want to remove this suggestion? This action cannot be undone.')) {
      await removeSuggestion.mutateAsync({
        suggestionId,
        bandId: bandId!
      })
    }
  }

  const filteredSuggestions = suggestions?.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return (b.vote_count || 0) - (a.vote_count || 0)
      case 'alphabetical':
        return a.title.localeCompare(b.title)
      case 'trending':
        return (b.vote_count || 0) - (a.vote_count || 0)
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
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
                <h1 className="text-lg font-semibold text-gray-900">Song Suggestions</h1>
                <p className="text-xs text-gray-500">{band?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Rate Limit Indicator */}
              {rateLimit && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <Timer className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {rateLimit.votesRemaining} votes left
                  </span>
                </div>
              )}
              
              {/* Analytics Button */}
              <button
                onClick={() => navigate(`/band/${bandId}/voting-analytics`)}
                className="btn-secondary text-sm"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </button>
              
              {/* Suggest Song Button */}
              <button
                onClick={() => navigate(`/band/${bandId}/search`)}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Suggest Song
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Filters and search */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Search songs, artists, albums..."
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 text-gray-500 mr-2" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="votes">Most Voted</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="trending">Trending</option>
                  </select>
                </div>
                <span className="text-sm text-gray-500">
                  {sortedSuggestions.length} songs
                </span>
              </div>
            </div>
          </div>

          {/* Songs list */}
          {sortedSuggestions.length > 0 ? (
            <div className="space-y-4">
              {sortedSuggestions.map((song) => (
                <div key={song.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      {song.album_art_url ? (
                        <img
                          src={song.album_art_url}
                          alt={song.album || 'Album art'}
                          className="w-16 h-16 rounded-md mr-4 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-300 rounded-md mr-4 flex-shrink-0 flex items-center justify-center">
                          <Music className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{song.title}</h3>
                        </div>
                        <p className="text-gray-600 truncate">{song.artist}</p>
                        {song.album && (
                          <p className="text-sm text-gray-500 truncate">{song.album}</p>
                        )}
                        
                        <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {song.suggested_by_user?.display_name}
                          </div>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(song.created_at), { addSuffix: true })}</span>
                          
                          {song.duration_ms && (
                            <>
                              <span>•</span>
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDuration(song.duration_ms)}
                              </div>
                            </>
                          )}
                          
                          
                          {song.spotify_track_id && (
                            <>
                              <span>•</span>
                              <a
                                href={`https://open.spotify.com/track/${song.spotify_track_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 flex items-center"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Spotify
                              </a>
                            </>
                          )}
                        </div>
                        
                        {song.notes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                            <strong>Note:</strong> {song.notes}
                          </div>
                        )}

                        {/* Spotify Embed */}
                        {song.spotify_track_id && (
                          <div className="mt-4">
                            <SpotifyEmbed trackId={song.spotify_track_id} compact={true} height={80} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center ml-4 space-x-2">
                      {/* Vote buttons */}
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-1">
                          {/* Upvote button */}
                          <button
                            onClick={() => handleVote(song.id, song.user_voted || null, 'upvote')}
                            disabled={voteSong.isPending || Boolean(rateLimit && rateLimit.votesRemaining <= 0)}
                            className={`p-2 rounded-full transition-colors ${
                              song.user_voted === 'upvote'
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${
                              (rateLimit && rateLimit.votesRemaining <= 0)
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                            title={
                              (rateLimit && rateLimit.votesRemaining <= 0)
                                ? "You've reached your voting limit for this hour"
                                : song.user_voted === 'upvote'
                                ? "Remove your upvote"
                                : "Upvote this song"
                            }
                          >
                            <ThumbsUp className={`w-4 h-4 ${song.user_voted === 'upvote' ? 'fill-current' : ''}`} />
                          </button>
                          <span className="text-xs font-medium text-green-600">
                            {song.upvote_count || 0}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Downvote button */}
                          <button
                            onClick={() => handleVote(song.id, song.user_voted || null, 'downvote')}
                            disabled={voteSong.isPending || Boolean(rateLimit && rateLimit.votesRemaining <= 0)}
                            className={`p-2 rounded-full transition-colors ${
                              song.user_voted === 'downvote'
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${
                              (rateLimit && rateLimit.votesRemaining <= 0)
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                            title={
                              (rateLimit && rateLimit.votesRemaining <= 0)
                                ? "You've reached your voting limit for this hour"
                                : song.user_voted === 'downvote'
                                ? "Remove your downvote"
                                : "Downvote this song"
                            }
                          >
                            <ThumbsDown className={`w-4 h-4 ${song.user_voted === 'downvote' ? 'fill-current' : ''}`} />
                          </button>
                          <span className="text-xs font-medium text-red-600">
                            {song.downvote_count || 0}
                          </span>
                        </div>
                        
                        {/* Net score */}
                        <div className="text-center">
                          <span className={`text-sm font-bold ${
                            (song.vote_count || 0) > 0 
                              ? 'text-green-600' 
                              : (song.vote_count || 0) < 0 
                              ? 'text-red-600' 
                              : 'text-gray-600'
                          }`}>
                            {(song.vote_count || 0) > 0 ? '+' : ''}{song.vote_count || 0}
                          </span>
                          <div className="text-xs text-gray-500">net</div>
                        </div>
                      </div>

                      {/* Admin remove button */}
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleRemoveSuggestion(song.id)}
                          disabled={removeSuggestion.isPending}
                          className="p-3 rounded-full transition-colors bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600"
                          title="Remove suggestion (Admin only)"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No songs found</h3>
                  <p className="text-gray-600 mb-4">
                    No songs match your search "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No songs suggested yet</h3>
                  <p className="text-gray-600 mb-6">
                    Be the first to suggest a song for your band to practice!
                  </p>
                  <button
                    onClick={() => navigate(`/band/${bandId}/search`)}
                    className="btn-primary"
                  >
                    Suggest a Song
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}