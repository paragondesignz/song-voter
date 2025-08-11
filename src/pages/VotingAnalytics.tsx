import { useParams } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { useVoteStats, useUserVoteStats, useVoteHistory, useLeaderboard } from '@/hooks/useSongs'
import { Header } from '@/components/Header'
import { 
  BarChart3,
  TrendingUp,
  Star,
  Heart,
  Music,
  Trophy
} from 'lucide-react'
import { StarRating } from '@/components/StarRating'
import { formatDistanceToNow } from 'date-fns'

export function VotingAnalytics() {
  const { bandId } = useParams<{ bandId: string }>()
  
  const { data: band } = useBand(bandId!)
  const { data: ratingStats, isLoading: statsLoading } = useVoteStats(bandId!)
  const { data: userRatingStats } = useUserVoteStats(bandId!)
  const { data: ratingHistory } = useVoteHistory(bandId!, 20)
  const { data: topSongs } = useLeaderboard(bandId!)

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Voting Analytics"
        subtitle={band?.name}
      />

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
                <h3 className="text-sm font-medium text-blue-800">Understanding your voting analytics</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• <strong>Overall stats:</strong> See total ratings, average scores, and high-rated songs</p>
                  <p>• <strong>Your voting:</strong> Track your personal rating history and patterns</p>
                  <p>• <strong>Top songs:</strong> Discover which songs are most popular with your band</p>
                  <p>• <strong>Recent activity:</strong> Monitor voting trends and engagement</p>
                  <p>• <strong>Rating distribution:</strong> Understand how your band rates different songs</p>
                  <p>• <strong>Use insights:</strong> Make informed decisions about which songs to practice</p>
                </div>
              </div>
            </div>
          </div>

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
                    <p className="text-sm font-medium text-gray-600">Total Ratings</p>
                    <p className="text-2xl font-bold text-gray-900">{ratingStats?.totalRatings || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{ratingStats?.averageRating || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">High Ratings (4-5★)</p>
                    <p className="text-2xl font-bold text-gray-900">{ratingStats?.highRatings || 0}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{ratingStats?.recentRatings || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Highest Rated Songs */}
            {topSongs && topSongs.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
                  Highest Rated Songs
                </h2>
                <div className="space-y-4">
                  {topSongs.slice(0, 5).map((song, index) => (
                    <div key={song.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          {index + 1}
                        </div>
                        {song.album_art_url ? (
                          <img
                            src={song.album_art_url}
                            alt="Album art"
                            className="w-12 h-12 rounded-md shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{song.title}</h3>
                          <p className="text-gray-600">{song.artist}</p>
                          {song.suggested_by_user && (
                            <p className="text-xs text-gray-500 mt-1">
                              Suggested by {song.suggested_by_user.display_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="flex items-center space-x-1 mb-1">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="text-xl font-bold text-gray-900">
                              {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {song.vote_count || 0} rating{(song.vote_count || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <StarRating
                          rating={song.user_rating || null}
                          onRate={() => {}} // Read-only in analytics
                          readonly={true}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {topSongs.length > 5 && (
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500">
                      Showing top 5 of {topSongs.length} rated songs
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Your Rating Activity */}
            {userRatingStats && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Your Rating Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{userRatingStats.totalRatings}</p>
                    <p className="text-sm text-blue-800">Total Ratings Given</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{userRatingStats.averageRating}</p>
                    <p className="text-sm text-yellow-800">Your Avg Rating</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{userRatingStats.highRatings}</p>
                    <p className="text-sm text-green-800">High Ratings (4-5★)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rating Distribution */}
            {ratingStats?.ratingDistribution && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Rating Distribution</h2>
                <div className="space-y-4">
                  {Object.entries(ratingStats.ratingDistribution).map(([rating, count]) => {
                    const percentage = ratingStats.totalRatings > 0 
                      ? Math.round((count / ratingStats.totalRatings) * 100) 
                      : 0
                    return (
                      <div key={rating} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 w-16">
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-sm text-gray-600">{count}</span>
                        </div>
                        <div className="w-10 text-right">
                          <span className="text-xs text-gray-500">{percentage}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent Rating History */}
            {ratingHistory && ratingHistory.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Your Recent Ratings</h2>
                <div className="space-y-3">
                  {ratingHistory.slice(0, 10).map((rating: any) => (
                    <div key={rating.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <StarRating 
                            rating={parseInt(rating.vote_type)} 
                            readonly={true}
                            size="sm"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {rating.song_suggestion?.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            by {rating.song_suggestion?.artist}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-600">
                          {rating.vote_type}★
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

            {/* Rating Tips */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Rating Guide</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <Star className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p><strong>5 stars:</strong> Love this song, perfect for rehearsal</p>
                </div>
                <div className="flex items-start">
                  <Star className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p><strong>4 stars:</strong> Great song, would enjoy playing it</p>
                </div>
                <div className="flex items-start">
                  <Star className="h-4 w-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                  <p><strong>3 stars:</strong> Neutral, okay to practice</p>
                </div>
                <div className="flex items-start">
                  <Music className="h-4 w-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Higher rated songs are more likely to be selected for rehearsals</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Facts</h3>
              <div className="space-y-3">
                {ratingStats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">High Rating Rate</span>
                      <span className="text-sm font-medium">
                        {ratingStats.totalRatings > 0 
                          ? Math.round((ratingStats.highRatings / ratingStats.totalRatings) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Activity This Week</span>
                      <span className="text-sm font-medium">
                        {ratingStats.recentRatings} ratings
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Most Popular Rating</span>
                      <span className="text-sm font-medium">
                        {ratingStats.ratingDistribution && (() => {
                          const entries = Object.entries(ratingStats.ratingDistribution)
                          const mostPopular = entries.reduce((a, b) => a[1] > b[1] ? a : b)
                          return `${mostPopular[0]}★`
                        })()}
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