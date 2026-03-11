import { open } from '@tauri-apps/plugin-dialog'
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: string
  required?: boolean
  description?: string
  onChange: (v: string) => void
}

export function FilePathField({ name, label, value, required, description, onChange }: Props) {
  const handleBrowse = async () => {
    const selected = await open({ directory: false, multiple: false })
    if (typeof selected === 'string') {
      onChange(selected)
    }
  }

  return (
    <FieldWrapper label={label} required={required} description={description}>
      <div className="flex gap-2">
        <input
          id={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleBrowse}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          浏览
        </button>
      </div>
    </FieldWrapper>
  )
}
