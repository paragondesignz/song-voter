import { Calendar, Clock } from 'lucide-react'

interface DateTimePickerProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label?: string
  required?: boolean
  min?: string
  className?: string
  placeholder?: string
}

export function DateTimePicker({
  name,
  value,
  onChange,
  label,
  required = false,
  min,
  className = ""
}: DateTimePickerProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="datetime-local"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          className="input-field pl-16"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Calendar className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
          <Clock className="h-4 w-4 ml-1" style={{ color: 'var(--color-text-secondary)' }} />
        </div>
      </div>
    </div>
  )
}