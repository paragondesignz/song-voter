import { Calendar, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface DatePickerProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label?: string
  required?: boolean
  min?: string
  className?: string
  placeholder?: string
}

export function DatePicker({
  name,
  value,
  onChange,
  label,
  required = false,
  min,
  className = "",
  placeholder = "Select date"
}: DatePickerProps) {
  const displayValue = value ? format(new Date(value), 'EEEE, MMMM d, yyyy') : placeholder

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
          type="date"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
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
              <Calendar className="h-5 w-5 text-gray-400 group-hover:text-blue-500 mr-3 transition-colors" />
              <span className="font-medium">{displayValue}</span>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  )
}