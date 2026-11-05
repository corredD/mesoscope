import { useRecipeStore } from '../../state/recipeStore'
import { useUiModeStore } from '../../state/uiModeStore'
import { customIngredientFields, isIngredientNode, type IngredientData, type RecipeNode } from '../../domain/recipe/types'
import { COLOR_MODES, PROPERTY_MAPPING_KEYS, colorNode, colorNodeInfos, prepareColors } from '../../domain/recipe/view/colors'
import { DEFAULT_FORCES, type Forces } from '../../domain/recipe/view/simulation'
import { listGroupableProperties } from '../../domain/recipe/propertyMapping'
import { Button } from '../ui/Button'
import { Slider } from '../ui/Slider'
import { Switch } from '../ui/Switch'
import './RecipeCanvasToolbar.css'

const LABEL_OPTIONS = ['name', 'None', 'pdb', 'uniprot', 'label']

/** Custom (CSV) columns of the loaded ingredients: legacy `additional_data` (§1.5). */
function customColumns(nodes: RecipeNode[]): string[] {
  const keys = new Set<string>()
  for (const node of nodes) if (isIngredientNode(node)) for (const key of customIngredientFields(node.data as IngredientData)) keys.add(key)
  return [...keys].sort()
}

/** "Recipe Options" (recipe-view.md §5): legacy's View Options, Recipe Options and Forces Options. */
export function RecipeCanvasToolbar() {
  const graph = useRecipeStore((s) => s.graph)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const ui = useUiModeStore()
  const store = useRecipeStore.getState()

  if (!graph) return <p className="panel-note">Load a recipe to use the canvas view options.</p>

  const custom = customColumns(graph.nodes)
  // Real fields with two or more values, plus the custom columns (Ludovic, 2026-11-05, §6.5).
  const groupOptions = ['none', ...new Set([...listGroupableProperties(graph.nodes), ...custom])]
  // Only nodes still in the recipe: a deleted one must not get a link.
  const live = new Set(graph.nodes)
  const selection = ui.selectedNodes.filter((node) => live.has(node))
  const ingredients = graph.nodes.filter(isIngredientNode)

  function addInteraction() {
    // Pairs (i, i+1) of the multi-selection, then clears it (§7.3).
    for (let i = 0; i + 1 < selection.length; i += 2) store.addLink(selection[i], selection[i + 1])
    ui.clearSelection()
  }

  function applyColor() {
    // Every node, compartments included, keeps its colour once in `_color` (§6.4, row 88).
    if (!graph) return
    const infos = colorNodeInfos(graph.nodes[0])
    const prep = prepareColors(infos, ui.colorMode, ui.minColor, ui.maxColor, ui.useColorMapping, ui.visitedNodes, ui.categoryColors)
    const colors = new Map(infos.map((info) => [info.node, colorNode(info, prep)]))
    store.applyColorModeToIngredient((node) => colors.get(node) ?? 'black')
  }

  function step(delta: number) {
    // Previous/Next Ingredient walk the ingredient rows and select (main.js:5784-5826, row 95).
    const at = selectedNode ? (ingredients as RecipeNode[]).indexOf(selectedNode) : -1
    const next = ingredients[Math.min(Math.max(at + delta, 0), ingredients.length - 1)]
    if (!next) return
    store.selectNode(next)
    ui.setSelection([next])
    ui.markVisited(next)
  }

  return (
    <div className="recipe-canvas-toolbar">
      <fieldset className="recipe-canvas-toolbar-group">
        <legend>View Options</legend>
        <Switch checked={ui.showSprites} onCheckedChange={ui.toggleShowSprites}>
          Node image
        </Switch>
        <label>
          Node label
          <select value={ui.labelBy} onChange={(e) => ui.setLabelBy(e.target.value)}>
            {[...LABEL_OPTIONS, ...custom].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Node color
          <select value={ui.colorMode} onChange={(e) => ui.setColorMode(e.target.value)}>
            {[...COLOR_MODES, ...custom].map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        <Switch checked={ui.useColorMapping} onCheckedChange={ui.toggleUseColorMapping}>
          Use color linear mapping
        </Switch>
        <div className="recipe-canvas-toolbar-color-pickers">
          <label>
            Min <input type="color" value={ui.minColor} onChange={(e) => ui.setMinColor(e.target.value)} />
          </label>
          <label>
            Max <input type="color" value={ui.maxColor} onChange={(e) => ui.setMaxColor(e.target.value)} />
          </label>
        </div>
        <Button variant="primary" size="sm" onClick={applyColor}>
          Apply current to ingredient color
        </Button>
        <label>
          Node size
          <select value={ui.sizeBy} onChange={(e) => ui.setSizeBy(e.target.value)}>
            {[...PROPERTY_MAPPING_KEYS, ...custom].map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <NumberControl label="Scale Radius by" min={0.01} max={10} value={ui.radiusScale} onChange={ui.setRadiusScale} />
        <label>
          Node group by
          <select value={ui.groupBy ?? 'none'} onChange={(e) => ui.setGroupBy(e.target.value === 'none' ? null : e.target.value)}>
            {groupOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <NumberControl label="Stroke Line width" min={0.01} max={10} value={ui.strokeWidth} onChange={ui.setStrokeWidth} />
        <Switch checked={ui.showLegend} onCheckedChange={ui.toggleShowLegend}>
          Show latest legends
        </Switch>
        {ui.showLegend && (
          <>
            <NumberControl label="Legend width" min={1} max={250} value={ui.legend.w} onChange={(w) => ui.setLegend({ w })} />
            <NumberControl label="Legend height" min={1} max={250} value={ui.legend.h} onChange={(h) => ui.setLegend({ h })} />
            <NumberControl label="Legend font" min={1} max={250} value={ui.legend.f} onChange={(f) => ui.setLegend({ f })} />
          </>
        )}
        <div className="recipe-canvas-toolbar-edit-actions">
          <Button size="sm" onClick={() => step(-1)}>
            Previous Ingredient
          </Button>
          <Button size="sm" onClick={() => step(1)}>
            Next Ingredient
          </Button>
        </div>
      </fieldset>
      <fieldset className="recipe-canvas-toolbar-group">
        <legend>Recipe Options</legend>
        <Switch checked={ui.editMode} onCheckedChange={ui.toggleEditMode}>
          Edit Mode
        </Switch>
        {/* Visible until Edit Mode is first toggled, then only in Edit Mode (§8.19). */}
        {(ui.editMode || !ui.editModeToggled) && (
          <div className="recipe-canvas-toolbar-edit-actions">
            <Button size="sm" onClick={store.addIngredient}>
              Add ingredient
            </Button>
            <Button size="sm" onClick={store.addCompartment}>
              Add compartment
            </Button>
            <Button variant="primary" size="sm" onClick={addInteraction} disabled={selection.length < 2}>
              Add interaction
            </Button>
          </div>
        )}
      </fieldset>
      <fieldset className="recipe-canvas-toolbar-group">
        <legend>Forces Options</legend>
        {FORCE_KEYS.map((key) => (
          <ForceControl key={key} label={key} value={ui.forces[key]} onChange={(value) => ui.setForce(key, value)} />
        ))}
      </fieldset>
    </div>
  )
}

const FORCE_KEYS = Object.keys(DEFAULT_FORCES) as (keyof Forces)[]

/** `getForcesInputs` (lm:266-275, row 22): a range 0-1 paired with a number 0-2. */
function ForceControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="recipe-canvas-toolbar-slider-row">
      <span>{label}</span>
      <Slider aria-label={`${label} force`} min={0} max={1} step={0.01} value={Math.min(value, 1)} onValueChange={onChange} />
      <input aria-label={`${label} force value`} type="number" min="0" max="2" step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  )
}

function NumberControl({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <div className="recipe-canvas-toolbar-slider-row">
      <span>{label}</span>
      <Slider aria-label={label} min={min} max={max} step={0.01} value={value} onValueChange={onChange} />
      <input aria-label={`${label} value`} type="number" min={min} max={max} step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || min)} />
    </div>
  )
}
