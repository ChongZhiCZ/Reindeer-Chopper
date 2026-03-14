import { open } from '@tauri-apps/plugin-dialog'
import { FieldWrapper } from './FieldWrapper'

interface Props {
  name: string
  label: string
  value: string
  mode: 'file' | 'directory'
  required?: boolean
  description?: string
  onChange: (v: string) => void
}

export function FilePathField({
  name,
  label,
  value,
  mode,
  required,
  description,
  onChange,
}: Props) {
  const handleBrowse = async () => {
    const selected = await open({ directory: mode === 'directory', multiple: false })
    if (typeof selected === 'string') {
      onChange(selected)
    }
  }

  return (
    <FieldWrapper label={label} required={required} description={description}>
      <div className="field-file-row">
        <input
          id={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input"
        />
        <button type="button" onClick={handleBrowse} className="field-btn">
          BROWSE
        </button>
      </div>
    </FieldWrapper>
  )
}
