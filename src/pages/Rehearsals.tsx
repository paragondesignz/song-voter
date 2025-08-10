import { useParams, useNavigate } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { 
  ArrowLeft, 
  Calendar,
  Plus
} from 'lucide-react'

export function Rehearsals() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  
  const { data: band } = useBand(bandId!)

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
              <Calendar className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Rehearsals</h1>
                <p className="text-xs text-gray-500">{band?.name}</p>
              </div>
            </div>
            <button className="btn-primary text-sm">
              <Plus className="h-4 w-4 mr-1" />
              Schedule Rehearsal
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Rehearsal Planning</h3>
          <p className="text-gray-600 mb-6">
            This feature is coming soon! You'll be able to schedule rehearsals and automatically select songs from your leaderboard.
          </p>
          <div className="text-sm text-gray-500">
            <p>Planned features:</p>
            <ul className="mt-2 space-y-1">
              <li>• Schedule rehearsal sessions</li>
              <li>• Auto-select top songs from leaderboard</li>
              <li>• Set song limits and deadlines</li>
              <li>• Notify band members</li>
              <li>• Track rehearsal progress</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}