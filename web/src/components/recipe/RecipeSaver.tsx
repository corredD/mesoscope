import { downloadJson, downloadText } from '../../domain/files/saveFile'
import { exportColorPalette } from '../../domain/colors/colorPalette'
import { exportRecipeCsv } from '../../domain/files/csv'
import { exportMolarityCount, serializeRecipeClassic, serializeRecipeSerialized } from '../../domain/recipe/serializeRecipe'
import { useRecipeStore } from '../../state/recipeStore'

/**
 * Save menu actions. Legacy equivalents: SaveRecipeCellPACK /
 * SaveRecipeCellPACK_serialized (js/query_helper.js), saveCurrentCSV
 * (js/query_helper.js), cp_SerializedColorSchem / cp_SerializedMolarity
 * (js/cp_serialized.js).
 *
 * Not included here — see web/README-modernization.md: cellPAINT
 * recipe+sprites .zip (needs local sprite/file management this phase
 * doesn't build) and Color mapping (property_mapping is populated by the
 * still-unbuilt canvas coloring-by-property feature; saving it now would be
 * a structurally valid but always-empty file).
 */
export function useRecipeSaver() {
  const graph = useRecipeStore((s) => s.graph)
  const setError = useRecipeStore((s) => s.setError)

  const requireGraph = () => {
    if (graph) return graph
    setError('No recipe is loaded — nothing to save.')
    return null
  }

  return {
    saveClassic: () => {
      const g = requireGraph()
      if (!g) return
      const json = serializeRecipeClassic(g)
      downloadJson(json, `${json.recipe.name}.json`)
    },
    saveSerialized: () => {
      const g = requireGraph()
      if (!g) return
      const json = serializeRecipeSerialized(g)
      downloadJson(json, `${json.name}_serialized.json`)
    },
    saveCsv: () => {
      const g = requireGraph()
      if (!g) return
      downloadText(exportRecipeCsv(g), `${g.nodes[0].data.name}.csv`, 'text/csv;charset=utf-8;')
    },
    saveColorPalette: () => {
      const g = requireGraph()
      if (!g) return
      downloadJson(exportColorPalette(g), 'palette.json')
    },
    saveMolarity: () => {
      const g = requireGraph()
      if (!g) return
      downloadJson(exportMolarityCount(g), 'molarity.json')
    },
  }
}
