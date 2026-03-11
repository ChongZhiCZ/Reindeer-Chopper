import { ReactNode } from 'react'

interface Props {
  label: string
  description?: string
  required?: boolean
  children: ReactNode
}

export function FieldWrapper({ label, description, required, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  )
}
