import * as SliderPrimitive from '@radix-ui/react-slider'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import './Controls.css'

export interface SliderProps
  extends Omit<
    ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    'children' | 'defaultValue' | 'onValueChange' | 'onValueCommit' | 'value'
  > {
  'aria-label': string
  value: number
  onValueChange: (value: number) => void
  onValueCommit?: (value: number) => void
  size?: 'sm' | 'md'
}

/** Single-value Mesoscope slider; hides Radix's array API from feature components. */
export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  { value, onValueChange, onValueCommit, size = 'sm', className, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const classes = ['app-slider', className].filter(Boolean).join(' ')

  return (
    <SliderPrimitive.Root
      {...props}
      ref={ref}
      value={[value]}
      onValueChange={(values) => onValueChange(values[0])}
      onValueCommit={onValueCommit ? (values) => onValueCommit(values[0]) : undefined}
      className={classes}
      data-size={size}
    >
      <SliderPrimitive.Track className="app-slider-track">
        <SliderPrimitive.Range className="app-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="app-slider-thumb" aria-label={ariaLabel} />
    </SliderPrimitive.Root>
  )
})
