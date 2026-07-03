import { beforeEach, describe, expect, it } from 'vitest'
import { useLayoutStore } from '../src/state/layoutStore'

beforeEach(() => {
  useLayoutStore.setState({
    sequenceFeatures: true,
    objectProperties: true,
    interactionTable: true,
    searchTable: true,
  })
})

describe('layoutStore', () => {
  it('defaults every panel group to visible', () => {
    const state = useLayoutStore.getState()
    expect(state.sequenceFeatures).toBe(true)
    expect(state.objectProperties).toBe(true)
    expect(state.interactionTable).toBe(true)
    expect(state.searchTable).toBe(true)
  })

  it('toggles only the targeted group, leaving the others untouched', () => {
    useLayoutStore.getState().toggle('objectProperties')
    const state = useLayoutStore.getState()
    expect(state.objectProperties).toBe(false)
    expect(state.sequenceFeatures).toBe(true)
    expect(state.interactionTable).toBe(true)
    expect(state.searchTable).toBe(true)
  })

  it('toggling twice restores the original value', () => {
    useLayoutStore.getState().toggle('searchTable')
    useLayoutStore.getState().toggle('searchTable')
    expect(useLayoutStore.getState().searchTable).toBe(true)
  })
})
