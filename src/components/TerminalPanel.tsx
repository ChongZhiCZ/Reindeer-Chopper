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
    <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
      <div className="relative h-full w-full">
        {tasks.map((task) => (
          <div
            key={task.id}
            ref={setContainerRef(task.id)}
            className={`absolute inset-0 ${task.id === activeTaskId ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          />
        ))}
      </div>
    </div>
  )
}
