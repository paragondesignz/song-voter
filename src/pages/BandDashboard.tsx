import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { useSongSuggestions, useRateSong, useCleanupRehearsalSongs, useRemoveSuggestion } from '@/hooks/useSongs'
import { BandSidebar } from '@/components/BandSidebar'
import { StarRating } from '@/components/StarRating'
import { Header } from '@/components/Header'
import { useSpotifyPlayer } from '@/context/SpotifyPlayerContext'

import { Search, Trophy, Filter, ExternalLink, Trash2, Edit, Clock, ChevronLeft, ChevronRight, Bot, Play, Pause, Volume2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type SortOption = 'newest' | 'votes' | 'alphabetical' | 'your_votes'

export function BandDashboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [votingOnSong, setVotingOnSong] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [localVolumes, setLocalVolumes] = useState<{ [key: string]: number }>({})
  
  const { data: band } = useBand(bandId!)
  const { data: suggestions, refetch } = useSongSuggestions(bandId!, { sortBy })
  const { data: userRole } = useUserBandRole(bandId!)
  const rateSong = useRateSong()
  const removeSuggestion = useRemoveSuggestion()
  const cleanupRehearsalSongs = useCleanupRehearsalSongs()
  const spotifyPlayer = useSpotifyPlayer()

  const ITEMS_PER_PAGE = 10

  // Cleanup rehearsal songs on page load (silent, once per session)
  useEffect(() => {
    const hasRunCleanup = sessionStorage.getItem('rehearsal-cleanup-run')
    if (!hasRunCleanup && bandId) {
      cleanupRehearsalSongs.mutateAsync()
        .then(() => {
          sessionStorage.setItem('rehearsal-cleanup-run', 'true')
        })
        .catch(() => {
          // Silent failure - don't annoy users with errors
        })
    }
  }, [bandId, cleanupRehearsalSongs])

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

  const startEditingSuggester = () => {
    // Function kept for potential future use
  }

  const filteredSuggestions = suggestions?.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        // Sort by average rating first, then by total ratings for tie-breaking
        const avgRatingDiff = (b.average_rating || 0) - (a.average_rating || 0)
        if (Math.abs(avgRatingDiff) > 0.1) return avgRatingDiff
        return (b.total_ratings || 0) - (a.total_ratings || 0)
      case 'alphabetical':
        return a.title.localeCompare(b.title)
      case 'your_votes':
        // Sort by user's rating (highest first), then by average rating
        const userRatingDiff = (b.user_rating || 0) - (a.user_rating || 0)
        if (userRatingDiff !== 0) return userRatingDiff
        return (b.average_rating || 0) - (a.average_rating || 0)
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedSuggestions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentSuggestions = sortedSuggestions.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  if (!band) {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">


            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/band/${bandId}/search`)}
                className="card hover:shadow-lg transition-shadow p-6 text-center"
              >
                <Search className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">Search Songs</h3>
                <p className="text-sm text-gray-500 mt-1">Find and suggest new songs</p>
              </button>
              
              <button
                onClick={() => navigate(`/band/${bandId}/ai-finder`)}
                className="card hover:shadow-lg transition-shadow p-6 text-center"
              >
                <Bot className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">AI Song Detail Finder</h3>
                <p className="text-sm text-gray-500 mt-1">YOUR AI MUSICOLOGIST</p>
              </button>
              
              <button
                onClick={() => navigate(`/band/${bandId}/leaderboard`)}
                className="card hover:shadow-lg transition-shadow p-6 text-center"
              >
                <Trophy className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">Leaderboard</h3>
                <p className="text-sm text-gray-500 mt-1">See most popular songs</p>
              </button>
            </div>

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
                    placeholder="Search songs..."
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

            {/* Current Leaderboard Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Current Leaderboard</h2>
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedSuggestions.length)} of {sortedSuggestions.length} songs
              </div>
            </div>

            {/* Songs list */}
            {currentSuggestions.length > 0 ? (
              <div className="space-y-2">
                {currentSuggestions.map((song, index) => {
                  const position = startIndex + index + 1
                  return (
                    <div
                      key={song.id}
                      className="card border-2 border-[var(--color-border)] transition-all hover:shadow-lg p-3 cursor-pointer"
                      onClick={() => navigate(`/band/${bandId}/song/${song.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="mr-4">
                            {position === 1 ? (
                              <div className="relative">
                                <div className="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center font-bold text-xs">
                                  🥇
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-yellow-600 text-xs">v</div>
                              </div>
                            ) : position === 2 ? (
                              <div className="relative">
                                <div className="w-6 h-6 bg-gray-100 text-gray-800 rounded-full flex items-center justify-center font-bold text-xs">
                                  🥈
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-gray-600 text-xs">v</div>
                              </div>
                            ) : position === 3 ? (
                              <div className="relative">
                                <div className="w-6 h-6 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-bold text-xs">
                                  🥉
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-amber-600 text-xs">v</div>
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xs">
                                {position}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                                                      <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-base font-semibold truncate text-gray-900">
                              {song.title}
                            </h3>
                          </div>
                            
                                                      <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                            {song.suggested_by_user && (
                              <>
                                <span>By: {song.suggested_by_user.display_name}</span>
                                <span>•</span>
                              </>
                            )}
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
                                  className="text-primary-700 flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Spotify
                                </a>
                              </>
                            )}
                          </div>
                            
                            {song.notes && (
                              <div className="mt-1 p-2 bg-blue-50 rounded text-xs text-blue-800 mb-2">
                                <strong>Note:</strong> {song.notes}
                              </div>
                            )}

                            {/* Spotify Controls - Compact */}
                            {song.spotify_track_id && (
                              <div className="mt-2 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className={`p-2 rounded-full transition-colors ${
                                    spotifyPlayer.currentTrack === song.spotify_track_id && spotifyPlayer.isPlaying
                                      ? 'bg-green-600 hover:bg-green-700 text-white'
                                      : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (song.preview_url && song.spotify_track_id) {
                                      spotifyPlayer.togglePlayPause(song.spotify_track_id, song.preview_url)
                                    } else if (song.spotify_track_id) {
                                      // If no preview, open in Spotify
                                      window.open(`https://open.spotify.com/track/${song.spotify_track_id}`, '_blank')
                                    }
                                  }}
                                  title={song.preview_url ? 'Play preview' : 'Open in Spotify'}
                                >
                                  {spotifyPlayer.currentTrack === song.spotify_track_id && spotifyPlayer.isPlaying ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                                
                                {/* Volume control - only show if this track is playing */}
                                {spotifyPlayer.currentTrack === song.spotify_track_id && (
                                  <div className="flex items-center space-x-1">
                                    <Volume2 className="w-3 h-3 text-gray-400" />
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={(localVolumes[song.spotify_track_id || ''] ?? spotifyPlayer.volume) * 100}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        const newVolume = parseInt(e.target.value) / 100
                                        if (song.spotify_track_id) {
                                          setLocalVolumes(prev => ({ ...prev, [song.spotify_track_id as string]: newVolume }))
                                        }
                                        spotifyPlayer.setVolume(newVolume)
                                      }}
                                      className="w-16 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gray-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                                
                                <a
                                  href={`https://open.spotify.com/track/${song.spotify_track_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Spotify
                                </a>
                                
                                {!song.preview_url && (
                                  <span className="text-xs text-gray-500">(No preview)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons - compact layout */}
                        <div className="flex items-center ml-3 space-x-3">
                          {/* Star Rating */}
                          <div className="flex flex-col items-center space-y-1" onClick={(e) => e.stopPropagation()}>
                            <StarRating
                              rating={song.user_rating || null}
                              onRate={(rating) => handleRate(song.id, rating)}
                              readonly={votingOnSong === song.id}
                              size="sm"
                            />
                            
                            {/* Rating Info */}
                            <div className="text-center">
                              <div className="text-xs font-medium text-gray-900">
                                {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {song.total_ratings || 0}
                              </div>
                            </div>
                          </div>

                          {/* Admin controls */}
                          {userRole === 'admin' && (
                            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => startEditingSuggester()}
                                className="p-2 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
                                title="Change who suggested this song (Admin only)"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveSuggestion(song.id)}
                                disabled={removeSuggestion.isPending}
                                className="p-2 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--color-border)]"
                                title="Remove suggestion (Admin only)"
                              >
                                <Trash2 className="w-4 h-4" />
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
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        page === currentPage
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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