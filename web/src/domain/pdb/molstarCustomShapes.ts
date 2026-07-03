/**
 * Adds/removes arbitrary sphere/cylinder geometry (LOD beads, membrane and
 * fiber orientation gizmos) into a Mol-star plugin's scene, alongside
 * whatever structure is loaded. There is no such thing in vanilla Mol-star —
 * this is the "genuinely custom cellPACK logic" flagged in the "NGL Options"
 * audit (see web/README-modernization.md's "Ingredient Options" section):
 * legacy builds the same shapes with NGL's `Shape.addSphere`/`addCylinder`
 * (js/ngl.js's `NGL_ShowAxisOffset`/`NGL_ShowFiberAxis`/`NGL_multiSpheres`).
 * This is the Mol-star equivalent, following the exact pattern Mol-star's
 * own `extensions/meshes/mesh-extension.js` uses for injecting custom mesh
 * geometry: a `StateTransformer` from `PluginStateObject.Root` to
 * `PluginStateObject.Shape.Provider`, then the built-in `ShapeRepresentation3D`
 * transform turns that into a rendered representation.
 *
 * Deliberately always delete-and-recreate on change rather than relying on
 * `StateTransformer.update()` diffing — these shapes are a handful of
 * primitives (beads, one gizmo), so the perf cost is negligible, and
 * delete+recreate sidesteps needing to verify partial-update semantics for a
 * one-off custom transform.
 */
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra.js'
import { Color } from 'molstar/lib/mol-util/color/index.js'
import { Mesh } from 'molstar/lib/mol-geo/geometry/mesh/mesh.js'
import { MeshBuilder } from 'molstar/lib/mol-geo/geometry/mesh/mesh-builder.js'
import { addSphere } from 'molstar/lib/mol-geo/geometry/mesh/builder/sphere.js'
import { addCylinder } from 'molstar/lib/mol-geo/geometry/mesh/builder/cylinder.js'
import { Shape } from 'molstar/lib/mol-model/shape.js'
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects.js'
import { ShapeRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation.js'
import { StateTransformer } from 'molstar/lib/mol-state/index.js'
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition.js'
import type { PluginContext } from 'molstar/lib/mol-plugin/context.js'

export interface ShapeSphere {
  center: [number, number, number]
  radius: number
  color: [number, number, number]
}

export interface ShapeCylinder {
  start: [number, number, number]
  end: [number, number, number]
  radiusTop: number
  radiusBottom: number
  color: [number, number, number]
}

export interface CustomShapeSpec {
  label: string
  spheres?: ShapeSphere[]
  cylinders?: ShapeCylinder[]
}

function buildMesh(spec: CustomShapeSpec): { mesh: Mesh; colors: Color[] } {
  const state = MeshBuilder.createState(512, 512)
  const colors: Color[] = []
  let group = 0
  for (const s of spec.spheres ?? []) {
    state.currentGroup = group++
    addSphere(state, Vec3.create(...s.center), s.radius, 2)
    colors.push(Color.fromNormalizedRgb(...s.color))
  }
  for (const c of spec.cylinders ?? []) {
    state.currentGroup = group++
    addCylinder(state, Vec3.create(...c.start), Vec3.create(...c.end), 1, {
      radiusTop: c.radiusTop,
      radiusBottom: c.radiusBottom,
      radialSegments: 16,
      topCap: true,
      bottomCap: true,
    })
    colors.push(Color.fromNormalizedRgb(...c.color))
  }
  const mesh = MeshBuilder.getMesh(state)
  return { mesh, colors }
}

const CreateCustomShape = StateTransformer.builderFactory('mesoscope')({
  name: 'ingredient-custom-shape',
  display: 'Ingredient Custom Shape',
  from: PluginStateObject.Root,
  to: PluginStateObject.Shape.Provider,
  params: { spec: PD.Value<CustomShapeSpec>({ label: '' }, { isHidden: true }) },
})({
  apply({ params }) {
    const { spec } = params
    return new PluginStateObject.Shape.Provider(
      {
        label: spec.label,
        data: spec,
        params: Mesh.Params,
        geometryUtils: Mesh.Utils,
        getShape: (_ctx: unknown, data: CustomShapeSpec) => {
          const { mesh, colors } = buildMesh(data)
          return Shape.create(
            data.label,
            data,
            mesh,
            (groupId: number) => colors[groupId] ?? Color(0x888888),
            () => 1,
            () => data.label,
          )
        },
      },
      { label: spec.label },
    )
  },
})

const shapeRefs = new WeakMap<PluginContext, Map<string, string>>()

function refsFor(plugin: PluginContext): Map<string, string> {
  let map = shapeRefs.get(plugin)
  if (!map) {
    map = new Map()
    shapeRefs.set(plugin, map)
  }
  return map
}

/**
 * Per-(plugin, key) operation queue. `setCustomShape`/`removeCustomShape` for
 * the *same* key must never run concurrently — found live: a `setCustomShape`
 * call (delete-old, create-new, then register the new ref) racing against an
 * immediately-following `removeCustomShape` call for the same key (from a
 * quick show-then-hide re-render, e.g. switching the selected ingredient
 * while a LOD level was visible) could let the `removeCustomShape` run
 * *before* the `setCustomShape` had finished registering its new ref — it
 * would find nothing to delete, no-op, and then the `setCustomShape` would
 * register a ref for a shape nothing will ever clean up again: a
 * permanently orphaned, visible shape from an ingredient that's no longer
 * selected. Enqueuing serializes same-key calls into the order they were
 * requested, so a "hide" issued after a "show" always waits for that show to
 * finish registering before it runs, and correctly finds (and removes) it.
 */
const operationQueues = new WeakMap<PluginContext, Map<string, Promise<void>>>()

function enqueue(plugin: PluginContext, key: string, op: () => Promise<void>): Promise<void> {
  let queues = operationQueues.get(plugin)
  if (!queues) {
    queues = new Map()
    operationQueues.set(plugin, queues)
  }
  const previous = queues.get(key) ?? Promise.resolve()
  const settledPrevious = previous.catch(() => {})
  const next = settledPrevious.then(op)
  queues.set(key, next.catch(() => {}))
  return next
}

/** Adds (or replaces, if `key` already has a shape) a custom shape in the plugin's scene. */
export function setCustomShape(plugin: PluginContext, key: string, spec: CustomShapeSpec): Promise<void> {
  return enqueue(plugin, key, async () => {
    await removeCustomShapeNow(plugin, key)
    const shapeNode = plugin.build().toRoot().apply(CreateCustomShape, { spec })
    const ref = shapeNode.ref
    await shapeNode.apply(ShapeRepresentation3D).commit()
    refsFor(plugin).set(key, ref)
  })
}

/** Removes a previously-added custom shape, if one exists for `key`. No-op otherwise. */
export function removeCustomShape(plugin: PluginContext, key: string): Promise<void> {
  return enqueue(plugin, key, () => removeCustomShapeNow(plugin, key))
}

async function removeCustomShapeNow(plugin: PluginContext, key: string): Promise<void> {
  const refs = refsFor(plugin)
  const ref = refs.get(key)
  if (!ref) return
  refs.delete(key)
  const cell = plugin.state.data.cells.get(ref)
  if (!cell) return
  await plugin.build().delete(ref).commit()
}

/** Removes every custom shape this module has added to `plugin` (view teardown / structure change). */
export async function clearCustomShapes(plugin: PluginContext): Promise<void> {
  const refs = refsFor(plugin)
  await Promise.all([...refs.keys()].map((key) => removeCustomShape(plugin, key)))
}
