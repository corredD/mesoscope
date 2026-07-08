import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { InteractionTable } from '../src/components/recipe/InteractionTable'
import { useRecipeStore } from '../src/state/recipeStore'

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, '../../data', name), 'utf-8'))
}

/** `getByDisplayValue` also matches the endpoint `<select>`'s selected option text — this
 *  picks out just the `<input>` (the name1/name2 field), which is what these tests care about. */
function nameInput(value: string): HTMLElement {
  return screen.getAllByDisplayValue(value).find((el) => el.tagName === 'INPUT')!
}

beforeEach(() => {
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null, selectedLink: null })
})

describe('InteractionTable', () => {
  it('shows a message instead of a table when no recipe is loaded', () => {
    render(<InteractionTable />)
    expect(screen.getByText(/Nothing to show in the table yet/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a message instead of a table when the recipe has no interactions', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    render(<InteractionTable />)
    expect(screen.getByText(/This recipe has no interactions/)).toBeInTheDocument()
  })

  it('renders one row per link, matching name1/name2/pdb1', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)

    render(<InteractionTable />)
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1) // header + 1 link
    expect(nameInput('Hemagglutinin')).toBeInTheDocument()
    expect(nameInput('Neuraminidase')).toBeInTheDocument()
  })

  it('committing an edited field updates the store', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)
    render(<InteractionTable />)

    const input = nameInput('Hemagglutinin')
    fireEvent.change(input, { target: { value: 'HA-renamed' } })
    fireEvent.blur(input)

    expect(useRecipeStore.getState().graph!.links[0].name1).toBe('HA-renamed')
  })

  it('clicking Delete removes the link from the store', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)
    render(<InteractionTable />)

    const row = nameInput('Hemagglutinin').closest('tr')!
    fireEvent.click(row.querySelector('button')!)

    expect(useRecipeStore.getState().graph!.links).toHaveLength(0)
  })

  it('row click selects the link', () => {
    useRecipeStore.getState().loadFromJson(loadFixture('InfluenzaA.json'))
    const graph = useRecipeStore.getState().graph!
    const ha = graph.nodes.find((n) => n.data.name === 'Hemagglutinin')!
    const na = graph.nodes.find((n) => n.data.name === 'Neuraminidase')!
    useRecipeStore.getState().addLink(ha, na)
    render(<InteractionTable />)

    const row = nameInput('Hemagglutinin').closest('tr')!
    fireEvent.click(row)

    expect(useRecipeStore.getState().selectedLink).toBe(useRecipeStore.getState().graph!.links[0])
  })
})
