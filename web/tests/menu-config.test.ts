import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_RECIPE_ROOT,
  MENU,
  type MenuAction,
  type MenuNode,
} from '../src/components/layout/menuConfig'

function collectActions(nodes: MenuNode[]): MenuAction[] {
  return nodes.flatMap((node) => (node.kind === 'leaf' ? [node.action] : collectActions(node.items)))
}

describe('example recipe menu URLs', () => {
  it('loads every exposed example directly from the CORS-enabled GitHub source', () => {
    const exampleActions = MENU.flatMap((group) => collectActions(group.items)).filter(
      (action): action is Extract<MenuAction, { kind: 'load-example' | 'merge-example' }> =>
        action.kind === 'load-example' || action.kind === 'merge-example',
    )

    expect(exampleActions).toHaveLength(11)
    for (const action of exampleActions) {
      expect(action.url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/corredD\/mesoscope\/master\/data\/[^/]+\.json$/)
      expect(action.url.startsWith(EXAMPLE_RECIPE_ROOT)).toBe(true)
    }

    expect(new Set(exampleActions.map((action) => action.url.slice(EXAMPLE_RECIPE_ROOT.length)))).toEqual(
      new Set([
        'HIV_serialized.json',
        'HIV_immature.json',
        'BloodPlasmaHIV_serialized.json',
        'HIV_immature_blood.json',
        'InfluenzaA.json',
        'InfluenzaFull.json',
        'exosome_catalase.json',
        'BloodPlasma_serialized.json',
        'Mpn_1.0_2.json',
      ]),
    )
  })
})
