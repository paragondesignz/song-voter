import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers } from '@/hooks/useBands'
import { useSongSuggestions, useLeaderboard, useRateSong } from '@/hooks/useSongs'
import { useBandRehearsals, useRehearsalSetlist } from '@/hooks/useRehearsals'
import { useAuth } from '@/context/AuthContext'
import { StarRating } from '@/components/StarRating'
import { 
  Music, 
  Users, 
  Search, 
  Trophy, 
  Calendar,
  ArrowLeft,
  Plus,
  Crown,
  User
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Component to show selected songs for a rehearsal
function RehearsalSelectedSongs({ rehearsalId, maxSongs = 3 }: { rehearsalId: string; maxSongs?: number }) {
  const { data: setlist } = useRehearsalSetlist(rehearsalId)
  
  if (!setlist || setlist.length === 0) return null
  
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-green-600">Final selections:</p>
      <div className="space-y-1">
        {setlist.slice(0, maxSongs).map((item, index) => (
          <div key={item.id} className="flex items-center text-xs text-gray-600">
            <span className="w-4 text-center font-medium">{index + 1}.</span>
            <span className="truncate ml-1">
              {item.song_suggestion?.title} - {item.song_suggestion?.artist}
            </span>
          </div>
        ))}
        {setlist.length > maxSongs && (
          <div className="text-xs text-gray-500">
            +{setlist.length - maxSongs} more song{setlist.length - maxSongs !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

export function BandDashboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const { data: band } = useBand(bandId!)
  const { data: members } = useBandMembers(bandId!)
  const { data: recentSuggestions, refetch: refetchSuggestions } = useSongSuggestions(bandId!, { sortBy: 'newest' })
  const { data: leaderboard, refetch: refetchLeaderboard } = useLeaderboard(bandId!)
  const { data: rehearsals } = useBandRehearsals(bandId!)
  const rateSong = useRateSong()
  const [votingOnSong, setVotingOnSong] = useState<string | null>(null)

  const userRole = members?.find(m => m.user_id === user?.id)?.role

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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Music className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{band.name}</h1>
                <p className="text-xs text-gray-500">
                  Code: {band.invite_code} • {members?.length || 0} members
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/band/${bandId}/profile`)}
                className="btn-secondary text-sm"
              >
                <User className="h-4 w-4 mr-1" />
                My Profile
              </button>
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
          <div className="space-y-6">
            {/* Band members */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Band Members</h3>
                {userRole === 'admin' && (
                  <button
                    onClick={() => navigate(`/band/${bandId}/members`)}
                    className="btn-secondary text-sm"
                  >
                    Manage Members
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="relative">
                        {member.user?.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt={member.user.display_name}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        {member.role === 'admin' && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-1">
                            <Crown className="w-2 h-2" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <p className="text-sm font-medium text-gray-900">
                            {member.user?.display_name}
                          </p>
                          {member.role === 'admin' && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </div>
                    {member.user_id === user?.id && (
                      <span className="text-xs text-primary-600 font-medium">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Rehearsals */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Rehearsals</h3>
                <button
                  onClick={() => navigate(`/band/${bandId}/rehearsals`)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  {userRole === 'admin' ? 'Manage' : 'View All'}
                </button>
              </div>
              
              {rehearsals && rehearsals.length > 0 ? (
                <div className="space-y-3">
                  {rehearsals
                    .filter(rehearsal => {
                      const rehearsalDate = new Date(rehearsal.rehearsal_date)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return rehearsalDate >= today
                    })
                    .slice(0, 3)
                    .map((rehearsal) => (
                      <div 
                        key={rehearsal.id} 
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/band/${bandId}/rehearsal/${rehearsal.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{rehearsal.name}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(rehearsal.rehearsal_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              {rehearsal.start_time && (
                                <span> at {rehearsal.start_time}</span>
                              )}
                            </p>
                            {rehearsal.location && (
                              <p className="text-xs text-gray-500 mt-1">{rehearsal.location}</p>
                            )}
                            <div className="flex items-center mt-2 space-x-4 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                rehearsal.status === 'planning'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : rehearsal.status === 'songs_selected'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {rehearsal.status === 'planning' 
                                  ? 'Planning' 
                                  : rehearsal.status === 'songs_selected'
                                  ? 'Songs Selected'
                                  : 'Completed'
                                }
                              </span>
                              <span className="text-gray-500">
                                {rehearsal.songs_to_learn} songs to learn
                              </span>
                            </div>
                            {/* Show selected songs after cutoff date */}
                            {rehearsal.selection_deadline && 
                             new Date() > new Date(rehearsal.selection_deadline) && 
                             rehearsal.status !== 'planning' && (
                              <RehearsalSelectedSongs rehearsalId={rehearsal.id} maxSongs={3} />
                            )}
                          </div>
                          <div className="ml-4">
                            <Calendar className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm mb-4">No upcoming rehearsals scheduled</p>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => navigate(`/band/${bandId}/rehearsals`)}
                      className="btn-primary text-sm"
                    >
                      Schedule Rehearsal
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}