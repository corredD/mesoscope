import { Switch as RadixSwitch, type SwitchProps as RadixSwitchProps } from '@radix-ui/themes'
import { forwardRef, useId, type ReactNode } from 'react'
import './Controls.css'

export interface SwitchProps extends Omit<RadixSwitchProps, 'children' | 'className' | 'size'> {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

/** A labelled boolean setting. Selection among several items should remain a checkbox instead. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { children, className, id: providedId, size = 'sm', disabled, ...props },
  ref,
) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const classes = ['app-switch-field', className].filter(Boolean).join(' ')

  return (
    <label className={classes} htmlFor={id} data-disabled={disabled || undefined}>
      <RadixSwitch
        {...props}
        ref={ref}
        id={id}
        disabled={disabled}
        size={size === 'sm' ? '1' : '2'}
        variant="surface"
        color="blue"
        className="app-switch-control"
      />
      <span className="app-switch-label">{children}</span>
    </label>
  )
})
