import { useParams } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { useVoteStats, useUserVoteStats, useVoteHistory, useLeaderboard } from '@/hooks/useSongs'
import { Header } from '@/components/Header'
import {
  BarChart3,
  TrendingUp,
  Star,
  Heart,
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Voting Analytics</h1>
          {band?.name && <p className="text-lg mt-2" style={{ color: 'var(--color-text-secondary)' }}>{band.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(10, 132, 255, 0.15)' }}>
                    <BarChart3 className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Total Ratings</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{ratingStats?.totalRatings || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                    <Star className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Average Rating</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{ratingStats?.averageRating || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                    <Heart className="h-6 w-6" style={{ color: '#22C55E' }} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>High Ratings (4-5★)</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{ratingStats?.highRatings || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}>
                    <TrendingUp className="h-6 w-6" style={{ color: 'var(--color-secondary)' }} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>This Week</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{ratingStats?.recentRatings || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Highest Rated Songs */}
            {topSongs && topSongs.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-6 flex items-center" style={{ color: 'var(--color-text)' }}>
                  <Trophy className="h-6 w-6 mr-2" style={{ color: 'var(--color-accent)' }} />
                  Highest Rated Songs
                </h2>
                <div className="space-y-4">
                  {topSongs.slice(0, 5).map((song, index) => (
                    <div key={song.id} className="flex items-center justify-between p-4 rounded-lg border" style={{ 
                      backgroundColor: 'var(--color-surface-2)', 
                      borderColor: 'var(--color-border)' 
                    }}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white" style={{
                          background: 'linear-gradient(135deg, var(--color-accent), #F97316)'
                        }}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>{song.title}</h3>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{song.artist}</p>
                          {song.suggested_by_user && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                              Suggested by {song.suggested_by_user.display_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="flex items-center space-x-1 mb-1">
                            <Star className="h-5 w-5 fill-current" style={{ color: 'var(--color-accent)' }} />
                            <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                              {song.average_rating ? song.average_rating.toFixed(1) : '—'}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {song.total_ratings || 0} rating{(song.total_ratings || 0) !== 1 ? 's' : ''}
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
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Showing top 5 of {topSongs.length} rated songs
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Your Rating Activity */}
            {userRatingStats && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Your Rating Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{userRatingStats.totalRatings}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Ratings Given</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{userRatingStats.averageRating}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Your Avg Rating</p>
                  </div>
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <p className="text-2xl font-bold" style={{ color: '#22C55E' }}>{userRatingStats.highRatings}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>High Ratings (4-5★)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rating Distribution */}
            {ratingStats?.ratingDistribution && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Rating Distribution</h2>
                <div className="space-y-4">
                  {Object.entries(ratingStats.ratingDistribution).map(([rating, count]) => {
                    const percentage = ratingStats.totalRatings > 0 
                      ? Math.round((count / ratingStats.totalRatings) * 100) 
                      : 0
                    return (
                      <div key={rating} className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 w-16">
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{rating}</span>
                          <Star className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div className="flex-1">
                          <div className="rounded-full h-3" style={{ backgroundColor: 'var(--color-border)' }}>
                            <div
                              className="h-3 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: 'var(--color-accent)'
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
                        </div>
                        <div className="w-10 text-right">
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{percentage}%</span>
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
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Your Recent Ratings</h2>
                <div className="space-y-3">
                  {ratingHistory.slice(0, 10).map((rating: any) => (
                    <div key={rating.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                          <StarRating 
                            rating={parseInt(rating.vote_type)} 
                            readonly={true}
                            size="sm"
                          />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {rating.song_suggestion?.title}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            by {rating.song_suggestion?.artist}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
                          {rating.vote_type}★
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
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
            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Quick Facts</h3>
              <div className="space-y-3">
                {ratingStats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>High Rating Rate</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {ratingStats.totalRatings > 0 
                          ? Math.round((ratingStats.highRatings / ratingStats.totalRatings) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Activity This Week</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {ratingStats.recentRatings} ratings
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Most Popular Rating</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
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