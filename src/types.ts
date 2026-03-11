export type ParameterType = 'text' | 'number' | 'boolean' | 'select' | 'filepath'

export interface ParameterDescriptor {
  name: string
  label: string
  type: ParameterType
  required?: boolean
  description?: string
  default?: string | number | boolean
  options?: string[]
}

export interface PluginDescriptor {
  id: string
  name: string
  version: string
  description?: string
  entry: string
  parameters: ParameterDescriptor[]
}

export interface PluginConfig {
  id: string
  name: string
  params: Record<string, string | number | boolean>
}

export type TaskStatus = 'running' | 'done' | 'error'

export interface Task {
  id: string
  pluginId: string
  pluginName: string
  configName: string
  status: TaskStatus
  exitCode?: number
}
