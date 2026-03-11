import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'

interface TerminalEntry {
  terminal: Terminal
  fitAddon: FitAddon
  container: HTMLDivElement | null
  resizeObserver: ResizeObserver | null
}

const terminalMap = new Map<string, TerminalEntry>()

export function getOrCreateTerminal(taskId: string): TerminalEntry {
  if (!terminalMap.has(taskId)) {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminalMap.set(taskId, {
      terminal,
      fitAddon,
      container: null,
      resizeObserver: null,
    })
  }
  return terminalMap.get(taskId) as TerminalEntry
}

export function attachTerminal(taskId: string, container: HTMLDivElement) {
  const entry = getOrCreateTerminal(taskId)
  if (entry.container === container) {
    entry.fitAddon.fit()
    return
  }
  if (entry.container) {
    return
  }

  entry.terminal.open(container)
  entry.fitAddon.fit()

  const ro = new ResizeObserver(() => entry.fitAddon.fit())
  ro.observe(container)
  entry.container = container
  entry.resizeObserver = ro
}

export function destroyTerminal(taskId: string) {
  const entry = terminalMap.get(taskId)
  if (entry) {
    entry.resizeObserver?.disconnect()
    entry.terminal.dispose()
    terminalMap.delete(taskId)
  }
}

export function usePtyEvents() {
  useEffect(() => {
    const unlisten = listen<{ taskId: string; data: string }>('pty_output', (event) => {
      const { taskId, data } = event.payload
      const entry = terminalMap.get(taskId)
      entry?.terminal.write(data)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])
}
