import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLeaderboard, useVoteSong, useVoteRateLimit } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'
import { 
  ArrowLeft, 
  Music, 
  Trophy, 
  Heart,
  TrendingUp,
  Medal,
  Crown,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'

type TimeFrame = 'all' | 'month' | 'week'

export function Leaderboard() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all')
  
  const { data: band } = useBand(bandId!)
  const { data: leaderboard, isLoading } = useLeaderboard(bandId!, timeFrame)
  const { data: rateLimit } = useVoteRateLimit(bandId!)
  const voteSong = useVoteSong()

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

  const getRankClass = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200'
      default:
        return 'bg-white'
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
              <Trophy className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Leaderboard</h1>
                <p className="text-xs text-gray-500">{band?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Time frame selector */}
          <div className="card">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Most Popular Songs</h2>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setTimeFrame('week')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    timeFrame === 'week'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTimeFrame('month')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                    timeFrame === 'month'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setTimeFrame('all')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                    timeFrame === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
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
                    className={`card border-2 ${getRankClass(position)} transition-all hover:shadow-lg`}
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
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {song.title}
                          </h3>
                          <p className="text-gray-600 truncate">{song.artist}</p>
                          
                          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Heart className="w-4 h-4 mr-1 text-red-500" />
                              <span className="font-medium">{song.vote_count} votes</span>
                            </div>
                            
                            {song.recent_votes > 0 && (
                              <div className="flex items-center text-green-600">
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

                      {/* Vote buttons */}
                      <div className="flex flex-col items-center ml-4 space-y-1">
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
                          <span className="text-sm font-medium text-green-600">
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
                          <span className="text-sm font-medium text-red-600">
                            {song.downvote_count || 0}
                          </span>
                        </div>
                        
                        {/* Net score */}
                        <div className="text-center">
                          <span className={`text-lg font-bold ${
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
                    {leaderboard.reduce((sum, song) => sum + song.vote_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Votes Cast</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {leaderboard[0]?.vote_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Highest Score</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}