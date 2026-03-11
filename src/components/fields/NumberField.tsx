import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: number
  required?: boolean
  description?: string
  onChange: (v: number) => void
}

export function NumberField({ name, label, value, required, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} required={required} description={description}>
      <input
        id={name}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field-input field-input-number"
      />
    </FieldWrapper>
  )
}
