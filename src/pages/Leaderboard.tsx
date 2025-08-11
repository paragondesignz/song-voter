import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLeaderboard, useRateSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { StarRating } from '@/components/StarRating'
import { Header } from '@/components/Header'
import { 
  Music, 
  Trophy, 
  Heart,
  TrendingUp,
  Medal,
  Crown,
} from 'lucide-react'

type TimeFrame = 'all' | 'month' | 'week'

export function Leaderboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all')
  
  const { data: band } = useBand(bandId!)
  const { data: leaderboard, isLoading, refetch } = useLeaderboard(bandId!, timeFrame)
  const rateSong = useRateSong()
  const [ratingOnSong, setRatingOnSong] = useState<string | null>(null)

  const handleRate = async (songId: string, rating: number | null) => {
    try {
      setRatingOnSong(songId)

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
      setRatingOnSong(null)
    }
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return (
          <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm">
            {position}
          </div>
        )
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Leaderboard" subtitle={band?.name} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Time frame selector */}
          <div className="card">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Most Popular Songs</h2>
              <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
                <button
                  onClick={() => setTimeFrame('week')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    timeFrame === 'week'
                      ? 'bg-primary-600 text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTimeFrame('month')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--color-border)] ${
                    timeFrame === 'month'
                      ? 'bg-primary-600 text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setTimeFrame('all')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-[var(--color-border)] ${
                    timeFrame === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((song, index) => {
                const position = index + 1
                return (
                  <div
                    key={song.id}
                    className={`card border-2 transition-all hover:shadow-lg ${
                      position === 1
                        ? 'border-yellow-400/40'
                        : position === 2
                        ? 'border-gray-400/30'
                        : position === 3
                        ? 'border-amber-400/30'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="mr-6">
                          {getRankIcon(position)}
                        </div>
                        
                        {song.album_art_url ? (
                          <img
                            src={song.album_art_url}
                            alt="Album art"
                            className="w-16 h-16 rounded-md mr-4 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-300 rounded-md mr-4 flex-shrink-0 flex items-center justify-center">
                            <Music className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">
                            {song.title}
                          </h3>
                          <p className="text-secondary truncate">{song.artist}</p>
                          {song.suggested_by_user && (
                            <p className="text-xs text-secondary mt-1">
                              Added by: {song.suggested_by_user.display_name}
                            </p>
                          )}
                          
                          <div className="flex items-center mt-2 space-x-4 text-sm text-secondary">
                            <div className="flex items-center">
                              <Heart className="w-4 h-4 mr-1 text-red-500" />
                              <span className="font-medium">
                                {song.average_rating ? song.average_rating.toFixed(1) : '—'} avg
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              <span className="font-medium">{song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}</span>
                            </div>
                            
                            {song.recent_votes > 0 && (
                              <div className="flex items-center text-green-400">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                <span className="font-medium">{song.recent_votes} recent</span>
                              </div>
                            )}
                          </div>
                          
                          {position <= 3 && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                position === 1
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : position === 2
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {position === 1 ? '🥇 Most Popular' : position === 2 ? '🥈 Runner Up' : '🥉 Third Place'}
                              </span>
                            </div>
                          )}

                          {/* Spotify Embed for top 3 songs */}
                          {position <= 3 && song.spotify_track_id && (
                            <div className="mt-4">
                              <SpotifyEmbed trackId={song.spotify_track_id} compact={true} height={80} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Star Rating */}
                      <div className="flex flex-col items-center ml-4 space-y-2">
                        <StarRating
                          rating={song.user_rating}
                          onRate={(rating) => handleRate(song.id, rating)}
                          readonly={ratingOnSong === song.id}
                          size="md"
                        />
                        
                        {/* Rating Info */}
                          <div className="text-center">
                            <div className="text-sm font-medium">
                            {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                          </div>
                            <div className="text-xs text-secondary">
                            {song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Songs Yet</h3>
              <p className="text-gray-600 mb-6">
                The leaderboard will show the most popular songs once voting begins.
              </p>
              <button
                onClick={() => navigate(`/band/${bandId}/search`)}
                className="btn-primary"
              >
                Suggest the First Song
              </button>
            </div>
          )}

          {/* Stats summary */}
          {leaderboard && leaderboard.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leaderboard Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {leaderboard.length}
                  </div>
                  <div className="text-sm text-gray-600">Songs with Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {leaderboard.reduce((sum, song) => sum + (song.total_ratings || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Ratings Cast</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {leaderboard[0]?.average_rating?.toFixed(1) || '—'}
                  </div>
                  <div className="text-sm text-gray-600">Highest Average</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}