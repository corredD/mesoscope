import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RecipeCanvas } from '../src/components/recipe/RecipeCanvas'
import { isIngredientNode } from '../src/domain/recipe/types'
import { useRecipeStore } from '../src/state/recipeStore'
import { useUiModeStore } from '../src/state/uiModeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
  useUiModeStore.setState({ editMode: false })
})

describe('RecipeCanvas', () => {
  it('shows a message instead of the canvas when no recipe is loaded', () => {
    render(<RecipeCanvas />)
    expect(screen.getByText(/No recipe loaded/)).toBeInTheDocument()
    expect(document.querySelector('svg.recipe-canvas')).not.toBeInTheDocument()
  })

  it('hides the synthetic root and renders one node group per visible compartment/ingredient', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeCanvas />)

    const graph = useRecipeStore.getState().graph!
    const visibleNodes = document.querySelectorAll('svg.recipe-canvas [data-recipe-node="true"]')
    expect(visibleNodes).toHaveLength(graph.nodes.length - 1)
    expect(document.querySelector('svg.recipe-canvas [data-node-name="root"]')).not.toBeInTheDocument()
  })

  it('draws a compartment as a two-edge membrane with a wider invisible interaction band', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeCanvas />)

    const compartment = document.querySelector('svg.recipe-canvas [data-node-type="compartment"]')!
    expect(compartment.querySelectorAll('[data-membrane-edge]')).toHaveLength(2)
    const outer = compartment.querySelector('[data-membrane-edge="outer"]')!
    const inner = compartment.querySelector('[data-membrane-edge="inner"]')!
    expect(Number(outer.getAttribute('r'))).toBeGreaterThan(Number(inner.getAttribute('r')))
    const hit = compartment.querySelector('[data-compartment-hit="true"]')!
    expect(Number(hit.getAttribute('stroke-width'))).toBeGreaterThan(7.5)
  })

  it('clicking an ingredient circle selects that node in recipeStore', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeCanvas />)

    const graph = useRecipeStore.getState().graph!
    const ingredient = graph.nodes.find((n) => isIngredientNode(n) && n.data.name === 'Hemagglutinin')!
    const circles = Array.from(document.querySelectorAll('svg.recipe-canvas circle'))
    const target = circles.find((c) => c.querySelector('title')?.textContent === 'Hemagglutinin')!

    fireEvent.click(target)
    expect(useRecipeStore.getState().selectedNode).toBe(ingredient)
  })

  it('clicking the background clears the current selection', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    useRecipeStore.getState().selectNode(graph.nodes[1])
    render(<RecipeCanvas />)

    fireEvent.click(document.querySelector('svg.recipe-canvas')!)
    expect(useRecipeStore.getState().selectedNode).toBeNull()
  })

  it('resizes the SVG coordinate system and background to the available panel aspect ratio', () => {
    const OriginalResizeObserver = globalThis.ResizeObserver
    class ImmediateResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        this.callback([{ contentRect: { width: 800, height: 320 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver)
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ImmediateResizeObserver as unknown as typeof ResizeObserver

    try {
      useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
      render(<RecipeCanvas />)
      const svg = document.querySelector('svg.recipe-canvas')!
      const background = svg.querySelector(':scope > rect')!
      expect(svg).toHaveAttribute('viewBox', '0 0 800 320')
      expect(background).toHaveAttribute('width', '800')
      expect(background).toHaveAttribute('height', '320')
    } finally {
      globalThis.ResizeObserver = OriginalResizeObserver
    }
  })

  it('drags a non-root compartment with Edit Mode off', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<RecipeCanvas />)

    // jsdom has no SVG coordinate transforms; an identity transform is sufficient to exercise
    // the React pointer wiring and the hook's rigid-subtree movement.
    Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({}) }),
    })
    const OriginalDOMPoint = globalThis.DOMPoint
    class DOMPointStub {
      constructor(public x = 0, public y = 0) {}
      matrixTransform() {
        return { x: this.x, y: this.y }
      }
    }
    globalThis.DOMPoint = DOMPointStub as unknown as typeof DOMPoint

    try {
      const graph = useRecipeStore.getState().graph!
      const compartment = graph.nodes.find((node) => node.data.nodetype === 'compartment' && node.parent)!
      const circle = Array.from(document.querySelectorAll('svg.recipe-canvas circle')).find(
        (candidate) => candidate.querySelector('title')?.textContent === compartment.data.name,
      )!
      const group = circle.parentElement!
      const before = group.getAttribute('transform')

      fireEvent.pointerDown(circle, { clientX: 100, clientY: 100, pointerId: 1 })
      fireEvent.pointerMove(document.querySelector('svg.recipe-canvas')!, { clientX: 130, clientY: 100, pointerId: 1 })
      fireEvent.pointerUp(document.querySelector('svg.recipe-canvas')!, { pointerId: 1 })

      expect(useUiModeStore.getState().editMode).toBe(false)
      expect(group.getAttribute('transform')).not.toBe(before)
    } finally {
      globalThis.DOMPoint = OriginalDOMPoint
    }
  })

  // Since `useRecipeSimulation.ts` moved to a live, continuously-ticking `d3.forceSimulation`,
  // unmount must cleanly `.stop()` it — an un-stopped simulation would keep mutating refs to
  // now-detached DOM nodes (or leak its internal timer into the next test). These two cases are
  // exactly the risks flagged in that file's own design (StrictMode double-invocation, timer
  // leakage into jsdom's shared test environment).
  it('unmounts cleanly with no thrown error while the live simulation is still settling', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const { unmount } = render(<RecipeCanvas />)
    expect(() => unmount()).not.toThrow()
  })

  it('supports a StrictMode mount→unmount→remount cycle without duplicating the simulation (correct circle count, no thrown error)', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    expect(() =>
      render(
        <StrictMode>
          <RecipeCanvas />
        </StrictMode>,
      ),
    ).not.toThrow()
    const visibleNodes = document.querySelectorAll('svg.recipe-canvas [data-recipe-node="true"]')
    expect(visibleNodes).toHaveLength(graph.nodes.length - 1)
  })
})
