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

export function PluginForm({ plugin, values, onChange }: Props) {
  return (
    <div className="plugin-form">
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
    </div>
  )
}
