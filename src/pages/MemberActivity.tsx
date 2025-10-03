import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers, useUserBandRole } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { 
  Activity, 
  User, 
  Calendar,
  TrendingUp,
  Music,
  Star,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow, subDays } from 'date-fns'
import { toast } from 'react-hot-toast'

interface ActivityLog {
  id: string
  user_id: string
  user?: {
    display_name: string
    email: string
  } | null
  action_type: string
  action_details: any
  created_at: string
}

interface MemberStats {
  user_id: string
  display_name: string
  email: string
  joined_at: string
  total_votes: number
  songs_suggested: number
  last_active: string | null
  activity_score: number
}

export function MemberActivity() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [memberStats, setMemberStats] = useState<MemberStats[]>([])
  const [dateFilter, setDateFilter] = useState<'7' | '30' | '90' | 'all'>('30')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  
  const { data: band } = useBand(bandId!)
  const { data: members } = useBandMembers(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)

  const isAdmin = userRole === 'admin'

  useEffect(() => {
    if (bandId && isAdmin) {
      fetchActivityData()
    }
  }, [bandId, dateFilter, memberFilter, isAdmin])

  const fetchActivityData = async () => {
    setIsLoading(true)
    try {
      // Calculate date range
      let startDate = new Date(0).toISOString()
      if (dateFilter !== 'all') {
        startDate = subDays(new Date(), parseInt(dateFilter)).toISOString()
      }

      // Fetch votes
      let votesQuery = supabase
        .from('song_votes')
        .select(`
          id,
          user_id,
          song_id,
          vote_type,
          created_at,
          user:users!song_votes_user_id_fkey(display_name, email),
          song:song_suggestions!song_votes_song_id_fkey(title)
        `)
        .eq('band_id', bandId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })

      if (memberFilter !== 'all') {
        votesQuery = votesQuery.eq('user_id', memberFilter)
      }

      const { data: votes, error: votesError } = await votesQuery

      if (votesError) throw votesError

      // Fetch song suggestions
      let songsQuery = supabase
        .from('song_suggestions')
        .select(`
          id,
          title,
          suggested_by,
          created_at,
          user:users!song_suggestions_suggested_by_fkey(display_name, email)
        `)
        .eq('band_id', bandId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })

      if (memberFilter !== 'all') {
        songsQuery = songsQuery.eq('suggested_by', memberFilter)
      }

      const { data: songs, error: songsError } = await songsQuery

      if (songsError) throw songsError

      // Fetch ratings
      let ratingsQuery = supabase
        .from('song_ratings')
        .select(`
          id,
          user_id,
          song_id,
          rating,
          created_at,
          user:users!song_ratings_user_id_fkey(display_name, email),
          song:song_suggestions!song_ratings_song_id_fkey(title)
        `)
        .eq('band_id', bandId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })

      if (memberFilter !== 'all') {
        ratingsQuery = ratingsQuery.eq('user_id', memberFilter)
      }

      const { data: ratings, error: ratingsError } = await ratingsQuery

      if (ratingsError) throw ratingsError

      // Combine all activities
      const allActivities: ActivityLog[] = []

      // Add votes as activities
      votes?.forEach(vote => {
        allActivities.push({
          id: `vote-${vote.id}`,
          user_id: vote.user_id,
          user: Array.isArray(vote.user) ? vote.user[0] : vote.user,
          action_type: vote.vote_type === 'upvote' ? 'upvoted' : 'downvoted',
          action_details: { song_title: Array.isArray(vote.song) && vote.song.length > 0 ? vote.song[0].title : (vote.song as any)?.title },
          created_at: vote.created_at
        })
      })

      // Add song suggestions as activities
      songs?.forEach(song => {
        allActivities.push({
          id: `song-${song.id}`,
          user_id: song.suggested_by,
          user: Array.isArray(song.user) ? song.user[0] : song.user,
          action_type: 'suggested',
          action_details: { song_title: song.title },
          created_at: song.created_at
        })
      })

      // Add ratings as activities
      ratings?.forEach(rating => {
        allActivities.push({
          id: `rating-${rating.id}`,
          user_id: rating.user_id,
          user: Array.isArray(rating.user) ? rating.user[0] : rating.user,
          action_type: 'rated',
          action_details: { 
            song_title: Array.isArray(rating.song) && rating.song.length > 0 ? rating.song[0].title : (rating.song as any)?.title,
            rating: rating.rating 
          },
          created_at: rating.created_at
        })
      })

      // Sort by date
      allActivities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setActivities(allActivities.slice(0, 50)) // Limit to 50 most recent

      // Calculate member stats
      if (members) {
        const stats: MemberStats[] = []
        
        for (const member of members) {
          const memberVotes = votes?.filter(v => v.user_id === member.user_id) || []
          const memberSongs = songs?.filter(s => s.suggested_by === member.user_id) || []
          const memberRatings = ratings?.filter(r => r.user_id === member.user_id) || []
          
          const allMemberActivities = [
            ...memberVotes.map(v => v.created_at),
            ...memberSongs.map(s => s.created_at),
            ...memberRatings.map(r => r.created_at)
          ]
          
          const lastActive = allMemberActivities.length > 0
            ? allMemberActivities.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
            : null

          // Calculate activity score (weighted: suggestions worth more than votes)
          const activityScore = (memberSongs.length * 3) + memberVotes.length + memberRatings.length

          stats.push({
            user_id: member.user_id,
            display_name: member.user?.display_name || 'Unknown',
            email: member.user?.email || '',
            joined_at: member.joined_at,
            total_votes: memberVotes.length,
            songs_suggested: memberSongs.length,
            last_active: lastActive,
            activity_score: activityScore
          })
        }

        // Sort by activity score
        stats.sort((a, b) => b.activity_score - a.activity_score)
        setMemberStats(stats)
      }

    } catch (error) {
      toast.error('Failed to load activity data')
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'upvoted':
      case 'downvoted':
        return <TrendingUp className="h-4 w-4" />
      case 'suggested':
        return <Music className="h-4 w-4" />
      case 'rated':
        return <Star className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'upvoted':
        return 'text-green-600 bg-green-50'
      case 'downvoted':
        return 'text-red-600 bg-red-50'
      case 'suggested':
        return 'text-blue-600 bg-blue-50'
      case 'rated':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatAction = (activity: ActivityLog) => {
    switch (activity.action_type) {
      case 'upvoted':
        return `upvoted "${activity.action_details.song_title}"`
      case 'downvoted':
        return `downvoted "${activity.action_details.song_title}"`
      case 'suggested':
        return `suggested "${activity.action_details.song_title}"`
      case 'rated':
        return `rated "${activity.action_details.song_title}" ${activity.action_details.rating}/5`
      default:
        return activity.action_type
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">
              Only band admins can view member activity.
            </p>
            <button
              onClick={() => navigate(`/band/${bandId}/members`)}
              className="btn-primary"
            >
              Back to Members
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/band/${bandId}/members`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Member Activity</h1>
          <p className="text-lg text-gray-600 mt-2">{band?.name}</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="input-field"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-400" />
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Members</option>
                {members?.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className={`p-2 rounded-full ${getActionColor(activity.action_type)}`}>
                        {getActionIcon(activity.action_type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.user?.display_name}</span>
                          {' '}
                          {formatAction(activity)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No activity in this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Member Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Member Leaderboard</h3>
              
              {memberStats.length > 0 ? (
                <div className="space-y-3">
                  {memberStats.slice(0, 5).map((stat, index) => (
                    <div key={stat.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-amber-100 text-amber-800' :
                          'bg-primary-100 text-primary-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{stat.display_name}</p>
                          <p className="text-xs text-gray-500">
                            {stat.songs_suggested} songs • {stat.total_votes} votes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{stat.activity_score}</p>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center py-4">No member activity yet</p>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Activities</span>
                  <span className="font-medium">{activities.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Members</span>
                  <span className="font-medium">
                    {memberStats.filter(s => s.last_active).length}/{members?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Songs Suggested</span>
                  <span className="font-medium">
                    {memberStats.reduce((sum, s) => sum + s.songs_suggested, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Votes</span>
                  <span className="font-medium">
                    {memberStats.reduce((sum, s) => sum + s.total_votes, 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Inactive Members</h3>
              {memberStats.filter(s => !s.last_active || 
                (s.last_active && new Date(s.last_active) < subDays(new Date(), 30))
              ).length > 0 ? (
                <div className="space-y-2">
                  {memberStats.filter(s => !s.last_active || 
                    (s.last_active && new Date(s.last_active) < subDays(new Date(), 30))
                  ).map(stat => (
                    <div key={stat.user_id} className="flex items-center justify-between p-2 text-sm">
                      <span className="text-gray-600">{stat.display_name}</span>
                      <span className="text-xs text-gray-500">
                        {stat.last_active 
                          ? formatDistanceToNow(new Date(stat.last_active), { addSuffix: true })
                          : 'Never active'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center py-4">All members are active!</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}