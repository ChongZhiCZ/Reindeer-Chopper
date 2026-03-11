import { invoke } from '@tauri-apps/api/core'
import { useEffect } from 'react'
import { Task } from '../types'
import { attachTerminal, getOrCreateTerminal } from '../hooks/useTerminal'

interface Props {
  tasks: Task[]
  activeTaskId: string | null
}

export function TerminalPanel({ tasks, activeTaskId }: Props) {
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
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`terminal-layer ${task.id === activeTaskId ? 'terminal-layer-visible' : 'terminal-layer-hidden'}`}
          >
            <div ref={setContainerRef(task.id)} className="terminal-inner" />
          </div>
        ))}
      </div>
    </div>
  )
}
