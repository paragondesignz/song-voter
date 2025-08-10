import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers } from '@/hooks/useBands'
import { useSongSuggestions, useLeaderboard } from '@/hooks/useSongs'
import { useAuth } from '@/context/AuthContext'
import { 
  Music, 
  Users, 
  Search, 
  Trophy, 
  Calendar,
  ArrowLeft,
  Plus,
  Heart
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function BandDashboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const { data: band } = useBand(bandId!)
  const { data: members } = useBandMembers(bandId!)
  const { data: recentSuggestions } = useSongSuggestions(bandId!, { sortBy: 'newest' })
  const { data: leaderboard } = useLeaderboard(bandId!)

  const userRole = members?.find(m => m.user_id === user?.id)?.role

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
                            Suggested by {song.suggested_by_user?.display_name} • {' '}
                            {formatDistanceToNow(new Date(song.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Heart className="w-4 h-4 mr-1" />
                          {song.vote_count || 0}
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
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-sm font-semibold text-primary-600">
                          <Heart className="w-4 h-4 mr-1 fill-current" />
                          {song.vote_count}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Band Members</h3>
              <div className="space-y-3">
                {members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center">
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
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.user?.display_name}
                        </p>
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

            {/* Rehearsals (placeholder) */}
            {userRole === 'admin' && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Rehearsals</h3>
                  <button
                    onClick={() => navigate(`/band/${bandId}/rehearsals`)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Manage
                  </button>
                </div>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">No upcoming rehearsals</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}