import { useState } from 'react'
import { PluginConfig } from '../types'

interface Props {
  configs: PluginConfig[]
  selectedId: string | null
  onSelect: (config: PluginConfig | null) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
}

export function ConfigBar({ configs, selectedId, onSelect, onSave, onDelete }: Props) {
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const selected = configs.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
      <span className="shrink-0 text-sm text-gray-600">配置：</span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(configs.find((c) => c.id === e.target.value) ?? null)}
        className="min-w-0 max-w-48 flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">-- 未选择 --</option>
        {configs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {isCreating ? (
        <>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                onSave(newName.trim())
                setNewName('')
                setIsCreating(false)
              }
              if (e.key === 'Escape') {
                setIsCreating(false)
              }
            }}
            placeholder="配置名称"
            className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (newName.trim()) {
                onSave(newName.trim())
                setNewName('')
                setIsCreating(false)
              }
            }}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            确认
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            取消
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            新建
          </button>
          <button
            type="button"
            onClick={() => selected && onSave(selected.name)}
            disabled={!selected}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => selected && onDelete(selected.id)}
            disabled={!selected}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            删除
          </button>
        </>
      )}
    </div>
  )
}
