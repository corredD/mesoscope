// The multi-selection (legacy `nodes_selections`) never outlives its nodes (review #3).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { RecipeCanvasToolbar } from '../src/components/recipe/RecipeCanvasToolbar'
import { useRecipeStore } from '../src/state/recipeStore'
import { useUiModeStore } from '../src/state/uiModeStore'

beforeEach(() => {
  useRecipeStore.getState().loadFromJson(JSON.parse(readFileSync(resolve(__dirname, '../../data/InfluenzaA.json'), 'utf-8')))
  useUiModeStore.setState({ editMode: true, selectedNodes: [] })
})

it('Add interaction after deleting a selected node writes no link to it', () => {
  const graph = useRecipeStore.getState().graph!
  const [a, b] = graph.nodes.filter((n) => !n.children)
  useUiModeStore.getState().setSelection([a, b])
  useRecipeStore.getState().deleteIngredient(b)
  render(<RecipeCanvasToolbar />)
  fireEvent.click(screen.getByRole('button', { name: 'Add interaction' }))
  const after = useRecipeStore.getState().graph!
  for (const link of after.links) {
    expect(after.nodes).toContain(link.source)
    expect(after.nodes).toContain(link.target)
  }
})
