import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSongSuggestions, useVoteSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { useAuth } from '@/context/AuthContext'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { 
  ArrowLeft, 
  Music, 
  Heart, 
  Clock, 
  Filter,
  Search,
  Plus,
  User,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type SortOption = 'newest' | 'votes' | 'alphabetical' | 'trending'

export function Suggestions() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: band } = useBand(bandId!)
  const { data: suggestions, isLoading } = useSongSuggestions(bandId!, { sortBy })
  const voteSong = useVoteSong()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleVote = async (songId: string, isCurrentlyVoted: boolean) => {
    await voteSong.mutateAsync({
      songId,
      bandId: bandId!,
      isVoting: !isCurrentlyVoted
    })
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
            <button
              onClick={() => navigate(`/band/${bandId}/search`)}
              className="btn-primary text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Suggest Song
            </button>
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

                    {/* Vote button */}
                    <div className="flex flex-col items-center ml-4">
                      <button
                        onClick={() => handleVote(song.id, song.user_voted || false)}
                        disabled={song.suggested_by === user?.id || voteSong.isPending}
                        className={`p-3 rounded-full transition-colors ${
                          song.user_voted
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } ${
                          song.suggested_by === user?.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        title={song.suggested_by === user?.id ? "Can't vote on your own suggestion" : "Vote for this song"}
                      >
                        <Heart className={`w-5 h-5 ${song.user_voted ? 'fill-current' : ''}`} />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 mt-1">
                        {song.vote_count || 0}
                      </span>
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