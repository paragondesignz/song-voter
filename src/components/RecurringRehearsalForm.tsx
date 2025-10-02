import { useState } from 'react'
import { DatePicker } from './DatePicker'
import { TimePicker } from './TimePicker'
import { Calendar, Clock, Repeat, Plus, X } from 'lucide-react'

interface RecurringRehearsalFormProps {
  onSubmit: (data: RecurringRehearsalData) => Promise<void>
  isLoading: boolean
  onCancel: () => void
}

export interface RecurringRehearsalData {
  seriesName: string
  templateName: string
  templateStartTime: string
  templateLocation: string
  templateSongsToLearn: number
  templateSelectionDeadlineHours: number | null
  templateDescription: string
  recurrenceType: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'custom'
  recurrenceInterval: number
  recurrenceDays: string[]
  startDate: string
  endType: 'never' | 'after_count' | 'end_date'
  occurrenceCount: number | null
  endDate: string
  exceptions: string[]
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

export function RecurringRehearsalForm({ onSubmit, isLoading, onCancel }: RecurringRehearsalFormProps) {
  const [formData, setFormData] = useState<RecurringRehearsalData>({
    seriesName: '',
    templateName: '',
    templateStartTime: '',
    templateLocation: '',
    templateSongsToLearn: 5,
    templateSelectionDeadlineHours: 24,
    templateDescription: '',
    recurrenceType: 'weekly',
    recurrenceInterval: 1,
    recurrenceDays: [],
    startDate: new Date().toISOString().split('T')[0],
    endType: 'never',
    occurrenceCount: null,
    endDate: '',
    exceptions: []
  })

  const [newException, setNewException] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      if (name === 'recurrenceDays') {
        const day = value
        setFormData(prev => ({
          ...prev,
          recurrenceDays: checked
            ? [...prev.recurrenceDays, day]
            : prev.recurrenceDays.filter(d => d !== day)
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }))
    }
  }

  const addException = () => {
    if (newException && !formData.exceptions.includes(newException)) {
      setFormData(prev => ({
        ...prev,
        exceptions: [...prev.exceptions, newException]
      }))
      setNewException('')
    }
  }

  const removeException = (date: string) => {
    setFormData(prev => ({
      ...prev,
      exceptions: prev.exceptions.filter(d => d !== date)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Series Info */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Repeat className="h-5 w-5 mr-2 text-blue-600" />
          Recurring Series Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Series Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="seriesName"
              value={formData.seriesName}
              onChange={handleInputChange}
              required
              className="input-field"
              placeholder="Weekly Band Practice"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rehearsal Name Template <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="templateName"
              value={formData.templateName}
              onChange={handleInputChange}
              required
              className="input-field"
              placeholder="Weekly Practice Session"
            />
          </div>
        </div>
      </div>

      {/* Template Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-green-600" />
          Rehearsal Template
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TimePicker
              name="templateStartTime"
              value={formData.templateStartTime}
              onChange={handleInputChange}
              label="Start Time"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Songs to Learn
            </label>
            <select
              name="templateSongsToLearn"
              value={formData.templateSongsToLearn}
              onChange={handleInputChange}
              className="input-field"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>{num} song{num > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="templateLocation"
              value={formData.templateLocation}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Studio A, John's Garage, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selection Deadline (hours before)
            </label>
            <input
              type="number"
              name="templateSelectionDeadlineHours"
              value={formData.templateSelectionDeadlineHours || ''}
              onChange={handleInputChange}
              className="input-field"
              placeholder="24"
              min="1"
              max="168"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description Template
          </label>
          <textarea
            name="templateDescription"
            value={formData.templateDescription}
            onChange={handleInputChange}
            rows={3}
            className="input-field"
            placeholder="Standard weekly practice session..."
          />
        </div>
      </div>

      {/* Recurrence Pattern */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-purple-600" />
          Recurrence Pattern
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Type
            </label>
            <select
              name="recurrenceType"
              value={formData.recurrenceType}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi_weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom (days)</option>
            </select>
          </div>

          {(formData.recurrenceType === 'daily' || formData.recurrenceType === 'custom') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat Every (days)
              </label>
              <input
                type="number"
                name="recurrenceInterval"
                value={formData.recurrenceInterval}
                onChange={handleInputChange}
                className="input-field"
                min="1"
                max="365"
              />
            </div>
          )}

          {formData.recurrenceType === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat Every (weeks)
              </label>
              <input
                type="number"
                name="recurrenceInterval"
                value={formData.recurrenceInterval}
                onChange={handleInputChange}
                className="input-field"
                min="1"
                max="12"
              />
            </div>
          )}

          {formData.recurrenceType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat Every (months)
              </label>
              <input
                type="number"
                name="recurrenceInterval"
                value={formData.recurrenceInterval}
                onChange={handleInputChange}
                className="input-field"
                min="1"
                max="12"
              />
            </div>
          )}
        </div>

        {(formData.recurrenceType === 'weekly' || formData.recurrenceType === 'bi_weekly') && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days of Week
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map(day => (
                <label key={day.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="recurrenceDays"
                    value={day.value}
                    checked={formData.recurrenceDays.includes(day.value)}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <DatePicker
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              label="Start Date"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Condition
            </label>
            <select
              name="endType"
              value={formData.endType}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="never">Never end</option>
              <option value="after_count">After number of rehearsals</option>
              <option value="end_date">End by date</option>
            </select>
          </div>
        </div>

        {formData.endType === 'after_count' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Rehearsals
            </label>
            <input
              type="number"
              name="occurrenceCount"
              value={formData.occurrenceCount || ''}
              onChange={handleInputChange}
              className="input-field"
              min="1"
              max="100"
              placeholder="10"
            />
          </div>
        )}

        {formData.endType === 'end_date' && (
          <div className="mt-4">
            <DatePicker
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              label="End Date"
              min={formData.startDate}
            />
          </div>
        )}
      </div>

      {/* Exceptions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          Skip Dates (Exceptions)
        </h3>

        <div className="flex space-x-2 mb-4">
          <input
            type="date"
            value={newException}
            onChange={(e) => setNewException(e.target.value)}
            className="input-field flex-1"
            min={formData.startDate}
          />
          <button
            type="button"
            onClick={addException}
            className="btn-secondary"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {formData.exceptions.length > 0 && (
          <div className="space-y-2">
            {formData.exceptions.map((date, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                <button
                  type="button"
                  onClick={() => removeException(date)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Creating Series...' : 'Create Recurring Series'}
        </button>
      </div>
    </form>
  )
}