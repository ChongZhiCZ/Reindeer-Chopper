import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: boolean
  description?: string
  onChange: (v: boolean) => void
}

export function BooleanField({ name, label, value, description, onChange }: Props) {
  return (
    <FieldWrapper label={label} description={description}>
      <label className="field-checkbox-row">
        <input
          id={name}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="field-checkbox"
        />
        <span>ENABLE</span>
      </label>
    </FieldWrapper>
  )
}
