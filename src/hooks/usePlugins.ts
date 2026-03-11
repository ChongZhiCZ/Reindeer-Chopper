import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { PluginDescriptor } from '../types'

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([])

  const refresh = () => {
    invoke<PluginDescriptor[]>('list_plugins').then(setPlugins).catch(console.error)
  }

  useEffect(() => {
    refresh()
  }, [])

  return { plugins, refresh }
}
