# Architecture: Mesoscope as a Prism extension

Should Mesoscope become an extension in prism-me (one Prism app) or stay a second app kept in sync with it (PR #50
§5.7)? How does the Recipe ⇄ Model switch work? Brief: [../progress/2026-11-06-prism-architecture.md](../progress/2026-11-06-prism-architecture.md).
The flow it serves (Ludovic, 2026-11-06): open a recipe, build and look at it (Recipe view, Table, Ingredient view),
then switch to Model and build and look at the mesoscale model, with one Focus, one undo and one ⌘K.

**Citations.**
- `prism:` is `packages/prism` and `ext:` is `packages/extensions`, both at prism-me `a1126e871` (repo
  `~/molstar-prism-me`). The prototype builds against this copy of Prism, not against `~/Developments/molstar`
  `c1b8ecb`.
- `me:` is `apps/prism-me` at the same commit.
- `proto:` is `apps/prism-me/src/recipe/extension.tsx` on `spike/mesoscope-extension` `ff2b24509`. That branch is local
  and was never pushed.
- `web:` is `web/src` at `39175ca`.
- `pr50:` is `origin/lane/builder-mockup:web/_spec/design/README.md`.

**Evidence labels.**
- **[run]**: seen while the prototype ran (port 5183; screenshots in `architecture/1-4`).
- **[read]**: read in the code or the specs.
- **[guess]**: inferred, not checked.

## 1. Recommendation

1. **Mesoscope becomes an extension in the prism-me workspace, built in stages (§9).** It is not a second app. The
   recipe is the extension's own state, registered so that Prism's single undo takes it (§3.4). Recipe and Model are
   two workspaces of one shell, switched at app level now (§6). A `ui.workspaces` shell concept goes upstream to Prism
   as a proposal (§7). *Why:*
   - Most of the two-app sync contract disappears when both sides run in one process and call one API: the channel,
     embedding, two undo histories and two ⌘K menus (§8).
   - What remains is recipe-domain work that both variants need anyway: identity by path, recipe → scene, and conflict
     handling.
   - The cost falls mostly on the UI chrome. The Recipe canvas drawing and most of the domain code carry over; the parts that mutate the recipe or hold the
     cyclic graph are reworked for the custom state (§3.4, §5).
2. **These would change my mind:**
   - **Churn.** prism-me's or Prism's churn breaks the extension more often than once a week during the first month of
     lanes. An extension has no stability promise outside its repository (§4.1).
   - **Undo cost.** This is met unless the design changes: a recipe with inline meshes (`hivfull_serialized.json`, 13 MB)
     turns Prism's undo off for the whole scene (§3.4, Price 3). The design in D4 (meshes outside the custom state) avoids
     it; if that cannot be done, the fallback is a history inside the extension, which loses "one undo", not the
     extension.
   - **Side by side.** Ludovic needs the Recipe view beside the 3D stage as a must, and upstream turns down both a
     workspace and a peer slot (§7). With pages only, the two cannot sit side by side.
   - **Deploy timing.** A production beta of `web/` is needed before a prism-me build can be deployed to the Mesoscope
     host (§4.4). In that case the recommendation becomes "ship `web/` first, then the extension".

## 2. Question 1: hosting

1. **React views run in Prism with a `Button` stub and the CSS inlined (§2.5). [run]**
   - `prism:ui/src/react/react-view.ts:26-47` (`reactView(component, { createRoot })`) mounts any React or Preact
     component as a Prism view. The caller passes `createRoot`, so prism-ui depends on neither library (`:18-20`).
   - No shipped extension mounts React through it yet (grep `reactView` in `packages` and `apps`: prism-ui's stories and
     tests, and the prototype). The prototype is the first user: a risk, not a track record.
   - The prototype mounts the copied `web:` `RecipeCanvas` (d3-force physics, 2D canvas) and `RecipeTable` as a page,
     and an outline as a tab (`proto:197-201`).
2. **The slots are closed.** They are named slots, `tabs`, `overlays` (cards), `pages` (over the app), scene-tree
   `rows`, `toolbar`, and selection and node actions (`prism:viewer/_spec/viewer-spec.md:137-142`). None of them puts an
   extension view in the main area as a peer of the 3D stage. **[read]**
3. **A page is the only way to take the main area, and it covers the 3D stage without replacing it.**
   - A page is "a full-size opaque card over the canvas" (`prism:ui/_spec/shell.md:96-97`).
   - It is drawn over the viewport (`prism:ui/src/views/shell/shell-view.tsx:258-259`).
   - The WebGL canvas keeps rendering under it: no pause is tied to a page, and the canvas presence check pauses only
     out-of-view canvases (`canvas-presence.ts:15`), not occluded ones. **[read]**; it cannot be seen in a run, the page
     being opaque.
   - The code comment says the page sits beside the rail and the open panel (`shell-view.tsx:258`), but with the right
     dock pinned (prism-me pins it, `me:src/spec.ts:58`) the inset is the edge alone (`shell-view.tsx:166`), the page
     uses it (`page.module.css:16,20`) and its host is in the full-inset chrome layer (`shell.module.css:68-73`), so
     the page spans the rail and the panel. **[run: screenshot 2; read: the lines above]** This is a Prism bug for
     pinned docks (§7), and it means the outline tab's Recipe/Model control cannot be reached while a page is open
     over a pinned panel: the switch must be in the page header (it is) and on ⌘K.
4. **A page closes on Esc, and it unmounts when closed.**
   - Esc closes the page (`shell.md:97`).
   - A closed page is unmounted (`prism:ui/src/views/shell/page-host.tsx:26-27`, `Show when={page}`), so the recipe
     canvas restarts its simulation each time the page opens again. **[read]**
   - Therefore the canvas positions must be kept in the extension's state (view state, not undo steps), or a switch
     back to Recipe moves every node.
5. **CSS and theme from `web:` do not reach the views. [run]**
   - The recipe canvas follows `<html data-theme>` (`web:components/recipe/RecipeCanvas.tsx:39-42`). The prototype set
     `data-theme="dark"` on a wrapper (`proto:160`), so the canvas drew on its light background in a dark page
     (screenshot 2), and Prism's theme switch never reaches it. A `reactView` island must read Prism's theme and set
     the tokens itself.
   - The shell renders inside an open shadow root with adopted sheets (`prism:viewer/src/ui/shell.tsx:118-119`), so
     document CSS (`web:` `import './X.css'`, `--color-*` tokens) does not reach the views.
   - The prototype puts the CSS in a string inside a `<style>` element (`web-css.ts`). Without this, the canvas draws
     nothing.
   - The proper route is `defineStyles(id, css)` (`prism:ui/src/styles/registry.ts:37`), which shares one sheet per
     root (`ui/_spec/styling.md:63-66`). **[read]**
   - Radix Themes styles would not reach the shadow root either. They were not used, and `Button` was stubbed.
6. **prism-ui is not React. [read]**
   - Its components use prism-ui's own JSX runtime (`prism:ui/tsconfig.json:7`, `jsxImportSource
     @molstar/prism-ui/dom`; `page-host.tsx:1`).
   - prism-me's views are written in that runtime too.
   - So a `web:` view either stays React inside a `reactView` island, or is rewritten as prism-ui DOM JSX.
     `web:components/ui/` (Button, Switch, Slider over Radix) cannot simply be swapped for prism-ui's `Button` and
     `params/slider.tsx` inside React.
   - prism-ui has no separate switch component. Its boolean control is in `params/params-form.tsx`.
7. **React version.**
   - The workspace catalog pins React 18.3.1 (`~/molstar-prism-me/pnpm-workspace.yaml:65-66`). `web:` uses React 19.
   - The prototype runs on 18, with a peer warning. **[run]**
   - `web:` uses no React-19-only API. A grep for `use(`, `useActionState`, `useOptimistic` and `<Context value` finds
     nothing. `forwardRef` works on 18. **[read]**
8. **Imports and typecheck.**
   - An import of `web/src` from the other repository is impossible without a package or a copy. The prototype copies
     43 files (6.7k lines).
   - The copy does not typecheck under prism-me's rules, which need NodeNext `.js` endings. esbuild bundles it anyway.
     **[run]**
9. **Undo: see §3.4.** Recipe edits get Prism's one undo only when the recipe is registered custom state.

## 3. Questions 2 and 3: switch and shared state

1. **The workspace switch works at app level, with no change to Prism. [run]**
   - One operation, `recipe.workspace {mode}`, opens or closes the page through `ctx.managers.navigation.setPage`
     (`proto:65-87`, `:187-190`).
   - Two ⌘K commands call it (`proto:181-184`).
   - A Recipe/Model segmented control sits in the outline tab and in the page (`proto:112-119`, `:149`, `:162`).
   - Switching to Model closes the page, picks the entity, frames it with `explorer.focus` and opens the Scene tab
     (`proto:74-84`; screenshot 4).
   - **Limits:**
     - It cannot swap the dock layout or the stage content.
     - Prism has no workspace or mode concept. `ui.layout` has docks, mode (`desktop`, `compact`, `embedded`), start
       tab and compact rail (`viewer-spec.md:75`, `:83-91`; `shell.md:196`).
2. **What the extension shows and hides by itself. [read]**
   - It can show its own tabs per workspace: an extension tab takes `visible: Observable<boolean>`
     (`prism:viewer/src/spec.ts:423-427`).
   - The only way to hide another extension's tab is `hideTab`. That writes the person's hidden tabs into the kept
     layout (`shell.md:191-195`), which is the wrong owner for a workspace.
   - The explorer's Scene tab is app code (`me:src/explorer/`), so the app can give it `visible` too. Prism's core
     tabs stay where they are.
3. **The recipe is extension state; the model stays in prism-me.**
   - In the prototype, the recipe is the `web:` zustand singleton (`proto:18`, `:41`) and the ops are
     `history: false` (`proto:39,51,69`). **[read]**
   - This breaks two prism-me rules. **[read]**
     - "prism-me adds no store of its own" (`me:_spec/architecture.md:29-30`).
     - "operations are the only way its views … change anything (one history step each)" (`me:_spec/README.md:31-33`).
   - The pattern that conforms is an `ApiArea` that registers its state with `registerCustomState`, like `contents`
     (`prism:viewer/src/api/contents.ts:155-170`).
   - The model stays prism-me's particle list in Mol\*'s state tree.
4. **One undo: possible, at a price.**
   - Each checkpoint holds `getSnapshot(...)` (`prism:viewer/src/sources/checkpoint.ts:48`), and `getSnapshot` writes
     every registered custom state (`packages/plugin/core/src/state.ts:181-186`).
   - Three owners already use this: the sequence (`prism:viewer/src/viewer.ts:742`), measurements
     (`features/measurements/operations.ts:77`) and the palette (`sources/palette.ts:140`).
   - The camera, the selection and the focus are view state and never steps (`checkpoint.ts:17-20`;
     `viewer/_spec/sequence.md:216-219`).
   - **Price 1: write sites.** Only the data tree is watched for outside changes (`checkpoint.ts:194-207`). A recipe
     write that bypasses `api.run` is therefore not detected; it silently falls outside history. Every writer (about 10 files call
     a mutating store action; `selectNode` is view state) must go through operations, and so must the domain functions
     the views call that write (§5).
   - **Price 2: the recipe as it is cannot be registered. [read, and run by the skeptic's probe]**
     - `web:domain/recipe/types.ts:138-148`: `RecipeNode.parent` and `RecipeLink.source/target` are object references,
       so the graph is cyclic. `JSON.stringify(parseLegacyRecipe(json))` throws for HIV and hivfull. In the checkpoint
       the size pass catches that and returns 0 (`checkpoint.ts:131-132`), so the budget never trips, and the
       checkpoint holds live references that `web:state/recipeStore.ts:277-283` (`Object.assign`) mutates: undo
       restores nothing.
     - The custom state is acyclic and serializable by contract, so the state must be a plain tree (ids or paths for
       parent and link ends), rebuilt into the graph the views read.
   - **Price 3: the size pass is not memoized for custom state, so a big recipe turns undo off for the whole scene.**
     - `checkpoint.ts:120-123` runs `JSON.stringify(rest, withoutPayloads)` on every checkpoint over everything but
       the data and behavior trees, `custom` included (`plugin/core/src/state.ts:181-186`). Only tree transforms are
       cached (`#sizes`, `:101`, `:136-142`), so structural sharing in the store does not lessen it.
     - `withoutPayloads` (`:78-82`) drops only strings over 1 KB and typed arrays. `web:domain/recipe/parseLegacyRecipe.ts:273`
       keeps `meshFile` as is: in `hivfull_serialized.json` 45 ingredients carry `{verts, faces, normals}` as plain number
       arrays, and 13.27 MB remain after the filter (13,270,615 B; 135 ms warm). **[run: probe by the review's skeptic]**
     - The budget is 5 MB and 50 ms per step (`prism:ui/src/managers/history.ts:221`, enforced `:648-666`; no override at
       `viewer.ts:272`): over it, undo goes off for the whole viewer ("Undo is off for this large scene"). Plain
       `HIV_serialized.json` filters to 25 KB, so it is under.
     - So one undo needs state that stays small: meshes (and any big array) held outside the custom state by key, in a
       non-undo cache, or as typed arrays. Or an upstream ask: a per-part size cache for custom state, as
       `SerializedTrees` is for trees.
   - **Price 4: Focus identity.** The Focus becomes a path, not a node reference, because a restore rebuilds the nodes
     (§3.5).
5. **One Focus: the extension mirrors it; Prism's selection does not hold it.**
   - The prototype mirrors the Focus both ways. **[run]**: Recipe → model on screenshots 3 and 4; Model → recipe with
     the pick emulated through the explorer's `picks` subject (`explorer.picks.next`), the same subject the canvas click
     feeds, and with real canvas clicks that landed only on non-recipe entities (no screenshot).
     - Recipe → model: `recipe.focus` sets `selectedNode`, then calls `explorer.revealRow('me:<ref>:<id>')` and
       `explorer.highlight` (`proto:47-63`; screenshot 3).
     - Model → recipe: the explorer's `clicks` (`me:src/explorer/operations.ts:144-145`) → `pickedOf(loci).key`
       (`:380`) → entity id → `mesoscale.entities` (`ext:mesoscale/src/operations.ts:206`) → name → `recipe.focus`
       (`proto:192-195`).
     - A click on an entity that is not in the recipe (`inner_membrane`, `SerumAlbumin`, `dLDL`, …) leaves the Focus
       unchanged. 17 entities match.
   - Prism's selection is Loci-based, and recipe objects are not Loci. The Focus is therefore extension view state:
     not a step, as Prism has it.
6. **Identity: names are the prototype's luck; paths need a model built from the recipe.**
   - The prototype matches by name, first hit (`proto:53`, `:98`).
   - HIV has four ingredient names twice (`pr50:259-262`), so the first hit is wrong for those.
   - Paths cannot work against the published example either. Its tree is `HIVenvelop_mature / HIV_capsid / surface`
     (screenshot 4), while the recipe's compartments are `HIV1_envelope_Pack_145_0_2_0` and
     `HIV1_capsid_3j3q_PackInner_0_1_0` (screenshot 2). An entity carries only its name and a compartment index, and
     groups carry their own paths (`ext:mesoscale/src/model.ts:16-34`).
   - So path keying (`pr50:374-378`) and a model built from the recipe are one decision. The extension that builds the
     model writes each entity's recipe path, and matching by name stays a fallback for published models only.
   - **Not run:** a model built from the open recipe. Who packs, with what, and where (prism-me's rebuilt physics,
     queue item 12) is the central open question.

## 4. Question 4: risks

1. **No stability promise.** "Every extension lives in this repository, no stability promise beyond it"
   (`viewer-spec.md:133-134`, README decision 13). The extension must live in the molstar-proto repo (prism-me branch),
   rebased with prism-me, so it is coupled to Prism's churn.
2. **Fork.** molstar-proto is a fork that is not on npm, and Mol\* v6 is `6.0.0-dev.0`. This risk exists in both
   variants: item 1 of the queue (consuming Prism in `web/`) faces it too.
3. **Bundle.**
   - prism-me's budget is 3.4 MB for `index.js` (`me:package.json:67-69`), checked on the start closure of a `--prd`
     build (`scripts/esbuild/app.mjs:310-323`). The baseline is already over it and the budget is known to be stale
     (`me:progress/current.md:138-141`): the `--prd` build of this worktree reported 6.15 MB without the spike.
   - The spike adds 0.30 MB, to 6.45 MB, because the extension is eager (`me:src/extensions.ts`). **[run: `pnpm build`
     in the prototype, which runs `--prd`, once with and once without the `extensions.ts` line]**
   - A lazy stub (`viewer-spec.md` §3, "Lazy") would move it to its own chunk. **[read]**
4. **Deploy.**
   - prism-me is a pnpm workspace built with `node scripts/esbuild/app.mjs apps/prism-me --prd` (`me:_spec/README.md:47-51`).
   - `web/` uses Vite and has no deploy path yet (queue item 5). Either way, a build has to reach the Mesoscope host.
   - Toolchain on this machine: pnpm 12.15.0 through corepack was broken (missing `pnpm.cjs`), and the cached
     `pnpm.mjs` worked. Headless Chromium had no WebGL; headed Chromium with `--use-angle=swiftshader` had it. **[run]**
5. **Two UI models, React islands and prism-ui JSX (§2.6).** Keep React for the canvas, Table and Interactions, which
   are heavy and already tested. Write the chrome (outline, inspector sections, Open page) in prism-ui, as prism-me
   does.

## 5. Cost

Lines in `web:`, TS/TSX not counting tests, total 9,424; CSS separate.

| Bucket | What | Lines |
| --- | --- | --- |
| Carries over unchanged (not the mutating parts listed under Adapted) | `domain/recipe` 1,717 + `domain/recipe/view` 1,258 (the Recipe canvas drawing, physics, hit test), `domain/colors` 101, `domain/files` 457, `domain/skills` 56, `domain/pdb/{pdbSearch,structureSource}` 171, `types` 27 | 3,787 |
| Adapted (React kept in `reactView`; writes become `api.run`; CSS through `defineStyles`) | `state/recipeStore` 451 (immutable, custom state, ops), `components/recipe/{recipeView 348, RecipeCanvas 266, RecipeTable 122, InteractionTable 118, spriteCache 35}` | 1,340 (+155 CSS). Also adapted, within the rows above: the domain code that writes in place (`domain/colors/colorPalette.ts:42,45,63`, `domain/recipe/mergeRecipe.ts:101-125`, `importMolarityCount` `serializeRecipe.ts:537-538`) and `RecipeNode`'s parent and link references (`types.ts:138-148`), which D4 turns into ids or paths: path-copying cannot share nodes that carry parent back-pointers. `RecipeSaver` calls `exportColorPalette`, which writes `node.data.color` during an export (`RecipeSaver.tsx:50`): a write outside history under D4. So "unchanged 3,787" is an upper bound, not an estimate of the final figure. |
| Rewritten **only because of the extension** | `components/layout` 1,011 (dockview `Workspace` 589, `MenuBar`, `menuConfig`, `AppShell`, `Dialog` → Prism shell, commands, pages); `components/ui` 124; `RecipeLoader`, `RecipeSaver`, `MergeDialog`, `ColumnMappingDialog`, `RecipeCanvasToolbar` 599 (→ an Open page, cards, toolbar, commands); `state/{layout,preset,theme,uiMode}Store` 241 (→ `viewState`, the theme, extension settings); `app`, `skills`, `main` 75 | 2,050 (+488 CSS) |
| Rewritten **in either variant** (Mol\* 5 → Prism, queue item 2) | `components/pdb` 1,314; `domain/pdb` Mol\*-bound 871; `state/ingredientViewerStore` 62 | 2,247 (+183 CSS) |

- **Tests:** `web/tests` has 4,976 lines, 679 of them e2e. Both apps use vitest, so the domain tests carry over. The
  component tests are adapted. The e2e tests are rewritten against the prism-me build.
- **The two-app variant:** none of the extension-only rewrite. It adds what PR #50 left unbuilt: the channel,
  embedding prism-me, and Prism consumed by `web/` (item 1). **[guess: comparable size, not estimated]**

## 6. The workspace switch at app level (built on what Prism has)

1. **A workspace** is `{ id, title, page?, tabs, start }`. The current workspace is derived from `navigation.page`
   (subscribe: page open is `recipe`, none is `model`), not held as a second field: the prototype kept both
   (`proto:27,72-73,187-190`) and a close by ✕ or Esc (`page-host.tsx:49,64`) left the field at `recipe`, with the
   control wrong, the Focus not picked in the model, and `recipe` persisted. Every way out of the page then runs the
   Model entry (pick, frame).
   - `recipe`: page `mesoscope.page.recipe` with the Recipe view, the Table and the Ingredient view (§6.5). Tabs:
     Recipe outline and Interactions.
   - `model`: no page, so the 3D stage shows. Tabs: Scene (the explorer's) and the Recipe outline, which serves as the
     palette for Build/Paint.
   - Each tab's `visible` follows the current workspace (§3.2). The person's hidden tabs are never written.
2. **The Focus carries across.** It is the extension's list of ingredient paths: view state, not undo (§3.4).
   - Entering Model picks and frames the Focus (`explorer.revealRow`, `highlight`, `focus`), as `proto:74-84` does.
   - Entering Recipe selects the Focus in the canvas and the Table.
   - The 3D camera is left as it was.
3. **Kept per workspace, in the extension's view state:**
   - Recipe: the canvas's node positions, zoom and pan; the Table's sort and scroll. The page unmounts (§2.4).
   - Model: the camera, which is already Prism's.
   - Neither is an undo step.
4. **Persistence.** The current workspace id goes to the extension's settings in `persist.preferences`. The layout
   store does not keep the page: it keeps "not the card or the page, which are summoned"
   (`prism:viewer/_spec/journal.md:110-111`). At start, with a recipe open and `recipe` kept, the extension opens the
   page.
5. **Commands.** `mesoscope.workspace.recipe`, `mesoscope.workspace.model` and `mesoscope.workspace.toggle` (one key,
   to choose), made with `operationCommand` (`prism:viewer/src/commands/operations.ts:80`). The segmented control sits
   in the page header and in the outline tab (§2.3: the rail may be covered).
   - **Esc conflict:** Esc closes the page (`shell.md:97`). That leaves Recipe, which conflicts with Esc clearing the
     Focus (`pr50:284-285`). The page handler can keep Esc for the Focus: `page-host.tsx:61` returns early when
     `e.defaultPrevented`, and the document listener runs after an in-page one. **[read]**
6. **Where the queue items land:**
   - 1 is replaced by this lane.
   - 2: the Ingredient view is a second, embedded Prism viewer inside the Recipe page. That is the embedded mode
     (`viewer-spec.md:83-88`), with its own `persist.key` (`:105-106`). **Not prototyped**, including whether two
     viewers share one WebGL context well.
   - 3 is the Model workspace, which is prism-me as it stands.
   - 4: recipe URL parameters go into the app's URL handling (`me:src/url.ts`).
   - 5 becomes a deploy of the prism-me build.
   - 6 and 7 become extension operations, the Open page and Prism's Settings and Help.
   - 8 becomes a lazy stub.
   - 9 carries over with the drawing code.
   - 10 has to be re-read against prism-ui.
   - 11 is the Model workspace with the outline as the palette.
   - 12 runs in the same process.

## 7. Upstream proposal: `ui.workspaces` (to Prism; not a commitment)

1. **Problem.** An app with two ways of working over one scene, such as a document view and the 3D model, has only
   pages to work with. A page:
   - covers the stage and does not replace it: the WebGL canvas keeps rendering under it (§2.3), and it is unmounted
     on close (§2.4);
   - is summoned, not kept, so a reload lands on the 3D stage (`journal.md:110-111`);
   - closes on Esc (`shell.md:97`);
   - cannot sit beside the stage.

   In addition, another extension's tabs can be hidden only by writing the person's hidden tabs (`shell.md:191-195`).
2. **Minimum shape.** In `ui.layout`:

   ```
   workspaces?: { id; title; icon; main: 'canvas' | PartId; layout?: Partial<ViewLayout>; start?: boolean }[]
   ```

   - `main` is the 3D canvas or one view as a peer in its place. When the canvas is not `main`, its rendering is
     paused, the way hidden panels pause (`shell.md:98-101`, `react-view.ts:22-24`).
   - `layout` seeds each dock's tabs, the active tab and the sizes for that workspace.
3. **Shell model.**
   - `navigation.workspace` holds the current id.
   - `setWorkspace(id)` is exposed as the command `view.workspace.<id>`, with one cycle command.
   - `viewState` keeps a layout per workspace id, and `resetLayout` resets the current one.
   - The current workspace is kept with the layout (`journal.md` §6).
   - Esc never leaves a workspace.
   - The rail shows the switch as one control.
4. **Out of the minimum:** `main` as a split of two views (pr50's arrangements, `pr50:290-292`). It is the next step if
   the minimum lands.

## 8. Against PR #50 §5.7 (two apps in sync)

1. **Disappears with the extension:**
   - the channel (`pr50:750-751`);
   - embedded or own window (`pr50:745-749`);
   - "live sync or on save" (`pr50:729-731`), because both read one state;
   - two undo histories (`pr50:433-442`): one history once the recipe is custom state (§3.4);
   - two ⌘K menus and two keymaps.
2. **Remains, as recipe-domain rules of the extension:**
   - legacy's builder reading (`pr50:326-354`);
   - one writer per fact (`pr50:356-370`);
   - identity by path (`pr50:374-378`, sharpened by §3.6);
   - recipe → scene: meshes, palette, targets, orientation (`pr50:379-401`);
   - scene → recipe: placed counts, fibers (`pr50:405-421`);
   - the conflict table (`pr50:444-460`);
   - the Focus both ways (`pr50:423-431`), now a call and no longer a message.
3. **New risks:**
   - coupling to prism-me's and Prism's churn, with no stability promise (§4.1);
   - a fork not on npm (§4.2; shared with item 1);
   - React 18 instead of 19 (§2.7);
   - CSS in a shadow root (§2.5);
   - two UI models, React islands and prism-ui JSX (§2.6);
   - Prism's closed slots (§2.2);
   - the code and its parity specs leaving the Mesoscope repo (§10, D2).

## 9. Staged path

1. **Stage 1, the next mockup round.** Two workspaces in one shell: Recipe (page) and Model (stage). Mockups on
   prism-ui with the Focus, ⌘K and Esc. No `web:` change.
2. **Stage 2, a port lane.** A `mesoscope` extension package:
   - `domain/` copied as is, with `.js` endings;
   - the recipe as custom state with undoable operations;
   - the canvas and Table in `reactView`;
   - the outline in prism-ui;
   - a lazy stub.
   - Check: open `hivfull_serialized.json` (not plain HIV, which is 25 KB and passes whatever the design), edit a count,
     undo it with ⌘Z, and see that undo stays on (no "Undo is off for this large scene"); then switch to Model.
3. **Stage 3.** The Ingredient view as an embedded Prism viewer (item 2), the Open page (items 4 and 6), then deploy
   (item 5).
4. **Meanwhile, `web/`** takes only fixes. It stays the port's running reference until the extension reaches parity.

## 10. Decisions for Ludovic

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Extension in prism-me, or two apps (PR #50 §5.7). | Extension, staged (§9). |
| D2 | Where the code and its specs live. | In the molstar-proto prism-me branch, `packages/extensions/mesoscope`, with its `_spec` and its tests (README decision 13). The Mesoscope repo keeps legacy and the oracle capture scripts. |
| D3 | Which app. | Inside `apps/prism-me` first, as the prototype is. Split to a sibling `apps/mesoscope` only if the defaults conflict (prism-me's "one panel, one tree", `me:_spec/ui.md:7-10`). |
| D4 | How the recipe is held. | As registered custom state: a plain acyclic tree (no parent or link object references), meshes and other big arrays outside it by key, every write an operation, one undo step (§3.4). Otherwise undo turns off for large recipes. |
| D5 | View technology. | React 18 islands for the canvas, Table and Interactions; prism-ui for the chrome. Drop Radix Themes and dockview. |
| D6 | Identity between the recipe and the model. | The ingredient path, written into the model the extension builds; matching by name only for published models (§3.6). |
| D7 | The switch. | App level now (§6); propose `ui.workspaces` to David (§7). |
| D8 | The Ingredient view. | An embedded second Prism viewer in the Recipe page; prototype it first (§6.6). |
| D9 | `web/` from now on. | Fixes only. Lanes in flight finish; no new feature lanes. |
| D10 | PR #50. | Close §5.7 as a two-app contract and move §5.7.1, §5.7.3-§5.7.4 and §5.7.7 into the extension's spec. Merge the rest of its mockups. |

## 11. Proposed `web/TODO.md` updates (for the PR body; TODO.md itself is not edited)

1. **Item 1 (Mol\* v6 spike):** replaced by this lane. Prism is consumed as the host, not by `web/`. Remove it if D1
   is "extension".
2. **Item 2 (Ingredient view):** reword it as "the embedded Prism viewer in the Recipe page", after its prototype (D8).
3. **Item 3 (Full-scene viewer):** it is the Model workspace. Reword it as "model built from the open recipe, with
   ingredient paths on the entities" (D6, §3.6).
4. **New, ahead of item 2:** "Two workspaces in one shell", mockups on prism-ui (§9.1).
5. **New:** "Port lane: the `mesoscope` extension with the recipe as custom state and undo" (§9.2).
6. **New:** "Upstream: propose `ui.workspaces` to Prism" (§7).
7. **Items 5 and 8:** reword them for the prism-me build (deploy; lazy stub).
8. **Items 6, 7 and 9:** move them to the extension's queue as written. **Item 10:** re-read against prism-ui (§6.6).
   **Items 4, 11 and 12:** as §6.6 maps them (URL parameters; the Model workspace's outline palette; physics in the same
   process).

## 12. What the prototype did not cover

- the Ingredient viewer;
- a model built from the recipe;
- recipe undo;
- keyboard parity;
- typecheck and lint of the copied code under prism-me's rules (`extension.tsx` types are partly `as any`,
  `proto:184`, `:202`);
- any recipe other than HIV;
- duplicate names (§3.6);
- `web:`'s chrome: the toolbars, the load and save dialogs, `MergeDialog` and `ColumnMappingDialog` were copied but
  not mounted.
