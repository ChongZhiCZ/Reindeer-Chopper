import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: string
  required?: boolean
  description?: string
  onChange: (v: string) => void
}

export function TextField({ name, label, value, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <input
        id={name}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </FieldWrapper>
  )
}
