import { PluginDescriptor } from '../types'

interface Props {
  plugins: PluginDescriptor[]
  selectedId: string | null
  onSelect: (plugin: PluginDescriptor) => void
  onRefresh: () => void
}

export function PluginSidebar({ plugins, selectedId, onSelect, onRefresh }: Props) {
  return (
    <div className="flex w-48 shrink-0 flex-col border-r border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">插件</span>
        <button
          type="button"
          onClick={onRefresh}
          title="刷新插件列表"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ↻
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {plugins.length === 0 ? (
          <p className="p-3 text-xs text-gray-400">未找到插件</p>
        ) : (
          plugins.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelect(p)}
              className={`w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50
                ${p.id === selectedId ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`}
              title={p.name}
            >
              {p.name}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
