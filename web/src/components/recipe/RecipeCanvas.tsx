import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useRecipeStore } from '../../state/recipeStore'
import { isIngredientNode, nodeKey, type IngredientData, type RecipeNode } from '../../domain/recipe/types'
import './RecipeCanvas.css'

/**
 * Replaces the "Recipe View" text-summary placeholder with the actual
 * hierarchy visualization — the modern equivalent of js/main.js's
 * `update_graph`/`ticked` canvas (main.js:5565-5628, 3892-4042).
 *
 * Native reimplementation over legacy wrap, same reasoning as RecipeTable.tsx
 * and the PDB search panels: legacy's canvas reads/writes the global `graph`
 * directly (drag-to-reparent mutates it in place, `node_selected` etc.),
 * which conflicts with recipeStore being the single source of truth. Built
 * with the npm `d3` package instead of the bundled `extras`'s D3 v4 global.
 *
 * Legacy draws on a single 2D `<canvas>`; this draws SVG circles instead —
 * simpler to keep declarative in React, and at recipe-sized node counts
 * (tens to low hundreds) SVG's per-element overhead isn't a real concern.
 *
 * Ported: `d3.hierarchy` + `d3.pack` circle-packing layout (main.js:5576-5581,
 * pack instance main.js:2896-2898) — compartments as rings, ingredients as
 * filled circles nested inside, sized by `size` and colored by `data.color`
 * when set (matches the [r,g,b] 0-1 float convention already used by
 * `domain/colors/colorPalette.ts`) or an ordinal depth scale otherwise.
 * Click-to-select feeds `recipeStore.selectNode`, the same seam RecipeTable
 * and the PDB/UniProt search panels already use (legacy's `node_selected`).
 * Basic zoom/pan via `d3.zoom` (main.js:2957-2960/3091) since it's cheap on
 * an SVG group transform.
 *
 * NOT ported (each a separate, larger slice — see the audit in
 * web/README-modernization.md's "Phase 4 progress: recipe canvas" section):
 * the force-simulation collision settling (main.js's `simulation`, cosmetic
 * only — `d3.pack` alone already produces a non-overlapping static layout),
 * drag-to-reparent between compartments (mutates persistent structure in
 * legacy's edit mode), sprite/thumbnail image rendering
 * (`drawThumbnailInCanvas`), curved compartment name labels
 * (`drawCircularText`), the many `colorNode` property-mapping modes beyond
 * the explicit-color/depth default, and cross-panel sync equivalents to
 * `NGL_UpdateWithNode`/Mol* highlighting beyond the existing `selectedNode`
 * seam those panels already read from.
 */

const WIDTH = 600
const HEIGHT = 600
const depthColor = d3.scaleOrdinal(d3.schemeTableau10)

function explicitColor(color: number[] | null | undefined): string | null {
  if (!color || color.length < 3) return null
  const [r, g, b] = color
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}

function fillColor(node: RecipeNode, depth: number): string {
  return explicitColor(node.data.color) ?? depthColor(String(depth))
}

/** Legacy `d.size` (main.js:5576's `.sum(d => d.size)`) — only leaves carry weight. */
function packWeight(node: RecipeNode): number {
  if (!isIngredientNode(node)) return 0
  return Math.max((node.data as IngredientData).size || 1, 0.1)
}

export function RecipeCanvas() {
  const graph = useRecipeStore((s) => s.graph)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const selectNode = useRecipeStore((s) => s.selectNode)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomGroupRef = useRef<SVGGElement>(null)

  const root = graph?.nodes[0] ?? null

  const packed = useMemo(() => {
    if (!root) return null
    const hierarchy = d3.hierarchy(root, (d) => d.children).sum(packWeight)
    const pack = d3.pack<RecipeNode>().size([WIDTH - 8, HEIGHT - 8]).padding(3)
    return pack(hierarchy).descendants()
    // `graph` (not just `root`) is a dependency: node data mutates in place
    // (updateIngredient/applyPdbPick/color import) without changing identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, graph])

  useEffect(() => {
    const svg = svgRef.current
    const group = zoomGroupRef.current
    if (!svg || !group) return
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 8])
      .on('zoom', (event) => {
        group.setAttribute('transform', event.transform.toString())
      })
    const selection = d3.select(svg)
    selection.call(zoom)
    return () => {
      selection.on('.zoom', null)
    }
  }, [])

  if (!graph || !root) {
    return <p className="panel-note">No recipe loaded. Use Load &gt; New Recipe.</p>
  }
  if (!packed) return null

  return (
    <svg
      ref={svgRef}
      className="recipe-canvas"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      onClick={() => selectNode(null)}
    >
      <g ref={zoomGroupRef}>
        {packed.map((node) => {
          const isLeaf = !node.children
          const selected = node.data === selectedNode
          return (
            <circle
              key={nodeKey(node.data)}
              cx={node.x}
              cy={node.y}
              r={node.r}
              className={isLeaf ? 'recipe-canvas-ingredient' : 'recipe-canvas-compartment'}
              fill={isLeaf ? fillColor(node.data, node.depth) : 'none'}
              stroke={selected ? '#ff8800' : isLeaf ? 'none' : fillColor(node.data, node.depth)}
              strokeWidth={selected ? 3 : isLeaf ? 0 : 1.5}
              onClick={(event) => {
                event.stopPropagation()
                selectNode(node.data)
              }}
            >
              <title>{node.data.data.name}</title>
            </circle>
          )
        })}
      </g>
    </svg>
  )
}
