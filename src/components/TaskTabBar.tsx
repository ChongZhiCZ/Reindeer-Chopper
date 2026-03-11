import { Task } from '../types'

interface Props {
  tasks: Task[]
  activeTaskId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

function statusColor(status: Task['status']) {
  if (status === 'running') {
    return 'bg-green-400'
  }
  if (status === 'error') {
    return 'bg-red-400'
  }
  return 'bg-gray-400'
}

export function TaskTabBar({ tasks, activeTaskId, onSelect, onClose }: Props) {
  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="flex items-end gap-0.5 overflow-x-auto border-b border-gray-200">
      {tasks.map((task) => {
        const isActive = task.id === activeTaskId
        const title = `${task.pluginName}-${task.configName}`

        return (
          <div
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`
              flex cursor-pointer select-none items-center gap-1.5 rounded-t border-x border-t px-3 py-1.5 text-sm
              ${
                isActive
                  ? 'shrink-0 border-gray-200 bg-white text-gray-900'
                  : 'min-w-0 border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }
            `}
            style={isActive ? {} : { minWidth: '80px', maxWidth: '160px' }}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor(task.status)}`} />
            <span className={isActive ? '' : 'flex-1 truncate'} title={title}>
              {title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose(task.id)
              }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
