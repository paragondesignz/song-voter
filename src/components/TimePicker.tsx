import { Clock } from 'lucide-react'

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
  className = ""
}: TimePickerProps) {
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
          type="time"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="input-field pl-12"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Clock className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
        </div>
      </div>
    </div>
  )
}