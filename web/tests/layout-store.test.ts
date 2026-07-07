import { describe, expect, it } from 'vitest'
import { useLayoutStore } from '../src/state/layoutStore'

describe('layoutStore', () => {
  it('defaults every panel group to hidden (user-directed — see layoutStore.ts docstring)', () => {
    const state = useLayoutStore.getState()
    expect(state.sequenceFeatures).toBe(false)
    expect(state.objectProperties).toBe(false)
    expect(state.interactionTable).toBe(false)
    expect(state.searchTable).toBe(false)
  })

  it('toggles only the targeted group, leaving the others untouched', () => {
    useLayoutStore.setState({ sequenceFeatures: true, objectProperties: true, interactionTable: true, searchTable: true })
    useLayoutStore.getState().toggle('objectProperties')
    const state = useLayoutStore.getState()
    expect(state.objectProperties).toBe(false)
    expect(state.sequenceFeatures).toBe(true)
    expect(state.interactionTable).toBe(true)
    expect(state.searchTable).toBe(true)
  })

  it('toggling twice restores the original value', () => {
    useLayoutStore.setState({ searchTable: false })
    useLayoutStore.getState().toggle('searchTable')
    useLayoutStore.getState().toggle('searchTable')
    expect(useLayoutStore.getState().searchTable).toBe(false)
  })
})
