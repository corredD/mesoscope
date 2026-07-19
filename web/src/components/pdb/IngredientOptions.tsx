import { useEffect, useMemo, useRef, useState } from 'react'
import { useRecipeStore } from '../../state/recipeStore'
import { Button } from '../ui/Button'
import { Slider } from '../ui/Slider'
import { Switch } from '../ui/Switch'
import { useIngredientViewerStore } from '../../state/ingredientViewerStore'
import { getAtomPositions } from '../../domain/pdb/molstarStructureUtil'
import { kmeans, boundingSphere, autoBeadCount, overrideRadii, type ClusterResult } from '../../domain/recipe/clustering'
import {
  buildIngredientRepresentation,
  setMembraneGeometry,
  clearMembraneGeometry,
  setFiberGizmo,
  clearFiberGizmo,
  setFiberPreview,
  MAX_FIBER_PREVIEW_COPIES,
  renderLodLevel,
  clearLodLevel,
  captureSprite,
  type IngredientRepresentationType,
  type IngredientColorType,
  type BeadColorMode,
} from '../../domain/pdb/ingredientViewControls'
import type { IngredientData, PositionLod, RadiiLod } from '../../domain/recipe/types'
import './IngredientOptions.css'

/**
 * Replaces the "NGL Options" panel — renamed "Ingredient Options" — driving
 * the shared Mol-star instance in `IngredientViewer.tsx` (`IngredientView`)
 * via `ingredientViewerStore`. Ported from the full control audit in
 * web/README-modernization.md's "Ingredient Options" section (js/ngl.js /
 * js/layout_mg.js:317-491), scoped to the four control areas called out when
 * this replacement was commissioned — chain selection, membrane/fiber
 * orientation, clustering/LOD construction, sprite 2D — plus the
 * representation/color controls those areas need to be usable at all. The
 * "native" NGL controls the same audit found Mol-star already covers for
 * free via its own default UI (background, spin, quality, assembly/model
 * switching, bounding box/origin display) are NOT reproduced here — that UI
 * intentionally isn't mounted (`IngredientViewer.tsx` uses a lean spec) to
 * avoid a second, competing control surface; those remain a gap vs. legacy,
 * not a silent scope cut of the four requested areas.
 *
 * Explicitly out of scope, named in the audit as their own slices: draggable
 * 3D gizmo manipulation (shift+ctrl+drag in legacy — sliders/numbers fully
 * cover "the same level of control" per the audit's own reasoning, since
 * dragging just calls the same apply functions), per-bead
 * drag/resize/edit-in-place, the dead/never-wired OPTICS/DBSCAN/grid
 * clustering modes (confirmed dead: legacy's "Build on a grid"/"Build on a
 * grid from level 0" checkboxes only ever set flags nothing reads through to
 * a real algorithm), and the server-rendered "Illustrate" sprite path
 * (`cgi-bin/illustrator.py` round trip) — sprite capture here is Mol-star's
 * own viewport screenshot, matching legacy's other (non-Illustrate) sprite
 * source (`NGL_makeImage`). Legacy's "Show Geometry used"/"Rebuild
 * Geometry"/"Geometry details" (coarse molecular *surface* generation, a
 * separate concept from beads) are out of scope per explicit instruction —
 * "Clustering / LOD" here is beads-only.
 *
 * Membrane/fiber orientation auto-enable: membrane orientation defaults ON
 * for `data.surface` ingredients, fiber orientation defaults ON for
 * `data.ingtype === 'fiber'` ingredients (confirmed via a full grep of
 * legacy's runtime `ingtype` checks — `buildtype` governs instance
 * placement, not ingredient kind, and was not the right field). The user
 * can still toggle either off/on manually regardless of ingredient kind.
 *
 * Membrane geometry: two disks 40Å apart, fixed in world space (not
 * positioned via `axis`/`offset` like the fiber arrow) — the *protein* is
 * transformed into place against this fixed membrane instead, via
 * `ingredientViewControls.ts:membraneAlignmentMatrix`. See that function's
 * docstring for why this is the confirmed-correct convention (legacy's
 * OPM-derived-structure code path did exactly this, just only for
 * OPM-sourced proteins; this generalizes it to every membrane ingredient).
 */

// 'spacefill' deliberately excluded — see IngredientRepresentationType's docstring
// (ingredientViewControls.ts) for the root-caused Mol-star-internal bug this avoids.
const REPRESENTATIONS: IngredientRepresentationType[] = ['cartoon', 'ball-and-stick', 'gaussian-surface']
const COLOR_THEMES: IngredientColorType[] = ['chain-id', 'uniform', 'element-symbol', 'secondary-structure']
const LOD_LEVELS = [0, 1, 2]
const DEFAULT_FIBER_LENGTH_MAX = 200

function vec3(value: number[] | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!value || value.length < 3) return fallback
  return [value[0], value[1], value[2]]
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(...v)
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1]
}

/** Largest coordinate-independent side of the loaded molecule's bounding box. */
function maximumIngredientSpan(points: [number, number, number][]): number {
  if (points.length === 0) return 0
  const min: [number, number, number] = [...points[0]]
  const max: [number, number, number] = [...points[0]]
  for (let i = 1; i < points.length; i++) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], points[i][axis])
      max[axis] = Math.max(max[axis], points[i][axis])
    }
  }
  return Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2])
}

export function IngredientOptions() {
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const selectedIngredientType = useRecipeStore((s) => (s.selectedNode?.data as IngredientData | undefined)?.ingtype)
  const patchIngredient = useRecipeStore((s) => s.patchSelectedIngredient)
  const plugin = useIngredientViewerStore((s) => s.plugin)
  const trajectoryRef = useIngredientViewerStore((s) => s.trajectoryRef)
  const chains = useIngredientViewerStore((s) => s.chains)
  const structure = useIngredientViewerStore((s) => s.structure)
  const setStructure = useIngredientViewerStore((s) => s.setStructure)
  const setStructureInfo = useIngredientViewerStore((s) => s.setStructureInfo)

  const data = selectedNode?.data as IngredientData | undefined

  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set())
  const [representation, setRepresentation] = useState<IngredientRepresentationType>('cartoon')
  const [colorTheme, setColorTheme] = useState<IngredientColorType>('chain-id')

  const [membraneAxis, setMembraneAxis] = useState<[number, number, number]>([0, 0, 1])
  const [membraneOffset, setMembraneOffset] = useState<[number, number, number]>([0, 0, 0])
  const [membraneOn, setMembraneOn] = useState(false)

  const [fiberAxis, setFiberAxis] = useState<[number, number, number]>([0, 0, 1])
  const [fiberLength, setFiberLength] = useState(20)
  const [fiberOffset, setFiberOffset] = useState<[number, number, number]>([0, 0, 0])
  const [fiberOn, setFiberOn] = useState(false)
  const [fiberPreviewOn, setFiberPreviewOn] = useState(false)
  const [fiberPreviewCopies, setFiberPreviewCopies] = useState(6)
  const [fiberTwist, setFiberTwist] = useState(0)

  // The rise must be able to clear even a large loaded ingredient. Use its
  // largest bounding-box span + 100Å, while retaining the previous 200Å floor
  // before loading and for smaller structures. Memoized because atom traversal
  // would otherwise repeat on every live slider render.
  const loadedFiberLengthMax = useMemo(() => {
    const structureSpan = structure ? maximumIngredientSpan(getAtomPositions(structure)) : 0
    return Math.max(DEFAULT_FIBER_LENGTH_MAX, Math.ceil(100 + structureSpan))
  }, [structure])
  // Preserve an already-stored longer rise without clamping recipe data.
  const fiberLengthMax = Math.max(loadedFiberLengthMax, Math.ceil(fiberLength))

  // Scales both orientation gizmos to the loaded structure's actual size (set once the
  // structure loads, see the effect below) — a fixed size looked wildly wrong across
  // differently-sized structures (a thin sliver on a large capsid protein, a dominant
  // pole on a small peptide) when found live.
  const [gizmoScale, setGizmoScale] = useState({ halfLength: 20, radius: 1.5 })

  const [lodLevel, setLodLevel] = useState(0)
  const [beadCount, setBeadCount] = useState(20)
  const [autoBeadCountOn, setAutoBeadCountOn] = useState(false)
  const [overwriteRadiusOn, setOverwriteRadiusOn] = useState(false)
  const [overwriteRadius, setOverwriteRadius] = useState(5)
  const [levelVisible, setLevelVisible] = useState<boolean[]>([false, false, false])
  const [beadColorMode, setBeadColorMode] = useState<BeadColorMode>('level')

  const [spriteScale, setSpriteScale] = useState(1)
  const [spriteOffsetY, setSpriteOffsetY] = useState(0)
  const [spriteLength, setSpriteLength] = useState(0)
  const [capturing, setCapturing] = useState(false)

  // Reset all local UI state whenever the selected ingredient changes — mirrors
  // the ingredient's stored orientation/sprite fields, matching legacy's panel
  // repopulating on `NGL_UpdateWithNode`.
  //
  // Membrane/fiber toggles default from the ingredient's own kind — `data.surface`
  // for membrane, `data.ingtype === 'fiber'` for fiber (confirmed against every
  // legacy runtime `ingtype` check; `buildtype` governs instance placement, not
  // ingredient kind) — not from `pcpalAxis`/`fiberAxis` presence:
  // `parseLegacyRecipe.ts` always fills those with a non-null default
  // ([0,0,1], [0,0,1,50]) when a recipe doesn't specify them (confirmed live —
  // every ingredient in data/HIV_serialized.json has a `fiberAxis`, including
  // ones that aren't fibers), so "is this field present" can't distinguish "the
  // recipe configured an orientation" from "the parser's fallback default."
  useEffect(() => {
    setRepresentation('cartoon')
    setColorTheme('chain-id')
    // normalize(), not just vec3(): a stored axis is frequently [0,0,0] (a real value in
    // the recipe, e.g. `principalVector: [0,0,0]` — not "missing"), which is degenerate as
    // a direction (a zero-length gizmo, invisible) — found live. normalize() already maps
    // a zero vector to [0,0,1], the same fallback as a genuinely absent axis.
    setMembraneAxis(normalize(vec3(data?.pcpalAxis, [0, 0, 1])))
    setMembraneOffset(vec3(data?.offset, [0, 0, 0]))
    setMembraneOn(!!data?.surface)
    setFiberAxis(normalize(vec3(data?.fiberAxis, [0, 0, 1])))
    setFiberLength(data?.fiberAxis?.[3] ?? 20)
    setFiberOffset(vec3(data?.fiberOffset, [0, 0, 0]))
    setFiberOn(data?.ingtype === 'fiber')
    setFiberPreviewOn(false)
    setFiberPreviewCopies(6)
    setFiberTwist(0)
    setLevelVisible([false, false, false])
    setSpriteScale(data?.sprite?.scale2d ?? 1)
    setSpriteOffsetY(data?.sprite?.offsety ?? 0)
    setSpriteLength(data?.sprite?.lengthy ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode])

  // `RecipeTable` mutates the selected node's data in place, so subscribe to
  // this primitive separately from the stable selected-node reference. A live
  // type edit can then enter/leave fiber mode immediately without requiring the
  // user to select a different row and come back.
  useEffect(() => {
    setFiberOn(selectedIngredientType === 'fiber')
    if (selectedIngredientType !== 'fiber') setFiberPreviewOn(false)
  }, [selectedIngredientType])

  // Chain list arrives asynchronously (`IngredientViewer` populates it only after the
  // structure finishes loading), so "default to all chains selected" has to react to
  // `chains` itself, not `selectedNode` — otherwise this runs once while `chains` is
  // still `[]` and `selectedChains` gets stuck empty forever (found live: chain
  // checkboxes rendered permanently unchecked because of exactly this).
  useEffect(() => {
    setSelectedChains(new Set(chains))
  }, [chains])

  // Default the orientation gizmos' offset to the structure's own geometric center once
  // it loads, rather than the world origin — found live: a PDB structure's own coordinate
  // frame is rarely centered at [0,0,0], so an origin-offset gizmo often renders far away
  // from the visible structure. Only applies when the offset is still at the all-zero
  // default (an ingredient with a real stored offset keeps it).
  useEffect(() => {
    if (!structure) return
    const center = centerOf(getAtomPositions(structure))
    if (!center) return
    const isDefault = (v: [number, number, number]) => v[0] === 0 && v[1] === 0 && v[2] === 0
    setMembraneOffset((prev) => (isDefault(prev) ? center : prev))
    setFiberOffset((prev) => (isDefault(prev) ? center : prev))
    const bound = boundingSphere(getAtomPositions(structure))
    setGizmoScale(bound.radii[0] ? { halfLength: bound.radii[0] * 0.8, radius: Math.max(bound.radii[0] * 0.03, 0.3) } : { halfLength: 20, radius: 1.5 })
  }, [structure])

  // Chain filter + representation + color + membrane transform — the sole builder of the
  // structure hierarchy/representation, for the very first build *and* every later change
  // alike (`IngredientViewer.tsx` only fetches/parses the trajectory; see its docstring for
  // why folding the first build in here too, rather than each owning one, avoids a race
  // between two builders that showed the wrong initial view for auto-enabled membrane state).
  // Only the *first* build for a given `trajectoryRef` updates `chains` (via
  // `setStructureInfo`) — later rebuilds use `setStructure`, deliberately leaving `chains`
  // untouched (see `ingredientViewerStore.ts`'s `setStructure` docstring for why: a
  // freshly-recomputed-but-same-content chains array would re-trigger the "default to all
  // chains selected" effect and silently undo the user's own chain selection).
  const chainsPopulatedFor = useRef<typeof trajectoryRef>(null)
  useEffect(() => {
    if (!plugin || !trajectoryRef) return
    const allSelected = chains.length === 0 || selectedChains.size === chains.length
    const membraneTransform = membraneOn ? { axis: membraneAxis, offset: membraneOffset } : null
    buildIngredientRepresentation(plugin, trajectoryRef, allSelected ? null : [...selectedChains], representation, colorTheme, membraneTransform)
      .then((result) => {
        if (chainsPopulatedFor.current !== trajectoryRef) {
          chainsPopulatedFor.current = trajectoryRef
          setStructureInfo(result.chains, result.structure, result.structureRef)
        } else {
          setStructure(result.structure, result.structureRef)
        }
      })
      .catch((err) => console.error('IngredientOptions: buildIngredientRepresentation failed', err))
  }, [plugin, trajectoryRef, selectedChains, representation, colorTheme, membraneOn, membraneAxis, membraneOffset, chains.length, setStructure, setStructureInfo])

  // Fixed membrane geometry (two disks, world-space) — on/off + size only; unlike the fiber
  // gizmo, this is never positioned via axis/offset (see `setMembraneGeometry`'s docstring).
  useEffect(() => {
    if (!plugin) return
    if (!membraneOn) {
      void clearMembraneGeometry(plugin)
      return
    }
    void setMembraneGeometry(plugin, Math.max(gizmoScale.halfLength, 15))
  }, [plugin, membraneOn, gizmoScale])

  // Fiber gizmo.
  useEffect(() => {
    if (!plugin) return
    if (!fiberOn) {
      void clearFiberGizmo(plugin)
      return
    }
    void setFiberGizmo(plugin, fiberAxis, fiberOffset, fiberLength, gizmoScale.radius)
  }, [plugin, fiberOn, fiberAxis, fiberOffset, fiberLength, gizmoScale])

  // Preview-only helical assembly. Every Fiber Orientation slider participates
  // in this dependency set, so instances follow axis/rise/offset/copies/twist
  // throughout a drag. `setFiberPreview` coalesces any faster-than-GPU updates
  // around Mol-star's single StructureInstances decorator; rise/axis/offset
  // still persist through the normal recipe fields, while copies and twist
  // remain disposable preview settings.
  useEffect(() => {
    if (!plugin) return
    const preview =
      fiberOn && fiberPreviewOn && selectedIngredientType === 'fiber'
        ? { copies: fiberPreviewCopies, axis: fiberAxis, rise: fiberLength, twist: fiberTwist, offset: fiberOffset }
        : null
    void setFiberPreview(plugin, preview).catch((err) => console.error('IngredientOptions: setFiberPreview failed', err))
  }, [plugin, selectedIngredientType, fiberOn, fiberPreviewOn, fiberPreviewCopies, fiberAxis, fiberLength, fiberTwist, fiberOffset])

  // A removable workspace panel can unmount while Ingredient View stays alive;
  // never leave its temporary preview active after the controls disappear.
  useEffect(
    () => () => {
      if (plugin) void setFiberPreview(plugin, null)
    },
    [plugin],
  )

  // Rebuild the currently-selected LOD level automatically whenever a bead-building option
  // changes — legacy (`NGL_updateCurrentBeadsLevel`, js/ngl.js:1528) has no "Build" button at
  // all: the number-of-beads slider's `mouseup` and its paired number input's `input` handler,
  // and the overwrite-radius checkbox's `onclick`/value's `onchange` (js/ngl.js:884-906,
  // js/layout_mg.js:436-441), each call it directly, on every change. Deliberately excludes
  // `lodLevel` from the trigger set: legacy's level *selector* (`NGL_showBeadsLevel`,
  // js/ngl.js:1646) never re-clusters when switched — it only recolors/toggles visibility of
  // whatever was already built for that level (confirmed via the full handler-wiring audit,
  // see web/README-modernization.md). `lodLevel`/`structure`/`selectedChains` are still read
  // live inside the effect (so a later trigger always targets the level/chain-filter/structure
  // current at that moment) — just not dependencies that themselves cause a rebuild, matching
  // legacy switching-ingredient-doesn't-silently-rebuild-beads behavior.
  //
  // Guarded against running on mount by comparing against the *previous* values of these
  // four, not a "consumed once" flag — found live once this panel became a workspace-preset-
  // removable panel (see Workspace.tsx's `WORKSPACE_PRESETS`): `useEffect` always fires once
  // on mount regardless of its dependency array, and since this component can now unmount/
  // remount (switching to a preset without "Ingredient Options" and back), every remount was
  // silently re-clustering and overwriting the selected ingredient's Level 0 bead data from
  // the freshly-reset default state — a real, user-visible data mutation triggered purely by
  // a layout change, not any bead-control interaction. A "consumed once" ref flag (tried
  // first) does NOT survive React 19 StrictMode's dev-only double-invoke of effects (mount →
  // effect → cleanup → effect again, all synchronous, with no fresh ref in between) — the
  // flag flips to "consumed" on the first synthetic pass and no longer guards the second, so
  // the bug still reproduced. Comparing against the last-seen values instead is robust to
  // being invoked any number of times for the same underlying state: it only proceeds when
  // something actually differs from what was last recorded, which is true exactly once for a
  // genuine user change and never for a mount (synthetic or real).
  const prevBeadOptions = useRef({ beadCount, autoBeadCountOn, overwriteRadiusOn, overwriteRadius })
  useEffect(() => {
    const prev = prevBeadOptions.current
    const changed =
      prev.beadCount !== beadCount ||
      prev.autoBeadCountOn !== autoBeadCountOn ||
      prev.overwriteRadiusOn !== overwriteRadiusOn ||
      prev.overwriteRadius !== overwriteRadius
    prevBeadOptions.current = { beadCount, autoBeadCountOn, overwriteRadiusOn, overwriteRadius }
    if (!changed) return
    if (!structure || !data) return
    const chainFilter = selectedChains.size > 0 && selectedChains.size < chains.length ? selectedChains : undefined
    const points = getAtomPositions(structure, chainFilter)
    // "Auto number of beads": legacy's live heuristic (buildWithKmeans, js/ngl.js:3988-4007,
    // `#toggle_cluster_auto`) — bead count from bounding volume ÷ one-bead volume at the
    // target radius. Uses the (about-to-be-applied) overwrite radius as the target bead size
    // when set, else a reasonable fixed default, since that's the actual bead size being built.
    const targetBeadRadius = overwriteRadiusOn ? overwriteRadius : 5
    const count = autoBeadCountOn ? autoBeadCount(points, targetBeadRadius) : beadCount
    let result = lodLevel === 0 ? boundingSphere(points) : kmeans(points, count, { seed: 1 })
    // "Overwrite cluster radius": legacy's `#cl_use_radius` + `#cl_radius` — force every
    // bead in this level to the same fixed radius instead of the cluster-computed one.
    if (overwriteRadiusOn) result = overrideRadii(result, overwriteRadius)
    const pos = [...(data.pos ?? [])] as (PositionLod | undefined)[]
    const radii = [...(data.radii ?? [])] as (RadiiLod | undefined)[]
    pos[lodLevel] = { coords: result.centers.flat() }
    radii[lodLevel] = { radii: result.radii }
    patchIngredient({ pos: pos as PositionLod[], radii: radii as RadiiLod[] })
    setLevelVisible((prev) => {
      const next = [...prev]
      next[lodLevel] = true
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beadCount, autoBeadCountOn, overwriteRadiusOn, overwriteRadius])

  // LOD bead rendering — re-render whenever visibility/color mode/stored data changes.
  useEffect(() => {
    if (!plugin) return
    for (const level of LOD_LEVELS) {
      const pos = data?.pos?.[level] as PositionLod | undefined
      const radii = data?.radii?.[level] as RadiiLod | undefined
      if (!levelVisible[level] || !pos || !radii) {
        void clearLodLevel(plugin, level)
        continue
      }
      const result: ClusterResult = { centers: chunk3(pos.coords), radii: radii.radii }
      void renderLodLevel(plugin, level, result, beadColorMode)
    }
  }, [plugin, levelVisible, beadColorMode, data?.pos, data?.radii])

  if (!data) return <p className="panel-note">Select an ingredient (Recipe table or Recipe View) to see its options.</p>

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) => {
      const next = new Set(prev)
      if (next.has(chain)) next.delete(chain)
      else next.add(chain)
      return next
    })
  }

  const applyMembraneAxis = (axis: [number, number, number]) => {
    const normalized = normalize(axis)
    setMembraneAxis(normalized)
    patchIngredient({ pcpalAxis: normalized })
  }
  const applyMembraneOffset = (offset: [number, number, number]) => {
    setMembraneOffset(offset)
    patchIngredient({ offset })
  }
  const resetMembrane = () => {
    applyMembraneAxis([0, 0, 1])
    applyMembraneOffset([0, 0, 0])
  }

  const applyFiberAxis = (axis: [number, number, number]) => {
    const normalized = normalize(axis)
    setFiberAxis(normalized)
    patchIngredient({ fiberAxis: [...normalized, fiberLength] })
  }
  const applyFiberLength = (length: number) => {
    setFiberLength(length)
    patchIngredient({ fiberAxis: [...fiberAxis, length] })
  }
  const applyFiberOffset = (offset: [number, number, number]) => {
    setFiberOffset(offset)
    patchIngredient({ fiberOffset: offset })
  }
  const resetFiber = () => {
    applyFiberAxis([0, 0, 1])
    applyFiberLength(20)
    applyFiberOffset([0, 0, 0])
  }
  const buildFiberFromChains = () => {
    if (!structure || chains.length < 2) return
    const c0 = centerOf(getAtomPositions(structure, new Set([chains[0]])))
    const c1 = centerOf(getAtomPositions(structure, new Set([chains[1]])))
    if (!c0 || !c1) return
    const vec: [number, number, number] = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]]
    const length = Math.hypot(...vec)
    setFiberOn(true)
    applyFiberAxis(length > 0 ? normalize(vec) : [0, 0, 1])
    applyFiberLength(length)
    applyFiberOffset(c0)
  }

  const toggleLevelVisible = (level: number) => {
    setLevelVisible((prev) => {
      const next = [...prev]
      next[level] = !next[level]
      return next
    })
  }

  const onCaptureSprite = async () => {
    if (!plugin) return
    setCapturing(true)
    try {
      const image = await captureSprite(plugin)
      if (image) patchIngredient({ sprite: { ...data.sprite, image } })
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="ingredient-options">
      <section>
        <h4>Molecule</h4>
        <label>
          Representation{' '}
          <select value={representation} onChange={(e) => setRepresentation(e.target.value as IngredientRepresentationType)}>
            {REPRESENTATIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Color{' '}
          <select value={colorTheme} onChange={(e) => setColorTheme(e.target.value as IngredientColorType)}>
            {COLOR_THEMES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h4>Chain selection</h4>
        {chains.length === 0 && <p className="panel-note">No structure loaded, or it has no chain information.</p>}
        <div className="ingredient-options-chains">
          {chains.map((chain) => (
            <label key={chain} className="ingredient-options-chain">
              <input type="checkbox" checked={selectedChains.has(chain)} onChange={() => toggleChain(chain)} />
              {chain}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4>
          <Switch checked={membraneOn} onCheckedChange={setMembraneOn}>
            Membrane orientation
          </Switch>
        </h4>
        {membraneOn && (
          <>
            <Vec3Sliders label="Axis" value={membraneAxis} min={-1} max={1} step={0.01} onChange={applyMembraneAxis} />
            <Vec3Sliders label="Offset" value={membraneOffset} min={-200} max={200} step={1} onChange={applyMembraneOffset} />
            <Button size="sm" onClick={resetMembrane}>
              Reset
            </Button>
          </>
        )}
      </section>

      <section>
        <h4>
          <Switch checked={fiberOn} onCheckedChange={setFiberOn}>
            Fiber orientation
          </Switch>
        </h4>
        {fiberOn && (
          <>
            <Vec3Sliders label="Axis" value={fiberAxis} min={-1} max={1} step={0.01} onChange={applyFiberAxis} />
            <ScalarSlider
              label="Fiber length (rise)"
              value={fiberLength}
              min={0}
              max={fiberLengthMax}
              step={1}
              unit="Å"
              onChange={applyFiberLength}
            />
            <Vec3Sliders label="Offset" value={fiberOffset} min={-200} max={200} step={1} onChange={applyFiberOffset} />
            {selectedIngredientType === 'fiber' && (
              <div className="ingredient-options-fiber-preview">
                <Switch checked={fiberPreviewOn} onCheckedChange={setFiberPreviewOn}>
                  Preview fiber assembly
                </Switch>
                {fiberPreviewOn && (
                  <>
                    <ScalarSlider
                      label="Preview copies"
                      value={fiberPreviewCopies}
                      min={1}
                      max={MAX_FIBER_PREVIEW_COPIES}
                      step={1}
                      onChange={setFiberPreviewCopies}
                    />
                    <ScalarSlider
                      label="Fiber twist"
                      value={fiberTwist}
                      min={-180}
                      max={180}
                      step={1}
                      unit="°"
                      onChange={setFiberTwist}
                    />
                    <p className="panel-note ingredient-options-preview-note">
                      Rise and twist are applied per copy around the axis through Offset.
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="ingredient-options-row">
              <Button variant="primary" size="sm" onClick={buildFiberFromChains} disabled={chains.length < 2}>
                Build from chains
              </Button>
              <Button size="sm" onClick={resetFiber}>
                Reset
              </Button>
            </div>
          </>
        )}
      </section>

      <section>
        <h4>Clustering / LOD</h4>
        <label>
          Level{' '}
          <select value={lodLevel} onChange={(e) => setLodLevel(Number(e.target.value))}>
            {LOD_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === 0 ? '0 (bounding sphere)' : l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Number of beads{' '}
          <input
            type="number"
            min={1}
            max={2000}
            value={beadCount}
            disabled={autoBeadCountOn}
            onChange={(e) => setBeadCount(Number(e.target.value))}
          />
        </label>
        <Switch checked={autoBeadCountOn} onCheckedChange={setAutoBeadCountOn}>
          Auto number of beads
        </Switch>
        <Switch checked={overwriteRadiusOn} onCheckedChange={setOverwriteRadiusOn}>
          Overwrite cluster radius
        </Switch>
        {overwriteRadiusOn && (
          <label>
            Radius <input type="number" min={0.1} step={0.5} value={overwriteRadius} onChange={(e) => setOverwriteRadius(Number(e.target.value))} />
          </label>
        )}
        <label>
          Color by{' '}
          <select value={beadColorMode} onChange={(e) => setBeadColorMode(e.target.value as BeadColorMode)}>
            <option value="level">level</option>
            <option value="radius">radius</option>
            <option value="random">random</option>
            <option value="red">red</option>
          </select>
        </label>
        <div className="ingredient-options-chains">
          {LOD_LEVELS.map((level) => (
            <Switch
              key={level}
              className="ingredient-options-lod-level"
              checked={levelVisible[level]}
              disabled={!data.pos?.[level]}
              onCheckedChange={() => toggleLevelVisible(level)}
            >
              Level {level} {data.pos?.[level] ? `(${data.pos[level]!.coords.length / 3} beads)` : '(not built)'}
            </Switch>
          ))}
        </div>
      </section>

      <section>
        <h4>Sprite (2D)</h4>
        <div className="ingredient-options-row">
          <Button variant="primary" onClick={onCaptureSprite} loading={capturing} disabled={!plugin}>
            {capturing ? 'Capturing…' : 'Capture sprite from view'}
          </Button>
        </div>
        {/* `sprite.image` defaults to a bare "<name>.png" filename convention when a recipe
            doesn't carry a captured image (parseLegacyRecipe.ts) — only a real captured
            screenshot (a data: URI, from `captureSprite`) is actually renderable here. */}
        {data.sprite?.image?.startsWith('data:') && (
          <img className="ingredient-options-sprite-preview" src={data.sprite.image} alt="Ingredient sprite" />
        )}
        <label>
          2D scale{' '}
          <input
            type="number"
            step={0.01}
            value={spriteScale}
            onChange={(e) => {
              const scale2d = Number(e.target.value)
              setSpriteScale(scale2d)
              patchIngredient({ sprite: { ...data.sprite, scale2d } })
            }}
          />
        </label>
        <label>
          Membrane Y offset{' '}
          <input
            type="number"
            value={spriteOffsetY}
            onChange={(e) => {
              const offsety = Number(e.target.value)
              setSpriteOffsetY(offsety)
              patchIngredient({ sprite: { ...data.sprite, offsety } })
            }}
          />
        </label>
        <label>
          Fiber length{' '}
          <input
            type="number"
            value={spriteLength}
            onChange={(e) => {
              const lengthy = Number(e.target.value)
              setSpriteLength(lengthy)
              patchIngredient({ sprite: { ...data.sprite, lengthy } })
            }}
          />
        </label>
      </section>
    </div>
  )
}

function Vec3Sliders({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: [number, number, number]
  min: number
  max: number
  step: number
  onChange: (v: [number, number, number]) => void
}) {
  return (
    <div className="ingredient-options-vec3">
      <span>{label}</span>
      {(['X', 'Y', 'Z'] as const).map((axisLabel, i) => (
        <div key={axisLabel} className="ingredient-options-vec3-control">
          <span>{axisLabel}</span>
          <Slider
            aria-label={`${label} ${axisLabel}`}
            min={min}
            max={max}
            step={step}
            value={value[i]}
            onValueChange={(nextValue) => {
              const next: [number, number, number] = [...value]
              next[i] = nextValue
              onChange(next)
            }}
          />
          <input
            aria-label={`${label} ${axisLabel} value`}
            type="number"
            step={step}
            value={value[i]}
            onChange={(e) => {
              const next: [number, number, number] = [...value]
              next[i] = Number(e.target.value)
              onChange(next)
            }}
          />
        </div>
      ))}
    </div>
  )
}

function ScalarSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="ingredient-options-scalar-control">
      <span>{label}</span>
      <Slider aria-label={label} min={min} max={max} step={step} value={value} onValueChange={onChange} />
      <label className="ingredient-options-number-field">
        <span className="ingredient-options-visually-hidden">{label} value</span>
        <input
          aria-label={`${label} value`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit && <span aria-hidden="true">{unit}</span>}
      </label>
    </div>
  )
}

function chunk3(flat: number[]): [number, number, number][] {
  const out: [number, number, number][] = []
  for (let i = 0; i + 2 < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]])
  return out
}

function centerOf(points: [number, number, number][]): [number, number, number] | null {
  if (points.length === 0) return null
  const c: [number, number, number] = [0, 0, 0]
  for (const p of points) {
    c[0] += p[0]
    c[1] += p[1]
    c[2] += p[2]
  }
  return [c[0] / points.length, c[1] / points.length, c[2] / points.length]
}
