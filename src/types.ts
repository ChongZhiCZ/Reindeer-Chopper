export type ParameterType = 'text' | 'number' | 'boolean' | 'select' | 'filepath'

export interface PlatformRuntimeDescriptor {
  run: string
  install?: string
}

export interface RuntimeDescriptor {
  windows: PlatformRuntimeDescriptor
  mac: PlatformRuntimeDescriptor
}

interface BaseParameterDescriptor {
  name: string
  label: string
  required?: boolean
  description?: string
  default?: string | number | boolean
  options?: string[]
}

type NonPathParameterType = Exclude<ParameterType, 'filepath'>

export type ParameterDescriptor =
  | (BaseParameterDescriptor & {
      type: 'filepath'
      pathMode: 'file' | 'directory'
    })
  | (BaseParameterDescriptor & {
      type: NonPathParameterType
      pathMode?: never
    })

export interface PluginDescriptor {
  id: string
  name: string
  version: string
  description?: string
  runtime: RuntimeDescriptor
  parameters: ParameterDescriptor[]
}

export interface PluginConfig {
  id: string
  name: string
  params: Record<string, string | number | boolean>
}

export type TaskStatus = 'running' | 'done' | 'error'

export const SYSTEM_TASK_ID = '__system__'

export type TaskLogLevel = 'info' | 'warn' | 'error'
export type TaskLogSource = 'frontend' | 'backend'

export interface TaskLogEvent {
  taskId?: string
  level: TaskLogLevel
  source: TaskLogSource
  phase: string
  message: string
  ts: string
}

export interface Task {
  id: string
  pluginId: string
  pluginName: string
  configName: string
  status: TaskStatus
  exitCode?: number
}
