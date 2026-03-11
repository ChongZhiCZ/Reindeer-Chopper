import { Task } from '../types'

interface Props {
  tasks: Task[]
  activeTaskId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

function statusColor(status: Task['status']) {
  if (status === 'running') {
    return 'task-dot-running'
  }
  if (status === 'error') {
    return 'task-dot-error'
  }
  return 'task-dot-done'
}

export function TaskTabBar({ tasks, activeTaskId, onSelect, onClose }: Props) {
  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="task-tab-bar">
      {tasks.map((task) => {
        const isActive = task.id === activeTaskId
        const title = `${task.pluginName} - ${task.configName}`

        return (
          <div
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`task-tab ${isActive ? 'task-tab-active' : ''}`}
            style={{ minWidth: '120px', maxWidth: '240px' }}
          >
            <span className={`task-dot ${statusColor(task.status)}`} />
            <span className="task-label" title={title}>
              {title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose(task.id)
              }}
              className="task-close"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
