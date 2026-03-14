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
  const safeValue = Number.isFinite(value) ? value : 0

  const step = (delta: number) => {
    onChange(safeValue + delta)
  }

  return (
    <FieldWrapper label={label} required={required} description={description}>
      <div className="field-number-row">
        <button type="button" className="field-step-btn" onClick={() => step(-1)} aria-label={`${label} minus`}>
          -
        </button>
        <input
          id={name}
          type="number"
          value={safeValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className="field-input field-input-number"
        />
        <button type="button" className="field-step-btn" onClick={() => step(1)} aria-label={`${label} plus`}>
          +
        </button>
      </div>
    </FieldWrapper>
  )
}
