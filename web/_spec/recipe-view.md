# Recipe View — behavioural spec (legacy is the contract)

Scope: the legacy "Recipe View" (Golden Layout component `d3canvas`), a single 2D `<canvas>` driven by D3 v4.13.0 (`extras/d3.v4.min.js`, exported as the global `d3v4`, index.html:200). This spec covers only behaviour reachable from `index.html`. The gridster entry point `intialize()` (main.js:2974-3085) is **not live**: it uses leaf collide `r*2`, link `.id()`, and zoom `[0.5, 8]`. Do not port it. `js/modal_canvas_comp.js` is a separate compartment-picker modal; only its `modal_drawHtmlTreeList` is used here (main.js:2724).

Citation format: `m:N` = js/main.js line N; `lm:` = js/layout_mg.js; `gt:` = js/gridtable.js; `ngl:` = js/ngl.js; `ms:` = js/molstar_wrapper.js; `ix:` = index.html. Modern paths are relative to `web/src/`.

---

## §0 Global state the canvas reads and writes

| Global | Init | Role | Cite |
|---|---|---|---|
| `graph` `{nodes, links}` | `{}` | The only model. `nodes` are d3 hierarchy nodes (flattened), `links` are interaction objects | m:186, m:5600-5602 |
| `gp_nodes` | — | Packed descendants (same array as `graph.nodes`) | m:165, m:5581 |
| `root`, `pack` | — | Hierarchy root; `d3v4.pack()` created once in `setupD3` | m:164,191, m:2896-2898 |
| `simulation` | — | One `d3v4.forceSimulation`, created once, reused for every recipe | m:188, m:2928 |
| `canvas`, `context`, `container`, `width`, `height` | — | `#d3canvas` and its 2D context | m:144-153, m:2877-2889 |
| `transform` | `zoomIdentity` | Current zoom transform; written only by `zoomed` | m:2884-2887, m:3091-3096 |
| `current_mode` | 0 | 0 = view/curate, 1 = Edit Mode | m:9, m:278-290 |
| `node_over`, `line_over` | — | Hover target | m:133, m:5030-5060 |
| `node_selected`, `node_selected_indice`, `line_selected`, `nodes_selections` | — | Selection (single, link, multi) | m:137-142 |
| `node_over_to_use` | — | Context-menu target | m:134, m:6051 |
| `ctrlKey` | false | Ctrl state, sampled on canvas mousemove | m:142, m:2966-2972 |
| `mousein`, `mousexy`, `draw_debug_mouse` | false | Pointer-in-canvas flag; debug dot (off) | m:12-14 |
| `draggin_d_node`, `start_drag` | — | Drag bookkeeping | m:11, m:123 |
| `comp_highligh`, `comp_highligh_surface`, `temp_link` | — | Edit-Mode drop feedback | m:113, m:120-121 |
| `AllForces` | `{ParentForce:.01, SurfaceForce:.5, LinkForce:.1, clusterByForce:.01, collisionForce:1.0}` | Force tuning. The values become **strings** after UI edits (ngl:851) | m:177-183 |
| `HQ` | false | Gates the cool-down calls. It is always false, so the simulation never cools (§3.4) | m:192 |
| `clusterBy`, `current_clusters` | 0, `{}` | Group-by state | m:171, m:185 |
| `radius_scale`, `stroke_line_width` | 1.0, 1 | Size multiplier; stroke width | m:66-67 |
| `property_mapping` | per-key `{min,max,cmin:"hsl(0,100%,50%)",cmax:"hsl(165,100%,50%)",colors:[]}` | Colour and size ranges | m:36-45 |
| `current_color_mapping`, `use_color_mapping`, `unique_array`, `use_unique_array`, `latest_colorby`, `color_palette`, `comp_colors` | —, true, —, false | Colour-mode state | m:46-54 |
| `legends`, `show_last_legends` | `{w:100,h:40,ypad:5,f:30}`, false | Legend geometry | m:50-51 |
| `color` (depth scale) | `scaleLinear().domain([-1,6]).range(["hsl(360,100%,100%)","hsl(228,30%,40%)"]).interpolate(interpolateHcl)` | The fallback colour for every node, by depth | m:156-159 |
| `titleFont` | "Oswald" | Font for compartment labels | m:129 |
| `recipe_changed` | false | Adds the `*` to the root label | m:7, m:3823 |

---

## §1 Data in, hierarchy, pack, sizing

1.1 **Mount.** The Golden Layout `d3canvasComponent._Setup` creates `<canvas id="d3canvas">` (CSS 100%×100%, `1px solid black` border). It sets the bitmap size to `parentNode.clientWidth/Height`, then calls `setupD3()` (lm:1027-1043, 1045-1056). `setupD3` creates the context and `pack = d3v4.pack().size([canvas.width, canvas.height]).padding(30)`, and binds all handlers (m:2877-2964). The pack size is fixed at mount and never updated afterwards.

1.2 **Input.** `update_graph(agraph, alink)` (m:5565-5628) takes these arguments:
- `agraph`: a nested tree `{name, nodetype, size, children:[...], ...ingredient fields}`.
- `alink`: an array of `{source, target, name1, name2, pdb1, sel1, sel2, ...}`, where `source` and `target` are node *names* or node objects.

`update_graph` is called by every recipe loader (m:1359, 1466, 1481, 1525, 1536, 1596, 1616, 1645, 1668) and with `([],[])` for a new blank recipe (m:304).

1.3 **Hierarchy.** `root = d3v4.hierarchy(agraph).sum(d => d.size)`. **There is no sort** (the sort call is commented out, m:5576-5578).
- `.sum` adds each node's *own* `size` to its children's totals, so a compartment's `size` also adds pack area.
- `graph.nodes = pack(root).descendants()`, a breadth-first flattening. `graph.nodes[0]` is always the root (m:5581).
- Reason: the pack only *seeds* positions. Radii are overwritten in 1.7.

1.4 **Links.** `MapLinkToNode` replaces `source`/`target` names (or objects) with node *indices* (m:5550-5563). `forceLink`'s default index id then resolves them to node objects when the force initialises.

1.5 **`checkAttributes(nodes)`** (m:2173-2316). It runs only when there are 2 or more nodes. It does the following:
- Resets the ranges: MW and molarity to `{0,0}`, size to `{999999,0}`, count to `{0,0}`, confidence to `{0,1}`.
- Registers each `additional_data` CSV column as a colour, label and property key.
- For each **leaf** (`!children`), sets `nodetype="ingredient"` and fills defaults:
  - `label=name`, `geom="X"`, `geom_type="None"`, `uniprot=""`
  - `pcpalAxis=[0,0,1]`, `offset=[0,0,0]`, `pos=[]`, `radii=[]`
  - `molecularweight=0` (else parseFloat)
  - `confidence`: 1.0 if `source.pdb` is 4 characters, else −1 (else parseFloat)
  - `count=0` (parseInt), `molarity=0` (parseFloat)
  - **`color=[0,0,0]`**, `ingtype="protein"`, `buildtype="random"`, `buildfilename=""`, `comments=""`
  - `visited=false`, `include=true`, `opm=0`, `angle=25`, `ulength=34`, `tlength=100`
  - `__id` = a counter
  - It also accumulates the MW, size, molarity and count maxima, and the minima for the custom columns.
- For each **non-leaf**, root included, sets `nodetype="compartment"` and `size ??= 200`.
- Finally it repopulates the `canvas_color`, `canvas_label` and `canvas_group` selects.

1.6 **Position normalisation.** `resetAllNodePos` subtracts `offx/2` and `offy/2` (parent offset size taken at setup). `centerAllNodePos` adds `canvas.getBoundingClientRect().width/2` and `height/2` (m:2805-2834, 5589-5590). When the canvas fills its parent the net shift is about 0, so nodes stay in pack space `[0,W]×[0,H]` with `transform` = identity.

1.7 **Radius override.** `update_graph` ends with `mapRadiusToProperty_cb(#canvas_map_r.value)`, default `"size"` (m:5627, m:3602-3647). This replaces the pack radii.

Leaf `r` by mode:

| Mode | Leaf `r` |
|---|---|
| `size` | `data.size·radius_scale` |
| `default` | `10·radius_scale` |
| `molecularweight` | `cbrt(mw)·0.1·radius_scale` |
| `radius_molecularweight` | `cbrt(3·1.21·mw/4π)·0.1·radius_scale` (util.js:30-33) |
| any other key | `scaleLinear([min(0,min), max] → [1,50])(value)·radius_scale` |

The fallbacks are: `r ≤ 0` becomes `size·radius_scale`, and `NaN` becomes `10·radius_scale` (m:3609-3619).

Compartments: for each node with children, `r = packEnclose(packSiblings(direct leaf children sorted by r desc)).r + 25` (m:3621-3640). Compartment positions are **not** moved. A compartment with no leaf children keeps its pack `r`. The function then calls `updateForce()`.

Rule: leaf radii are **absolute** (Å-scale numbers drawn as px at k=1) and independent of panel size. The diagram does not auto-fit.

1.8 **Colour init.** `update_graph` also calls `ChangeCanvasColor(null)` (m:5626). See §6.

1.9 **No repack after load.** Add, delete, reparent and resize all mutate `graph.nodes` and `children` in place, then call `updateForce()`. Every other node keeps its position (m:4499-4519, 4678-4718, 4827-4861, 5280-5350). Panel resize does not repack either (§2.11).

---

## §2 Rendering (canvas 2D, all inside the `ticked` tick handler)

2.1 **The frame is drawn only on simulation ticks.** `simulation.on("tick", ticked)` (m:2938-2940). The other calls are `ticked(null)` on panel resize (lm:1056). If the simulation stops, the canvas freezes.

2.2 **Draw order in `ticked`** (m:3892-4042):
1. `clearRect`. Then fill the whole viewport `fillRect(0,0,innerWidth,innerHeight)` with the root's `data.color` as `rgb(floor·255)`. If unset, set `root.data.color=[.88,.88,.88]` and use `rgba(225,225,225,1)` (m:3900-3910). This fill is in screen space, before the transform.
2. `save; translate(t.x,t.y); scale(k,k)` (m:3911-3921).
3. Copy `graph.nodes` and sort it by `depth` ascending (m:3931-3933).
4. `DrawCompartments`: each node with children, in depth order, runs `drawNode` + `Highlight` (m:3726-3733).
5. `DrawConnections`: every link (m:3765-3800).
6. `DrawIngredients`: each leaf runs `drawNode` + `Highlight`, then its sprite (m:3735-3754).
7. If `nodes_selections.length` is even, draw a line between each pair `(i,i+1)` from the radius/2 offsets, yellow, lineWidth 2 (m:3944-3952, 5368-5395).
8. In Edit Mode, if `temp_link` is set, draw it white with lineWidth 2 (m:3953-3958).
9. `DrawLabels` (m:3802-3846).
10. Debug mouse dot. Off: `draw_debug_mouse=false`.
11. The hover/selection popup thumbnail, drawn in screen space (§2.8).
12. `DrawColorLegend`. This is still inside the zoom transform (§2.9).
13. `restore`.

2.3 **Root.** `drawNode` begins a path but adds no arc for the root (m:5460-5463), so `Highlight` fills and strokes an empty path. The root is never visible as a circle. It appears only as the background colour (2.2.1) and the bottom-left label (2.7).

2.4 **Compartment shape** (m:5473-5482, then `Highlight` m:3672-3724):
- Path: `arc(x,y,r+5,0,10)`, then stroke `color(depth+1)`, then `arc(x,y,r−5,0,10)` added to the **same path**, then stroke again.
- The arcs span 10 rad (more than 2π), so each is a full circle. There is a straight connecting segment from the end of the outer arc to the start of the inner arc.
- `Highlight` then **fills** this path. With nonzero winding, two co-directional circles make a **solid disk of radius r+5**, filled with `colorNode(d)`. It then strokes the path with the state colour at `lineWidth = stroke_line_width`.
- Visible result: a filled disk (by default the depth colour `color(depth)`) with two concentric outlines at r±5. That is the 10 px "membrane band", and its interior is tinted by depth. Deeper compartments draw on top of shallower ones (step 2.2.3).

2.5 **Ingredient shape.** `arc(x,y,r,0,10)` (m:5473), filled with `colorNode(d)` and stroked with `color(depth+1)` at `stroke_line_width`. Surface ingredients use the same shape. Their centre sits on the membrane centreline r (§3.6), so they straddle the band.

2.6 **`Highlight` state precedence.** The first matching row wins (m:3672-3724).

| Condition | Fill | Stroke |
|---|---|---|
| `d ∈ nodes_selections` | yellow | orange |
| `d.highlight` (hover), and not selected or a drop target | `colorNode(d)` | black |
| `d === node_selected` | yellow | orange |
| `d === comp_highligh_surface` | `colorNode(d)` | yellow |
| `d === comp_highligh` | grey | black |
| `depth === 6` (being dragged in Edit Mode) | `rgba(55,55,255,0.3)` | `color(depth+1)` |
| otherwise | `colorNode(d)` | `color(depth+1)` |

All strokes use `lineWidth = stroke_line_width`. Fiber ingredients get no special shape on the canvas.

2.7 **Labels** (`DrawLabels`, m:3802-3846). It walks `graph.nodes` in BFS order.
- **Compartment (non-root).**
  - `fs = round(r/10)`. If `fs ≤ 4` then `fs = 10`, so the gate `fs>4` is always true and every compartment gets a label.
  - `drawCircularText(name with " and "→" & ", fs, "Oswald", x, y, r+5, rotationText[counter], 0)`. The text runs on the **outer** edge of the band, black, letter by letter. The start angle comes from the fixed table `rotationText` (29 entries, degrees, m:5497), indexed by compartment order (m:5500-5536).
  - It sets `textAlign='center'` and `textBaseline='alphabetic'`. `textAlign` sits outside its save/restore, so it leaks to later text.
- **Root.** `name + ("*" if recipe_changed)` at screen point (5, canvas.height−20), inverted through `transform`. Font `20/k px Georgia`, black. The size is therefore constant on screen (m:3818-3825).
- **Ingredient.** Drawn when `!children && (d.highlight || (k > 1.5 && labelOption !== "None"))`.
  - `fs = round(r/2)`, and values ≤4 become 5. Font `fs px Georgia`.
  - Text by option: `pdb` gives `source.pdb` (falling back to name); `None` gives the name (reachable only on hover); any other key gives `data[key]` (empty string if falsy). `" and "` becomes `" & "`.
  - Drawn at `(x−r, y+r+fs)`. Because of the leaked `textAlign=center`, the text is centred on the circle's left edge.
  - `fillStyle` is inherited from the previous draw.

2.8 **Sprites** (`#sprites` checkbox, default checked).
- **In-circle** (m:3740-3751): every ingredient gets `getThumbnail(d)`. If an image exists, it is drawn letterboxed into the 2r×2r box centred on the node, once. This applies to surface and fiber ingredients alike. There are no membrane marker lines in the circle.
- **Image source** (`getThumbnail`, m:4308-4383):
  1. `sprite.image` found in the local folder `pathList_` gives an object URL.
  2. Otherwise `cellpack_repo+"images/"+sprite.image`, after an async existence check.
  3. Otherwise, if no `sprite.image`, the PDBe image `…/pdbe/static/entry/{pdb.split("_")[0].lower}_deposited_chain_front_image-200x200.png`.
  - On error the source becomes `images/Warning_icon.png` with `done=false`, so it is never drawn. Images are drawn only when `complete && done` (m:4384-4392).
- **Popup** (m:3970-4027). Target: `node_selected`, or `node_over` if the selection is null or a compartment (**the selection wins over hover**). Drawn only for leaves with a loaded thumbnail. After `resetTransform`:
  - Box: `w=150`, `h=150/aspect`, at `x=canvas.width/2−160`, `y=canvas.height−h−10`.
  - A `rect` outline (current stroke) and the name text at (x, y).
  - The image is drawn unless the node is a fiber.
  - **Surface:** three horizontal lines across the popup, each lineWidth 2. Green at the centre (`y+h/2+sprite.offsety·sc2d`), red and blue at ±21 Å·sc2d (membrane half-thickness 42/2 Å). Here `sc2d = sprite.scale2d·150/img.width`.
  - **Fiber:** the image is drawn twice, at `x ± sprite.lengthy·sc2d/2`.

2.9 **Legend** (`DrawColorLegend`, m:3848-3889). Drawn in **world** coordinates at origin (0,0), so it pans and zooms with the content.
- It shows categorical swatches `w×h` (from `legends`) stacked from y=`ypad`, with labels in `f px Georgia` ("" becomes "unknown").
- Shown when `!use_color_mapping && colorby is not a default option && use_unique_array`, or when `colorby==="color" && show_last_legends` (the last categorical palette, `latest_colorby`).

2.10 **Links** (m:3765-3800, 5353-5366).
- Each link is a segment from the source circle's edge to the target circle's edge: centre + r·unit vector.
- Normal: stroked with a linear gradient `createLinearGradient(0,0,170,0)` in **fixed world coordinates** from `colorNode(source)` to `colorNode(target)`.
- Hover (`link.highlight`): black at width `r+0.5`, then `color(source.depth+1)` at width `r`.
- `line_selected`: orange at width `r+0.5`, then yellow at width `r`.
- Link objects have no `r`, so every `lineWidth` assignment is a no-op and the width is inherited.

2.11 **Size, resize and HiDPI.**
- Bitmap size = `parentNode.clientWidth×clientHeight` on mount and on every Golden Layout `resize` (lm:1045-1056), followed by `ticked(null)`.
- There is **no devicePixelRatio scaling**, so the canvas is blurry on HiDPI screens.
- Resize does not repack and does not reset the transform. Content keeps its world positions and the visible area grows or shrinks.
- `respondCanvas` (m:2839) belongs to the gridster path only.

---

## §3 Simulation

3.1 **One simulation object for the session.** `d3v4.forceSimulation()` with defaults: `alpha 1`, `alphaMin .001`, `alphaDecay ≈ .0228`, `alphaTarget 0`, `velocityDecay .4` (m:2928-2942). On load, `update_graph` calls `stop()`, `nodes(graph.nodes)` (**every** node: root, compartments and leaves), `force("link").links(...)`, `restart()`, `alpha(1)` (m:5615-5623). Nodes keep their pack x,y and `vx`/`vy` is reset.

3.2 **Forces in effect.** `update_graph` → `mapRadiusToProperty_cb` → `updateForce` (m:2865-2875). Every call to `updateForce` rebuilds them.

| Name | Type | Members | Radius / params | Strength |
|---|---|---|---|---|
| `link` | `forceLink` | all `graph.links` | default distance 30, default iterations 1, id = index | `parseFloat(AllForces.LinkForce)` (.1) |
| `d0`…`d4` | `forceCollide`, via `isolate` | nodes with `depth === N`, **any parent** | `r` | 1 |
| `leaf` | `forceCollide`, via `isolate` | every leaf, **all compartments** | `r·1.15` | `parseFloat(AllForces.collisionForce)` (1.0) |

How the groups work:
- `isolate` filters `graph.nodes` when the force initialises (m:2859-2863).
- A leaf collides as `r` with every same-depth node, including compartments at that depth, and as `1.15r` with every other leaf.
- Nodes at depth ≥5 are excluded from the d-groups.
- Reason for depth isolation: compartments must not collide with their own contents.
- Reason for the 1.15 factor: a visible gap between ingredients.

3.3 **Custom forces are written as velocity nudges inside `drawNode`** (m:5417-5459). They run once per node per tick, after d3 has integrated positions. **They are not scaled by alpha.** All strengths are read from `AllForces` on every call.
- **Cluster.** Applies only when `clusterBy !== 0` and `d.cluster` is set. If `|pos − (cluster.xy + parent.xy)| > r + cluster.r`, then `v += (cluster.xy + parent.xy − pos)·clusterByForce` (m:5424-5439).
- **Surface.** For a leaf with `data.surface`: `k = (parent.r − dist)·SurfaceForce/dist`, and `v += (pos − parent)·k`. This is a spring toward the circle of radius `parent.r`, the band centreline, with no hard constraint (m:5440-5452).
- **Root.** `v += −pos·0.1`. The root is pulled toward world (0,0) (m:5455-5459).
- **Parent containment.** For any non-root, non-surface node (compartments too) whose `parent.parent` exists: if `dist + 1.2·r > parent.r − 5`, then `v += (parent − pos)·ParentForce`. This pulls toward the parent **centre** (m:5465-5472). Children of the root get no containment.

3.4 **Heat, cooling and restart** (the defining behaviour).

| Trigger | Call | Cite |
|---|---|---|
| Recipe load | `stop; restart; alpha(1)`. `alphaTarget` is left unchanged | m:5615-5623 |
| Pointer enters canvas | `alphaTarget(0.3).restart()` | m:5066-5071 |
| Drag start | `alphaTarget(0.3).restart()` | m:5116 |
| Drag end | `alphaTarget(0)` **only if HQ**, and HQ is false | m:5229 |
| Pointer leaves canvas | nothing (the reset is commented out) | m:5073-5078 |
| Hover with alpha < .01 | `alphaTarget(1).restart()` **only if HQ** | m:5062 |
| Grid cell edit | `alpha(1).alphaTarget(0).restart()` | gt:1564 |
| `AddALink` | `alpha(1).alphaTarget(0).restart()` | m:4627 |

Rule: after the pointer first enters the canvas, the simulation runs indefinitely at alpha≈0.3. The layout stays live and keeps settling. Combined with 2.1, it also renders continuously. The simulation cools to rest only after a grid cell edit (and stays at rest until the pointer enters again).

3.5 **Fixed nodes.** Only during a drag: `fx`/`fy` are set by `dragged` and cleared to null in `dragended` (m:5196-5197, 5230-5231). Nothing is permanently fixed.

3.6 **Membrane rule.** Surface leaves are attracted to the centreline `parent.r` by the soft spring in 3.3, so they straddle the band. Collisions can push them off it. There is no projection.

3.7 **Drag-depth trick (Edit Mode).** On drag start in Edit Mode, without Ctrl, on a non-root node: `subject._depth = depth`, `depth = 6`, then `updateForce()`. This removes the node from d0–d4 collision while it is moved. On drag end, depth is restored (m:5159-5168, 5290).

---

## §4 Interaction

4.1 **Bindings** (m:2944-2963).
- `canvas.onmousemove = isKeyPressed` samples `ctrlKey` and sets `mousein`.
- `d3v4.select(canvas)` registers, in this order: `mousemove` → `mouseMoved`, `mouseout` → `mouseLeave`, `mouseover` → `mouseEnter`, then `.call(d3v4.drag().container(canvas).subject(subject)…)`, then `.call(d3v4.zoom().scaleExtent([0.2, 20]).filter(button===0||button===1))`.
- A native `click` listener clears highlights in Edit Mode when not dragging.

4.2 **Gesture table.**

| Gesture | Result | Cite |
|---|---|---|
| Left mousedown, anywhere | d3-drag always starts. `subject()` never returns null (it falls back to the root, 4.3), and d3-drag calls `stopImmediatePropagation` on mousedown, so **d3-zoom never sees a left mousedown** | m:4939, d3.v4 drag `vt()` |
| Left-drag on empty space (root) | No pan. The root branch clears the selection and highlights; `dragged` returns early for the root | m:5150-5157, 5194 |
| Middle-drag | Pan. The drag filter `!button` rejects button 1; the zoom filter accepts it | m:2957-2960 |
| Wheel | Zoom about the pointer, extent [0.2, 20], `wheelDelta = −deltaY·(deltaMode?120:1)/500` (d3 v4 default). Works over nodes too | m:2957 |
| Double-click | d3-zoom default: ×2 about the pointer (shift: ×0.5), 250 ms transition. Works anywhere | d3 v4 default |
| Ctrl held while zooming | `clearHighLight()` | m:3095 |
| Mouse move | Hover (4.4) | m:5080-5103 |
| Left press + release on a node (a "click") | Drag start + drag end with no movement. Selection happens at start, side effects at end (4.5) | m:5106-5169, 5225-5351 |
| Left-drag on a non-root node | Moves it: `fx = start + Δpointer/k` (world-correct). It is released on end and the simulation keeps it near where it was dropped. **Allowed in both modes** | m:5190-5197 |
| Ctrl+click on an ingredient | Adds it to `nodes_selections`. **Works in both modes** | m:5122-5126 |
| Right-click | Context menu (§7) | m:6044-6077 |
| Keyboard | None on the canvas. Previous/Next Ingredient are buttons that walk table rows (m:5776-5826, lm:527-528) | — |

4.3 **Hit-test** `asubject(x,y)` (m:4918-4992).
- The screen point is scaled by `canvas.width/rect.width` (m:4994-4999 for drag, m:5081-5087 for move), then inverted through `transform`.
- Node pick: start with the root. For every node, if `|p − c|² < r²` and `depth > best.depth`, take it. **Deepest containing disk wins**; ties go to the earliest in BFS order. A compartment's whole interior is hittable, by `r`, not the drawn `r+5`.
- Link pick: for each link, compute the distance to the edge-to-edge segment (`distanceToLineSegment`, distance.js:69). If it is under 2.5 and under the picked node's centre distance, the link wins. This also clears every link's `highlight` and its ends' `highlight` as a side effect.

4.4 **Hover** (`MouseMove`, m:5016-5064).
- `clearHighLight()` and `MS_ClearHighlight()` run first.
- On a node: `node_over = d`, `d.highlight = true`, `MS_HighlightNode(d)`, which highlights the PDB id (upper-case if 4 characters, or the name for fibers) and the name in Mol* (ms:126-139).
- On a link: `line_over = l`, and the link and both ends get `highlight`. Mol* highlights both ends.
- Hover changes only flags. The next tick redraws them: black stroke (2.6), label forced on (2.7), popup (2.8).

4.5 **Selection and side effects.**
- **Drag start** (m:5106-5169):
  - Leaf: `node_selected = d`. With Ctrl, push it into `nodes_selections`; without Ctrl, `nodes_selections = [d]`.
  - Compartment: in view mode it is selected. In Edit Mode the selection is cleared.
  - Root: the selection is cleared.
- **Drag end** (m:5225-5351):
  - Always `SetObjectsOptionsDiv(subject)`, which fills the Object Properties panel. For the root it lists the compartment tree and calls `drawCompRec`. For a compartment it calls `UpdateCompartmentRep` (NGL compartment geometry) (m:2694-2803).
  - Leaf:
    - Set `data.visited = true`.
    - `grid_UpdateSelectionPdbFromId` switches to table tab 0, selects the row and scrolls to column 7 (gt:2112-2126).
    - In view mode only: `NGL_UpdateWithNode`. If the leaf has a PDB and `#pdb_component_enable` is checked, also `UpdatePDBcomponent`, plus `customReport` (UniProt lookup) when there is no UniProt id, or else `setupProVista` + `UpdateUniPDBcomponent`.
    - `line_selected = null`.
  - Link:
    - `line_selected = l` and `nodes_selections = [source, target]`.
    - `UpdateSelectionInteractionFromId` (table tab 1).
    - In view mode: `NGL_UpdateWithNodePair`.

4.6 **Table → canvas** (gt:1679-1700).
- A row click calls `clearHighLight()`, sets `node_selected = graph.nodes[parseInt(row.id.split("_")[1])]`, clears `nodes_selections` and calls `SetObjectsOptionsDiv`, then loads the viewers. Row ids are `"id_"+index in graph.nodes` (gt:947).
- A cell edit calls `updateAttributesNode` and reparents by the compartment path, then `alpha(1).alphaTarget(0).restart()` (gt:1525-1567).

4.7 **Edit Mode** (`#editmode`, `switchMode`, m:278-290). It toggles `current_mode` and shows or hides `#addingr`, `#addcomp` and `#addlink`. Effects:

| Phase | Behaviour | Cite |
|---|---|---|
| Drag start | Compartments are not selected. Depth trick (3.7) | m:5134-5168 |
| Drag move | `anotherSubject(subject, subject.x, subject.y)` | m:5198-5222 |
| Drag end, without Ctrl | Reparent (below), then `updateForce`, clear `temp_link` and `comp_highligh` | m:5280-5350 |
| Native `click` | `clearHighLight()` | m:2963 |

`anotherSubject` (m:4863-4916) picks the target:
- Start with the root, then take the deepest node with `dist < d.r + subject.r` (circle **overlap**, not containment), excluding the subject itself and its direct children.
- If the target is a compartment (the root counts, since its nodetype is compartment): `comp_highligh = target`. If `|target.r − dist| < subject.r`, also `comp_highligh_surface = target`. `temp_link = {source: target, target: subject}`.
- Otherwise all three are cleared.

Reparent on drag end:
- Restore the depth.
- If the hover target is a compartment or the root, differs from the current parent, and is not a direct child of the subject:
  - splice the subject out of its old parent and push it into the target;
  - `parent = target`, `depth = target.depth+1`;
  - **`target.r += subject.r/2`**;
  - update the table's `compartment` path. For a dragged compartment, its direct children also get `depth+1` and new paths (one level only).
- For ingredients, **`surface = |target.r − dist| < subject.r`** is recomputed on every drop, even onto the same parent, and written to the table.
- Dropping in empty space resolves to the root and reparents there.

---

## §5 Options panel (live: `canvas_widget_options_collapsible`, lm:277-315, mounted by `canvas_options` lm:1318-1322)

`canvasOption` (lm:156-181) is dead markup. Range and number inputs are bound once by `$('.inputRange, .inputNumber').on('input')` in ngl:834-869. That handler mirrors the sibling input and dispatches on the id.

**View Options** (expanded by default):

| Control | id | Default | Range | Effect | Cite |
|---|---|---|---|---|---|
| Node image | `sprites` | checked | — | Sprites are read on every frame | lm:280, m:3740 |
| Node label | `canvas_label` | `name` | `name, None, pdb, uniprot, label` + custom columns | Read on every frame; `ChangeCanvasLabel` is a no-op | lm:281, m:21, m:3105 |
| Node color | `canvas_color` | `default` in the markup; **`pdb` after a load** (the oracle: `update_graph` rebuilds the select, which lands on its first option) | `canvas_color_options` (16) + custom | `ChangeCanvasColor` | lm:283, m:28-30 |
| Use color linear mapping | `colormap` | checked | — | `use_color_mapping`; no recompute | lm:285, m:3184-3187 |
| Min / max colour | `min_color` / `max_color` | `#ff0000` / `#00ffbf` | — | Sets `property_mapping[mode].cmin/cmax`, recomputes | lm:286-287, m:3336-3354 |
| Apply current to ingredient color | `applycolor` | — | — | `applyColorModeToIngredient` (§6.4) | lm:289, m:3356-3371 |
| Node size | `canvas_map_r` | `size` | `Object.keys(property_mapping)` | `mapRadiusToProperty_cb` (§1.7) | lm:291-292 |
| Scale Radius by | `radius_scale` | 1.0 | 0.01–10, step .01 | `radius_scale = v`, then re-map radii | lm:293, ngl:864-866 |
| Node group by | `canvas_group` | `size` (applied only on change) | `Object.keys(property_mapping)` | `ClusterNodeBy` (§6.5) | lm:294-295 |
| Stroke Line width | `stroke_lineWidth` | 1 | 0.01–10 | `stroke_line_width` | lm:296, ngl:861-862 |
| Show latest legends | `show_legends` | off | — | Shows the w/h/f sliders; the `color`-mode legend | lm:297, m:3189-3196 |
| Legend width / height / font | `legends_w` / `_h` / `_f` | 100 / 40 / 30 | 1–250 | `legends[k] = v` | lm:298-301, ngl:857-859 |

**Recipe Options:**

| Control | id | Default | Effect | Cite |
|---|---|---|---|---|
| Edit Mode | `editmode` | off | `switchMode` | lm:308 |
| Add ingredient | `addingr` | visible (no initial `hidden` class) | §7.1 | lm:309 |
| Add compartment | `addcomp` | visible | §7.2 | lm:310 |
| Add interaction | `addlink` | visible | §7.3 | lm:311 |

**Forces Options** (`getForcesInputs`, lm:266-275). One row per `AllForces` key: `range_<Key>` (0–1, step .01) paired with `num_<Key>` (0–2). Input sets `AllForces[Key] = value` (a string), then calls `updateForce()` (ngl:850-855). Defaults are in §0.

---

## §6 Colour and size modes

6.1 **`ChangeCanvasColor`** (m:3211-3334) prepares state for `colorNode`. Every `scores` set below covers `graph.nodes`.

| Mode | Preparation |
|---|---|
| `automatic` | The first time a compartment is seen, it gets one iwanthue colour (`GenerateNColor`, chroma + paletteGenerator, HCL filter) and a palette of `children.length` hues within ±30° (`GenerateOneColorRangePalette`). Then `current_color_mapping = scaleLinear([0, N] → [cmin, cmax])` |
| `confidence` | `scaleLinear([min, max] of the confidence values ≠ −1)` |
| `count` | `scaleSqrt([min, max] of the counts)` |
| `size` | `scaleLinear` |
| `molarity` | `scaleSqrt` |
| `molecularweight` | `scaleLinear` |
| Any other key in `property_mapping` (custom columns, and also `default`/`interaction`) | If the first value is non-numeric: categorical. `unique_array` = the unique values + `""`; `colors` = `GenerateNColor(n)`, regenerated only when the count changes; `current_color_mapping = scaleLinear([minIdx, maxIdx] → [cmin, cmax])`; `use_unique_array = true`. Otherwise a numeric `scaleLinear` |

Modes not in `property_mapping` (`pdb`, `geom`, …) return early, before the min/max pickers sync.

6.2 **`colorNode(d)`** (m:3378-3515). The guard comes first: if the mapping is unset and `use_color_mapping`, return `color(depth)`. Then the root always gets its own `data.color`. Then:

| Mode | Leaf | Compartment |
|---|---|---|
| `pdb` | red if `source.pdb` ∈ {falsy, "None", "null", ""}, else `color(depth)` | `color(depth)` |
| `geom` | red if `geom` is empty-like | `color(depth)` |
| `pcpalAxis`, `offset` | red if empty-like or of length 0 | `color(depth)` |
| `Beads` | red if `pos` is empty-like | `color(depth)` |
| `count_molarity` | red if `count === 0 && molarity === 0` | `color(depth)` |
| `color` | `data.color` | **`data.color`** (if non-null) |
| `confidence`, `count`, `size`, `molarity`, `molecularweight` | `current_color_mapping(v)` if `v ≥ 0`, else `color(depth)` | `color(depth)` |
| `viewed` | yellow if visited, red if not | `color(depth)` |
| `automatic` | Mapping on: `mapping(index in graph.nodes)`. Mapping off: `color_palette[parent.name][index among parent.children]` | Mapping on: `mapping(index)`. Mapping off: `comp_colors[name]` |
| `default`, `interaction` | `data._color` if that key exists, else `data.color`. After `checkAttributes` this is **black `[0,0,0]`** when the recipe had no colour | `color(depth)` |
| Custom column, mapping on | `current_color_mapping(unique_array.indexOf(v))` (categorical) or `(v)` (numeric) | `color(depth)` |
| Custom column, mapping off | categorical: `colors[indexOf(v)]`, missing values take the `""` colour; numeric: mapping | categorical: `colors[indexOf("")]` |

6.3 **Depth colour** `color(depth)`: an HCL ramp from white (depth −1) to slate `hsl(228,30%,40%)` (depth 6) (m:156-159). Compartment fills use `color(depth)` and strokes `color(depth+1)`.

6.4 **Apply to ingredient colour** (m:3356-3371). For **every** node, compartments included, it saves `data._color` once and sets `data.color = colorNode(d)/255`. Because `default` mode prefers `_color`, the original colours still show in `default` after an apply.

6.5 **Group by** (`ClusterNodeBy`, m:3517-3595). It applies only to keys **not** in `default_options`, which means custom columns.
- Values are made unique, plus `""`.
- Each value gets a centre seeded from `Util_halton(counter,2|3)·parent.r·2`. Its member leaves' (x, y, r) are run through `packSiblings` + `packEnclose` to get the centre and radius. All clusters are then run through `packSiblings` together.
- Clusters are **global**, not per compartment. The force (3.3) offsets the centre by each node's own parent position.
- Sets `clusterBy = 1` and calls `updateForce`. Choosing a built-in key leaves `clusterBy = 0`, which disables clustering.

---

## §7 Node CRUD

Context menu (ix:671-676; m:6044-6105):
- `contextmenu` on the document. It acts only if `mousein` and a node or link is under the pointer. It calls `preventDefault`, sets `node_over_to_use`, preloads `#node_color` from `data.color` (or from the category colour in categorical mode), and shows `.custom-menu-node` at the page coordinates.
- A mousedown outside the menu hides it.

| Item | Behaviour | Cite |
|---|---|---|
| colour input `#node_color` | In categorical mode for a non-root node: recolour the **category** (`property_mapping[mode].colors[i]`). Otherwise `data.color = rgb/255`. Then `GP_updateMeshColorGeometry`, update the NGL geometry colour if this node is shown, and `MS_ChangeColor` | m:4763-4796 |
| rename | `prompt`. Sets `data.name`. For an ingredient, updates the table `name` cell. For a compartment, rewrites the `compartment` path of every descendant row | m:4812-4825, 4752-4760 |
| delete | Link: splice it from `graph.links` and delete its row in table 1. Node: splice it from `parent.children` and `graph.nodes` and delete its row in table 0. Then `updateForce`; there is no repack | m:4827-4861 |
| resize | `prompt` (current `r`). Sets `r` directly; for an ingredient, also the table `size` cell. Then `updateForce` | m:4798-4810 |

7.1 **Add ingredient** (m:4630-4676, 4678-4750).
- Adds a table row with these defaults: `id_N`, `protein_nameN`, size 40, count 0, molarity 0, surface false, MW 0, confidence 0, `bu=BU1`, `pcpalAxis [0,0,1]`, offset 0, include true, `ingtype=protein`, `buildtype=random`, compartment = the root name.
- `AddANode` creates a hierarchy node under the root at world point `(canvas.width/2, canvas.height/2)` with `r = 30` (not 40) and sprite `{image:null, offsety:0, scale2d:1}`, then calls `updateForce`.

7.2 **Add compartment** (m:4499-4519). `newCompartmentK`, size 150, under the root at the canvas centre, `r = 150`, empty `children`. Calls `updateForce`.

7.3 **Add interaction** (m:4545-4616). For each pair `(i, i+1)` of `nodes_selections`: push a link object into `graph.links` and update table 1. Then clear the selection.

---

## §8 Open questions (legacy oddities — record them, do not fix them)

1. Compartment `r` = enclose(direct leaves) + 25 ignores sub-compartments (m:3624), so a parent can be smaller than its child compartments. The +25 is not scaled by `radius_scale`.
2. The compartment path connects the r+5 and r−5 arcs with a straight segment, and arcs of 10 rad overdraw (m:5476-5481). Is the visible "spoke" intended?
3. Ingredients with no recipe colour render **black** in `default` mode (m:2246, 3474). Only when the `color` key is missing: the oracle shows HIV's ingredients (key present, null) in depth colours.
4. `rotationText` has 29 entries. Compartment 30 and later get `undefined`, which becomes a NaN start angle, and their label is not drawn (m:5497, 3814).
5. The ingredient label inherits `textAlign='center'` and `fillStyle` from earlier draws (m:5506, 3843).
6. The link gradient is fixed in world space `(0,0)→(170,0)`, not along the link (m:3781). Link `lineWidth = d.r` is undefined (m:3771-3795).
7. The legend is drawn in world space, so it pans and zooms (m:4028 vs 4041).
8. The root is pulled toward world (0,0) every tick (m:5457). Surface ingredients whose parent is the root therefore chase a drifting circle.
9. With `HQ=false` the simulation never cools after the first mouse entry (§3.4). CPU use is permanent. That may also be why the layout feels alive.
10. Grid cell edit removes the node from its old parent's `children` but never pushes it into `pnode.children` (gt:1544-1549).
11. Context-menu delete on a compartment: there is no `data.id`, so `row` is undefined and the delete **throws** (m:4853-4855). Its children stay in `graph.nodes` with a dangling parent.
12. Right-click over empty canvas targets the root, because hover sets `node_over` to the root. Choosing delete then crashes (`root.parent` is null, m:4844). Right-clicking a link reads `line_over.data`, which is undefined, and throws (m:6052).
13. Drop detection uses circle overlap (`d.r + subject.r`), not containment (m:4902), and excludes only direct children. A drop into empty space reparents to the root.
14. `mouseMoved` reads `event.offsety` (a typo), giving NaN when `layerY` is 0 (m:5085).
15. `CenterCanvas` resets the global `transform` but not d3-zoom's internal `__zoom`, and it is never called (m:3098-3102).
16. `ChangeCanvasColor` for `molarity` and `molecularweight` contains a stray `return …color_mapping(d…)` referencing an undefined `d` (m:3287, 3297). `current_color_mapping` is already set, so the throw happens after the assignment.
17. The range-input binding (ngl:834) runs at NGL setup. Inputs created later (for example if the options panel re-renders) are unbound.
18. `addIngredient` writes size 40 to the table but gives the node `r = 30`. The node has no `data.size` until `mapRadiusToProperty` reads `data.size` (40), so the next re-map changes its radius.
19. The Add ingredient, compartment and interaction buttons start visible, although Edit Mode starts off. They are hidden only after toggling Edit Mode twice.
20. d3 v4 `packEnclose` and collide jiggle use `Math.random`, so the legacy seed layout is not deterministic. d3 v7 uses a seeded LCG (d3-hierarchy 3.1.2 `pack/enclose.js:2-5`).

---

## §9 Divergence table (legacy code vs modern code)

Modern files (lane `recipe-view-port`, cited by function): `components/recipe/RecipeCanvas.tsx` (RC), `components/recipe/recipeDraggable.tsx` (RD), `components/recipe/RecipeCanvasToolbar.tsx` (TB), `domain/recipe/view/layout.ts` (LY), `view/drag.ts` (DR), `view/hitTest.ts` (HT), `view/colors.ts` (CO), `view/labels.ts` (LB), `state/recipeStore.ts` (RS), `state/uiModeStore.ts` (UM). Modern d3 is 7.9.0; `dragology` 0.1.7 (npm). "oracle" = checked against `tests/fixtures/recipe-view-oracle/` by `tests/recipe-view-oracle.test.ts`.

| # | Behaviour | Legacy (file:line) | Modern (file:line) | Status |
|---|---|---|---|---|
| 1 | Renderer | Single canvas 2D, redrawn on every sim tick (m:3892) | SVG drawn by Dragology from the view state (RD `makeRecipeDraggable`) | Departure §10.1 |
| 2 | HiDPI | None: bitmap = CSS px (lm:1052-1053) | SVG is vector | Departure §10.7 |
| 3 | Resize | Bitmap resized; positions, pack and transform kept (lm:1045-1056) | Panel size from a ResizeObserver; no repack, zoom kept (RC) | Same |
| 4 | Pack params | size = panel at mount, padding 30, `.sum(size)` includes internal `size`, no sort (m:2896-2898, 5576-5578) | No d3.pack: each compartment's interior packed with `packSiblings` at legacy radii (LY `layoutRecipe`) | Departure §10.2 |
| 5 | Leaf radius | Absolute `size·radius_scale`; not fitted to the panel (m:3611-3617) | Absolute, §1.7 formulas (LY `leafRadius`; oracle) | Same |
| 6 | Compartment radius | enclose(direct leaves) + 25 (m:3621-3640) | enclose(direct leaves)+25 (LY `computeRadii`; oracle). No leaf children: enclose the sub-compartments +25, an empty one 150 (legacy keeps its pack r) | Same |
| 7 | radius_scale semantics | Multiplies leaf radii, then re-encloses (m:3611-3617) | Multiplies leaf radii (LY `leafRadius`) | Same |
| 8 | Size-by formulas | m:3609-3619 | §1.7 formulas incl. the r≤0 and NaN fallbacks (LY `leafRadius`; oracle) | Same |
| 9 | Repack on add/delete/reparent | Never; nodes are placed at the canvas centre, others keep positions (m:4509, 4699, 4848-4850, 5306-5313) | Never: known nodes keep their world position, new ones at the canvas centre (LY `reconcileView`, RC) | Same |
| 10 | Sim membership | All nodes: root, compartments, leaves (m:5616) | No simulation | Departure §10.2 |
| 11 | Same-depth collisions d0–d4 | Compartments and leaves collide per depth, strength 1 (m:2869-2873) | No collisions; a drag pushes its siblings aside (DR `pushNeighbours`) | Departure §10.2 |
| 12 | Leaf collision | `forceCollide(r·1.15)`, strength `collisionForce`, all leaves (m:2874) | 1.15r is the layout gap and the push distance for leaves (LY, DR) | Departure §10.2 |
| 13 | Link force | `forceLink` strength .1, distance 30, all links (m:2867-2868) | Links drawn, partners not pulled | Departure §10.2 |
| 14 | Custom-force scaling | Velocity nudges, **not** scaled by alpha, run after integration (m:5417-5472) | No forces | Departure §10.2 |
| 15 | Surface rule | Soft spring to `parent.r`, can be displaced (m:5440-5452) | Hard: on the centreline, dragged by angle (DR `onMembrane`, RD `dragSpecFor`) | Departure §10.4 |
| 16 | Surface proteins straddle the membrane | Centre on the centreline (m:5447) | Centre on the centreline (LY, DR) | Same |
| 17 | Parent containment | Pull to parent centre when `dist+1.2r > R−5`, compartments included, skipped under root (m:5465-5472) | Hard: inside the inner membrane edge, compartments by their r+5 disk, none under the root (DR `containmentLimit`) | Departure §10.4 |
| 18 | Root force | Root pulled toward world (0,0) (m:5455-5459) | No root force (§8.8 no longer applies) | Departure §10.2 |
| 19 | Sim never cools | `alphaTarget(.3)` on mouse-enter and drag; reset only if HQ (false) (m:5068, 5116, 5229) | No simulation (§8.9 no longer applies) | Departure §10.2 |
| 20 | Reheat on recipe load | `stop/restart/alpha(1)` on the same sim (m:5615-5623) | Layout on load (LY `layoutRecipe`) | Departure §10.2 |
| 21 | Forces-slider update | `updateForce()` rebuilds the forces; no alpha change (ngl:850-855, m:2865) | Forces Options removed (TB) | Departure §10.2 |
| 22 | Slider ranges | range 0–1, number 0–2 (lm:271-272) | Forces Options removed (TB) | Departure §10.2 |
| 23 | Hidden root circle | Not drawn; colour used as background (m:5461-5463, 3901-3910) | Not drawn; background rect (RD) | Same |
| 24 | Background in dark theme | Root colour always (m:3901) | Theme variable in dark mode, root colour in light (RC) | Departure §10.3 |
| 25 | Compartment fill | **Filled disk** r+5, `color(depth)` (m:5476-5481, 3718) | Filled disk r+5, `colorNode` (RD `compartmentLayer`) | Same |
| 26 | Membrane two-edge band | Outlines at r±5 (fixed 10 px), stroke `color(depth+1)` (m:5476-5481) | Outlines at r±5, `color(depth+1)` (RD `compartmentLayer`) | Same |
| 27 | Ingredient stroke | Always `color(depth+1)` at stroke width (m:3720-3722) | `color(depth+1)` at stroke width (CO `nodeStyle`) | Same |
| 28 | Depth palette | HCL ramp white → `hsl(228,30%,40%)` over [−1,6] (m:156-159) | HCL ramp; d3 v4's hue for white reproduced (CO `depthColor`; oracle ±2 per channel) | Same |
| 29 | Draw order | Compartments by depth → links → ingredients → pair lines → labels → popup → legend (m:3931-4028) | Layers: compartments by depth, links, ingredients by depth, pair lines, temp link, labels, legend (RD `Z`; oracle); popup and root label in a screen overlay on top | Same |
| 30 | Hover style | Fill `colorNode`, black stroke (m:3682-3687) | Fill `colorNode`, black stroke (CO `nodeStyle`) | Same |
| 31 | Selected style | Yellow fill, orange stroke (m:3689-3694) | Yellow fill, orange stroke (CO `nodeStyle`) | Same |
| 32 | Multi-select style | Yellow/orange, plus yellow pair lines (m:3674-3679, 3944-3952) | Yellow/orange plus yellow pair lines (CO `nodeStyle`, RD) | Same |
| 33 | Edit-drop feedback | Grey fill target, yellow stroke for a surface drop, white temp link, translucent blue dragged node (m:3696-3716, 3953-3958) | Grey target, yellow stroke for a surface drop, white temp link, translucent blue dragged node (CO, RD) | Same |
| 34 | Compartment label | Curved, outer r+5, Oswald, `round(r/10)` (≤4 → 10), always drawn, `rotationText` start angle (m:3809-3816) | Letters on r+5, Oswald, round(r/10) (≤4 → 10), `rotationText` start, none past 29 (LB `compartmentTitle`; oracle) | Same |
| 35 | Root label + `*` dirty mark | Bottom-left, screen-fixed (m:3818-3825) | Screen overlay bottom-left; `*` after any store edit (legacy: after a grid edit) (RC `ScreenOverlay`) | Differs |
| 36 | Ingredient label gate | `highlight` or (k > 1.5 and option ≠ None) (m:3828) | Hover, or k > 1.5 and option ≠ None (LB `ingredientLabelVisible`) | Same |
| 37 | Ingredient label style | Georgia `round(r/2)`, at (x−r, y+r+fs), centre-aligned (m:3829-3843) | Georgia round(r/2), at (x−r, y+r+fs), centred (LB; oracle) | Same |
| 38 | Label options | name/None/pdb/uniprot/label + custom columns (m:2174, 2199) | name/None/pdb/uniprot/label + custom columns (TB, LB `ingredientLabelText`) | Same |
| 39 | In-circle sprite | Once per ingredient, letterboxed in 2r (m:3740-3751) | Once, letterboxed in 2r, only once loaded (RD, `spriteCache.ts`) | Same |
| 40 | Membrane marker lines | Only in the popup, Å-scaled via `offsety`/`scale2d` (m:3989-4016) | In every surface ingredient's circle and in the popup (RD, RC) | Departure §10.5 |
| 41 | Popup thumbnail | 150 px wide, bottom, x=W/2−160, rect + name + membrane/fiber; selection beats hover (m:3970-4027) | 150 px, x=W/2−160, bottom; rect, name, image; membrane lines; fiber twice; selection beats hover (RC `ScreenOverlay`) | Same |
| 42 | Sprite source chain | local folder → repo (checked) → PDBe (`pdb.split("_")[0]`) → warning icon (m:4308-4383) | repo images (unchecked; a failed image is not drawn) → PDBe `pdb.split("_")[0]` (structureSource.ts); no local folder (Setup Data Directory is a placeholder) | Differs |
| 43 | Legend | World space; categorical when mapping off; w/h/f sliders; `color`-mode "latest" legend (m:3848-3889) | World space at the origin; categorical when mapping off; w/h/f sliders (RD, TB). The `color`-mode "latest" legend is not ported | Differs |
| 44 | Link geometry | Edge-to-edge (m:5353-5366) | Edge to edge (HT `linkEnds`) | Same |
| 45 | Link gradient | Fixed world axis (0,0)→(170,0) (m:3781) | Fixed world axis (0,0)→(170,0) (RD) | Same |
| 46 | Link hover + Mol* highlight of ends | m:4965-4990, 5049-5059 | Link and ends highlighted on hover (HT `hitLink`, RD); the Mol* highlight is not wired | Open (viewer lanes) |
| 47 | Link click selection | Selects link and ends, table tab 1, NGL pair (m:5266-5278) | Selects the link and its ends (RC → `selectLink`, `setSelection`); the NGL pair view is not wired | Open (viewer lanes) |
| 48 | Hit-test | Deepest containing disk; compartment interior hittable (m:4918-4960) | Deepest containing disk by r (HT `hitNode`) | Same |
| 49 | Click on empty compartment interior | Selects the compartment (m:5134-5139) | Selects the compartment (RC) | Same |
| 50 | Click on empty canvas | Root subject: clears selection; `SetObjectsOptionsDiv(root)` (m:5150-5157, 5232) | Clears the selection (RC); Object Properties is a placeholder | Same |
| 51 | Pan gesture | Middle-drag only; left-drag on empty space does nothing (m:2951-2960, 4939) | Middle-drag only (RC zoom filter) | Same |
| 52 | Zoom extent | [0.2, 20] (m:2957) | [0.2, 20] (RC) | Same |
| 53 | Wheel over nodes | Zooms (m:2957) | Zooms (RC) | Same |
| 54 | Double-click | Zoom ×2 anywhere (d3 v4 default) | ×2 anywhere (RC) | Same |
| 55 | Wheel delta | v4: `−dy·(mode?120:1)/500` | v4 formula (RC `wheelDelta`) | Same |
| 56 | Dragging outside Edit Mode | Allowed (m:5190-5197) | Allowed (RD `dragSpecFor`) | Same |
| 57 | Drag start offset | Grab point preserved (d3-drag subject dx) (m:5196) | Grab point kept (Dragology anchor) | Same |
| 58 | Compartment drag | Pins only the ring; children follow softly via ParentForce (m:5196, 5470) | Rigid subtree (relative positions), inside its parent, pushes siblings (RD, DR) | Departure §10.4 |
| 59 | Ingredient drag constraint | Free (fx/fy anywhere) (m:5196) | Inside its parent or on its membrane, pushes siblings (RD, DR) | Departure §10.4 |
| 60 | Hover → Mol* highlight | `MS_HighlightNode` on every move (m:5018, 5035-5045) | Not wired | Open (viewer lanes) |
| 61 | Hover → popup and label | m:3828, 3971 | Hover forces the label and the popup (LB, RC) | Same |
| 62 | Selection side effects | Table row select + scroll, NGL load, PDB component, UniProt/ProtVista, Object Properties, `visited` (m:5232-5262) | `selectNode` → table and viewers through the store; `markVisited` (RC) | Differs |
| 63 | Selection timing | Mousedown selects; mouseup triggers effects (m:5106-5135, 5225) | On release of a click (2 px threshold) or on drop of a drag (RC) | Differs |
| 64 | Compartment selection in Edit Mode | Deselects (m:5141-5148) | Deselects in Edit Mode (RC) | Same |
| 65 | Ctrl multi-select | Both modes (m:5122) | Both modes (RC) | Same |
| 66 | Edit drop target test | Overlap `d < r_t + r_s`, root fallback, ingredients included as candidates (m:4863-4916) | Overlap, deepest, root fallback, an ingredient blocks; the dragged subtree is excluded (a cycle otherwise, §10.6) (DR `reparentTarget`) | Same |
| 67 | Reparent: target grows by r/2 | m:5313 | Target grows by r/2 (DR `dropReparent`) | Same |
| 68 | Reparent recomputes `surface` from drop distance | m:5330-5337 | `surface` recomputed and written to the store; the node put on the grown target's centreline (DR, RC) | Same |
| 69 | Reparent updates table compartment path | m:5314-5327 | The table derives the path from the store | Same |
| 70 | Context menu items | colour / rename / delete / resize (ix:671-676) | Colour / Rename / Delete / Resize (RC `ContextMenu`) | Same |
| 71 | Context-menu resize | m:4798-4810 | Prompt; sets r, and the ingredient's size (RC) | Same |
| 72 | Context-menu recolour in categorical mode | Recolours the category (m:4772-4775) | Recolours the category (`uiModeStore.categoryColors`) | Same |
| 73 | Context-menu recolour → 3D | `GP_updateMeshColorGeometry`, NGL, `MS_ChangeColor` (m:4779-4794) | Store only | Open (viewer lanes) |
| 74 | Context menu on links / root | Links: throws; root via empty space (m:6051-6052) | No menu on a link or the empty canvas (RC) | Departure §10.6 |
| 75 | Delete compartment | Throws, orphans children (m:4844-4858) | Deletes the subtree and its links (RS) | Departure §10.6 |
| 76 | Rename | `prompt` → name; compartment path rewrite (m:4812-4825) | Prompt → name (RS) | Same |
| 77 | Add ingredient defaults | size 40 (r 30), `protein_nameN`, at canvas centre (m:4630-4718) | `protein_nameN`, size 40, r 30, at the canvas centre (RS, RC) | Same |
| 78 | Add compartment | size/r 150 at centre (m:4499-4519) | `newCompartmentK` from 0, r 150, at the canvas centre (RS, RC) | Same |
| 79 | Add interaction | Pairs `nodes_selections` 2 at a time, clears selection (m:4545-4616) | Pairs (i, i+1), clears (TB) | Same |
| 80 | Edit-Mode button visibility | Visible at start; toggled by `switchMode` (m:278-290) | Visible until Edit Mode is first toggled, then in Edit Mode only (TB, §8.19) | Same |
| 81 | Colour modes list | 16, including `size` (m:28-30) | 16 in legacy order; `pdb` after load, as the oracle shows (CO, UM) | Same |
| 82 | Validation modes (pdb/geom/pcpalAxis/offset/Beads/count_molarity) | m:3386-3420 | pdb/pcpalAxis/offset as legacy; geom/Beads/count_molarity follow our parser's defaults, not legacy's (oracle differs on HIV and Influenza) | Differs |
| 83 | Gradient modes (confidence/count/size/molarity/MW) | d3 scale, hsl endpoints, sqrt for count/molarity (m:3256-3298) | d3 scales, sqrt for count/molarity, a one-value domain gives the min colour (CO; oracle) | Same |
| 84 | `default` / `interaction` | `_color` else `color`; black when absent (m:3468-3491, 2246) | `_color` else `color` else depth colour; our parser always sets `color`, so a recipe without colours shows depth colours, as the oracle does on HIV (CO) | Same |
| 85 | `viewed` | Yellow/red from `data.visited` (m:3432-3435) | From `uiModeStore.visitedNodes` (CO) | Same |
| 86 | `automatic`, mapping off | iwanthue per compartment + ±30° range; compartments coloured (m:3213-3240, 3455-3465) | Evenly spaced hues per compartment and a ±30° range per child (legacy: random iwanthue, §8.20) (CO) | Differs |
| 87 | Custom string column, mapping on | Gradient by unique index (m:3497) | Gradient by unique index (CO) | Same |
| 88 | Apply to ingredient colour | All nodes incl. compartments; saves `_color` (m:3356-3371) | Every node, compartments included; `_color` kept (TB, RS) | Same |
| 89 | Group-by eligibility | Custom columns only; built-ins disable it (m:3522-3561) | Keys outside `default_options` group (LY `groupKey`) | Same |
| 90 | Cluster geometry | Global halton → packSiblings clusters, pull only outside the radius (m:3517-3595, 5424-5439) | A group level in each compartment's layout, animated (LY) | Departure §10.2 |
| 91 | Stroke-width control | `stroke_line_width` for every node and link (m:3678-3722) | Every node and link (RD) | Same |
| 92 | Scale Radius control | Number input 0.01–10 (lm:293) | Slider + number 0.01–10 (TB) | Same |
| 93 | Table row → canvas selection | Sets `node_selected`, clears multi, highlights (gt:1688-1695) | `selectNode` from RecipeTable | Same |
| 94 | d3 numerics | v4.13 `packEnclose`/jiggle use `Math.random` | Layout deterministic (d3 v7 seeded) | Differs |
| 95 | Previous/Next ingredient | Buttons walk table rows and select (m:5784-5826) | Previous/Next Ingredient buttons in the options (TB) | Same |

**Row counts** (from the Status column, lane `recipe-view-port`): Same 61, Departure 22, Differs 8, Open 4. Total 95. Departures cite the §10 item that decides them.

---

## §10 Decided (Ludovic, 2026-11-04)

The modern Recipe view is rebuilt from this spec, not patched from the SVG view. Legacy is the contract for every row of
§9 except the departures below; each one is kept on purpose, and code that implements it cites this section.

1. **Drags are declared with Dragology; the view is SVG** (Ludovic, 2026-11-04; replaces an earlier canvas re-port
   decision of the same day). `dragology` (MIT, pinned at `b145bdd`, 0.1.7) renders the view as a pure function of
   the recipe state to SVG and owns every drag (§4): `d.vary` with constraints for a free drag, `d.closest(...)
   .withFloating()` over candidate parents for Edit-Mode reparenting (rows 66-68), a shared centre for a compartment
   drag (row 58). Why: the drag rules (on the membrane, inside the parent, out of siblings, into a new parent) are
   constraints, which is what Dragology declares; legacy's look (filled disks, depth order, labels) is drawn in SVG,
   depth order through `dragologyZIndex`. Rendering is not the bottleneck at recipe sizes (≤ a few hundred nodes);
   Dragology's per-pointer-move work (one render of the recipe per candidate state and per optimizer step) is, so it
   is measured first (the lane's spike) on Mpn. WebGPU is not used: it does not speed that work up, and text and
   curved labels (rows 34-38) are costly there.
2. **No live physics; the layout is a pure function of the tree** (Ludovic, 2026-11-04: "I probably won't need the
   physics"; the two-kinds-of-tree approach for grouping). Legacy's always-running force simulation (§3, rows 10-21) is
   replaced by:
   - **Layout** = `layout(tree, grouping, options)`: legacy's pack and radii (§1). Group-by (rows 89-90) adds a
     synthetic group level inside each compartment, packed like a compartment, as Dragology's `two-kinds-of-tree`
     derives its layout from the tree's structure. Changing the grouping, the size mode or the radius scale computes
     the new layout and animates to it (`setState` with a transition), instead of forces pulling nodes there.
   - **Drags** are constraints and our own operators, not forces: containment and on-membrane are constraints
     (surface and parent forces, rows 15 and 17); Edit-Mode reparenting enumerates every candidate parent (and group)
     as `two-kinds-of-tree` enumerates insertion points, then `d.closest(...).withFloating().whenFar(free drag)`.
     Dragology's demos are patterns, not limits: where none fits, the lane writes its own operator or modifier
     (`docs/AGENTS.md`, "Writing Your Own Operators"); a candidate is a "push neighbours" modifier that relaxes
     sibling overlaps on the preview state, giving back legacy's feel of neighbours moving aside (rows 11-12).
   - **Interaction links** (row 13) are drawn as legacy; partners are not pulled together. If Ludovic wants them
     close, it is a layout term (order siblings so partners pack side by side), not a force.
   - The Forces options panel (§5, rows 21-22) keeps only what still has a meaning (group-by, its spacing); the
     strength sliders without one are removed, each listed in the PR with its §9 row.
3. **Dark-theme background** (row 24): in the dark theme the background is the theme's; in the light theme it is the
   root colour, as legacy. Why: the rest of the app follows the theme.
4. **Hard membrane constraints** (rows 15, 17, 58, 59): a surface ingredient stays on its parent's membrane centreline
   (Dragology's point-on-circle constraint), an interior ingredient inside the membrane's inner edge, a compartment
   drag moves its subtree rigidly, inside its parent. Why: Ludovic's earlier review found legacy's soft springs let
   proteins drift off the membrane.
5. **Membrane marker lines in every surface ingredient's circle** (row 40), as well as in the popup as legacy.
6. **Crashes fixed, other oddities kept** (§8): deleting a compartment deletes its subtree and its links (§8.11);
   right-click on a link or on the empty canvas opens no menu, so nothing deletes the root (§8.12). Every other item of
   §8 is reproduced where it still applies without live physics (§8.8, §8.9 no longer do), with a comment citing it.
   One whose reproduction would throw is fixed the same way and noted in the lane's progress file.
7. **HiDPI**: SVG is vector, so sharp on every screen (row 2).
8. **Proof** (How we work, oracle rule): the deterministic outputs (radii, colours, labels, draw order, the effects of
   each gesture) are captured from the running legacy app on `HIV_serialized.json` and `InfluenzaA.json` into
   `tests/fixtures/recipe-view-oracle/`, and screenshots of both apps at a fixed size are compared side by side. Exact
   positions are not compared: legacy's pack uses `Math.random` (§8.20).
