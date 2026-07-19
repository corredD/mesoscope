import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../src/components/ui/Button'

describe('Button', () => {
  it('uses safe native-button defaults and the secondary medium appearance', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('data-variant', 'secondary')
    expect(button).toHaveAttribute('data-size', 'md')
  })

  it('exposes the requested hierarchy and density through stable design-system attributes', () => {
    render(
      <Button variant="danger" size="sm">
        Delete
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('app-button--danger', 'app-button--sm')
  })

  it('blocks duplicate activation and exposes progress while loading', () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" loading onClick={onClick}>
        Search
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Search' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.rt-Spinner')).toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('preserves accessible labels for icon-only controls', () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Close">
        <span aria-hidden="true">×</span>
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})
