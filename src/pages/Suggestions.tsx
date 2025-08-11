import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useUserBandRole, useBandMembers } from '@/hooks/useBands'
import { useSongSuggestions, useRateSong, useRemoveSuggestion, useUpdateSongSuggester } from '@/hooks/useSongs'
import { Header } from '@/components/Header'
import { StarRating } from '@/components/StarRating'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { BandSidebar } from '@/components/BandSidebar'
import { 
  Clock,
  ExternalLink,
  Filter,
  Edit,
  Trash2,
  Music,
  Search,
  User
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type SortOption = 'newest' | 'votes' | 'alphabetical' | 'trending'

export function Suggestions() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [votingOnSong, setVotingOnSong] = useState<string | null>(null)
  const [editingSuggester, setEditingSuggester] = useState<string | null>(null)
  const [selectedNewSuggester, setSelectedNewSuggester] = useState<string>('')
  
  const { data: band } = useBand(bandId!)
  const { data: suggestions, isLoading, refetch } = useSongSuggestions(bandId!, { sortBy })
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: bandMembers } = useBandMembers(bandId!)
  const rateSong = useRateSong()
  const removeSuggestion = useRemoveSuggestion()
  const updateSongSuggester = useUpdateSongSuggester()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleRate = async (songId: string, rating: number | null) => {
    try {
      setVotingOnSong(songId)

      await rateSong.mutateAsync({
        songId,
        bandId: bandId!,
        rating
      })
      
      // Refetch to get updated ratings
      await refetch()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Rating error:', error)
    } finally {
      setVotingOnSong(null)
    }
  }

  const handleRemoveSuggestion = async (suggestionId: string) => {
    if (window.confirm('Are you sure you want to remove this suggestion? This action cannot be undone.')) {
      await removeSuggestion.mutateAsync({
        suggestionId,
        bandId: bandId!
      })
    }
  }

  const handleUpdateSuggester = async (songId: string) => {
    if (!selectedNewSuggester) return
    
    await updateSongSuggester.mutateAsync({
      songId,
      newSuggesterId: selectedNewSuggester
    })
    
    setEditingSuggester(null)
    setSelectedNewSuggester('')
    await refetch()
  }

  const startEditingSuggester = (songId: string, currentSuggesterId: string) => {
    setEditingSuggester(songId)
    setSelectedNewSuggester(currentSuggesterId)
  }

  const filteredSuggestions = suggestions?.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return (b.total_ratings || 0) - (a.total_ratings || 0)
      case 'alphabetical':
        return a.title.localeCompare(b.title)
      case 'trending':
        return (b.total_ratings || 0) - (a.total_ratings || 0)
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
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Song Suggestions</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Instructions */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">How to manage song suggestions</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>• <strong>Rate songs:</strong> Click the star rating (⭐) to vote on songs you want to practice</p>
                    <p>• <strong>Search suggestions:</strong> Use the search bar to find specific songs quickly</p>
                    <p>• <strong>Sort options:</strong> View songs by newest, most voted, alphabetical, or trending</p>
                    <p>• <strong>Edit suggester:</strong> Admins can change who suggested a song if needed</p>
                    <p>• <strong>Remove songs:</strong> Delete inappropriate or duplicate suggestions (admin only)</p>
                    <p>• <strong>View details:</strong> See song info, previews, and who suggested each track</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
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
                      className="select-field"
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

            {/* Edit Suggester Modal */}
            {editingSuggester && (
               <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 max-w-md w-full mx-4 text-[var(--color-text)]">
                  <h3 className="text-lg font-semibold mb-4">Change Song Suggester</h3>
                  <p className="text-gray-400 mb-4 text-sm">
                    Select who should be credited as the suggester for this song:
                  </p>
                  <select
                    value={selectedNewSuggester}
                    onChange={(e) => setSelectedNewSuggester(e.target.value)}
                    className="select-field w-full mb-4"
                  >
                    <option value="">Select a band member...</option>
                    {bandMembers?.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.user?.display_name} ({member.role})
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setEditingSuggester(null)
                        setSelectedNewSuggester('')
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateSuggester(editingSuggester)}
                      disabled={!selectedNewSuggester || updateSongSuggester.isPending}
                      className="btn-primary"
                    >
                      {updateSongSuggester.isPending ? 'Updating...' : 'Update Suggester'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Songs list */}
            {sortedSuggestions.length > 0 ? (
              <div className="space-y-4">
                {sortedSuggestions.map((song) => (
                  <div key={song.id} className="card hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{song.title}</h3>
                          </div>
                          <p className="text-gray-600 truncate">{song.artist}</p>
                          {song.album && (
                            <p className="text-sm text-gray-500 truncate">{song.album}</p>
                          )}
                          
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                            <div className="flex items-center font-medium text-gray-600">
                              <User className="w-3 h-3 mr-1" />
                              Added by: {song.suggested_by_user?.display_name}
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

                          {/* Spotify Controls - Compact */}
                          {song.spotify_track_id && (
                            <div className="mt-4">
                              <SpotifyEmbed 
                                trackId={song.spotify_track_id} 
                                compact={true}
                                height={80}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center ml-4 space-x-4">
                        {/* Star Rating */}
                        <div className="flex flex-col items-center space-y-2">
                          <StarRating
                            rating={song.user_rating || null}
                            onRate={(rating) => handleRate(song.id, rating)}
                            readonly={votingOnSong === song.id}
                            size="md"
                          />
                          
                          {/* Rating Info */}
                          <div className="text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Admin controls */}
                        {userRole === 'admin' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => startEditingSuggester(song.id, song.suggested_by)}
                              className="p-3 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
                              title="Change who suggested this song (Admin only)"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRemoveSuggestion(song.id)}
                              disabled={removeSuggestion.isPending}
                              className="p-3 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--color-border)]"
                              title="Remove suggestion (Admin only)"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
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

          {/* Sidebar */}
          <div>
            <BandSidebar bandId={bandId!} />
          </div>
        </div>
      </main>
    </div>
  )
}