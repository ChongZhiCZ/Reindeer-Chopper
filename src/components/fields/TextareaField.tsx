import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: string
  required?: boolean
  description?: string
  onChange: (v: string) => void
}

export function TextareaField({ name, label, value, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <textarea
        id={name}
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="field-input field-textarea"
      />
    </FieldWrapper>
  )
}
