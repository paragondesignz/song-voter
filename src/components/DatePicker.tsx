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
      <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        className="input-field"
      />
    </div>
  )
}