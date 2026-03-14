import { FieldWrapper } from './FieldWrapper'
import { WireSelect } from '../WireSelect'

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
  const selectOptions = options.map((option) => ({ value: option, label: option }))

  return (
    <FieldWrapper label={label} required={required} description={description}>
      <WireSelect
        id={name}
        value={value}
        options={selectOptions}
        onChange={onChange}
        containerClassName="field-select-wrap"
        triggerClassName="field-input field-select"
      />
    </FieldWrapper>
  )
}
