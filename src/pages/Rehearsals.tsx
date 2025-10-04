import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import { DatePicker } from '@/components/DatePicker'
import { TimePicker } from '@/components/TimePicker'
import { DateTimePicker } from '@/components/DateTimePicker'
import { RecurringRehearsalForm, RecurringRehearsalData } from '@/components/RecurringRehearsalForm'
import { useBandRehearsals, useCreateRehearsal, useRehearsalSetlist, useBandRehearsalSeries, useCreateRehearsalSeries, useDeleteRehearsalSeries, useGenerateRehearsalsFromSeries } from '@/hooks/useRehearsals'
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Music,
  Trash2,
  CheckCircle,
  AlertCircle,
  Repeat,
  Link2,
  Copy,
  Check
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
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rehearsal_date: '',
    start_time: '',
    location: '',
    songs_to_learn: '5',
    selection_deadline: '',
    description: ''
  })
  
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: rehearsals, isLoading } = useBandRehearsals(bandId!)
  const { data: rehearsalSeries } = useBandRehearsalSeries(bandId!)
  const createRehearsal = useCreateRehearsal()
  const createRehearsalSeries = useCreateRehearsalSeries()
  const deleteRehearsalSeries = useDeleteRehearsalSeries()
  const generateRehearsals = useGenerateRehearsalsFromSeries()

  const handleCreateRehearsal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    await createRehearsal.mutateAsync({
      band_id: bandId!,
      name: formData.name,
      rehearsal_date: formData.rehearsal_date,
      start_time: formData.start_time || undefined,
      location: formData.location || undefined,
      songs_to_learn: parseInt(formData.songs_to_learn),
      selection_deadline: formData.selection_deadline || undefined,
      description: formData.description || undefined,
    })

    setFormData({
      name: '',
      rehearsal_date: '',
      start_time: '',
      location: '',
      songs_to_learn: '5',
      selection_deadline: '',
      description: ''
    })
    setShowCreateForm(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateRecurringSeries = async (data: RecurringRehearsalData) => {
    await createRehearsalSeries.mutateAsync({ ...data, bandId: bandId! })
    setShowRecurringForm(false)
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

  const getCalendarSubscriptionUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    return `${supabaseUrl}/functions/v1/calendar-feed?bandId=${bandId}`
  }

  const copySubscriptionUrl = async () => {
    const url = getCalendarSubscriptionUrl()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        {/* Page Title & Actions */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rehearsals</h1>
            {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
          </div>
          {userRole === 'admin' && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                {showCreateForm ? 'Cancel' : 'Add Rehearsal'}
              </button>
              <button
                onClick={() => setShowRecurringForm(!showRecurringForm)}
                className="btn-secondary flex items-center"
              >
                <Repeat className="h-4 w-4 mr-1" />
                {showRecurringForm ? 'Cancel' : 'Recurring Series'}
              </button>
            </div>
          )}
        </div>

        {/* Calendar Subscription - Collapsible */}
        <details className="card mb-6">
          <summary className="cursor-pointer flex items-center justify-between">
            <div className="flex items-center">
              <Link2 className="h-4 w-4 mr-2" style={{ color: 'var(--color-primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Subscribe to Calendar
              </span>
            </div>
          </summary>
          <div className="mt-4 space-y-3">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Add this URL to your calendar app to automatically sync all future rehearsals.
            </p>
            <div className="rounded-lg border p-3 flex items-center justify-between" style={{
              backgroundColor: 'var(--color-surface-2)',
              borderColor: 'var(--color-border)'
            }}>
              <code className="text-xs flex-1 truncate mr-4" style={{ color: 'var(--color-text)' }}>
                {getCalendarSubscriptionUrl()}
              </code>
              <button
                onClick={copySubscriptionUrl}
                className="btn-secondary text-xs flex items-center whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <details className="mt-2">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-primary)' }}>
                How to subscribe
              </summary>
              <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <p><strong>Google Calendar:</strong> Settings → Add calendar → From URL</p>
                <p><strong>Apple Calendar:</strong> File → New Calendar Subscription</p>
                <p><strong>Outlook:</strong> Add calendar → Subscribe from web</p>
              </div>
            </details>
          </div>
        </details>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">


            {/* Rehearsals list */}
        {/* Create Recurring Series Form */}
        {showRecurringForm && (
          <div className="mb-8">
            <RecurringRehearsalForm
              onSubmit={handleCreateRecurringSeries}
              isLoading={createRehearsalSeries.isPending}
              onCancel={() => setShowRecurringForm(false)}
            />
          </div>
        )}

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
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Weekly Practice Session"
                  />
                </div>
                <div>
                  <DatePicker
                    name="rehearsal_date"
                    value={formData.rehearsal_date}
                    onChange={handleInputChange}
                    label="Date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <TimePicker
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    label="Start Time (Optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Songs to Learn
                  </label>
                  <select
                    name="songs_to_learn"
                    value={formData.songs_to_learn}
                    onChange={handleInputChange}
                    required
                    className="input-field"
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
                  value={formData.location}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Studio A, John's Garage, etc."
                />
              </div>
              
              <div>
                <DateTimePicker
                  name="selection_deadline"
                  value={formData.selection_deadline}
                  onChange={handleInputChange}
                  label="Selection Deadline (Optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
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

        {/* Recurring Series Section */}
        {rehearsalSeries && rehearsalSeries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Repeat className="h-5 w-5 mr-2 text-purple-600" />
              Recurring Series
            </h2>
            <div className="space-y-4">
              {rehearsalSeries.map((series) => (
                <div key={series.id} className="card border-l-4 border-purple-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{series.series_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {series.recurrence_type.replace('_', ' ')} • {series.template_songs_to_learn} songs
                        {series.template_start_time && ` • ${series.template_start_time}`}
                        {series.template_location && ` • ${series.template_location}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Started {new Date(series.start_date).toLocaleDateString()}
                        {series.end_type === 'end_date' && series.end_date &&
                          ` • Ends ${new Date(series.end_date).toLocaleDateString()}`}
                        {series.end_type === 'after_count' && series.occurrence_count &&
                          ` • ${series.occurrence_count} total rehearsals`}
                      </p>
                    </div>
                    {userRole === 'admin' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => generateRehearsals.mutateAsync({ seriesId: series.id })}
                          disabled={generateRehearsals.isPending}
                          className="btn-secondary text-xs"
                        >
                          Generate More
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this recurring series and all associated rehearsals?')) {
                              deleteRehearsalSeries.mutateAsync(series.id)
                            }
                          }}
                          disabled={deleteRehearsalSeries.isPending}
                          className="btn-secondary text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rehearsals List */}
        {rehearsals && rehearsals.length > 0 ? (
          <div className="space-y-4">
            {rehearsals.map((rehearsal) => (
              <div
                key={rehearsal.id}
                onClick={() => navigate(`/band/${bandId}/rehearsal/${rehearsal.id}`)}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Rehearsals Scheduled</h3>
            <p className="text-gray-600">
              {userRole === 'admin'
                ? "Click 'Add Rehearsal' above to schedule your first practice session!"
                : "Your band admin hasn't scheduled any rehearsals yet."
              }
            </p>
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