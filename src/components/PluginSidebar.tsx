import { PluginDescriptor } from '../types'

interface Props {
  plugins: PluginDescriptor[]
  selectedId: string | null
  onSelect: (plugin: PluginDescriptor) => void
  onImport: () => void
  onUninstall: () => void
  uninstallDisabled: boolean
}

export function PluginSidebar({
  plugins,
  selectedId,
  onSelect,
  onImport,
  onUninstall,
  uninstallDisabled,
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span>PLUGINS</span>
        <div className="sidebar-head-actions">
          <button
            type="button"
            onClick={onImport}
            title="导入插件目录"
            className="sidebar-action"
          >
            IMPORT
          </button>
        </div>
      </div>
      <div className="sidebar-list">
        {plugins.length === 0 ? (
          <p className="sidebar-empty">NO PLUGINS FOUND</p>
        ) : (
          plugins.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelect(p)}
              className={`plugin-item ${p.id === selectedId ? 'plugin-item-active' : ''}`}
              title={p.name}
            >
              {p.name}
            </button>
          ))
        )}
      </div>
      <div className="sidebar-foot">
        <button
          type="button"
          onClick={onUninstall}
          disabled={uninstallDisabled}
          className="btn-uninstall"
        >
          UNINSTALL PLUGIN
        </button>
      </div>
    </aside>
  )
}
