import { useState } from 'react'
import { PluginConfig } from '../types'

interface Props {
  configs: PluginConfig[]
  selectedId: string | null
  onSelect: (config: PluginConfig | null) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
  onRun: () => void
  canRun: boolean
}

export function ConfigBar({ configs, selectedId, onSelect, onSave, onDelete, onRun, canRun }: Props) {
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const selected = configs.find((c) => c.id === selectedId) ?? null

  return (
    <div className="control-bar">
      <div className="control-label">CONFIG</div>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(configs.find((c) => c.id === e.target.value) ?? null)}
        className="control-select"
      >
        <option value="">-- NONE --</option>
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
            placeholder="CONFIG NAME"
            className="control-input"
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
            className="control-btn"
          >
            CREATE
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="control-btn"
          >
            CANCEL
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="control-btn"
          >
            NEW
          </button>
          <button
            type="button"
            onClick={() => selected && onSave(selected.name)}
            disabled={!selected}
            className="control-btn"
          >
            SAVE
          </button>
          <button
            type="button"
            onClick={() => selected && onDelete(selected.id)}
            disabled={!selected}
            className="control-btn"
          >
            DELETE
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onRun}
        disabled={!canRun}
        className="control-btn run"
      >
        RUN CONFIG
      </button>
    </div>
  )
}
