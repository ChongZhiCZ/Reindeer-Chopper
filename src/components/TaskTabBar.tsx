import { SYSTEM_TASK_ID, Task } from '../types'

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
  const tabs: Array<{
    id: string
    title: string
    status: Task['status']
    closable: boolean
  }> = [
    {
      id: SYSTEM_TASK_ID,
      title: 'SYSTEM',
      status: 'done',
      closable: false,
    },
    ...tasks.map((task) => ({
      id: task.id,
      title: `${task.pluginName} - ${task.configName}`,
      status: task.status,
      closable: true,
    })),
  ]

  return (
    <div className="task-tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTaskId

        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`task-tab ${isActive ? 'task-tab-active' : ''}`}
            style={{ minWidth: '120px', maxWidth: '240px' }}
          >
            <span className={`task-dot ${statusColor(tab.status)}`} />
            <span className="task-label" title={tab.title}>
              {tab.title}
            </span>
            {tab.closable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
                className="task-close"
              >
                ×
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
