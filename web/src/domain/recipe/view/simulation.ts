/**
 * The Recipe view's physics (recipe-view.md §3, §10.2): every node in one d3 force simulation with legacy's forces
 * (`updateForce`, main.js:2865-2875), legacy's custom forces as unscaled velocity nudges (`drawNode`, main.js:5417-5472),
 * and the kept departures of §10.4-§10.5: the simulation cools to rest after a drag, surface ingredients are held on
 * their membrane's centreline and interior ones inside its inner edge, and a compartment carries its subtree.
 *
 * No React, no canvas, no timer: the owner calls `step()` once per animation frame while `hot` (d3's own timer is
 * never started). Nothing here allocates per tick or per pointer move; d3's collide builds its quadtree per tick,
 * which is d3's, not ours.
 */
import { forceCollide, forceLink, forceSimulation, type Force, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force'
import type { RecipeLink, RecipeNode } from '../types'

export interface SimNode extends SimulationNodeDatum {
  x: number
  y: number
  vx: number
  vy: number
  node: RecipeNode
  parent: SimNode | null
  /** Direct children, in the recipe's order. */
  kids: SimNode[]
  /** The depth the collision groups read: 6 while floated by an Edit-Mode drag (§3.7). */
  depth: number
  r: number
  leaf: boolean
  surface: boolean
  /** Group-by cluster (§6.5): centre relative to the parent, and radius. */
  cluster: { x: number; y: number; r: number } | null
  /** Position after the previous step: a compartment carries its kids by the difference (§10.5). */
  px: number
  py: number
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  source: SimNode
  target: SimNode
  link: RecipeLink
}

/** Legacy `AllForces` (main.js:177-183, §0). */
export interface Forces {
  ParentForce: number
  SurfaceForce: number
  LinkForce: number
  clusterByForce: number
  collisionForce: number
}

export const DEFAULT_FORCES: Forces = { ParentForce: 0.01, SurfaceForce: 0.5, LinkForce: 0.1, clusterByForce: 0.01, collisionForce: 1 }

/** Legacy's drawn membrane half-thickness: the band is r±5 (§2.4). */
export const MEMBRANE = 5
/** `alphaTarget` while a drag holds the simulation warm (main.js:5116). */
export const DRAG_HEAT = 0.3
/** Depth of a node floated by an Edit-Mode drag: out of every d0-d4 group (main.js:5159-5168, §3.7). */
export const FLOAT_DEPTH = 6

/** Restricts a force to the nodes passing `filter` when it initialises (`isolate`, main.js:2859-2863). */
function isolate<F extends Force<SimNode, undefined>>(force: F, filter: (d: SimNode) => boolean): F {
  const init = force.initialize
  force.initialize = (nodes, random) => init?.call(force, nodes.filter(filter), random)
  return force
}

interface Drag {
  subject: SimNode
  /** An Edit-Mode drag without Ctrl: the subject floats free to be dropped elsewhere (§4.7). */
  floating: boolean
}

export class RecipeSimulation {
  readonly sim: Simulation<SimNode, SimLink>
  nodes: SimNode[] = []
  links: SimLink[] = []
  forces: Forces = { ...DEFAULT_FORCES }
  /** Legacy `clusterBy` (§6.5): the cluster nudge runs only when on. */
  clusterBy = false
  drag: Drag | null = null

  constructor() {
    // d3's timer is stopped at once: the owner steps the simulation from its own frame loop.
    this.sim = forceSimulation<SimNode, SimLink>().stop()
    // Legacy keeps d3 v4's defaults (oracle `forces.simulation`): alphaMin .001, decay 1-.001^(1/300), velocityDecay .4.
  }

  /** A new recipe (§3.1): every node, positions as given, velocities reset, heated to alpha 1. */
  load(nodes: SimNode[], links: SimLink[]): void {
    for (const n of nodes) {
      n.vx = 0
      n.vy = 0
      n.fx = null
      n.fy = null
      n.px = n.x
      n.py = n.y
    }
    this.drag = null
    this.setGraph(nodes, links)
    this.sim.alpha(1)
  }

  /** The same simulation over an edited node set (§1.9: nothing is repacked; known nodes keep their state). */
  setGraph(nodes: SimNode[], links: SimLink[]): void {
    this.nodes = nodes
    this.links = links
    this.updateForce()
  }

  /** Legacy `updateForce` (main.js:2865-2875, §3.2): rebuilds every force over the current nodes and links. */
  updateForce(): void {
    const sim = this.sim
    const f = this.forces
    sim.nodes(this.nodes)
    // The custom nudges first: legacy applies them after a tick's integration, i.e. before the next tick's forces.
    sim.force('legacy', this.nudges)
    sim.force('link', forceLink<SimNode, SimLink>(this.links).strength(Number(f.LinkForce)))
    for (let depth = 0; depth <= 4; depth++) {
      sim.force(`d${depth}`, isolate(forceCollide<SimNode>((d) => d.r).strength(1), (d) => d.depth === depth))
    }
    sim.force('leaf', isolate(forceCollide<SimNode>((d) => d.r * 1.15).strength(Number(f.collisionForce)), (d) => d.leaf))
  }

  setForces(forces: Forces): void {
    this.forces = { ...forces }
    this.updateForce()
    this.heat()
  }

  /** Warms a resting simulation so an edit or a force change shows (§10.4); never cools a hotter one. */
  heat(alpha = DRAG_HEAT): void {
    if (this.sim.alpha() < alpha) this.sim.alpha(alpha)
  }

  /** Whether `step()` still moves anything: alpha above alphaMin, or a drag holding it warm. */
  get hot(): boolean {
    return this.sim.alpha() >= this.sim.alphaMin() || this.sim.alphaTarget() > 0
  }

  /** One tick, then the §10.5 constraints. */
  step(): void {
    this.sim.tick()
    this.constrain()
  }

  /**
   * Legacy's per-node velocity nudges (`drawNode`, main.js:5417-5472, §3.3), not scaled by alpha: cluster pull,
   * surface spring to the parent's centreline, root pulled to world (0,0), and the pull to the parent's centre when a
   * node nears its parent's inner edge (not under the root).
   */
  private readonly nudges = (): void => {
    const f = this.forces
    const parentForce = Number(f.ParentForce)
    const surfaceForce = Number(f.SurfaceForce)
    const clusterForce = Number(f.clusterByForce)
    for (const d of this.nodes) {
      const p = d.parent
      if (this.clusterBy && d.cluster && p) {
        const cx = d.cluster.x + p.x
        const cy = d.cluster.y + p.y
        if (Math.hypot(d.x - cx, d.y - cy) > d.r + d.cluster.r) {
          d.vx += (cx - d.x) * clusterForce
          d.vy += (cy - d.y) * clusterForce
        }
      }
      if (!p) {
        d.vx += -d.x * 0.1 // §8.8: the root drifts to world (0,0)
        d.vy += -d.y * 0.1
        continue
      }
      const dx = d.x - p.x
      const dy = d.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (d.leaf && d.surface) {
        if (dist > 0) {
          const k = ((p.r - dist) * surfaceForce) / dist
          d.vx += dx * k
          d.vy += dy * k
        }
      } else if (p.parent && dist + d.r * 1.2 > p.r - MEMBRANE) {
        d.vx += (p.x - d.x) * parentForce
        d.vy += (p.y - d.y) * parentForce
      }
    }
  }

  /**
   * §10.5, after each tick, parents before children (the nodes are breadth-first): a dragged compartment is clamped
   * inside its parent; a compartment carries its kids by its own move; ingredients under a compartment are put back on
   * its centreline (surface) or inside its inner edge (interior), their outward velocity removed so the next tick
   * does not push them out again. Nothing under the root, which has no membrane, and not the floating subject.
   */
  private constrain(): void {
    const drag = this.drag
    for (const n of this.nodes) {
      const p = n.parent
      if (p?.parent && !(drag?.floating && drag.subject === n)) {
        if (n.leaf) project(n, p)
        else if (drag?.subject === n) clampInside(n, p)
      }
      if (!n.leaf && p) {
        const dx = n.x - n.px
        const dy = n.y - n.py
        if (dx !== 0 || dy !== 0) {
          for (const k of n.kids) {
            k.x += dx
            k.y += dy
          }
        }
      }
      n.px = n.x
      n.py = n.y
    }
  }

  /** Drag start (main.js:5106-5169): warms the simulation; an Edit-Mode drag without Ctrl floats the subject (§3.7). */
  dragStart(subject: SimNode, editMode: boolean, ctrl: boolean): void {
    const floating = editMode && !!subject.parent && !ctrl
    this.drag = { subject, floating }
    this.sim.alphaTarget(DRAG_HEAT)
    this.heat()
    if (floating) {
      subject.depth = FLOAT_DEPTH
      this.updateForce()
    }
  }

  /** Pins the subject at a world point (`dragged`, main.js:5190-5197); the root never moves. */
  dragTo(x: number, y: number): void {
    const s = this.drag?.subject
    if (!s?.parent) return
    s.fx = x
    s.fy = y
  }

  /** Drag end: releases the pin, restores the depth, lets the simulation cool to rest (§10.4). */
  dragEnd(): void {
    const drag = this.drag
    if (!drag) return
    this.drag = null
    drag.subject.fx = null
    drag.subject.fy = null
    this.sim.alphaTarget(0)
    if (drag.floating) {
      drag.subject.depth = depthOf(drag.subject)
      this.updateForce()
    }
  }
}

export function depthOf(n: SimNode): number {
  let depth = 0
  for (let p = n.parent; p; p = p.parent) depth++
  return depth
}

/** An ingredient back on its parent's centreline (surface) or inside the inner edge r−5 (interior), §10.5. */
export function project(n: SimNode, p: SimNode): void {
  let dx = n.x - p.x
  let dy = n.y - p.y
  let dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) {
    if (!n.surface) return
    dx = 1
    dy = 0
    dist = 1
  }
  const ux = dx / dist
  const uy = dy / dist
  const limit = n.surface ? p.r : Math.max(0, p.r - MEMBRANE - n.r)
  if (n.surface || dist > limit) {
    n.x = p.x + ux * limit
    n.y = p.y + uy * limit
    const vr = n.vx * ux + n.vy * uy
    if (n.surface || vr > 0) {
      n.vx -= vr * ux
      n.vy -= vr * uy
    }
  }
}

/** A dragged compartment's drawn disk (r+5) inside its parent's inner edge (r−5), §10.5; its pin follows. */
export function clampInside(n: SimNode, p: SimNode): void {
  const dx = n.x - p.x
  const dy = n.y - p.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const limit = Math.max(0, p.r - 2 * MEMBRANE - n.r)
  if (dist <= limit) return
  const s = dist > 0 ? limit / dist : 0
  n.x = p.x + dx * s
  n.y = p.y + dy * s
  if (n.fx != null) {
    n.fx = n.x
    n.fy = n.y
  }
}

/**
 * The simulation's nodes for a recipe tree, breadth-first from the root (legacy `graph.nodes` order, §1.3). A node
 * already in `known` keeps its state (position, velocity, radius); a new one is placed by `place`.
 */
export function buildSimNodes(root: RecipeNode, known: ReadonlyMap<RecipeNode, SimNode>, place: (node: RecipeNode) => { x: number; y: number; r: number }): SimNode[] {
  const out: SimNode[] = []
  const queue: [RecipeNode, SimNode | null, number][] = [[root, null, 0]]
  for (let i = 0; i < queue.length; i++) {
    const [node, parent, depth] = queue[i]
    let n = known.get(node)
    if (!n) {
      const at = place(node)
      n = { node, parent, kids: [], depth: 0, r: at.r, leaf: !node.children, surface: false, cluster: null, x: at.x, y: at.y, vx: 0, vy: 0, px: at.x, py: at.y }
    }
    n.parent = parent
    n.kids = []
    n.depth = depth
    n.leaf = !node.children
    n.surface = n.leaf && !!(node.data as { surface?: boolean }).surface
    parent?.kids.push(n)
    out.push(n)
    for (const c of node.children ?? []) queue.push([c, n, depth + 1])
  }
  return out
}
