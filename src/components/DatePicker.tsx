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
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
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
          className="input-field pl-12"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Calendar className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
        </div>
      </div>
    </div>
  )
}