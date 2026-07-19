import { useRecipeStore } from '../../state/recipeStore'
import { Button } from '../ui/Button'
import { buildAncestorCompartmentPath, isIngredientNode, nodeKey, type IngredientData } from '../../domain/recipe/types'
import './RecipeTable.css'

/**
 * Native React replacement for the legacy `grid_recipe` SlickGrid
 * (js/gridtable.js) — deliberately NOT a wrap of that grid. Cell edits there
 * write straight into the global D3 `graph` (`updateAttributesNode`,
 * js/gridtable.js:1551); wrapping it as-is would mean re-introducing that
 * global in bidirectional sync with `recipeStore`, which Phase 2/3 removed
 * on purpose. Editing here goes through `recipeStore.updateIngredient` /
 * `deleteIngredient` instead, so `recipeStore` stays the single source of
 * truth.
 *
 * Scope: only the ingredient rows (legacy `grid_recipe`). `grid_interaction`
 * (partner links) is deferred; `grid_uniprot`/`grid_pdb` (search-result
 * tables) are PdbSearchPanel/UniprotSearchPanel, which write picks back
 * onto `recipeStore.selectedNode` — this table sets that selection when a
 * row is clicked, the modern equivalent of legacy's `node_selected` global.
 *
 * Not yet ported from the legacy grid: image/sprite thumbnail column
 * (`renderImageRecipeCell`), column picker, pager, inline filter panel,
 * `grid_pdb`-style group-by. Name/count/molarity/PDB/ingredient type are
 * editable here; pcpalAxis/offset edits remain in Ingredient Options.
 */

const INGREDIENT_TYPES = ['protein', 'fiber', 'ligand'] as const

export function RecipeTable() {
  const graph = useRecipeStore((s) => s.graph)
  const updateIngredient = useRecipeStore((s) => s.updateIngredient)
  const deleteIngredient = useRecipeStore((s) => s.deleteIngredient)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const selectNode = useRecipeStore((s) => s.selectNode)

  if (!graph) return <p>Nothing to show in the table yet — load a recipe first.</p>

  const rows = graph.nodes.filter(isIngredientNode)
  if (rows.length === 0) return <p>This recipe has no ingredients.</p>

  return (
    <table className="recipe-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Compartment</th>
          <th>Location</th>
          <th>Count</th>
          <th>Molarity</th>
          <th>PDB</th>
          <th>Type</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((node) => {
          const data = node.data as IngredientData
          const key = nodeKey(node)
          return (
            <tr key={key} className={node === selectedNode ? 'selected' : undefined} onClick={() => selectNode(node)}>
              <td>
                <input
                  key={`${key}-name-${data.name}`}
                  defaultValue={data.name}
                  onBlur={(e) => e.target.value !== data.name && updateIngredient(node, { name: e.target.value })}
                />
              </td>
              <td>{buildAncestorCompartmentPath(node) || node.parent?.data.name}</td>
              <td>{data.surface ? 'surface' : 'interior'}</td>
              <td>
                <input
                  key={`${key}-count-${data.count}`}
                  type="number"
                  defaultValue={data.count}
                  onBlur={(e) => updateIngredient(node, { count: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  key={`${key}-molarity-${data.molarity}`}
                  type="number"
                  defaultValue={data.molarity}
                  onBlur={(e) => updateIngredient(node, { molarity: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  aria-label={`${data.name} PDB`}
                  key={`${key}-pdb-${data.source?.pdb ?? ''}`}
                  defaultValue={data.source?.pdb ?? ''}
                  onBlur={(event) => {
                    const pdb = event.target.value.trim()
                    if (pdb !== (data.source?.pdb ?? '')) updateIngredient(node, { source: { ...data.source, pdb } })
                  }}
                />
              </td>
              <td>
                <select
                  aria-label={`${data.name} ingredient type`}
                  value={data.ingtype}
                  onChange={(event) => updateIngredient(node, { ingtype: event.target.value })}
                >
                  {INGREDIENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <Button variant="danger" size="sm" onClick={() => deleteIngredient(node)}>
                  Delete
                </Button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
