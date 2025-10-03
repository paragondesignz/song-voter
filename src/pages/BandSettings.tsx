import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useBand, useUserBandRole, useUpdateBandSettings } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import {
  Settings,
  Lock,
  Calendar,
  Bell,
  Save,
  Shield
} from 'lucide-react'

export function BandSettings() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const updateBandSettings = useUpdateBandSettings()

  const [formData, setFormData] = useState({
    name: '',
    shared_password: '',
    voting_deadline_hours: 24,
    max_songs_per_rehearsal: 5,
    allow_member_song_suggestions: true,
    auto_select_songs: false,
    notification_preferences: {
      new_song_suggestions: true,
      rehearsal_reminders: true,
      voting_deadlines: true,
      member_updates: true
    }
  })

  const isAdmin = userRole === 'admin'

  // Initialize form data when band data loads
  useEffect(() => {
    if (band) {
      setFormData({
        name: band.name || '',
        shared_password: '', // Don't populate password for security
        voting_deadline_hours: band.voting_deadline_hours || 24,
        max_songs_per_rehearsal: band.max_songs_per_rehearsal || 5,
        allow_member_song_suggestions: band.allow_member_song_suggestions ?? true,
        auto_select_songs: band.auto_select_songs ?? false,
        notification_preferences: {
          new_song_suggestions: band.notification_preferences?.new_song_suggestions ?? true,
          rehearsal_reminders: band.notification_preferences?.rehearsal_reminders ?? true,
          voting_deadlines: band.notification_preferences?.voting_deadlines ?? true,
          member_updates: band.notification_preferences?.member_updates ?? true
        }
      })
    }
  }, [band])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      if (name.startsWith('notification_')) {
        const notificationKey = name.replace('notification_', '')
        setFormData(prev => ({
          ...prev,
          notification_preferences: {
            ...prev.notification_preferences,
            [notificationKey]: checked
          }
        }))
      } else {
        setFormData(prev => ({ ...prev, [name]: checked }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return

    await updateBandSettings.mutateAsync({
      bandId: bandId!,
      settings: {
        name: formData.name,
        shared_password: formData.shared_password || undefined, // Only update if provided
        voting_deadline_hours: formData.voting_deadline_hours,
        max_songs_per_rehearsal: formData.max_songs_per_rehearsal,
        allow_member_song_suggestions: formData.allow_member_song_suggestions,
        auto_select_songs: formData.auto_select_songs,
        notification_preferences: formData.notification_preferences
      }
    })
  }

  if (!band) {
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
          <h1 className="text-3xl font-bold flex items-center" style={{ color: 'var(--color-text)' }}>
            <Settings className="h-8 w-8 mr-3" style={{ color: 'var(--color-primary)' }} />
            Band Settings
          </h1>
          {band?.name && <p className="text-lg mt-2" style={{ color: 'var(--color-text-secondary)' }}>{band.name}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">

            {isAdmin ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Settings */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6 flex items-center" style={{ color: 'var(--color-text)' }}>
                    <Shield className="h-5 w-5 mr-2" style={{ color: 'var(--color-primary)' }} />
                    Basic Settings
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                        Band Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                        Band Password
                      </label>
                      <input
                        type="password"
                        name="shared_password"
                        value={formData.shared_password}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Leave blank to keep current password"
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        Required for new members to join the band
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rehearsal Settings */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6 flex items-center" style={{ color: 'var(--color-text)' }}>
                    <Calendar className="h-5 w-5 mr-2" style={{ color: 'var(--color-accent)' }} />
                    Rehearsal Settings
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                        Default Voting Deadline (hours before rehearsal)
                      </label>
                      <input
                        type="number"
                        name="voting_deadline_hours"
                        value={formData.voting_deadline_hours}
                        onChange={handleInputChange}
                        className="input-field"
                        min="1"
                        max="168"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                        Max Songs per Rehearsal
                      </label>
                      <input
                        type="number"
                        name="max_songs_per_rehearsal"
                        value={formData.max_songs_per_rehearsal}
                        onChange={handleInputChange}
                        className="input-field"
                        min="1"
                        max="20"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="allow_member_song_suggestions"
                          checked={formData.allow_member_song_suggestions}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm" style={{ color: 'var(--color-text)' }}>Allow all members to suggest songs</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="auto_select_songs"
                          checked={formData.auto_select_songs}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm" style={{ color: 'var(--color-text)' }}>Automatically select top-voted songs for rehearsals</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="card">
                  <h2 className="text-xl font-semibold mb-6 flex items-center" style={{ color: 'var(--color-text)' }}>
                    <Bell className="h-5 w-5 mr-2" style={{ color: 'var(--color-accent)' }} />
                    Notification Preferences
                  </h2>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="notification_new_song_suggestions"
                        checked={formData.notification_preferences.new_song_suggestions}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm" style={{ color: 'var(--color-text)' }}>New song suggestions</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="notification_rehearsal_reminders"
                        checked={formData.notification_preferences.rehearsal_reminders}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm" style={{ color: 'var(--color-text)' }}>Rehearsal reminders</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="notification_voting_deadlines"
                        checked={formData.notification_preferences.voting_deadlines}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2" style={{ color: 'var(--color-text)' }}>Voting deadline reminders</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="notification_member_updates"
                        checked={formData.notification_preferences.member_updates}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm" style={{ color: 'var(--color-text)' }}>Member updates</span>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateBandSettings.isPending}
                    className="btn-primary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateBandSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="card text-center py-12">
                <Lock className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--color-text)' }}>Admin Access Required</h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Only band administrators can modify band settings.
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