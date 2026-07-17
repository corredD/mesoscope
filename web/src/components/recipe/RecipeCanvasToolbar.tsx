import { useRecipeStore } from '../../state/recipeStore'
import { useUiModeStore } from '../../state/uiModeStore'
import { listGroupableProperties, computePropertyMapping } from '../../domain/recipe/propertyMapping'
import { ancestorsSelfFirst, isIngredientNode } from '../../domain/recipe/types'
import { BUILTIN_COLOR_MODES, computeCategoricalPalette, resolveFillColor, type ColorModeContext } from '../../domain/recipe/colorModes'
import './RecipeCanvasToolbar.css'

const BUILTIN_COLOR_MODES_SET = new Set<string>(BUILTIN_COLOR_MODES)
const LABEL_OPTIONS = ['name', 'None', 'pdb', 'uniprot', 'label'] as const

/**
 * Replaces the "Recipe Options" placeholder — the modern equivalent of legacy's `canvasOption`
 * toolbar (js/layout_mg.js:155-181): Edit Mode + the three "Add..." buttons it gates
 * (`switchMode`, main.js:278-290), "Node group by" (`ClusterNodeBy`), "Node color" +
 * min/max pickers + "Apply to ingredient color" (`ChangeCanvasColor`/`ChangeMinColor`/
 * `ChangeMaxColor`/`applyColorModeToIngredient`), "Node size" (`mapRadiusToProperty`), "Node
 * label" (the `canvas_label` dropdown — real rendering despite its own legacy `onchange`
 * handler being dead code, see `uiModeStore.ts`), "Node image" (sprite visibility), "Scale
 * Radius by"/"Stroke Line width" (`radius_scale`/`stroke_line_width` globals), and "Forces
 * Options" (`AllForces` tuning — Parent/Surface/Link/ClusterBy/Collision). Lives in
 * a separate dockview panel from `RecipeCanvas` ("Recipe View"), so both read/write
 * `uiModeStore` rather than being passed props directly — see `uiModeStore.ts`'s docstring.
 */
export function RecipeCanvasToolbar() {
  const graph = useRecipeStore((s) => s.graph)
  const addIngredient = useRecipeStore((s) => s.addIngredient)
  const addCompartment = useRecipeStore((s) => s.addCompartment)
  const addLink = useRecipeStore((s) => s.addLink)
  const applyColorModeToIngredient = useRecipeStore((s) => s.applyColorModeToIngredient)
  const editMode = useUiModeStore((s) => s.editMode)
  const toggleEditMode = useUiModeStore((s) => s.toggleEditMode)
  const selectedNodes = useUiModeStore((s) => s.selectedNodes)
  const clearSelection = useUiModeStore((s) => s.clearSelection)
  const groupBy = useUiModeStore((s) => s.groupBy)
  const setGroupBy = useUiModeStore((s) => s.setGroupBy)
  const colorMode = useUiModeStore((s) => s.colorMode)
  const setColorMode = useUiModeStore((s) => s.setColorMode)
  const minColor = useUiModeStore((s) => s.minColor)
  const maxColor = useUiModeStore((s) => s.maxColor)
  const setMinColor = useUiModeStore((s) => s.setMinColor)
  const setMaxColor = useUiModeStore((s) => s.setMaxColor)
  const visitedNodes = useUiModeStore((s) => s.visitedNodes)
  const sizeBy = useUiModeStore((s) => s.sizeBy)
  const setSizeBy = useUiModeStore((s) => s.setSizeBy)
  const labelBy = useUiModeStore((s) => s.labelBy)
  const setLabelBy = useUiModeStore((s) => s.setLabelBy)
  const showSprites = useUiModeStore((s) => s.showSprites)
  const toggleShowSprites = useUiModeStore((s) => s.toggleShowSprites)
  const showLegend = useUiModeStore((s) => s.showLegend)
  const toggleShowLegend = useUiModeStore((s) => s.toggleShowLegend)
  const useColorMapping = useUiModeStore((s) => s.useColorMapping)
  const toggleUseColorMapping = useUiModeStore((s) => s.toggleUseColorMapping)
  const radiusScale = useUiModeStore((s) => s.radiusScale)
  const setRadiusScale = useUiModeStore((s) => s.setRadiusScale)
  const strokeWidth = useUiModeStore((s) => s.strokeWidth)
  const setStrokeWidth = useUiModeStore((s) => s.setStrokeWidth)
  const parentForce = useUiModeStore((s) => s.parentForce)
  const surfaceForce = useUiModeStore((s) => s.surfaceForce)
  const linkForce = useUiModeStore((s) => s.linkForce)
  const clusterByForce = useUiModeStore((s) => s.clusterByForce)
  const collisionForce = useUiModeStore((s) => s.collisionForce)
  const setForce = useUiModeStore((s) => s.setForce)

  if (!graph) return <p className="panel-note">Load a recipe to use the canvas view options.</p>

  const groupableProperties = listGroupableProperties(graph.nodes)

  function handleAddInteraction() {
    // Pairs up the current Ctrl+click multi-selection 2-at-a-time, matching legacy's `addLink`
    // (main.js:4545-4610) — a trailing unpaired selection is left out, same as legacy.
    for (let i = 0; i + 1 < selectedNodes.length; i += 2) {
      addLink(selectedNodes[i], selectedNodes[i + 1])
    }
    clearSelection()
  }

  function handleApplyColor() {
    if (!graph) return
    const propertyMapping = computePropertyMapping(graph.nodes)
    const categoricalPalettes = new Map<string, ReadonlyMap<string, string>>()
    if (!BUILTIN_COLOR_MODES_SET.has(colorMode)) {
      categoricalPalettes.set(colorMode, computeCategoricalPalette(graph.nodes, colorMode))
    }
    const nodeIndex = new Map(graph.nodes.map((n, i) => [n, i]))
    const ctx: ColorModeContext = {
      mode: colorMode,
      minColor,
      maxColor,
      propertyMapping,
      visitedNodes,
      categoricalPalettes,
      useColorMapping,
      nodeIndex,
      nodeCount: graph.nodes.length,
    }
    // Only ingredients — the button is "Apply to *ingredient* color", matching legacy's own
    // wording; computing an accurate depth for compartments here would need the pack layout,
    // which only `RecipeCanvas.tsx` has, for no real benefit (baking a fallback depth-color
    // into a compartment's persisted data isn't a meaningful "apply" for a ring that renders
    // `fill="none"` anyway).
    applyColorModeToIngredient((node) => {
      const depth = ancestorsSelfFirst(node).length - 1
      return resolveFillColor(node, depth, isIngredientNode(node), ctx)
    })
  }

  return (
    <div className="recipe-canvas-toolbar">
      <label>
        <input type="checkbox" checked={editMode} onChange={toggleEditMode} />
        Edit Mode
      </label>
      {editMode && (
        <div className="recipe-canvas-toolbar-edit-actions">
          <button type="button" onClick={addIngredient}>
            Add ingredient
          </button>
          <button type="button" onClick={addCompartment}>
            Add compartment
          </button>
          <button type="button" onClick={handleAddInteraction} disabled={selectedNodes.length < 2}>
            Add interaction
          </button>
          {selectedNodes.length > 0 && (
            <p className="panel-note">
              {selectedNodes.length} node{selectedNodes.length === 1 ? '' : 's'} selected (Ctrl+click ingredients on the
              canvas, then Add interaction)
            </p>
          )}
        </div>
      )}
      <label>
        Group by
        <select value={groupBy ?? 'none'} onChange={(e) => setGroupBy(e.target.value === 'none' ? null : e.target.value)}>
          <option value="none">None</option>
          {groupableProperties.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>
      <p className="panel-note">
        Drag any non-root node to arrange it. {editMode && 'Drop a node onto another compartment to reparent it.'}
      </p>

      <label>
        Node color
        <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
          {BUILTIN_COLOR_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
          {groupableProperties
            .filter((key) => !BUILTIN_COLOR_MODES_SET.has(key))
            .map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
        </select>
      </label>
      <div className="recipe-canvas-toolbar-color-pickers">
        <label>
          Min <input type="color" value={minColor} onChange={(e) => setMinColor(e.target.value)} />
        </label>
        <label>
          Max <input type="color" value={maxColor} onChange={(e) => setMaxColor(e.target.value)} />
        </label>
        <button type="button" onClick={handleApplyColor}>
          Apply to ingredient color
        </button>
      </div>
      <label>
        <input type="checkbox" checked={useColorMapping} onChange={toggleUseColorMapping} />
        Use color linear mapping
      </label>

      <label>
        Node size
        <select value={sizeBy} onChange={(e) => setSizeBy(e.target.value)}>
          <option value="size">size</option>
          <option value="default">default</option>
          <option value="molecularweight">molecularweight</option>
          <option value="radius_molecularweight">radius_molecularweight</option>
          {groupableProperties
            .filter((key) => !['size', 'molecularweight'].includes(key))
            .map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
        </select>
      </label>
      <label>
        Scale Radius by
        <input
          type="number"
          min="0.01"
          max="10"
          step="0.01"
          value={radiusScale}
          onChange={(e) => setRadiusScale(parseFloat(e.target.value) || 0.01)}
        />
      </label>

      <label>
        Node label
        <select value={labelBy} onChange={(e) => setLabelBy(e.target.value as (typeof LABEL_OPTIONS)[number])}>
          {LABEL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        <input type="checkbox" checked={showSprites} onChange={toggleShowSprites} />
        Node image
      </label>
      <label>
        <input type="checkbox" checked={showLegend} onChange={toggleShowLegend} />
        Show legend
      </label>

      <label>
        Stroke Line width
        <input
          type="number"
          min="0.01"
          max="10"
          step="0.01"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(parseFloat(e.target.value) || 0.01)}
        />
      </label>

      {/* "Forces Options" — legacy's `getForcesInputs`/`AllForces` (js/layout_mg.js:266-275,
          main.js:177-183). A single number input per force rather than legacy's redundant
          paired range+number controls for the same value — the same value, simplified UI,
          matching this feature's "modern approach, easy to maintain" framing. */}
      <fieldset className="recipe-canvas-toolbar-forces">
        <legend>Forces Options</legend>
        <label>
          ParentForce
          <input type="number" min="0" max="2" step="0.01" value={parentForce} onChange={(e) => setForce('parentForce', parseFloat(e.target.value) || 0)} />
        </label>
        <label>
          SurfaceForce
          <input type="number" min="0" max="2" step="0.01" value={surfaceForce} onChange={(e) => setForce('surfaceForce', parseFloat(e.target.value) || 0)} />
        </label>
        <label>
          LinkForce
          <input type="number" min="0" max="2" step="0.01" value={linkForce} onChange={(e) => setForce('linkForce', parseFloat(e.target.value) || 0)} />
        </label>
        <label>
          ClusterByForce
          <input type="number" min="0" max="2" step="0.01" value={clusterByForce} onChange={(e) => setForce('clusterByForce', parseFloat(e.target.value) || 0)} />
        </label>
        <label>
          CollisionForce
          <input type="number" min="0" max="2" step="0.01" value={collisionForce} onChange={(e) => setForce('collisionForce', parseFloat(e.target.value) || 0)} />
        </label>
      </fieldset>
    </div>
  )
}
