import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Structure } from 'molstar/lib/mol-model/structure/structure/structure.js'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IngredientOptions } from '../src/components/pdb/IngredientOptions'
import type { IngredientData, RecipeNode } from '../src/domain/recipe/types'
import { useIngredientViewerStore } from '../src/state/ingredientViewerStore'
import { useRecipeStore } from '../src/state/recipeStore'

const viewerMocks = vi.hoisted(() => ({
  clearFiberGizmo: vi.fn(async () => {}),
  clearLodLevel: vi.fn(async () => {}),
  clearMembraneGeometry: vi.fn(async () => {}),
  setFiberGizmo: vi.fn(async () => {}),
  setFiberPreview: vi.fn(async () => {}),
}))
const structureMocks = vi.hoisted(() => ({
  getAtomPositions: vi.fn<() => [number, number, number][]>(() => []),
}))

vi.mock('../src/domain/pdb/ingredientViewControls', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/domain/pdb/ingredientViewControls')>()),
  ...viewerMocks,
}))
vi.mock('../src/domain/pdb/molstarStructureUtil', () => structureMocks)

function fiberIngredient(): RecipeNode {
  const data: IngredientData = {
    nodetype: 'ingredient',
    name: 'test-fiber',
    label: 'Test fiber',
    size: 10,
    molecularweight: 0,
    confidence: 0,
    source: { pdb: '', bu: 'BU1', model: '0', selection: '' },
    count: 1,
    molarity: 0,
    surface: false,
    geom: '',
    geom_type: 'None',
    comments: '',
    uniprot: '',
    pcpalAxis: [0, 0, 1],
    offset: [0, 0, 0],
    fiberAxis: [0, 0, 1, 40],
    fiberOffset: [0, 0, 0],
    pos: null,
    radii: null,
    ingtype: 'fiber',
    buildtype: 'random',
    color: null,
    sprite: { image: null, offsety: 0, scale2d: 1, lengthy: 0 },
  }
  return { data, parent: null }
}

afterEach(() => {
  vi.clearAllMocks()
  structureMocks.getAtomPositions.mockReturnValue([])
  useRecipeStore.setState({ graph: null, selectedNode: null, selectedLink: null })
  useIngredientViewerStore.setState({ plugin: null, trajectoryRef: null, chains: [], structure: null, structureRef: null })
})

describe('IngredientOptions fiber controls', () => {
  it('extends orientation offsets to 200 and exposes the fiber preview sliders', () => {
    const selectedNode = fiberIngredient()
    useRecipeStore.setState({ graph: { nodes: [selectedNode], links: [] }, selectedNode })

    render(<IngredientOptions />)

    const offsetX = screen.getByRole('slider', { name: 'Offset X' })
    expect(offsetX).toHaveAttribute('aria-valuemin', '-200')
    expect(offsetX).toHaveAttribute('aria-valuemax', '200')

    const rise = screen.getByRole('slider', { name: 'Fiber length (rise)' })
    expect(rise).toHaveAttribute('aria-valuenow', '40')
    expect(rise).toHaveAttribute('aria-valuemax', '200')

    fireEvent.click(screen.getByRole('switch', { name: 'Preview fiber assembly' }))
    expect(screen.getByRole('slider', { name: 'Preview copies' })).toHaveAttribute('aria-valuemax', '50')
    expect(screen.getByRole('slider', { name: 'Fiber twist' })).toHaveAttribute('aria-valuemin', '-180')
    expect(screen.getByRole('slider', { name: 'Fiber twist' })).toHaveAttribute('aria-valuemax', '180')
  })

  it('sets the maximum fiber rise to 100Å plus the loaded ingredient maximum span', () => {
    const selectedNode = fiberIngredient()
    const points: [number, number, number][] = [
      [-80, -20, 5],
      [170, 40, 15],
    ]
    structureMocks.getAtomPositions.mockReturnValue(points)
    useRecipeStore.setState({ graph: { nodes: [selectedNode], links: [] }, selectedNode })
    useIngredientViewerStore.setState({ structure: {} as Structure })

    render(<IngredientOptions />)

    expect(screen.getByRole('slider', { name: 'Fiber length (rise)' })).toHaveAttribute('aria-valuemax', '350')
    expect(screen.getByRole('spinbutton', { name: 'Fiber length (rise) value' })).toHaveAttribute('max', '350')
  })

  it('updates StructureInstances from every Fiber Orientation slider while preview is on', async () => {
    const selectedNode = fiberIngredient()
    const plugin = {} as PluginUIContext
    useRecipeStore.setState({ graph: { nodes: [selectedNode], links: [] }, selectedNode })
    useIngredientViewerStore.setState({ plugin })
    render(<IngredientOptions />)

    fireEvent.click(screen.getByRole('switch', { name: 'Preview fiber assembly' }))
    await waitFor(() => expect(viewerMocks.setFiberPreview).toHaveBeenLastCalledWith(plugin, expect.objectContaining({ copies: 6 })))

    const expectLatest = async (expected: Record<string, unknown>) => {
      await waitFor(() => expect(viewerMocks.setFiberPreview).toHaveBeenLastCalledWith(plugin, expect.objectContaining(expected)))
    }

    for (const { name, key = 'ArrowRight' } of [
      { name: 'Axis X' },
      { name: 'Axis Y' },
      { name: 'Axis Z', key: 'ArrowLeft' },
      { name: 'Fiber length (rise)' },
      { name: 'Offset X' },
      { name: 'Offset Y' },
      { name: 'Offset Z' },
      { name: 'Preview copies' },
      { name: 'Fiber twist' },
    ]) {
      const callsBefore = viewerMocks.setFiberPreview.mock.calls.length
      fireEvent.keyDown(screen.getByRole('slider', { name }), { key })
      await waitFor(() => expect(viewerMocks.setFiberPreview.mock.calls.length).toBeGreaterThan(callsBefore))
      expect(viewerMocks.setFiberPreview.mock.calls.at(-1)?.[1]).not.toBeNull()
    }

    await expectLatest({ rise: 41, copies: 7, twist: 1 })
    const preview = viewerMocks.setFiberPreview.mock.calls.at(-1)?.[1]
    expect(preview?.axis.every(Number.isFinite)).toBe(true)
    expect(preview?.offset).toEqual([1, 1, 1])
  })

  it('enters fiber mode immediately when the selected table row type changes', async () => {
    const selectedNode = fiberIngredient()
    selectedNode.data.ingtype = 'protein'
    useRecipeStore.setState({ graph: { nodes: [selectedNode], links: [] }, selectedNode })
    render(<IngredientOptions />)

    expect(screen.queryByRole('switch', { name: 'Preview fiber assembly' })).not.toBeInTheDocument()
    act(() => useRecipeStore.getState().updateIngredient(selectedNode, { ingtype: 'fiber' }))

    expect(await screen.findByRole('switch', { name: 'Preview fiber assembly' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Fiber orientation' })).toHaveAttribute('aria-checked', 'true')
  })
})
