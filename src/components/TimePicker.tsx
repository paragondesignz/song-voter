import { Clock, ChevronDown } from 'lucide-react'

interface TimePickerProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label?: string
  required?: boolean
  className?: string
  placeholder?: string
}

export function TimePicker({
  name,
  value,
  onChange,
  label,
  required = false,
  className = "",
  placeholder = "Select time"
}: TimePickerProps) {
  const formatTime = (timeStr: string) => {
    if (!timeStr) return placeholder
    const [hours, minutes] = timeStr.split(':')
    const hour24 = parseInt(hours)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="time"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="sr-only"
          id={`${name}-hidden`}
        />
        <button
          type="button"
          onClick={() => document.getElementById(`${name}-hidden`)?.click()}
          className={`
            w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg
            hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors duration-200 group
            ${value ? 'text-gray-900' : 'text-gray-500'}
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 group-hover:text-blue-500 mr-3 transition-colors" />
              <span className="font-medium">{formatTime(value)}</span>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  )
}