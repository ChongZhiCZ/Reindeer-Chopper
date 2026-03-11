import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { PluginConfig } from '../types'

export function useConfigs(pluginId: string | null) {
  const [configs, setConfigs] = useState<PluginConfig[]>([])

  const refresh = useCallback(() => {
    if (!pluginId) {
      setConfigs([])
      return
    }
    invoke<PluginConfig[]>('list_configs', { pluginId }).then(setConfigs).catch(console.error)
  }, [pluginId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveConfig = async (
    name: string,
    params: Record<string, string | number | boolean>,
    existingId?: string,
  ) => {
    if (!pluginId) {
      return null
    }
    const config: PluginConfig = { id: existingId ?? uuidv4(), name, params }
    await invoke('save_config', { pluginId, config })
    refresh()
    return config
  }

  const deleteConfig = async (configId: string) => {
    if (!pluginId) {
      return
    }
    await invoke('delete_config', { pluginId, configId })
    refresh()
  }

  return { configs, saveConfig, deleteConfig, refresh }
}
