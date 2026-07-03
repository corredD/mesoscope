/**
 * Imperative Mol-star scene actions for `IngredientOptions.tsx`, split out
 * of the component so the Mol-star API surface (MolScript expressions,
 * component/representation builders) isn't mixed into JSX. Companion to
 * `molstarCustomShapes.ts` (generic shape injection) and
 * `domain/recipe/clustering.ts` (pure k-means, no Mol-star dependency).
 */
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder.js'
import { TransformStructureConformation } from 'molstar/lib/mol-plugin-state/transforms/model.js'
import { Mat4, Quat, Vec3 } from 'molstar/lib/mol-math/linear-algebra.js'
import type { PluginContext } from 'molstar/lib/mol-plugin/context.js'
import type { StateObjectSelector } from 'molstar/lib/mol-state/index.js'
import type { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects.js'
import { listChains } from './molstarStructureUtil'
import { setCustomShape, removeCustomShape, type CustomShapeSpec } from './molstarCustomShapes'
import type { ClusterResult } from '../recipe/clustering'
import type { Structure } from 'molstar/lib/mol-model/structure/structure/structure.js'

/**
 * `'spacefill'` is deliberately excluded — root-caused live: once Mol-star's
 * `spacefill` representation (GPU impostor rendering) has been used on this
 * plugin, every custom-shape color (LOD beads, orientation gizmos) rendered
 * afterward — for the rest of the session, regardless of switching to a
 * different representation type or fully reloading the structure hierarchy
 * from scratch — renders as an unrelated uniform color instead of the
 * requested one. Confirmed via isolated A/B testing that `cartoon`,
 * `ball-and-stick`, and `gaussian-surface` never trigger this, only
 * `spacefill` does; confirmed the structure's own coloring is unaffected in
 * every case (only this app's custom-shape rendering is), and confirmed
 * (via a full rebuild-from-trajectory refactor, `buildIngredientRepresentation`)
 * that the corruption isn't specific to incremental component updates — it's
 * some lasting Mol-star-internal (or WebGL-driver-level) state left behind
 * by spacefill's impostor shader path, not something reachable from this
 * app's code. See `web/README-modernization.md`'s "Ingredient Options"
 * section for the full investigation.
 */
export type IngredientRepresentationType = 'cartoon' | 'ball-and-stick' | 'gaussian-surface'
export type IngredientColorType = 'chain-id' | 'uniform' | 'element-symbol' | 'secondary-structure'

export interface IngredientRepresentationResult {
  chains: string[]
  structure: Structure | null
  structureRef: StateObjectSelector<PluginStateObject.Molecule.Structure> | null
}

export interface MembraneTransformInput {
  axis: [number, number, number]
  offset: [number, number, number]
}

const modelRefs = new WeakMap<PluginContext, string>()

/**
 * Rigid transform that moves the loaded structure into the fixed membrane
 * frame `setMembraneGeometry` draws (two disks at world z = ±20) — confirmed
 * as the "real" intended semantics of `pcpalAxis`/`offset`, not a guess:
 * legacy's OPM-derived-structure path (js/ngl.js:4564-4571, comment at 4563
 * "this force the opm pcp and offset. it shouldnt") loads an OPM-hosted PDB
 * that's *already* pre-transformed into OPM's own canonical membrane frame,
 * then forces `axis=[0,0,1]`/`offset=`(structure center) to match — i.e.
 * for OPM structures, the protein was moved to fit a fixed membrane, and
 * axis/offset just describe that it's already in the canonical frame. This
 * generalizes that convention to every membrane ingredient (not only
 * OPM-sourced ones): rotate `axis` onto world `+Z`, then translate `offset`
 * to the world origin — the inverse of legacy's *other*, non-OPM convention
 * (`NGL_ShowAxisOffset`), which kept the protein fixed and moved a gizmo to
 * `axis`/`offset` instead. Confirmed with the user that the protein-moves
 * convention is the correct one.
 */
function membraneAlignmentMatrix(axis: [number, number, number], offset: [number, number, number]): Mat4 {
  const axisVec = Vec3.normalize(Vec3.zero(), Vec3.create(...axis))
  const rotation = Quat.identity()
  Quat.fromUnitVec3(rotation, axisVec, Vec3.create(0, 0, 1))
  const rotationMatrix = Mat4.fromQuat(Mat4.zero(), rotation)
  const translationMatrix = Mat4.fromTranslation(Mat4.zero(), Vec3.negate(Vec3.zero(), Vec3.create(...offset)))
  return Mat4.mul(Mat4.zero(), rotationMatrix, translationMatrix)
}

/**
 * (Re)builds the structure hierarchy + single visible representation *from
 * the trajectory*, restricted to `chainIds` (`null` = all chains) — the
 * Mol-star equivalent of legacy's `NGL_ChangeChainsSelection`/
 * `NGL_ChangeSelection` (js/ngl.js:2021-2059, 1988-2019), which also rebuild
 * the representation from scratch on every selection change rather than
 * toggling visibility.
 *
 * Deliberately re-runs `hierarchy.applyPreset` from the trajectory every
 * time (deleting the previous model subtree first) rather than patching an
 * existing structure's components in place. Found live, root-caused as far
 * as reasonably possible: incrementally deleting/recreating just the
 * *component* under an already-built structure (the original approach)
 * intermittently left later custom-shape colors (LOD beads, orientation
 * gizmos) rendering as a uniform, unrelated color instead of the requested
 * ones — reproducible specifically after a `spacefill` representation had
 * been used on a chain-filtered (non-"all") component, deterministically
 * (not a timing race — confirmed with multi-second waits), but only via
 * that one incremental-update path. Rebuilding the whole hierarchy fresh
 * every time — identical to how a structure's *first* load already always
 * rendered correctly — sidesteps whatever internal state that incremental
 * path was carrying forward, without having fully isolated which Mol-star
 * internal (theme cache, GPU buffer reuse, or something else) it was.
 */
/**
 * Per-plugin operation queue for `buildIngredientRepresentation`/
 * `clearIngredientStructure` — both read-then-write the shared `modelRefs`
 * ref across several `await`s (delete old model, build new one from the
 * trajectory, transform, filter, represent). Found live, confirmed by
 * artificially widening the window between the read and the delete: a fast
 * slider drag fires the owning `useEffect` (`IngredientOptions.tsx`) faster
 * than one rebuild's GPU-bound work completes, so two calls overlap — both
 * read the same stale `modelRefs.get(plugin)`, both target it for deletion,
 * each mints an independent new model via `applyPreset`, and only the last
 * `modelRefs.set` wins, permanently orphaning every earlier in-flight
 * model's geometry (still in the state tree, never tracked again for
 * cleanup) — exactly the "copies of the object along the offset" artifact
 * reported live. Same class of bug, same fix, as `molstarCustomShapes.ts`'s
 * `enqueue`: serialize all calls for a given plugin into arrival order.
 */
const buildQueues = new WeakMap<PluginContext, Promise<unknown>>()

function enqueueBuild<T>(plugin: PluginContext, op: () => Promise<T>): Promise<T> {
  const previous = buildQueues.get(plugin) ?? Promise.resolve()
  const settledPrevious = previous.catch(() => {})
  const next = settledPrevious.then(op)
  buildQueues.set(plugin, next.catch(() => {}))
  return next
}

export function buildIngredientRepresentation(
  plugin: PluginContext,
  trajectoryRef: StateObjectSelector<PluginStateObject.Molecule.Trajectory>,
  chainIds: string[] | null,
  type: IngredientRepresentationType,
  color: IngredientColorType,
  membraneTransform?: MembraneTransformInput | null,
): Promise<IngredientRepresentationResult> {
  return enqueueBuild(plugin, () => buildIngredientRepresentationNow(plugin, trajectoryRef, chainIds, type, color, membraneTransform))
}

async function buildIngredientRepresentationNow(
  plugin: PluginContext,
  trajectoryRef: StateObjectSelector<PluginStateObject.Molecule.Trajectory>,
  chainIds: string[] | null,
  type: IngredientRepresentationType,
  color: IngredientColorType,
  membraneTransform?: MembraneTransformInput | null,
): Promise<IngredientRepresentationResult> {
  const prevModelRef = modelRefs.get(plugin)
  if (prevModelRef && plugin.state.data.cells.has(prevModelRef)) {
    await plugin.build().delete(prevModelRef).commit()
  }
  modelRefs.delete(plugin)

  const preset = await plugin.builders.structure.hierarchy.applyPreset(trajectoryRef, 'default', { representationPreset: 'empty' })
  let structureRef = preset?.structure ?? null
  if (preset?.model) modelRefs.set(plugin, preset.model.ref)
  if (!structureRef || !structureRef.data) return { chains: [], structure: null, structureRef: null }

  if (membraneTransform) {
    const matrix = membraneAlignmentMatrix(membraneTransform.axis, membraneTransform.offset)
    structureRef = await plugin
      .build()
      .to(structureRef)
      .apply(TransformStructureConformation, { transform: { name: 'matrix', params: { data: matrix, transpose: false } } })
      .commit()
  }

  const structure = structureRef.data ?? null
  if (!structure) return { chains: [], structure: null, structureRef: null }
  const chains = listChains(structure)
  const componentRef =
    chainIds && chainIds.length > 0 && chainIds.length < chains.length
      ? await plugin.builders.structure.tryCreateComponentFromExpression(
          structureRef,
          MS.struct.generator.atomGroups({
            'chain-test': MS.core.set.has([MS.set(...chainIds), MS.ammp('label_asym_id')]),
          }),
          'ingredient-chain-filter',
        )
      : await plugin.builders.structure.tryCreateComponentStatic(structureRef, 'all')

  if (componentRef) {
    await plugin.builders.structure.representation.addRepresentation(componentRef, { type, color })
  }
  return { chains, structure, structureRef }
}

export function clearIngredientStructure(plugin: PluginContext): Promise<void> {
  return enqueueBuild(plugin, async () => {
    const prevModelRef = modelRefs.get(plugin)
    if (prevModelRef && plugin.state.data.cells.has(prevModelRef)) {
      await plugin.build().delete(prevModelRef).commit()
    }
    modelRefs.delete(plugin)
  })
}

const MEMBRANE_KEY = 'membrane-gizmo'
const FIBER_KEY = 'fiber-gizmo'

/** Disks sit at world z = ±20 — 40Å apart total, per the confirmed membrane thickness. */
const MEMBRANE_HALF_SEPARATION = 20
/** Purely visual thickness so each leaflet reads as a flat disk rather than a zero-volume plane. */
const MEMBRANE_DISK_THICKNESS = 2

/**
 * Draws the fixed membrane — two disks 40Å apart at world z = ±20, red =
 * outside (z > 0), blue = inside (z < 0), matching legacy's own leaflet
 * sign convention (js/ngl.js:3330: "Sign of Z coordinate is negative at the
 * inner (IN) side and positive at the outer side"). Fixed in world space,
 * not positioned via `axis`/`offset` — see `membraneAlignmentMatrix`'s
 * docstring for why the *protein* moves to this fixed frame instead.
 * `radius` scales the disks to the loaded structure's size (the same
 * bounding-radius-derived value used for the fiber gizmo).
 */
export async function setMembraneGeometry(plugin: PluginContext, radius: number): Promise<void> {
  const half = MEMBRANE_DISK_THICKNESS / 2
  const spec: CustomShapeSpec = {
    label: 'Membrane',
    cylinders: [
      {
        start: [0, 0, MEMBRANE_HALF_SEPARATION - half],
        end: [0, 0, MEMBRANE_HALF_SEPARATION + half],
        radiusTop: radius,
        radiusBottom: radius,
        color: [0.85, 0.15, 0.15],
      },
      {
        start: [0, 0, -MEMBRANE_HALF_SEPARATION - half],
        end: [0, 0, -MEMBRANE_HALF_SEPARATION + half],
        radiusTop: radius,
        radiusBottom: radius,
        color: [0.15, 0.35, 0.85],
      },
    ],
  }
  await setCustomShape(plugin, MEMBRANE_KEY, spec)
}

export async function clearMembraneGeometry(plugin: PluginContext): Promise<void> {
  await removeCustomShape(plugin, MEMBRANE_KEY)
}

/**
 * Builds/updates the fiber orientation gizmo — legacy's `NGL_ShowFiberAxis`
 * "arrowfiber" shape (js/ngl.js:3283-3313): a single arrow from `offset`
 * along `axis` for `length`. Modeled as a shaft cylinder + a cone (a
 * cylinder with `radiusTop: 0`) for the arrowhead, since Mol-star's mesh
 * builder has no dedicated arrow primitive.
 */
export async function setFiberGizmo(
  plugin: PluginContext,
  axis: [number, number, number],
  offset: [number, number, number],
  length: number,
  radius: number,
): Promise<void> {
  const [ax, ay, az] = axis
  const [ox, oy, oz] = offset
  const shaftEnd: [number, number, number] = [ox + ax * length * 0.85, oy + ay * length * 0.85, oz + az * length * 0.85]
  const tip: [number, number, number] = [ox + ax * length, oy + ay * length, oz + az * length]
  const spec: CustomShapeSpec = {
    label: 'Fiber orientation',
    cylinders: [
      { start: offset, end: shaftEnd, radiusTop: radius, radiusBottom: radius, color: [0.1, 0.75, 0.75] },
      { start: shaftEnd, end: tip, radiusTop: 0, radiusBottom: radius * 2.5, color: [0.1, 0.75, 0.75] },
    ],
  }
  await setCustomShape(plugin, FIBER_KEY, spec)
}

export async function clearFiberGizmo(plugin: PluginContext): Promise<void> {
  await removeCustomShape(plugin, FIBER_KEY)
}

const LEVEL_COLORS: [number, number, number][] = [
  [0.9, 0.3, 0.3],
  [0.3, 0.7, 0.3],
  [0.3, 0.4, 0.9],
]

export type BeadColorMode = 'level' | 'radius' | 'random' | 'red'

function colorForBead(colorMode: BeadColorMode, level: number, index: number, radius: number, maxRadius: number): [number, number, number] {
  if (colorMode === 'red') return [0.85, 0.15, 0.15]
  if (colorMode === 'level') return LEVEL_COLORS[level % LEVEL_COLORS.length]
  if (colorMode === 'radius') {
    const t = maxRadius > 0 ? radius / maxRadius : 0
    return [t, 0.3, 1 - t]
  }
  // random, but deterministic per (level, index) so re-rendering the same data doesn't flicker colors
  let h = (level + 1) * 2654435761 + index * 40503
  h = (h ^ (h >>> 15)) >>> 0
  const r = ((h % 200) + 30) / 255
  const g = (((h >> 8) % 200) + 30) / 255
  const b = (((h >> 16) % 200) + 30) / 255
  return [r, g, b]
}

/** Renders one LOD level's beads as spheres — legacy's `NGL_multiSpheresComp` (js/ngl.js:4804). */
export async function renderLodLevel(plugin: PluginContext, level: number, result: ClusterResult, colorMode: BeadColorMode): Promise<void> {
  const maxRadius = Math.max(0, ...result.radii)
  const spec: CustomShapeSpec = {
    label: `LOD ${level} beads`,
    spheres: result.centers.map((center, i) => ({
      center,
      radius: result.radii[i],
      color: colorForBead(colorMode, level, i, result.radii[i], maxRadius),
    })),
  }
  await setCustomShape(plugin, lodKey(level), spec)
}

export async function clearLodLevel(plugin: PluginContext, level: number): Promise<void> {
  await removeCustomShape(plugin, lodKey(level))
}

function lodKey(level: number): string {
  return `lod-${level}-beads`
}

/** Captures the current viewport as a PNG data URI — legacy's `NGL_makeImage`/`stage.makeImage` (js/ngl.js:2493-2530). */
export async function captureSprite(plugin: PluginContext): Promise<string | null> {
  const helper = plugin.helpers.viewportScreenshot
  if (!helper) return null
  return helper.getImageDataUri()
}
