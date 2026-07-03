/**
 * K-means clustering of 3D points into a coarse "bead" representation —
 * replaces legacy's `buildWithKmeans` (js/ngl.js:3965, backing
 * `NGL_ClusterStructure`/`NGL_buildBeads`/`NGL_autoBuildBeads`). Deliberately
 * a plain, library-independent function: the audit for the "NGL Options" ->
 * "Ingredient Options" rebuild found this has no relationship to NGL/Mol-star
 * at all — it's a generic clustering algorithm run over atom coordinates,
 * with only the final sphere rendering being viewer-specific (see
 * `molstarCustomShapes.ts`). Legacy's `buildWithOptics`/`buildWithDBScan`
 * alternates are commented-out dead code with no UI ever wired to them —
 * not ported.
 *
 * Not a byte-for-byte port of legacy's k-means (which was never a documented
 * algorithm to match, just "some k-means over atomStore") — this is a
 * standard k-means++-seeded implementation, deterministic given a seed so
 * it's testable.
 */

export interface ClusterResult {
  /** Cluster center, one per bead. */
  centers: [number, number, number][]
  /** Bead radius: the max distance from its center to any assigned point (covers all members). */
  radii: number[]
}

function distSq(a: readonly number[], b: readonly number[]): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return dx * dx + dy * dy + dz * dz
}

/** Mulberry32 — small deterministic PRNG so clustering is reproducible/testable. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function kmeansPlusPlusSeed(points: [number, number, number][], k: number, rand: () => number): [number, number, number][] {
  const centers: [number, number, number][] = [points[Math.floor(rand() * points.length)]]
  while (centers.length < k) {
    const dists = points.map((p) => Math.min(...centers.map((c) => distSq(p, c))))
    const sum = dists.reduce((a, b) => a + b, 0)
    if (sum === 0) {
      centers.push(points[Math.floor(rand() * points.length)])
      continue
    }
    let target = rand() * sum
    let chosen = points[points.length - 1]
    for (let i = 0; i < points.length; i++) {
      target -= dists[i]
      if (target <= 0) {
        chosen = points[i]
        break
      }
    }
    centers.push(chosen)
  }
  return centers
}

/**
 * Clusters `points` into `k` groups. Returns one center + covering radius
 * per cluster. `k` is clamped to `[1, points.length]`. Empty `points` (or
 * k <= 0) returns an empty result rather than throwing, since a caller may
 * invoke this on a chain-filtered subset that happens to be empty.
 */
export function kmeans(points: [number, number, number][], k: number, options: { iterations?: number; seed?: number } = {}): ClusterResult {
  if (points.length === 0 || k <= 0) return { centers: [], radii: [] }
  const n = points.length
  const clampedK = Math.min(k, n)
  const iterations = options.iterations ?? 20
  const rand = mulberry32(options.seed ?? 1)

  let centers = kmeansPlusPlusSeed(points, clampedK, rand)
  const assignment = new Int32Array(n)

  for (let iter = 0; iter < iterations; iter++) {
    let changed = false
    for (let i = 0; i < n; i++) {
      let best = 0
      let bestDist = distSq(points[i], centers[0])
      for (let c = 1; c < centers.length; c++) {
        const d = distSq(points[i], centers[c])
        if (d < bestDist) {
          bestDist = d
          best = c
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best
        changed = true
      }
    }

    const sums = centers.map(() => [0, 0, 0])
    const counts = new Array(centers.length).fill(0)
    for (let i = 0; i < n; i++) {
      const c = assignment[i]
      sums[c][0] += points[i][0]
      sums[c][1] += points[i][1]
      sums[c][2] += points[i][2]
      counts[c]++
    }
    centers = centers.map((old, c) => (counts[c] > 0 ? [sums[c][0] / counts[c], sums[c][1] / counts[c], sums[c][2] / counts[c]] : old))

    if (!changed && iter > 0) break
  }

  const radii = centers.map(() => 0)
  for (let i = 0; i < n; i++) {
    const c = assignment[i]
    const d = Math.sqrt(distSq(points[i], centers[c]))
    if (d > radii[c]) radii[c] = d
  }
  // A bead covering zero-spread points (a cluster of size 1, or coincident
  // points) would render as a zero-radius (invisible) sphere — floor it.
  for (let c = 0; c < radii.length; c++) if (radii[c] <= 0) radii[c] = 1

  return { centers, radii }
}

/** Legacy's LOD-0 fallback (`NGL_autoBuildBeads`, js/ngl.js:4205): one sphere covering the whole point set. */
export function boundingSphere(points: [number, number, number][]): ClusterResult {
  if (points.length === 0) return { centers: [], radii: [] }
  const center: [number, number, number] = [0, 0, 0]
  for (const p of points) {
    center[0] += p[0]
    center[1] += p[1]
    center[2] += p[2]
  }
  center[0] /= points.length
  center[1] /= points.length
  center[2] /= points.length
  let radius = 0
  for (const p of points) {
    const d = Math.sqrt(distSq(p, center))
    if (d > radius) radius = d
  }
  return { centers: [center], radii: [radius || 1] }
}

/**
 * "Auto number of beads" — legacy's live heuristic (`buildWithKmeans`,
 * js/ngl.js:3988-4007, gated by the `#toggle_cluster_auto` checkbox): bead
 * count = (bounding volume of the structure) / (volume of one bead at the
 * target radius), floored at 3. Legacy computes the bounding volume from
 * the structure's *principal axes* (a PCA-oriented box); this uses an
 * axis-aligned bounding box instead — same volume-ratio idea, without
 * requiring a PCA implementation. `NGL_autoClusterUniqueSize`
 * (js/ngl.js:3631-3650), which the audit initially found and assumed was
 * the live heuristic, turned out to be dead code (its only call site is
 * commented out) — confirmed by finding the actual call site instead.
 */
export function autoBeadCount(points: [number, number, number][], targetBeadRadius: number): number {
  if (points.length === 0) return 3
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i]
      if (p[i] > max[i]) max[i] = p[i]
    }
  }
  const volume = Math.max(0, max[0] - min[0]) * Math.max(0, max[1] - min[1]) * Math.max(0, max[2] - min[2])
  const beadVolume = (4 / 3) * Math.PI * targetBeadRadius ** 3
  if (beadVolume <= 0) return 3
  return Math.max(3, Math.ceil(volume / beadVolume))
}

/** "Overwrite cluster radius" — replaces every bead's computed radius with a fixed value. */
export function overrideRadii(result: ClusterResult, radius: number): ClusterResult {
  return { centers: result.centers, radii: result.radii.map(() => radius) }
}
