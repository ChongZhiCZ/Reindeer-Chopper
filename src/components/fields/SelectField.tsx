import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: string
  options: string[]
  required?: boolean
  description?: string
  onChange: (v: string) => void
}

export function SelectField({ name, label, value, options, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <select
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
}
