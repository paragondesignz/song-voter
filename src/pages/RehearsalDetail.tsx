import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { useRehearsal, useRehearsalSetlist, useAutoSelectSongs, useRemoveFromSetlist } from '@/hooks/useRehearsals'
import { useLeaderboard } from '@/hooks/useSongs'

import { 
  ArrowLeft, 
  Calendar,
  MapPin,
  Clock,
  Music,
  Shuffle,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  Users
} from 'lucide-react'
import { format } from 'date-fns'

export function RehearsalDetail() {
  const { bandId, rehearsalId } = useParams<{ bandId: string; rehearsalId: string }>()
  const navigate = useNavigate()
  const [showAutoSelectConfirm, setShowAutoSelectConfirm] = useState(false)
  
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: rehearsal, isLoading: rehearsalLoading } = useRehearsal(rehearsalId!)
  const { data: setlist, isLoading: setlistLoading } = useRehearsalSetlist(rehearsalId!)
  const { data: leaderboard } = useLeaderboard(bandId!)
  const autoSelectSongs = useAutoSelectSongs()
  const removeFromSetlist = useRemoveFromSetlist()

  const handleAutoSelect = async () => {
    await autoSelectSongs.mutateAsync({
      rehearsalId: rehearsalId!,
      bandId: bandId!
    })
    setShowAutoSelectConfirm(false)
  }

  const handleRemoveFromSetlist = async (setlistItemId: string) => {
    if (window.confirm('Remove this song from the rehearsal setlist?')) {
      await removeFromSetlist.mutateAsync(setlistItemId)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-yellow-600 bg-yellow-50'
      case 'songs_selected': return 'text-blue-600 bg-blue-50'
      case 'completed': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <AlertCircle className="h-4 w-4" />
      case 'songs_selected': return <Music className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  if (rehearsalLoading || setlistLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!rehearsal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rehearsal Not Found</h2>
          <p className="text-gray-600 mb-4">The rehearsal you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(`/band/${bandId}/rehearsals`)}
            className="btn-primary"
          >
            Back to Rehearsals
          </button>
        </div>
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
                onClick={() => navigate(`/band/${bandId}/rehearsals`)}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Calendar className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{rehearsal.name}</h1>
                <p className="text-xs text-gray-500">{band?.name}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(rehearsal.status)}`}>
              {getStatusIcon(rehearsal.status)}
              <span className="ml-1 capitalize">{rehearsal.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Instructions */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">How to manage your rehearsal</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• <strong>Auto-select songs:</strong> Let the system pick the highest-rated songs automatically</p>
                  <p>• <strong>Manual selection:</strong> Choose specific songs from the leaderboard</p>
                  <p>• <strong>Setlist management:</strong> Reorder or remove songs from your rehearsal</p>
                  <p>• <strong>Status tracking:</strong> Monitor if songs are selected and ready to practice</p>
                  <p>• <strong>Song details:</strong> View Spotify links and song information</p>
                  <p>• <strong>Admin controls:</strong> Manage rehearsal settings and song selection</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Rehearsal Info */}
            <div className="lg:col-span-1">
              <div className="card">
              <h2 className="text-xl font-semibold mb-4">Rehearsal Details</h2>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium">{format(new Date(rehearsal.rehearsal_date), 'EEEE, MMMM d, yyyy')}</p>
                    {rehearsal.start_time && (
                      <p className="text-gray-600 flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {rehearsal.start_time}
                      </p>
                    )}
                  </div>
                </div>
                
                {rehearsal.location && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <p>{rehearsal.location}</p>
                  </div>
                )}
                
                <div className="flex items-center text-sm">
                  <Music className="h-5 w-5 text-gray-400 mr-3" />
                  <p>{rehearsal.songs_to_learn} song{rehearsal.songs_to_learn > 1 ? 's' : ''} to learn</p>
                </div>
                
                {rehearsal.selection_deadline && (
                  <div className="flex items-center text-sm">
                    <AlertCircle className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">Selection Deadline</p>
                      <p className="text-gray-600">{format(new Date(rehearsal.selection_deadline), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {rehearsal.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{rehearsal.description}</p>
                </div>
              )}
              
              {userRole === 'admin' && rehearsal.status === 'planning' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  {!showAutoSelectConfirm ? (
                    <button
                      onClick={() => setShowAutoSelectConfirm(true)}
                      className="w-full btn-primary"
                      disabled={!leaderboard || leaderboard.length === 0}
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      Auto-Select Songs from Leaderboard
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 mb-3">
                        This will select the top {rehearsal.songs_to_learn} songs from your leaderboard and add them to this rehearsal.
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAutoSelect}
                          disabled={autoSelectSongs.isPending}
                          className="btn-primary text-sm"
                        >
                          {autoSelectSongs.isPending ? 'Selecting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setShowAutoSelectConfirm(false)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {(!leaderboard || leaderboard.length === 0) && (
                    <p className="text-xs text-gray-500 mt-2">
                      No songs available on leaderboard. Add some song suggestions first!
                    </p>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Setlist */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Rehearsal Setlist</h2>
                {setlist && setlist.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {setlist.length} of {rehearsal.songs_to_learn} songs selected
                  </span>
                )}
              </div>
              
              {setlist && setlist.length > 0 ? (
                <div className="space-y-4">
                  {setlist.map((item, index) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {item.song_suggestion?.title}
                                </h3>
                                <p className="text-gray-600 truncate">{item.song_suggestion?.artist}</p>
                                {item.song_suggestion?.album && (
                                  <p className="text-sm text-gray-500 truncate">{item.song_suggestion?.album}</p>
                                )}
                              </div>
                              
                              {item.song_suggestion?.album_art_url && (
                                <img
                                  src={item.song_suggestion.album_art_url}
                                  alt={item.song_suggestion.album || 'Album art'}
                                  className="w-12 h-12 rounded-md ml-4"
                                />
                              )}
                            </div>
                            
                            <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {item.vote_count_at_selection || item.song_suggestion?.vote_count || 0} votes
                              </div>
                              
                              {item.selection_reason && (
                                <>
                                  <span>•</span>
                                  <span>{item.selection_reason}</span>
                                </>
                              )}
                              
                              {item.song_suggestion?.spotify_track_id && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://open.spotify.com/track/${item.song_suggestion.spotify_track_id}`}
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
                            
                            {/* Spotify Controls - Compact */}
                            {item.song_suggestion?.spotify_track_id && (
                              <div className="mt-3 flex items-center space-x-2">
                                <button className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </button>
                                <button className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                  </svg>
                                </button>
                                <div className="flex items-center space-x-1">
                                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                                  </svg>
                                  <div className="w-12 h-1 bg-gray-200 rounded-full">
                                    <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
                                  </div>
                                </div>
                                <a
                                  href={`https://open.spotify.com/track/${item.song_suggestion.spotify_track_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                  Spotify
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {userRole === 'admin' && rehearsal.status !== 'completed' && (
                          <button
                            onClick={() => handleRemoveFromSetlist(item.id)}
                            disabled={removeFromSetlist.isPending}
                            className="ml-4 p-2 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--color-border)]"
                            title="Remove from setlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Songs Selected</h3>
                  <p className="text-gray-600 mb-6">
                    {userRole === 'admin' 
                      ? "Use the auto-select feature or manually add songs to create your rehearsal setlist."
                      : "The admin hasn't selected songs for this rehearsal yet."
                    }
                  </p>
                  {userRole === 'admin' && rehearsal.status === 'planning' && (
                    <button
                      onClick={() => setShowAutoSelectConfirm(true)}
                      className="btn-primary"
                      disabled={!leaderboard || leaderboard.length === 0}
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      Auto-Select from Leaderboard
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