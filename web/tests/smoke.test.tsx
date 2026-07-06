import { useEffect, useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../src/components/layout/AppShell'
import { useLayoutStore } from '../src/state/layoutStore'
import { useRecipeStore } from '../src/state/recipeStore'

// Mol-star needs a real WebGL context (THREE.WebGLRenderer), which jsdom doesn't provide — it's
// exercised live in a browser instead (see web/README-modernization.md's "Phase 4 progress:
// viewer mount"/"Ingredient Options" sections). Stub both plugin instances here so AppShell's
// menu/layout tests, which aren't about the viewers, don't have to fight jsdom's WebGL gap.
vi.mock('../src/components/pdb/MolstarViewer', () => ({ MolstarViewer: () => <div>Mol-* viewer stub</div> }))
vi.mock('../src/components/pdb/IngredientViewer', () => ({ IngredientViewer: () => <div>Ingredient viewer stub</div> }))

// dockview needs `ResizeObserver` (and real layout measurement) that jsdom doesn't provide.
// Real drag/resize/dock behavior is exercised live in a browser instead (see
// web/README-modernization.md's "resizable/dockable panel layout" section). This fake
// reproduces just enough of the `DockviewApi` surface `Workspace.tsx` calls
// (`addPanel`/`removePanel`/`getPanel`) to keep these tests meaningful: it tracks which
// panels are currently "added" and renders each one's title text plus its real content
// component, so the panel-presence/Layout-Options-toggle assertions below still exercise
// real behavior instead of being deleted along with the old fixed-layout implementation.
vi.mock('dockview-react', () => {
  function DockviewReact({ components, onReady }: { components: Record<string, React.ComponentType>; onReady: (e: unknown) => void }) {
    const panelsRef = useRef(new Map<string, { component: string; title?: string }>())
    const apiRef = useRef<{
      addPanel: (opts: { id: string; component: string; title?: string }) => { id: string }
      removePanel: (panel: { id: string }) => void
      getPanel: (id: string) => { id: string } | undefined
    } | null>(null)
    const [, rerender] = useState(0)
    if (!apiRef.current) {
      apiRef.current = {
        addPanel: (opts) => {
          if (!panelsRef.current.has(opts.id)) {
            panelsRef.current.set(opts.id, opts)
            rerender((n) => n + 1)
          }
          return { id: opts.id }
        },
        removePanel: (panel) => {
          if (panelsRef.current.delete(panel.id)) rerender((n) => n + 1)
        },
        getPanel: (id) => (panelsRef.current.has(id) ? { id } : undefined),
      }
    }
    useEffect(() => {
      onReady({ api: apiRef.current })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
      <div>
        {[...panelsRef.current.entries()].map(([id, opts]) => {
          const Content = components[opts.component]
          return (
            <div key={id}>
              <div>{opts.title}</div>
              <Content />
            </div>
          )
        })}
      </div>
    )
  }
  function DockviewDefaultTab() {
    return null
  }
  return { DockviewReact, DockviewDefaultTab, themeLight: {}, themeDark: {} }
})

beforeEach(() => {
  useLayoutStore.setState({
    sequenceFeatures: true,
    objectProperties: true,
    interactionTable: true,
    searchTable: true,
  })
  useRecipeStore.setState({ graph: null, format: null, error: null, loading: false, selectedNode: null })
})

describe('AppShell', () => {
  it('renders the four legacy menu groups and the default viewer-row/table-row panels', () => {
    render(<AppShell />)
    for (const label of ['Load', 'Save', 'Layout Options', 'Skills']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    // js/layout_mg.js:config_light — always-present panels/tabs, independent of any toggle.
    for (const panel of ['Recipe Options', 'Recipe View', 'Ingredient Options', 'Ingredient View', 'Mol-*', 'Table Options', 'Recipe table']) {
      expect(screen.getByText(panel)).toBeInTheDocument()
    }
    // gated by the four Layout Options toggles, all visible by default
    for (const panel of ['Object Properties', 'Sequence features', 'Topology', 'Uniprot mapping', 'Interaction table', 'Uniprot search table', 'PDB search table']) {
      expect(screen.getByText(panel)).toBeInTheDocument()
    }
    // no recipe loaded yet
    expect(screen.getByText(/No recipe loaded/)).toBeInTheDocument()
  })

  it('opens a nested Load menu and shows a "not yet available" dialog for still-deferred items', () => {
    render(<AppShell />)
    fireEvent.click(screen.getByRole('button', { name: 'Load' }))
    fireEvent.click(screen.getByText('New Recipe'))
    fireEvent.click(screen.getByText('From YASARA Petworld'))
    const sarsCov2 = screen.getByText('Sars-cov-2 mature')
    expect(sarsCov2).toBeInTheDocument()

    fireEvent.click(sarsCov2)
    expect(screen.getByRole('dialog')).toHaveTextContent('Sars-cov-2 mature')
  })

  it('Load > New Recipe > Empty Recipe creates a bare root recipe, shown in the Recipe View panel', () => {
    render(<AppShell />)
    fireEvent.click(screen.getByRole('button', { name: 'Load' }))
    fireEvent.click(screen.getByText('New Recipe'))
    fireEvent.click(screen.getByText('Empty Recipe'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument() // real action, no placeholder dialog
    expect(useRecipeStore.getState().graph?.nodes[0].data.name).toBe('root')
    expect(screen.getByText('root', { selector: 'dd' })).toBeInTheDocument()
  })

  it('Save > cellPACK/cellPAINT recipe shows an error dialog when no recipe is loaded', () => {
    render(<AppShell />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByText('cellPACK/cellPAINT recipe'))

    expect(screen.getByRole('dialog')).toHaveTextContent('No recipe is loaded')
  })

  it('toggles the interaction-table tab via Layout Options, matching legacy Show/Hide label flipping', () => {
    render(<AppShell />)
    expect(screen.getByText('Interaction table')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Layout Options' }))
    fireEvent.click(screen.getByText('Hide Interaction Table'))

    expect(screen.queryByText('Interaction table')).not.toBeInTheDocument()
    // the rest of that tab group's siblings are untouched
    expect(screen.getByText('Recipe table')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Layout Options' }))
    expect(screen.getByText('Show Interaction Table')).toBeInTheDocument()
  })

  it('toggling sequence features hides its three tabs but keeps Mol-* in the same stack', () => {
    render(<AppShell />)
    fireEvent.click(screen.getByRole('button', { name: 'Layout Options' }))
    fireEvent.click(screen.getByText('Hide Sequence Feature'))

    for (const panel of ['Sequence features', 'Topology', 'Uniprot mapping']) {
      expect(screen.queryByText(panel)).not.toBeInTheDocument()
    }
    expect(screen.getByText('Mol-*')).toBeInTheDocument()
  })
})
