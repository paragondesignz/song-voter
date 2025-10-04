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
      <input
        type="time"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="input-field"
      />
    </div>
  )
}