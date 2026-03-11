import { ReactNode } from 'react'

interface Props {
  label: string
  description?: string
  required?: boolean
  children: ReactNode
}

export function FieldWrapper({ label, description, required, children }: Props) {
  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {required && <span className="field-required">*</span>}
      </label>
      {children}
      {description && <p className="field-hint">{description}</p>}
    </div>
  )
}
