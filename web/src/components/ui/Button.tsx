import { Button as RadixButton, type ButtonProps as RadixButtonProps } from '@radix-ui/themes'
import { forwardRef, type ReactNode } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'chrome' | 'menu'
export type ButtonSize = 'sm' | 'md' | 'icon'

export interface ButtonProps extends Omit<RadixButtonProps, 'color' | 'loading' | 'size' | 'variant'> {
  /** Visual hierarchy, intentionally kept small so actions remain consistent across panels. */
  variant?: ButtonVariant
  /** Compact remains WCAG 2.2 target-sized; icon is a square target for labelled icon controls. */
  size?: ButtonSize
  /** Keeps the button's dimensions stable while showing progress and blocks duplicate activation. */
  loading?: boolean
  children: ReactNode
}

/**
 * Mesoscope's single action primitive. Radix Themes supplies the native button behavior,
 * accessible states, loading treatment, and visual foundation; this wrapper keeps feature code
 * independent of the library and limits the supported hierarchy to Mesoscope's design language.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, className, disabled, type = 'button', children, ...props },
  ref,
) {
  const classes = ['app-button', `app-button--${variant}`, `app-button--${size}`, className].filter(Boolean).join(' ')
  const radixVariant =
    variant === 'primary' ? 'solid' : variant === 'secondary' ? 'surface' : variant === 'danger' ? 'soft' : 'ghost'

  return (
    <RadixButton
      {...props}
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      loading={loading}
      aria-busy={loading || undefined}
      variant={radixVariant}
      color={variant === 'danger' ? 'red' : variant === 'secondary' ? 'gray' : 'blue'}
      size={size === 'sm' ? '1' : '2'}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </RadixButton>
  )
})
