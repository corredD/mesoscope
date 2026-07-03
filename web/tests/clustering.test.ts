import { describe, expect, it } from 'vitest'
import { autoBeadCount, boundingSphere, kmeans, overrideRadii } from '../src/domain/recipe/clustering'

describe('kmeans', () => {
  it('returns an empty result for no points', () => {
    expect(kmeans([], 3)).toEqual({ centers: [], radii: [] })
  })

  it('clamps k to the number of points', () => {
    const result = kmeans([[0, 0, 0], [1, 0, 0]], 10)
    expect(result.centers).toHaveLength(2)
    expect(result.radii).toHaveLength(2)
  })

  it('separates two well-separated clusters correctly', () => {
    const cluster1: [number, number, number][] = [[0, 0, 0], [0.1, 0, 0], [0, 0.1, 0], [-0.1, 0, 0]]
    const cluster2: [number, number, number][] = [[100, 100, 100], [100.1, 100, 100], [100, 100.1, 100]]
    const result = kmeans([...cluster1, ...cluster2], 2, { seed: 42 })
    expect(result.centers).toHaveLength(2)
    // one center should land near the origin cluster, the other near (100,100,100)
    const nearOrigin = result.centers.some((c) => Math.hypot(...c) < 5)
    const nearFar = result.centers.some((c) => Math.hypot(c[0] - 100, c[1] - 100, c[2] - 100) < 5)
    expect(nearOrigin).toBe(true)
    expect(nearFar).toBe(true)
  })

  it('every point is within its cluster radius of its cluster center (radii actually cover assignments)', () => {
    const points: [number, number, number][] = Array.from({ length: 30 }, (_, i) => [Math.sin(i), Math.cos(i), i * 0.1])
    const result = kmeans(points, 4, { seed: 7 })
    for (const p of points) {
      const best = result.centers.reduce(
        (bestI, c, i) => (Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < Math.hypot(p[0] - result.centers[bestI][0], p[1] - result.centers[bestI][1], p[2] - result.centers[bestI][2]) ? i : bestI),
        0,
      )
      const d = Math.hypot(p[0] - result.centers[best][0], p[1] - result.centers[best][1], p[2] - result.centers[best][2])
      expect(d).toBeLessThanOrEqual(result.radii[best] + 1e-9)
    }
  })

  it('is deterministic given the same seed', () => {
    const points: [number, number, number][] = Array.from({ length: 20 }, (_, i) => [i, i * 2, i * 3])
    const a = kmeans(points, 3, { seed: 5 })
    const b = kmeans(points, 3, { seed: 5 })
    expect(a).toEqual(b)
  })

  it('never produces a zero radius bead', () => {
    const result = kmeans([[1, 1, 1], [1, 1, 1], [1, 1, 1]], 1)
    expect(result.radii[0]).toBeGreaterThan(0)
  })
})

describe('boundingSphere', () => {
  it('returns empty for no points', () => {
    expect(boundingSphere([])).toEqual({ centers: [], radii: [] })
  })

  it('covers all points from a single center (legacy LOD-0 fallback)', () => {
    const points: [number, number, number][] = [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]]
    const result = boundingSphere(points)
    expect(result.centers).toHaveLength(1)
    const [cx, cy, cz] = result.centers[0]
    for (const [x, y, z] of points) {
      expect(Math.hypot(x - cx, y - cy, z - cz)).toBeLessThanOrEqual(result.radii[0] + 1e-9)
    }
  })
})

describe('autoBeadCount', () => {
  it('returns the floor (3) for no points', () => {
    expect(autoBeadCount([], 5)).toBe(3)
  })

  it('returns the floor (3) for a tiny structure relative to the target bead size', () => {
    const points: [number, number, number][] = [[0, 0, 0], [1, 1, 1]]
    expect(autoBeadCount(points, 50)).toBe(3)
  })

  it('scales up for a large structure relative to a small target bead radius', () => {
    // a 100x100x100 box has a much larger volume than a handful of radius-2 beads would need
    const points: [number, number, number][] = [
      [0, 0, 0], [100, 0, 0], [0, 100, 0], [0, 0, 100], [100, 100, 100],
    ]
    const count = autoBeadCount(points, 2)
    expect(count).toBeGreaterThan(3)
  })

  it('is monotonically non-decreasing as the target bead radius shrinks (more, smaller beads needed)', () => {
    const points: [number, number, number][] = [[0, 0, 0], [50, 0, 0], [0, 50, 0], [0, 0, 50]]
    const coarse = autoBeadCount(points, 20)
    const fine = autoBeadCount(points, 5)
    expect(fine).toBeGreaterThanOrEqual(coarse)
  })
})

describe('overrideRadii', () => {
  it('replaces every radius with the given value, keeping centers unchanged', () => {
    const result = { centers: [[0, 0, 0], [1, 1, 1]] as [number, number, number][], radii: [3, 7] }
    const overridden = overrideRadii(result, 5)
    expect(overridden.radii).toEqual([5, 5])
    expect(overridden.centers).toBe(result.centers)
  })

  it('handles an empty result', () => {
    expect(overrideRadii({ centers: [], radii: [] }, 5)).toEqual({ centers: [], radii: [] })
  })
})
