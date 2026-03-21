import { invoke } from '@tauri-apps/api/core'
import { useEffect } from 'react'
import { SYSTEM_TASK_ID, Task } from '../types'
import { attachTerminal, getOrCreateTerminal } from '../hooks/useTerminal'

interface Props {
  tasks: Task[]
  activeTaskId: string | null
}

export function TerminalPanel({ tasks, activeTaskId }: Props) {
  const terminalIds = [SYSTEM_TASK_ID, ...tasks.map((task) => task.id)]

  const setContainerRef = (taskId: string) => (el: HTMLDivElement | null) => {
    if (!el) {
      return
    }
    attachTerminal(taskId, el)
  }

  useEffect(() => {
    if (!activeTaskId) {
      return
    }

    if (activeTaskId === SYSTEM_TASK_ID) {
      return
    }

    const { terminal } = getOrCreateTerminal(activeTaskId)
    const dispose = terminal.onData((data) => {
      invoke('pty_input', { taskId: activeTaskId, data }).catch(console.error)
    })

    return () => {
      dispose.dispose()
    }
  }, [activeTaskId])

  return (
    <div className="terminal-panel">
      <div className="terminal-stack">
        {terminalIds.map((taskId) => (
          <div
            key={taskId}
            className={`terminal-layer ${taskId === activeTaskId ? 'terminal-layer-visible' : 'terminal-layer-hidden'}`}
          >
            <div ref={setContainerRef(taskId)} className="terminal-inner" />
          </div>
        ))}
      </div>
    </div>
  )
}
