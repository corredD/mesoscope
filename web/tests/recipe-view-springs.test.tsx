// Dragology blends the old and new render on every state change (a 200 ms spring) and pairs children by index;
// a thumbnail that finishes loading mid-spring must not change which child is which (review #1).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { RecipeCanvas } from '../src/components/recipe/RecipeCanvas'
import { useRecipeStore } from '../src/state/recipeStore'
import { useUiModeStore } from '../src/state/uiModeStore'

const images: { onload: null | (() => void) }[] = []
class FakeImage {
  onload: null | (() => void) = null
  onerror: null | (() => void) = null
  src = ''
  naturalWidth = 200
  naturalHeight = 200
  constructor() {
    images.push(this)
  }
}
vi.stubGlobal('Image', FakeImage)

it('a sprite loading during a spring does not break the blend of a surface ingredient', () => {
  useRecipeStore.getState().loadFromJson(JSON.parse(readFileSync(resolve(__dirname, '../../data/InfluenzaA.json'), 'utf-8')))
  const errors: string[] = []
  const spy = vi.spyOn(console, 'error').mockImplementation((e) => void errors.push(String(e)))
  render(<RecipeCanvas />)
  act(() => useUiModeStore.getState().setRadiusScale(1.2)) // a new state: a spring starts
  let thrown: unknown = null
  try {
    act(() => images.forEach((img) => img.onload?.()))
  } catch (e) {
    thrown = e
  }
  spy.mockRestore()
  expect(String(thrown ?? '') + errors.join('\n')).not.toMatch(/Cannot lerp/)
  expect(document.querySelectorAll('[data-node-id] image').length).toBeGreaterThan(0)
})
