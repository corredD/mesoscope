import { useRecipeStore } from '../../state/recipeStore'
import { Button } from '../ui/Button'
import { isIngredientNode, nodeKey, type RecipeLink } from '../../domain/recipe/types'
import '../recipe/RecipeTable.css'

/**
 * Native React replacement for the legacy `grid_interaction` SlickGrid tab — modeled directly
 * on `RecipeTable.tsx`'s pattern (plain `<table>`, `defaultValue`+`onBlur` commit, trailing
 * Delete button, row click sets selection) rather than a different table shape, matching that
 * file's established conventions in this codebase.
 *
 * Creating a link happens from the canvas toolbar (`RecipeCanvasToolbar.tsx`'s "Add
 * interaction", pairing up a Ctrl+click multi-selection) — this table is for
 * viewing/editing/deleting links that already exist, plus reassigning an endpoint to a
 * different ingredient (`setLinkEndpoint`, a structural change kept separate from the
 * plain-field `updateLink` patches below).
 */
export function InteractionTable() {
  const graph = useRecipeStore((s) => s.graph)
  const updateLink = useRecipeStore((s) => s.updateLink)
  const deleteLink = useRecipeStore((s) => s.deleteLink)
  const setLinkEndpoint = useRecipeStore((s) => s.setLinkEndpoint)
  const selectedLink = useRecipeStore((s) => s.selectedLink)
  const selectLink = useRecipeStore((s) => s.selectLink)

  if (!graph) return <p>Nothing to show in the table yet — load a recipe first.</p>

  const ingredients = graph.nodes.filter(isIngredientNode)
  const rows = graph.links
  if (rows.length === 0) return <p>This recipe has no interactions.</p>

  function endpointSelect(link: RecipeLink, end: 'source' | 'target') {
    const current = link[end]
    return (
      <select
        value={nodeKey(current)}
        onChange={(e) => {
          const node = ingredients.find((n) => nodeKey(n) === Number(e.target.value))
          if (node) setLinkEndpoint(link, end, node)
        }}
      >
        {ingredients.map((n) => (
          <option key={nodeKey(n)} value={nodeKey(n)}>
            {n.data.name}
          </option>
        ))}
      </select>
    )
  }

  return (
    <table className="recipe-table">
      <thead>
        <tr>
          <th>Source</th>
          <th>Target</th>
          <th>Name 1</th>
          <th>Name 2</th>
          <th>PDB</th>
          <th>Selection 1</th>
          <th>Selection 2</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((link) => {
          const key = link.id
          return (
            <tr key={key} className={link === selectedLink ? 'selected' : undefined} onClick={() => selectLink(link)}>
              <td>{endpointSelect(link, 'source')}</td>
              <td>{endpointSelect(link, 'target')}</td>
              <td>
                <input
                  key={`${key}-name1-${link.name1}`}
                  defaultValue={link.name1}
                  onBlur={(e) => e.target.value !== link.name1 && updateLink(link, { name1: e.target.value })}
                />
              </td>
              <td>
                <input
                  key={`${key}-name2-${link.name2}`}
                  defaultValue={link.name2}
                  onBlur={(e) => e.target.value !== link.name2 && updateLink(link, { name2: e.target.value })}
                />
              </td>
              <td>
                <input
                  key={`${key}-pdb1-${link.pdb1}`}
                  defaultValue={link.pdb1}
                  onBlur={(e) => e.target.value !== link.pdb1 && updateLink(link, { pdb1: e.target.value })}
                />
              </td>
              <td>
                <input
                  key={`${key}-sel1-${link.sel1}`}
                  defaultValue={link.sel1}
                  onBlur={(e) => e.target.value !== link.sel1 && updateLink(link, { sel1: e.target.value })}
                />
              </td>
              <td>
                <input
                  key={`${key}-sel2-${link.sel2}`}
                  defaultValue={link.sel2}
                  onBlur={(e) => e.target.value !== link.sel2 && updateLink(link, { sel2: e.target.value })}
                />
              </td>
              <td>
                <Button variant="danger" size="sm" onClick={() => deleteLink(link)}>
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
