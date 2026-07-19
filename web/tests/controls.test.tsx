import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from '../src/components/ui/Slider'
import { Switch } from '../src/components/ui/Switch'

describe('Switch', () => {
  it('has an accessible label and reports boolean changes', () => {
    const onCheckedChange = vi.fn()
    render(
      <Switch checked={false} onCheckedChange={onCheckedChange}>
        Show legend
      </Switch>,
    )

    const control = screen.getByRole('switch', { name: 'Show legend' })
    expect(control).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(control)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})

describe('Slider', () => {
  it('exposes its scientific label and supports keyboard increments', () => {
    const onValueChange = vi.fn()
    render(
      <Slider aria-label="Surface force" min={0} max={2} step={0.01} value={0.5} onValueChange={onValueChange} />,
    )

    const control = screen.getByRole('slider', { name: 'Surface force' })
    expect(control).toHaveAttribute('aria-valuenow', '0.5')
    fireEvent.keyDown(control, { key: 'ArrowRight' })
    expect(onValueChange).toHaveBeenCalledWith(0.51)
  })
})
