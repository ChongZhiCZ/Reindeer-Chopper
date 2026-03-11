import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useReducer, useRef } from 'react'
import { ConfigBar } from './components/ConfigBar'
import { PluginForm, initFormValues } from './components/PluginForm'
import { PluginSidebar } from './components/PluginSidebar'
import { TaskTabBar } from './components/TaskTabBar'
import { TerminalPanel } from './components/TerminalPanel'
import { useConfigs } from './hooks/useConfigs'
import { usePlugins } from './hooks/usePlugins'
import { destroyTerminal, usePtyEvents } from './hooks/useTerminal'
import { PluginDescriptor, Task } from './types'

interface AppState {
  selectedPlugin: PluginDescriptor | null
  selectedConfigId: string | null
  formValues: Record<string, string | number | boolean>
  tasks: Task[]
  activeTaskId: string | null
}

type Action =
  | { type: 'SELECT_PLUGIN'; plugin: PluginDescriptor }
  | {
      type: 'SELECT_CONFIG'
      configId: string | null
      values: Record<string, string | number | boolean>
    }
  | { type: 'SET_FORM_VALUE'; name: string; value: string | number | boolean }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'SET_ACTIVE_TASK'; id: string }
  | { type: 'CLOSE_TASK'; id: string }
  | { type: 'TASK_DONE'; id: string; exitCode?: number }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_PLUGIN':
      return {
        ...state,
        selectedPlugin: action.plugin,
        selectedConfigId: null,
        formValues: initFormValues(action.plugin),
      }
    case 'SELECT_CONFIG':
      return { ...state, selectedConfigId: action.configId, formValues: action.values }
    case 'SET_FORM_VALUE':
      return { ...state, formValues: { ...state.formValues, [action.name]: action.value } }
    case 'ADD_TASK': {
      const existing = state.tasks.find((t) => t.id === action.task.id)
      const tasks = existing
        ? state.tasks.map((t) => (t.id === action.task.id ? { ...t, ...action.task } : t))
        : [...state.tasks, action.task]
      return { ...state, tasks, activeTaskId: action.task.id }
    }
    case 'SET_ACTIVE_TASK':
      return { ...state, activeTaskId: action.id }
    case 'CLOSE_TASK': {
      const tasks = state.tasks.filter((t) => t.id !== action.id)
      const activeTaskId =
        state.activeTaskId === action.id ? (tasks[tasks.length - 1]?.id ?? null) : state.activeTaskId
      return { ...state, tasks, activeTaskId }
    }
    case 'TASK_DONE':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? {
                ...t,
                status: action.exitCode === undefined || action.exitCode === 0 ? 'done' : 'error',
                exitCode: action.exitCode,
              }
            : t,
        ),
      }
    default:
      return state
  }
}

export default function App() {
  const { plugins, refresh } = usePlugins()
  usePtyEvents()
  const pendingInstallRuns = useRef(
    new Map<
      string,
      {
        pluginId: string
        pluginName: string
        configName: string
        params: Record<string, unknown>
      }
    >(),
  )

  const [state, dispatch] = useReducer(reducer, {
    selectedPlugin: null,
    selectedConfigId: null,
    formValues: {},
    tasks: [],
    activeTaskId: null,
  })

  const { configs, saveConfig, deleteConfig } = useConfigs(state.selectedPlugin?.id ?? null)

  useEffect(() => {
    const unsubTaskDone = listen<{ taskId: string; exitCode?: number }>('task_done', (e) => {
      dispatch({ type: 'TASK_DONE', id: e.payload.taskId, exitCode: e.payload.exitCode })

      const pending = pendingInstallRuns.current.get(e.payload.taskId)
      if (!pending) {
        return
      }
      pendingInstallRuns.current.delete(e.payload.taskId)

      if (e.payload.exitCode !== undefined && e.payload.exitCode !== 0) {
        return
      }

      invoke<string>('run_plugin', {
        pluginId: pending.pluginId,
        pluginName: pending.pluginName,
        configName: pending.configName,
        params: pending.params,
        skipInstall: true,
      })
        .then((taskId) => {
          dispatch({
            type: 'ADD_TASK',
            task: {
              id: taskId,
              pluginId: pending.pluginId,
              pluginName: pending.pluginName,
              configName: pending.configName,
              status: 'running',
            },
          })
        })
        .catch((err) => {
          console.error('run_plugin after npm install failed', err)
        })
    })

    const unsubInstall = listen<{
      taskId: string
      pluginId: string
      pluginName: string
      configName: string
      params: Record<string, unknown>
    }>('npm_install_started', (e) => {
      const { taskId, pluginId, pluginName, configName, params } = e.payload
      pendingInstallRuns.current.set(taskId, { pluginId, pluginName, configName, params })
      dispatch({
        type: 'ADD_TASK',
        task: {
          id: taskId,
          pluginId,
          pluginName: `${pluginName} [npm install]`,
          configName,
          status: 'running',
        },
      })
    })

    return () => {
      pendingInstallRuns.current.clear()
      unsubTaskDone.then((fn) => fn())
      unsubInstall.then((fn) => fn())
    }
  }, [])

  const handleSelectConfig = (config: (typeof configs)[number] | null) => {
    if (!state.selectedPlugin) {
      return
    }
    dispatch({
      type: 'SELECT_CONFIG',
      configId: config?.id ?? null,
      values: config
        ? (config.params as Record<string, string | number | boolean>)
        : initFormValues(state.selectedPlugin),
    })
  }

  const handleSaveConfig = async (name: string) => {
    if (!state.selectedPlugin) {
      return
    }
    const saved = await saveConfig(name, state.formValues, state.selectedConfigId ?? undefined)
    if (saved) {
      dispatch({ type: 'SELECT_CONFIG', configId: saved.id, values: state.formValues })
    }
  }

  const handleRun = async () => {
    if (!state.selectedPlugin) {
      return
    }

    const configName = configs.find((c) => c.id === state.selectedConfigId)?.name ?? '默认'
    try {
      const taskId = await invoke<string>('run_plugin', {
        pluginId: state.selectedPlugin.id,
        pluginName: state.selectedPlugin.name,
        configName,
        params: state.formValues,
      })

      if (pendingInstallRuns.current.has(taskId)) {
        return
      }

      dispatch({
        type: 'ADD_TASK',
        task: {
          id: taskId,
          pluginId: state.selectedPlugin.id,
          pluginName: state.selectedPlugin.name,
          configName,
          status: 'running',
        },
      })
    } catch (e) {
      console.error('run_plugin failed', e)
    }
  }

  const handleCloseTask = async (id: string) => {
    await invoke('kill_task', { taskId: id }).catch(console.error)
    destroyTerminal(id)
    dispatch({ type: 'CLOSE_TASK', id })
  }

  const canRun =
    !!state.selectedPlugin &&
    state.selectedPlugin.parameters
      .filter((p) => p.required)
      .every((p) => {
        const v = state.formValues[p.name]
        return v !== '' && v !== undefined && v !== null
      })

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-900">
      <PluginSidebar
        plugins={plugins}
        selectedId={state.selectedPlugin?.id ?? null}
        onSelect={(p) => dispatch({ type: 'SELECT_PLUGIN', plugin: p })}
        onRefresh={refresh}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="max-h-96 overflow-y-auto border-b border-gray-200 p-4">
          {state.selectedPlugin ? (
            <>
              <h2 className="mb-3 text-base font-semibold">{state.selectedPlugin.name}</h2>
              <ConfigBar
                configs={configs}
                selectedId={state.selectedConfigId}
                onSelect={handleSelectConfig}
                onSave={handleSaveConfig}
                onDelete={deleteConfig}
              />
              <div className="mt-3">
                <PluginForm
                  plugin={state.selectedPlugin}
                  values={state.formValues}
                  onChange={(name, value) => dispatch({ type: 'SET_FORM_VALUE', name, value })}
                  onRun={handleRun}
                  canRun={canRun}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">从左侧选择一个插件</p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <TaskTabBar
            tasks={state.tasks}
            activeTaskId={state.activeTaskId}
            onSelect={(id) => dispatch({ type: 'SET_ACTIVE_TASK', id })}
            onClose={handleCloseTask}
          />
          <TerminalPanel tasks={state.tasks} activeTaskId={state.activeTaskId} />
        </div>
      </div>
    </div>
  )
}
