import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserBandRole } from '@/hooks/useBands'
import { useSongSuggestions, useRateSong, useRemoveSuggestion } from '@/hooks/useSongs'
import { BandSidebar } from '@/components/BandSidebar'
import { StarRating } from '@/components/StarRating'
import { Header } from '@/components/Header'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'

import { Search, Filter, ExternalLink, Trash2, Clock, ChevronLeft, ChevronRight, User, Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type SortOption = 'newest' | 'votes' | 'alphabetical' | 'your_votes' | 'rating'

export function BandDashboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortOption>('rating')
  const [searchQuery, setSearchQuery] = useState('')
  const [votingOnSong, setVotingOnSong] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  
  const { data: suggestions, refetch } = useSongSuggestions(bandId!, { sortBy })
  const { data: userRole } = useUserBandRole(bandId!)
  const rateSong = useRateSong()
  const removeSuggestion = useRemoveSuggestion()

  const ITEMS_PER_PAGE = 10

  // Cleanup rehearsal songs on page load (silent, once per session)
  // DISABLED - RPC function doesn't exist yet
  // useEffect(() => {
  //   const hasRunCleanup = sessionStorage.getItem('rehearsal-cleanup-run')
  //   if (!hasRunCleanup && bandId) {
  //     cleanupRehearsalSongs.mutateAsync()
  //       .then(() => {
  //         sessionStorage.setItem('rehearsal-cleanup-run', 'true')
  //       })
  //       .catch(() => {
  //         // Silent failure - don't annoy users with errors
  //       })
  //   }
  // }, [bandId, cleanupRehearsalSongs])

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
      // Error handling is done by the rateSong hook via toast
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

  const filteredSuggestions = suggestions?.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case 'votes': {
        // Sort by average rating first, then by total ratings for tie-breaking
        const avgRatingDiff = (b.average_rating || 0) - (a.average_rating || 0)
        if (Math.abs(avgRatingDiff) > 0.1) return avgRatingDiff
        return (b.total_ratings || 0) - (a.total_ratings || 0)
      }
      case 'alphabetical':
        return a.title.localeCompare(b.title)
      case 'your_votes': {
        // Sort by user's rating (highest first), then by average rating
        const userRatingDiff = (b.user_rating || 0) - (a.user_rating || 0)
        if (userRatingDiff !== 0) return userRatingDiff
        return (b.average_rating || 0) - (a.average_rating || 0)
      }
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const totalPages = Math.ceil(sortedSuggestions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentSuggestions = sortedSuggestions.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search and Filter */}
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Search songs..."
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" style={{ color: 'var(--color-text-secondary)' }} />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="select-field"
                    >
                      <option value="rating">Highest Rated</option>
                      <option value="newest">Newest First</option>
                      <option value="votes">Most Voted</option>
                      <option value="alphabetical">Alphabetical</option>
                      <option value="your_votes">Your Most Voted</option>
                    </select>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {sortedSuggestions.length} songs
                  </span>
                </div>
              </div>
            </div>

            {/* Current Leaderboard Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Current Leaderboard</h2>
              <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Showing {startIndex + 1}-{Math.min(endIndex, sortedSuggestions.length)} of {sortedSuggestions.length} songs
              </div>
            </div>

            {/* Songs list */}
            {currentSuggestions.length > 0 ? (
              <div className="space-y-4">
                {currentSuggestions.map((song, index) => {
                  const position = startIndex + index + 1
                  return (
                    <div
                      key={song.id}
                      className="card hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/band/${bandId}/song/${song.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          {/* Ranking Position */}
                          <div className="mr-4 flex-shrink-0">
                            {position === 1 ? (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--color-accent)' }}>
                                🥇
                              </div>
                            ) : position === 2 ? (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                                🥈
                              </div>
                            ) : position === 3 ? (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-accent)' }}>
                                🥉
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'rgba(10, 132, 255, 0.15)', color: 'var(--color-primary)' }}>
                                {position}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Song Title */}
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{song.title}</h3>
                            </div>
                            
                            {/* Song Metadata */}
                            <div className="flex items-center mt-2 space-x-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              <div className="flex items-center font-medium">
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
                                    className="flex items-center transition-colors"
                                    style={{ color: 'var(--color-primary)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-secondary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Spotify
                                  </a>
                                </>
                              )}
                            </div>
                            
                            {/* Notes */}
                            {song.notes && (
                              <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', color: 'var(--color-primary)' }}>
                                <strong>Note:</strong> {song.notes}
                              </div>
                            )}

                            {/* Spotify Embed */}
                            {song.spotify_track_id && (
                              <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                                <SpotifyEmbed 
                                  trackId={song.spotify_track_id} 
                                  compact={true}
                                  height={80}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons - Right Side */}
                        <div className="flex items-center ml-4 space-x-4">
                          {/* Star Rating */}
                          <div className="flex flex-col items-center space-y-2" onClick={(e) => e.stopPropagation()}>
                            <StarRating
                              rating={song.user_rating || null}
                              onRate={(rating) => handleRate(song.id, rating)}
                              readonly={votingOnSong === song.id}
                              size="md"
                            />
                            
                            {/* Rating Info */}
                            <div className="text-center">
                              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                                {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                {song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>

                          {/* Admin controls */}
                          {userRole === 'admin' && (
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => navigate(`/band/${bandId}/song/${song.id}`)}
                                className="p-3 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-primary-500/10 hover:text-primary-400 border border-[var(--color-border)]"
                                title="View/edit song details (Admin only)"
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
                  )
                })}
              </div>
            ) : (
              <div className="card text-center py-12">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                    <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text)' }}>No songs found</h3>
                    <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                      No songs match your search "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="font-medium transition-colors"
                      style={{ color: 'var(--color-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                    <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text)' }}>No songs suggested yet</h3>
                    <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                    }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className="px-3 py-2 text-sm rounded-lg transition-colors"
                      style={currentPage === page ? {
                        backgroundColor: 'var(--color-primary)',
                        color: 'white'
                      } : {
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                        }
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ 
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                    }
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
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