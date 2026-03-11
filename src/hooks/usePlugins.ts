import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { PluginDescriptor } from '../types'

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([])

  const refresh = async () => {
    try {
      const list = await invoke<PluginDescriptor[]>('list_plugins')
      setPlugins(list)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return { plugins, refresh }
}
