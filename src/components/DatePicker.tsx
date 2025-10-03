import { Calendar } from 'lucide-react'

interface DatePickerProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label?: string
  required?: boolean
  min?: string
  className?: string
}

export function DatePicker({
  name,
  value,
  onChange,
  label,
  required = false,
  min,
  className = ""
}: DatePickerProps) {
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
          className="
            w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-300 rounded-lg
            hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors duration-200
          "
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  )
}