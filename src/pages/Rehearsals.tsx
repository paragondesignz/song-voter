import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import { useBandRehearsals, useCreateRehearsal, useDeleteRehearsal, useRehearsalSetlist } from '@/hooks/useRehearsals'
import { 
  Calendar,
  Plus,
  MapPin,
  Clock,
  Music,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

// Component to show selected songs for a rehearsal
function RehearsalSelectedSongs({ rehearsalId, maxSongs = 5 }: { rehearsalId: string; maxSongs?: number }) {
  const { data: setlist } = useRehearsalSetlist(rehearsalId)
  
  if (!setlist || setlist.length === 0) return null
  
  return (
    <div className="mt-3 p-3 bg-white rounded border border-green-200">
      <p className="text-sm font-medium text-green-700 mb-2">Final song selections:</p>
      <div className="space-y-1">
        {setlist.slice(0, maxSongs).map((item, index) => (
          <div key={item.id} className="flex items-center text-sm text-gray-700">
            <span className="w-6 text-center font-medium text-green-600">{index + 1}.</span>
            <span className="truncate ml-2">
              <span className="font-medium">{item.song_suggestion?.title}</span> 
              <span className="text-gray-500"> - {item.song_suggestion?.artist}</span>
            </span>
          </div>
        ))}
        {setlist.length > maxSongs && (
          <div className="text-sm text-gray-500 ml-8">
            +{setlist.length - maxSongs} more song{setlist.length - maxSongs !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

export function Rehearsals() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: rehearsals, isLoading } = useBandRehearsals(bandId!)
  const createRehearsal = useCreateRehearsal()
  const deleteRehearsal = useDeleteRehearsal()

  const handleCreateRehearsal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    await createRehearsal.mutateAsync({
      band_id: bandId!,
      name: formData.get('name') as string,
      rehearsal_date: formData.get('rehearsal_date') as string,
      start_time: formData.get('start_time') as string || undefined,
      location: formData.get('location') as string || undefined,
      songs_to_learn: parseInt(formData.get('songs_to_learn') as string),
      selection_deadline: formData.get('selection_deadline') as string || undefined,
      description: formData.get('description') as string || undefined,
    })
    
    setShowCreateForm(false)
  }

  const handleDeleteRehearsal = async (rehearsalId: string) => {
    if (window.confirm('Are you sure you want to delete this rehearsal? This action cannot be undone.')) {
      await deleteRehearsal.mutateAsync(rehearsalId)
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rehearsals</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Instructions */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">How to manage rehearsals</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>• <strong>Create rehearsals:</strong> Click "New Rehearsal" to schedule practice sessions</p>
                    <p>• <strong>Set deadlines:</strong> Choose when song selections need to be finalized</p>
                    <p>• <strong>Track status:</strong> See if rehearsals are in planning, songs selected, or completed</p>
                    <p>• <strong>View setlists:</strong> See which songs were chosen for each rehearsal</p>
                    <p>• <strong>Manage details:</strong> Add location, time, and description for each session</p>
                    <p>• <strong>Delete rehearsals:</strong> Remove cancelled or outdated sessions (admin only)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rehearsals list */}
        {/* Create Rehearsal Form */}
        {showCreateForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Schedule New Rehearsal</h2>
            <form onSubmit={handleCreateRehearsal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rehearsal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="input-field"
                    placeholder="Weekly Practice Session"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    name="rehearsal_date"
                    required
                    className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time (Optional)
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Songs to Learn
                  </label>
                  <select
                    name="songs_to_learn"
                    required
                    className="input-field"
                    defaultValue="5"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                      <option key={num} value={num}>{num} song{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  name="location"
                  className="input-field"
                  placeholder="Studio A, John's Garage, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selection Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="selection_deadline"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="input-field"
                  placeholder="Additional notes for this rehearsal..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRehearsal.isPending}
                  className="btn-primary"
                >
                  {createRehearsal.isPending ? 'Creating...' : 'Schedule Rehearsal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rehearsals List */}
        {rehearsals && rehearsals.length > 0 ? (
          <div className="space-y-4">
            {rehearsals.map((rehearsal) => (
              <div key={rehearsal.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {rehearsal.name}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(rehearsal.status)}`}>
                        {getStatusIcon(rehearsal.status)}
                        <span className="ml-1 capitalize">{rehearsal.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(rehearsal.rehearsal_date), 'EEEE, MMMM d, yyyy')}
                        {rehearsal.start_time && (
                          <span className="ml-2 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {rehearsal.start_time}
                          </span>
                        )}
                      </div>
                      
                      {rehearsal.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {rehearsal.location}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Music className="h-4 w-4 mr-2" />
                        {rehearsal.songs_to_learn} song{rehearsal.songs_to_learn > 1 ? 's' : ''} to learn
                      </div>
                      
                      {rehearsal.selection_deadline && (
                        <div className="flex items-center text-sm text-gray-600">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Selection deadline: {format(new Date(rehearsal.selection_deadline), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>
                    
                    {rehearsal.description && (
                      <p className="mt-3 text-sm text-gray-600">{rehearsal.description}</p>
                    )}
                    
                    {/* Show selected songs after cutoff date */}
                    {rehearsal.selection_deadline && 
                     new Date() > new Date(rehearsal.selection_deadline) && 
                     rehearsal.status !== 'planning' && (
                      <RehearsalSelectedSongs rehearsalId={rehearsal.id} maxSongs={5} />
                    )}
                    
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={() => navigate(`/band/${bandId}/rehearsal/${rehearsal.id}`)}
                        className="btn-primary text-sm"
                      >
                        View Details
                      </button>
                      {userRole === 'admin' && (
                        <>
                          <button
                            onClick={() => navigate(`/band/${bandId}/rehearsal/${rehearsal.id}/edit`)}
                            className="btn-secondary text-sm"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRehearsal(rehearsal.id)}
                            disabled={deleteRehearsal.isPending}
                            className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Rehearsals Scheduled</h3>
            <p className="text-gray-600 mb-6">
              {userRole === 'admin' 
                ? "Schedule your first rehearsal to get started with organized practice sessions!"
                : "Your band admin hasn't scheduled any rehearsals yet."
              }
            </p>
            {userRole === 'admin' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                Schedule First Rehearsal
              </button>
            )}
          </div>
        )}
          </div>
          {/* Sidebar */}
          <div>
            <BandSidebar bandId={bandId!} />
          </div>
        </div>
      </main>
    </div>
  )
}