import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { type MouseEvent as ReactMouseEvent, useEffect, useReducer, useRef, useState } from 'react'
import { ConfigBar } from './components/ConfigBar'
import { PluginForm, initFormValues } from './components/PluginForm'
import { PluginSidebar } from './components/PluginSidebar'
import { TaskTabBar } from './components/TaskTabBar'
import { TerminalPanel } from './components/TerminalPanel'
import { useConfigs } from './hooks/useConfigs'
import { usePlugins } from './hooks/usePlugins'
import { destroyTerminal, usePtyEvents, useTaskLogEvents, writeToTerminal } from './hooks/useTerminal'
import { PluginDescriptor, SYSTEM_TASK_ID, Task } from './types'

interface AppState {
  selectedPlugin: PluginDescriptor | null
  selectedConfigId: string | null
  formValues: Record<string, string | number | boolean>
  tasks: Task[]
  activeTaskId: string | null
}

type Action =
  | { type: 'SELECT_PLUGIN'; plugin: PluginDescriptor }
  | { type: 'CLEAR_PLUGIN' }
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
    case 'CLEAR_PLUGIN':
      return {
        ...state,
        selectedPlugin: null,
        selectedConfigId: null,
        formValues: {},
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
        state.activeTaskId === action.id ? (tasks[tasks.length - 1]?.id ?? SYSTEM_TASK_ID) : state.activeTaskId
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

function errorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }
  return String(error)
}

export default function App() {
  const { plugins, refresh } = usePlugins()
  usePtyEvents()
  useTaskLogEvents()
  const clampTerminalHeight = (height: number) => {
    const min = 180
    const max = Math.max(min, window.innerHeight - 220)
    return Math.min(max, Math.max(min, height))
  }

  const [terminalHeight, setTerminalHeight] = useState(() => clampTerminalHeight(320))
  const [uninstallTarget, setUninstallTarget] = useState<{ id: string; name: string } | null>(null)
  const [removeConfigsOnUninstall, setRemoveConfigsOnUninstall] = useState(false)
  const [isUninstalling, setIsUninstalling] = useState(false)
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)
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
    activeTaskId: SYSTEM_TASK_ID,
  })

  const { configs, saveConfig, deleteConfig } = useConfigs(state.selectedPlugin?.id ?? null)

  const appendSystemError = (phase: string, error: unknown) => {
    writeToTerminal(
      SYSTEM_TASK_ID,
      `[${new Date().toISOString()}] [frontend] [error] [${phase}] ${errorMessage(error)}\r\n`,
    )
  }

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
          console.error('run_plugin after install failed', err)
          appendSystemError('run_plugin.skipInstall', err)
        })
    })

    const unsubInstall = listen<{
      taskId: string
      pluginId: string
      pluginName: string
      configName: string
      params: Record<string, unknown>
    }>('install_started', (e) => {
      const { taskId, pluginId, pluginName, configName, params } = e.payload
      pendingInstallRuns.current.set(taskId, { pluginId, pluginName, configName, params })
      dispatch({
        type: 'ADD_TASK',
        task: {
          id: taskId,
          pluginId,
          pluginName: `${pluginName} [install]`,
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

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const state = resizeStateRef.current
      if (!state) {
        return
      }

      const delta = state.startY - event.clientY
      setTerminalHeight(clampTerminalHeight(state.startHeight + delta))
    }

    const handleMouseUp = () => {
      if (!resizeStateRef.current) {
        return
      }
      resizeStateRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const handleWindowResize = () => {
      setTerminalHeight((height) => clampTerminalHeight(height))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', handleWindowResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
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

  const handleImportPlugin = async () => {
    try {
      const selected = await open({ directory: true, multiple: false })
      if (!selected || Array.isArray(selected)) {
        return
      }

      const imported = await invoke<PluginDescriptor>('import_plugin', { sourcePath: selected })
      dispatch({ type: 'SELECT_PLUGIN', plugin: imported })
      await refresh()
    } catch (error) {
      window.alert(`导入失败：${errorMessage(error)}`)
    }
  }

  const handleUninstallPlugin = () => {
    if (!state.selectedPlugin) {
      return
    }
    setUninstallTarget({ id: state.selectedPlugin.id, name: state.selectedPlugin.name })
    setRemoveConfigsOnUninstall(false)
  }

  const closeUninstallModal = () => {
    if (isUninstalling) {
      return
    }
    setUninstallTarget(null)
    setRemoveConfigsOnUninstall(false)
  }

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) {
      return
    }

    setIsUninstalling(true)
    try {
      await invoke('uninstall_plugin', {
        pluginId: uninstallTarget.id,
        removeConfigs: removeConfigsOnUninstall,
      })
      dispatch({ type: 'CLEAR_PLUGIN' })
      setUninstallTarget(null)
      setRemoveConfigsOnUninstall(false)
      await refresh()
    } catch (error) {
      window.alert(`卸载失败：${errorMessage(error)}`)
    } finally {
      setIsUninstalling(false)
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
      appendSystemError('run_plugin', e)
    }
  }

  const handleTerminalResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: terminalHeight,
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  const handleCloseTask = async (id: string) => {
    if (id === SYSTEM_TASK_ID) {
      return
    }
    await invoke('kill_task', { taskId: id }).catch((err) => {
      console.error(err)
      appendSystemError('kill_task', err)
    })
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
    <div className="app-shell">
      <header className="topbar">reindeer-chopper</header>
      <div className="app-layout">
        <PluginSidebar
          plugins={plugins}
          selectedId={state.selectedPlugin?.id ?? null}
          onSelect={(p) => dispatch({ type: 'SELECT_PLUGIN', plugin: p })}
          onImport={handleImportPlugin}
          onUninstall={handleUninstallPlugin}
          uninstallDisabled={!state.selectedPlugin}
        />

        <main className="main-area">
          <div className="content-panel">
            {state.selectedPlugin ? (
              <>
                <h1 className="page-title">{state.selectedPlugin.name}</h1>
                <p className="page-desc">{state.selectedPlugin.description ?? 'No description provided.'}</p>
                <ConfigBar
                  configs={configs}
                  selectedId={state.selectedConfigId}
                  onSelect={handleSelectConfig}
                  onSave={handleSaveConfig}
                  onDelete={deleteConfig}
                  onRun={handleRun}
                  canRun={canRun}
                />
                <PluginForm
                  plugin={state.selectedPlugin}
                  values={state.formValues}
                  onChange={(name, value) => dispatch({ type: 'SET_FORM_VALUE', name, value })}
                />
              </>
            ) : (
              <p className="empty-state">SELECT A PLUGIN FROM THE LEFT PANEL.</p>
            )}
          </div>

          <div className="terminal-shell" style={{ height: `${terminalHeight}px` }}>
            <div
              role="separator"
              aria-orientation="horizontal"
              onMouseDown={handleTerminalResizeStart}
              className="terminal-resize-handle"
              title="拖动调整终端高度"
            >
              <div className="terminal-resize-line" />
            </div>

            <div className="terminal-frame">
              <TaskTabBar
                tasks={state.tasks}
                activeTaskId={state.activeTaskId}
                onSelect={(id) => dispatch({ type: 'SET_ACTIVE_TASK', id })}
                onClose={handleCloseTask}
              />
              <TerminalPanel tasks={state.tasks} activeTaskId={state.activeTaskId} />
            </div>
          </div>
        </main>
      </div>

      {uninstallTarget ? (
        <div className="modal-overlay" onClick={closeUninstallModal}>
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="uninstall-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div id="uninstall-modal-title" className="modal-head">
              CONFIRM UNINSTALL
            </div>
            <div className="modal-body">
              <p className="modal-text">Uninstall plugin "{uninstallTarget.name}"?</p>
              <p className="modal-text modal-text-muted">
                This removes plugin files. Config deletion is optional.
              </p>
              <label className="modal-checkbox-row">
                <input
                  type="checkbox"
                  className="field-checkbox"
                  checked={removeConfigsOnUninstall}
                  onChange={(event) => setRemoveConfigsOnUninstall(event.target.checked)}
                  disabled={isUninstalling}
                />
                <span>Also delete this plugin&apos;s config file</span>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="control-btn modal-btn" onClick={closeUninstallModal} disabled={isUninstalling}>
                CANCEL
              </button>
              <button
                type="button"
                className="control-btn modal-btn modal-btn-danger"
                onClick={handleConfirmUninstall}
                disabled={isUninstalling}
              >
                {isUninstalling ? 'UNINSTALLING...' : 'UNINSTALL'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
