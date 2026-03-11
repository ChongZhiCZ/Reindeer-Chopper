import { ParameterDescriptor, PluginDescriptor } from '../types'
import { BooleanField } from './fields/BooleanField'
import { FilePathField } from './fields/FilePathField'
import { NumberField } from './fields/NumberField'
import { SelectField } from './fields/SelectField'
import { TextField } from './fields/TextField'

interface Props {
  plugin: PluginDescriptor
  values: Record<string, string | number | boolean>
  onChange: (name: string, value: string | number | boolean) => void
  onRun: () => void
  canRun: boolean
}

function defaultValue(p: ParameterDescriptor): string | number | boolean {
  if (p.default !== undefined) {
    return p.default
  }
  if (p.type === 'boolean') {
    return false
  }
  if (p.type === 'number') {
    return 0
  }
  if (p.type === 'select') {
    return p.options?.[0] ?? ''
  }
  return ''
}

export function initFormValues(plugin: PluginDescriptor): Record<string, string | number | boolean> {
  return Object.fromEntries(plugin.parameters.map((p) => [p.name, defaultValue(p)]))
}

export function PluginForm({ plugin, values, onChange, onRun, canRun }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {plugin.description && <p className="text-sm text-gray-500">{plugin.description}</p>}

      {plugin.parameters.map((p) => {
        const val = values[p.name] ?? defaultValue(p)
        const common = {
          key: p.name,
          name: p.name,
          label: p.label,
          required: p.required,
          description: p.description,
        }

        if (p.type === 'text') {
          return <TextField {...common} value={val as string} onChange={(v) => onChange(p.name, v)} />
        }
        if (p.type === 'number') {
          return <NumberField {...common} value={val as number} onChange={(v) => onChange(p.name, v)} />
        }
        if (p.type === 'boolean') {
          return <BooleanField {...common} value={val as boolean} onChange={(v) => onChange(p.name, v)} />
        }
        if (p.type === 'select') {
          return (
            <SelectField
              {...common}
              value={val as string}
              options={p.options ?? []}
              onChange={(v) => onChange(p.name, v)}
            />
          )
        }
        if (p.type === 'filepath') {
          return <FilePathField {...common} value={val as string} onChange={(v) => onChange(p.name, v)} />
        }
        return null
      })}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          运行此配置
        </button>
      </div>
    </div>
  )
}
