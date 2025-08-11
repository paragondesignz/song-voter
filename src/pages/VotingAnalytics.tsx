import { useParams, useNavigate } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { useVoteStats, useUserVoteStats, useVoteRateLimit, useVoteHistory } from '@/hooks/useSongs'
import { 
  ArrowLeft, 
  BarChart3,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Music,
  Timer
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export function VotingAnalytics() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  
  const { data: band } = useBand(bandId!)
  const { data: voteStats, isLoading: statsLoading } = useVoteStats(bandId!)
  const { data: userVoteStats } = useUserVoteStats(bandId!)
  const { data: rateLimit } = useVoteRateLimit(bandId!)
  const { data: voteHistory } = useVoteHistory(bandId!, 20)

  if (statsLoading) {
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
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(`/band/${bandId}`)}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <BarChart3 className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Voting Analytics</h1>
              <p className="text-xs text-gray-500">{band?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Votes</p>
                    <p className="text-2xl font-bold text-gray-900">{voteStats?.totalVotes || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ThumbsUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Upvotes</p>
                    <p className="text-2xl font-bold text-gray-900">{voteStats?.upvotes || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ThumbsDown className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Downvotes</p>
                    <p className="text-2xl font-bold text-gray-900">{voteStats?.downvotes || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-bold text-gray-900">{voteStats?.recentVotes || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Voting Activity */}
            {userVoteStats && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Your Voting Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{userVoteStats.totalVotes}</p>
                    <p className="text-sm text-blue-800">Total Votes Cast</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{userVoteStats.upvotes}</p>
                    <p className="text-sm text-green-800">Songs You Liked</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{userVoteStats.downvotes}</p>
                    <p className="text-sm text-red-800">Songs You Disliked</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Voting History */}
            {voteHistory && voteHistory.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Your Recent Votes</h2>
                <div className="space-y-3">
                  {voteHistory.slice(0, 10).map((vote: any) => (
                    <div key={vote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          vote.vote_type === 'upvote' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {vote.vote_type === 'upvote' ? (
                            <ThumbsUp className="h-4 w-4" />
                          ) : (
                            <ThumbsDown className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {vote.song_suggestion?.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            by {vote.song_suggestion?.artist}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(vote.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rate Limit Status */}
            {rateLimit && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Vote Limit Status</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span>Votes Remaining</span>
                      <span>{rateLimit.votesRemaining}/50</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((50 - rateLimit.votesRemaining) / 50) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {rateLimit.votesRemaining === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <Timer className="h-5 w-5 text-yellow-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Vote limit reached</p>
                          <p className="text-xs text-yellow-700">
                            Resets {formatDistanceToNow(rateLimit.resetTime, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Window resets: {format(rateLimit.resetTime, 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voting Tips */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Voting Tips</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <ThumbsUp className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Vote for songs you'd like to practice with your band</p>
                </div>
                <div className="flex items-start">
                  <ThumbsDown className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Downvote songs that don't fit your band's style</p>
                </div>
                <div className="flex items-start">
                  <Timer className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p>You can cast up to 50 votes per hour</p>
                </div>
                <div className="flex items-start">
                  <Music className="h-4 w-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Songs with more votes are more likely to be selected for rehearsals</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Facts</h3>
              <div className="space-y-3">
                {voteStats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Upvote Rate</span>
                      <span className="text-sm font-medium">
                        {voteStats.totalVotes > 0 
                          ? Math.round((voteStats.upvotes / voteStats.totalVotes) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Activity This Week</span>
                      <span className="text-sm font-medium">
                        {voteStats.recentVotes} votes
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}