import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers } from '@/hooks/useBands'
import { useSongSuggestions, useLeaderboard, useRateSong, useCleanupRehearsalSongs } from '@/hooks/useSongs'
import { useRehearsalSetlist } from '@/hooks/useRehearsals'
import { useAuth } from '@/context/AuthContext'
import { BandSidebar } from '@/components/BandSidebar'
import { StarRating } from '@/components/StarRating'
import { Header } from '@/components/Header'
import { Music, Search, Trophy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Removed unused RehearsalSelectedSongs helper (sidebar handles previews)

export function BandDashboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const { data: band } = useBand(bandId!)
  const { data: members } = useBandMembers(bandId!)
  const { data: recentSuggestions, refetch: refetchSuggestions } = useSongSuggestions(bandId!, { sortBy: 'newest' })
  const { data: leaderboard, refetch: refetchLeaderboard } = useLeaderboard(bandId!)
  const rateSong = useRateSong()
  const cleanupRehearsalSongs = useCleanupRehearsalSongs()
  const [votingOnSong, setVotingOnSong] = useState<string | null>(null)

  // userRole handled within sidebar where needed

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

  const handleRate = async (songId: string, rating: number | null, isFromLeaderboard: boolean = false) => {
    try {
      setVotingOnSong(songId)

      await rateSong.mutateAsync({
        songId,
        bandId: bandId!,
        rating
      })
      
      // Refetch to get updated ratings
      if (isFromLeaderboard) {
        await refetchLeaderboard()
      } else {
        await refetchSuggestions()
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Rating error:', error)
    } finally {
      setVotingOnSong(null)
    }
  }

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
                onClick={() => navigate(`/band/${bandId}/suggestions`)}
                className="card hover:shadow-lg transition-shadow p-6 text-center"
              >
                <Music className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900">All Suggestions</h3>
                <p className="text-sm text-gray-500 mt-1">View all suggested songs</p>
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

            {/* Recent suggestions */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Suggestions</h2>
                <button
                  onClick={() => navigate(`/band/${bandId}/suggestions`)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View all
                </button>
              </div>
              
              {recentSuggestions && recentSuggestions.length > 0 ? (
                <div className="space-y-4">
                  {recentSuggestions.slice(0, 5).map((song) => (
                    <div key={song.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {song.album_art_url ? (
                          <img
                            src={song.album_art_url}
                            alt={song.album || 'Album art'}
                            className="w-12 h-12 rounded-md mr-4"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-300 rounded-md mr-4 flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{song.title}</h3>
                          <p className="text-sm text-gray-600">{song.artist}</p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-600">Added by: {song.suggested_by_user?.display_name}</span> • {' '}
                            {formatDistanceToNow(new Date(song.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Star Rating */}
                        <div className="flex flex-col items-center space-y-1">
                          <StarRating
                            rating={song.user_rating || null}
                            onRate={(rating) => handleRate(song.id, rating, false)}
                            readonly={votingOnSong === song.id}
                            size="sm"
                          />
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-900">
                              {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No songs suggested yet</p>
                  <button
                    onClick={() => navigate(`/band/${bandId}/search`)}
                    className="btn-primary"
                  >
                    Suggest the First Song
                  </button>
                </div>
              )}
            </div>

            {/* Top songs */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Top Songs</h2>
                <button
                  onClick={() => navigate(`/band/${bandId}/leaderboard`)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View leaderboard
                </button>
              </div>
              
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-4">
                  {leaderboard.slice(0, 5).map((song, index) => (
                    <div key={song.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold text-sm mr-4">
                          {index + 1}
                        </div>
                        {song.album_art_url ? (
                          <img
                            src={song.album_art_url}
                            alt="Album art"
                            className="w-12 h-12 rounded-md mr-4"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-300 rounded-md mr-4 flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{song.title}</h3>
                          <p className="text-sm text-gray-600">{song.artist}</p>
                          {song.suggested_by_user && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Added by: {song.suggested_by_user.display_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Star Rating */}
                        <div className="flex flex-col items-center space-y-1">
                          <StarRating
                            rating={song.user_rating || null}
                            onRate={(rating) => handleRate(song.id, rating, false)}
                            readonly={votingOnSong === song.id}
                            size="sm"
                          />
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-900">
                              {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No votes yet</p>
                </div>
              )}
            </div>
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