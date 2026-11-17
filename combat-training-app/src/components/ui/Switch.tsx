import type { ComponentProps, ReactNode } from 'react'

type Props = Omit<ComponentProps<'input'>, 'type' | 'role' | 'children'> & { children: ReactNode; description?: ReactNode }

export function Switch({ children, description, className = '', ...inputProps }: Props) {
  return <label className={`switch-control ${className}`}>
    <span className="min-w-0 flex-1"><span className="block">{children}</span>{description && <span className="block text-xs font-normal text-muted">{description}</span>}</span>
    <span className="switch-target"><input {...inputProps} type="checkbox" role="switch" className="control-input" /><span aria-hidden="true" className="switch-track" /></span>
  </label>
}
