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
      <label className="flex cursor-pointer items-center gap-2">
        <input
          id={name}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm text-gray-600">启用</span>
      </label>
    </FieldWrapper>
  )
}
