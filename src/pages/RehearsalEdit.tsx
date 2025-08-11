import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { useRehearsal, useUpdateRehearsal } from '@/hooks/useRehearsals'
import { Header } from '@/components/Header'

export function RehearsalEdit() {
  const { bandId, rehearsalId } = useParams<{ bandId: string; rehearsalId: string }>()
  const navigate = useNavigate()
  const { data: band } = useBand(bandId!)
  const { data: rehearsal, isLoading } = useRehearsal(rehearsalId!)
  const updateRehearsal = useUpdateRehearsal()

  const [form, setForm] = useState({
    name: '',
    rehearsal_date: '',
    start_time: '',
    location: '',
    songs_to_learn: 5,
    selection_deadline: '',
    description: '',
  })

  useEffect(() => {
    if (rehearsal) {
      setForm({
        name: rehearsal.name || '',
        rehearsal_date: rehearsal.rehearsal_date?.slice(0, 10) || '',
        start_time: rehearsal.start_time || '',
        location: rehearsal.location || '',
        songs_to_learn: rehearsal.songs_to_learn || 5,
        selection_deadline: rehearsal.selection_deadline ? new Date(rehearsal.selection_deadline).toISOString().slice(0, 16) : '',
        description: rehearsal.description || '',
      })
    }
  }, [rehearsal])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'songs_to_learn' ? parseInt(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!rehearsalId) return
    await updateRehearsal.mutateAsync({
      rehearsalId,
      updates: {
        name: form.name,
        rehearsal_date: form.rehearsal_date,
        start_time: form.start_time || null,
        location: form.location || null,
        songs_to_learn: form.songs_to_learn,
        selection_deadline: form.selection_deadline || null,
        description: form.description || null,
      },
    })
    navigate(`/band/${bandId}/rehearsal/${rehearsalId}`)
  }

  if (isLoading || !rehearsal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Rehearsal</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>
        
        <form onSubmit={handleSubmit} className="card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rehearsal Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                name="rehearsal_date"
                value={form.rehearsal_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time (Optional)</label>
              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Songs to Learn</label>
              <select
                name="songs_to_learn"
                value={form.songs_to_learn}
                onChange={handleChange}
                className="input-field"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <option key={num} value={num}>{num} song{num > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="input-field"
              placeholder="Studio A, John's Garage, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selection Deadline (Optional)</label>
            <input
              type="datetime-local"
              name="selection_deadline"
              value={form.selection_deadline}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="input-field"
              placeholder="Additional notes for this rehearsal..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/band/${bandId}/rehearsal/${rehearsalId}`)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={updateRehearsal.isPending}
            >
              {updateRehearsal.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}


