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
        className="field-input field-select"
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
