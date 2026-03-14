import { useEffect, useMemo, useRef, useState } from 'react'

interface WireSelectOption {
  value: string
  label: string
}

interface Props {
  id?: string
  value: string
  options: WireSelectOption[]
  onChange: (value: string) => void
  triggerClassName: string
  containerClassName?: string
  disabled?: boolean
}

export function WireSelect({ id, value, options, onChange, triggerClassName, containerClassName, disabled }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value])
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onDocumentPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentPointerDown)
    return () => document.removeEventListener('mousedown', onDocumentPointerDown)
  }, [isOpen])

  useEffect(() => {
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex)
    }
  }, [selectedIndex])

  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : options[0]?.label ?? ''

  const selectIndex = (index: number) => {
    const option = options[index]
    if (!option) {
      return
    }
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={`wire-select${containerClassName ? ` ${containerClassName}` : ''}`}>
      <button
        id={id}
        type="button"
        className={`${triggerClassName} wire-select-trigger`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => !open)
          }
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return
          }

          if (event.key === 'Escape') {
            setIsOpen(false)
            return
          }

          if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            setIsOpen(true)
            return
          }

          if (!isOpen) {
            return
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((idx) => (idx + 1) % Math.max(options.length, 1))
            return
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((idx) => (idx - 1 + Math.max(options.length, 1)) % Math.max(options.length, 1))
            return
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            selectIndex(activeIndex)
          }
        }}
      >
        <span className="wire-select-value">{selectedLabel}</span>
      </button>

      {isOpen ? (
        <div className="wire-select-menu" role="listbox">
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            const isActive = index === activeIndex
            return (
              <button
                key={option.value}
                type="button"
                className={`wire-select-option${isSelected ? ' wire-select-option-selected' : ''}${isActive ? ' wire-select-option-active' : ''}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectIndex(index)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
