import { Mat4, Vec3 } from 'molstar/lib/mol-math/linear-algebra.js'
import { PluginContext } from 'molstar/lib/mol-plugin/context.js'
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec.js'
import { StructureInstances } from 'molstar/lib/mol-plugin-state/transforms/model.js'
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation.js'
import { describe, expect, it } from 'vitest'
import {
  buildIngredientRepresentation,
  fiberInstanceMatrices,
  MAX_FIBER_PREVIEW_COPIES,
  setFiberPreview,
} from '../src/domain/pdb/ingredientViewControls'

const TWO_ATOM_PDB = `ATOM      1  N   ALA A   1       1.000   0.000   0.000  1.00 20.00           N
ATOM      2  CA  ALA A   1       2.000   0.000   0.000  1.00 20.00           C
TER
END
`

describe('fiberInstanceMatrices', () => {
  it('keeps copy zero unchanged and applies rise and twist per following copy', () => {
    const matrices = fiberInstanceMatrices({
      copies: 3,
      axis: [0, 0, 1],
      rise: 10,
      twist: 90,
      offset: [0, 0, 0],
    })

    expect(matrices).toHaveLength(3)
    // Mol-star's Structure.instances must not receive an exact identity mixed
    // with other transforms or it reuses unit ids. The nudge is negligible.
    expect(Mat4.isIdentity(matrices[0])).toBe(false)
    const first = Vec3.transformMat4(Vec3.zero(), Vec3.create(1, 0, 0), matrices[0])
    expect(first[0]).toBeCloseTo(1, 6)
    expect(first[1]).toBeCloseTo(0, 6)
    expect(first[2]).toBeCloseTo(0.000002, 9)
    const transformed = Vec3.transformMat4(Vec3.zero(), Vec3.create(1, 0, 0), matrices[1])
    expect(transformed[0]).toBeCloseTo(0, 6)
    expect(transformed[1]).toBeCloseTo(1, 6)
    expect(transformed[2]).toBeCloseTo(10, 6)
  })

  it('rotates around the axis passing through the fiber offset', () => {
    const [, second] = fiberInstanceMatrices({
      copies: 2,
      axis: [0, 0, 1],
      rise: 5,
      twist: 90,
      offset: [2, 0, 0],
    })

    const transformed = Vec3.transformMat4(Vec3.zero(), Vec3.create(3, 0, 0), second)
    expect(transformed[0]).toBeCloseTo(2, 6)
    expect(transformed[1]).toBeCloseTo(1, 6)
    expect(transformed[2]).toBeCloseTo(5, 6)
  })

  it('normalizes the axis, falls back from a zero axis, and caps preview size', () => {
    const matrices = fiberInstanceMatrices({
      copies: MAX_FIBER_PREVIEW_COPIES + 20,
      axis: [0, 0, 0],
      rise: 2,
      twist: 0,
      offset: [0, 0, 0],
    })

    expect(matrices).toHaveLength(MAX_FIBER_PREVIEW_COPIES)
    const transformed = Vec3.transformMat4(Vec3.zero(), Vec3.zero(), matrices[1])
    expect([...transformed]).toEqual([0, 0, 2])
  })

  it('propagates fiber rise and twist through StructureInstances to the GPU representation', async () => {
    const plugin = new PluginContext(DefaultPluginSpec())
    await plugin.init()

    try {
      const data = await plugin.builders.data.rawData({ data: TWO_ATOM_PDB, label: 'fiber-preview-test' })
      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb')
      await buildIngredientRepresentation(plugin, trajectory, null, 'ball-and-stick', 'chain-id')

      await setFiberPreview(plugin, {
        copies: 3,
        axis: [0, 0, 1],
        rise: 10,
        twist: 0,
        offset: [0, 0, 0],
      })
      await setFiberPreview(plugin, {
        copies: 3,
        axis: [0, 0, 1],
        rise: 25,
        twist: 90,
        offset: [0, 0, 0],
      })

      const instanceCell = [...plugin.state.data.cells.values()].find(
        (cell) => cell.transform.transformer === StructureInstances,
      )
      expect(instanceCell?.obj).toBeDefined()

      const transforms = instanceCell!.params!.values.transforms as Array<{
        transform: { params: { data: Mat4 } }
      }>
      // Mol-star render-refresh order deliberately places dynamic copy one
      // first and the effectively-stationary anchor second.
      const helicalMatrix = transforms[0].transform.params.data
      const transformed = Vec3.transformMat4(Vec3.zero(), Vec3.create(1, 0, 0), helicalMatrix)
      expect(transformed[0]).toBeCloseTo(0, 6)
      expect(transformed[1]).toBeCloseTo(1, 6)
      expect(transformed[2]).toBeCloseTo(25, 6)

      const instancedStructure = instanceCell!.obj!.data
      expect(instancedStructure.units).toHaveLength(3)
      const firstOperator = instancedStructure.units[0].conformation.operator.matrix
      expect(Mat4.areEqual(firstOperator, helicalMatrix, 1e-6)).toBe(true)

      const representationCell = [...plugin.state.data.cells.values()].find(
        (cell) => cell.transform.transformer === StructureRepresentation3D,
      )
      const renderObject = representationCell?.obj?.data.repr.renderObjects.find(
        (object) => object.values.instanceCount.ref.value === 3,
      )
      expect(renderObject).toBeDefined()
      const gpuMatrix = Mat4.fromArray(Mat4(), renderObject!.values.aTransform.ref.value, 0)
      const gpuTransformed = Vec3.transformMat4(Vec3.zero(), Vec3.create(1, 0, 0), gpuMatrix)
      expect(gpuTransformed[0]).toBeCloseTo(0, 6)
      expect(gpuTransformed[1]).toBeCloseTo(1, 6)
      expect(gpuTransformed[2]).toBeCloseTo(25, 6)
    } finally {
      plugin.dispose()
    }
  })
})
