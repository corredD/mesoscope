import { useRecipeStore } from '../../state/recipeStore'
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
 * `grid_pdb`-style group-by. Name/count/molarity are the only editable
 * fields for now — pcpalAxis/offset edits are read-only here (pdb/uniprot
 * are settable via the PDB/UniProt search panels' "Apply" action).
 */

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
              <td>{data.source?.pdb}</td>
              <td>
                <button type="button" onClick={() => deleteIngredient(node)}>
                  Delete
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
