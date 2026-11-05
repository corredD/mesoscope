# Mesoscope interface design

The proposed interface of the modern app (`web/`): research, our context, principles, the information architecture,
the design system, and a coverage table of every current menu item and panel. A proposal for Ludovic to confirm or
reject (§8), not yet a rule for code. Mockups: open `web/design/mockups/index.html` in a browser (static HTML, no build,
no network; `?theme=dark` for dark). Screenshots: `web/design/mockups/screenshots/`. Checked by
`node design/mockups/check.mjs` from `web/` (§10).

Pinned references: Stories Untold `/Users/ludovicautin/Dev/stories-untold` at `5f4cf8dc`; Mol\* v6 Prism
`~/Developments/molstar` at `c1b8ecb`; MolViewStories `~/Developments/mol-view-stories` at `7c33489`; this repo at
`web-modernization` `a291338`. Paths below are relative to those roots (`SU:`, `molstar:`, `MVS:`); web sources were
fetched on 2026-11-04.

## 1. The request, read

Ludovic: "use state of the art design concept and prepare some mockup for the overall interface (like untold story, and
molstar v6 prism approach) … The UI should be easy to find and always make sense, and be consistent."

- **"untold story" is Stories Untold** (`SU:`), Ludovic's agent-driven successor to MolViewStories (per Ludovic,
  2026-11-04, correcting this lane's first reading as MolViewStories). It is the primary reference with Prism;
  MolViewStories is secondary context (§2.3).
- **"easy to find, always make sense, consistent"** is read as three testable properties: every action is reachable from
  one search (P4); a region never changes job or place between tasks (P3); one pattern per job (one selection, one
  inspector, one way to say "not possible yet") (P1, P2, P7).

## 2. Research

Each finding ends with the decision it leads to (→).

### 2.1 Stories Untold (primary)

- **The Focus.** "what the person points at, as a short list of items: the 3D selection, Context entities (a row, or a
  map or mesh clicked in 3D) … a selected text span" (`SU:designs/ux-map/README.md:28-31`). Rules: "One selection, one
  text span" and "A click points at one thing of its kind; Shift, ⌘ or Ctrl adds it. Clicking something already pointed
  at … takes it back; every pill has its ×" (`SU:designs/architecture/focus.md:24-29`). → Our one selection is a Focus:
  a short list of recipe objects, the same in every view, shown as pills (§5.3, P1).
- **Commands default from the Focus.** "Arguments default from the Focus: `/focus`, `/show as sticks`, `/color red` act on
  the 3D selection" (`SU:designs/ux-map/commands.md:23`). → Commands act on the Focus; no command asks "which
  ingredient?" (§5.4).
- **What cannot run says why.** "Commands that cannot run now stay in the list, grayed, with the reason"
  (`SU:designs/ux-map/commands.md:15`). → Replaces today's "Not yet available" dialog (P7).
- **The stage and the column.** "The 3D view is prominent; the story is a column beside it"
  (`SU:designs/ux-map/README.md:71`); seen in `SU:designs/mocks/workspace.html` (a reading column left, the stage right,
  quiet text-link chrome). → A recipe column beside a stage (§5.1).
- **Paper and ink, one accent.** Tokens: "serif for reading, sans for interface, mono for ids and data"
  (`SU:lib/stories/stories-ui/src/theme.css:9`); "One accent: focus, agent changes, the current selection" (`:42`),
  each status colour annotated with its contrast. → Our palette and type (§6), with the accent as the Focus colour.
- **Membranes.** "Oriented always, drawn on request … a gray band"; "OPM automatically, ANVIL on request"
  (`SU:designs/membrane-orientation/README.md:21-23`), the two faces drawn outer red, inner blue. → The Ingredient view
  draws the membrane band with its faces; "Orient from OPM" is offered for surface ingredients (§5.2, screen 4).
- **Principles.** "Everything visible can be pointed at (stable ids + human names), so Focus can resolve 'this'" and
  "Direct manipulation stays first-class" (`SU:designs/ux-map/README.md:90-94`). → P1, P5.
- **The stage's menu.** "A right-click on the stage opens a menu on what is under the pointer" with Move, Rotate and
  Color, each "one undo step"; "Right-click, not a gizmo"; "The menu's header names the target"
  (`SU:designs/stage-menu/README.md:5-9, 57, 62`). → A right-click in any view opens the commands for what is under the
  pointer, its name as the menu's header, built from the same registry (§5.4); today's Recipe view context menu (Rename,
  Delete, Colour) becomes that menu.
- **The opening.** "the first prompt ('What story do you want to tell?'), with files, options and examples"
  (`SU:designs/ux-map/home.md:39-40`). → First run asks "What will you pack?" with the ways in (screen 8).

### 2.2 Mol\* v6 Prism (primary)

- **Shell principles** (`molstar:packages/prism/ui/_spec/shell.md:10-16, 38`): "Canvas first"; "Summoned, not resident.
  Short tasks open as cards in the panel's place and close when done"; "One home for persistent UI: a tabbed panel on the
  right"; "Appear when relevant"; "Lean views. Commands carry the operations". → The inspector is the one right-hand
  home; Find a structure is a card in its place (screen 6); view options float over their view (§5.1). "Canvas first" is
  adapted, not copied: curation is table work (§3.3), so the stage holds a table as readily as a canvas.
- **Commands** (`molstar:packages/prism/ui/_spec/commands.md:9, 17, 62, 173`): commands carry "titles, categories,
  arguments, enablement, keybindings"; `when?(ctx): true | string` — "a reason greys it"; search is "fuzzy subsequence
  over title"; "a menu or button repeats no action's logic, every action stays findable in the command menu". → One
  registry; menus, palette and toolbars are views of it (§5.4, P4).
- **Selection lives in one place.** Selection and focus are Mol\*'s, mirrored into the sequence view: "No third copy"
  (`molstar:packages/prism/viewer/_spec/sequence.md:131`); marks are "one color in 3D, the sequence and the view"
  (`…/marks.md:12`). → The Focus is held once; views read it (P1).
- **Styling** (`molstar:packages/prism/ui/_spec/styling.md:75, 78, 84, 86, 137`): "Flat, few lines"; "Panel text is
  12px"; "Icons only where they say what text does not"; "Accent for actions and the picked item only … settings (a
  slider's fill, a switch that is on) are `--msp-color-text-muted`"; "Hover is instant". → §6; a switch that is on is
  ink, not accent.
- **Tokens** (`molstar:packages/prism/ui/src/styles/theme.css`): a few base colours per theme, the rest derived with
  `color-mix`; glass for what floats over the canvas; ink chosen by the canvas's background; spacing 2/4/8/12/16/24;
  radii 2/4/8. → Our token structure and scale (§6).
- **Accessibility** (`molstar:packages/prism/ui/_spec/accessibility.md:6, 9, 31, 33`): accent and status colours are
  text, 4.5:1 on a panel; targets "at least 24px"; reduced motion; data colours Okabe–Ito
  (`molstar:packages/core/src/util/color/lists.ts:292`). → §6.7, with the contrast pairs checked by script.
- **Parity in function, not form**: "every v5 feature has a place, each panel designed for its task"
  (`molstar:packages/prism/viewer/_spec/README.md:116`). → Our coverage table (§7): every feature has a place, not
  necessarily its old panel.

### 2.3 MolViewStories (secondary context)

- One view at a time in the editor (`MVS:@mol-view-stories/webapp/src/app/state/types.ts:36-39`); scenes picked from a
  dropdown, no persistent list (`…/menus/SceneSelector.tsx:33-40`). → Avoided: our outline stays visible, since a
  recipe of 180 ingredients is navigated, not stepped through.
- Example gallery on the landing page and `?template=` loading (`…/app/examples/list.ts:3-16`). → Examples are cards
  with their real sizes (screens 7-8), and URL loading is a way in (§5.5).

### 2.4 The state of the art on the web

- **Selection → inspector.** Figma: "Under Properties, you'll see the name of the selected layer and details about it,
  such as its layout and colors" (help.figma.com/hc/en-us/articles/360039832014). → P2.
- **Linked views in a mesoscale tool.** Mol\* Mesoscale Explorer: "To select, use shift + left click either on the 3D
  canvas or in the tree hierarchy" (molstar.org/me-docs/). → Canvas and tree feed one selection (P1).
- **Panels in a molecular app.** ChimeraX: "an all-in-one window interface in which various panels can be shown,
  hidden, and repositioned" (cgl.ucsf.edu/chimerax/docs/user/window.html). → Kept as an option (View › Reset layout), but
  regions have fixed jobs (P3): free docking is what made today's layout hard to predict.
- **Progressive disclosure.** NN/g: "Progressive disclosure defers advanced or rarely used features to a secondary
  screen"; "Initially, show users only a few of the most important options" (nngroup.com/articles/progressive-disclosure/).
  → Inspector sections, essentials open, Advanced folded (P6).
- **Empty states.** NN/g: "Do not default to totally empty states"; "Provide direct pathways (i.e., links) to getting
  started with key tasks related to populating the empty state" (nngroup.com/articles/empty-state-interface-design/).
  → Screen 8.
- **Contrast and targets.** WCAG 2.2: text "at least 4.5:1" (1.4.3); "The visual presentation of the following have a
  contrast ratio of at least 3:1 against adjacent color(s): User Interface Components, Graphical Objects" (1.4.11);
  "The size of the target for pointer inputs is at least 24 by 24 CSS pixels" (2.5.8)
  (w3.org/WAI/WCAG22/Understanding/). → §6.7 and the contrast check.
- **Colour-blind-safe categories.** Okabe and Ito, Color Universal Design: "Colors between yellow and green are all
  avoided, since they are indistinguishable with yellow and orange" (jfly.uni-koeln.de/color/). → `--data-cat-*` (§6.2).
- **Command palette.** VS Code: "The Command Palette provides access to many commands"
  (code.visualstudio.com/docs/getstarted/userinterface; as summarised by the fetch tool). Supports P4 with Prism and SU.

Not citable (fetch failed, so not used as evidence): Blender workspaces, Apple HIG inspectors, Material 3 density and
tonal surfaces, the Simularium paper.

## 3. Our context

### 3.1 The data

The model (`web/src/domain/recipe/types.ts`): a recipe is a tree of **compartments** (`CompartmentData` :89: name,
`geom_type` mb/sphere/file/raw/None, thickness, colour); each holds **ingredients** on its **surface** or in its
**interior** (`IngredientData` :50, the side is a flag, parsed from pseudo-compartments `surface`/`interior`/`cytoplasme`);
**fibers** are ingredients with `ingtype: 'fiber'`; **interactions** link two ingredients (`RecipeLink` :145). An
ingredient carries: name, label, count, molarity, molecular weight, confidence, structure source (PDB id or file,
assembly, model, selection, UniProt, EMDB), surface flag, principal axis, offset, fiber axis and offset, beads per level
of detail (positions and radii), geometry, colour, sprite (image, scale, y offset), comments, and custom columns
(`custom_data`). Formats: serialized (cellPACK-gpu), classic (cellPACK), CSV with column mapping; SKILLS.md defines the
LLM-generated recipe.

Real recipes, measured (`data/`):

| Recipe | Format | Compartments | Ingredients | Fibers | What is missing |
| --- | --- | --- | --- | --- | --- |
| `InfluenzaA.json` | classic | 1 | 3 (all surface) | 0 | counts 0 |
| `HIV_serialized.json` | serialized | 3 nested | 26 (6 surface, 20 interior) | 0 | all 26: count and molarity 0, no UniProt, no colour, no MW; all 6 surface ones have principal axis 0,0,0; 18 of 26 structures are `.pdb` files (served by the cellPACK_data repository) |
| `exosome_catalase.json` | classic | 1 | 47 | 2 | — |
| `Mpn_1.0_2.json` | classic | 1 | 180 (35 surface, 145 interior) | 3 | 0 of 180 have UniProt or a label; names are gene ids (`mpn665`); 98 of 180 structure names are not PDB ids and carry no file extension (`1pdz_1`, `2fqx_aligned`, `1pv6_mb`): the app sends them to the PDB as ids, where they do not load |
| `PlasmaHIVcycle_serialized.json` | serialized | 3 | 60 | 2 | 13.9 MB; 30 of 60 structures are `.pdb` files |

What this means for the design:
- **Sizes span 3 to 180+ ingredients.** A 2D overview alone does not scale to Mpn; a table does. Both views must hold
  the same Focus (P1), and the outline must filter.
- **The gaps are the work.** Every example has missing amounts or identifiers; curation is finding and filling them.
  Problems are shown on the object, in every view, with their fix (P5).
- **Names are ids.** `HIV1_ENV_4nco_0_1_1`, `mpn665`: ids are set in mono, labels (when present) in the reading face.
- **Two kinds of 3D.** One ingredient's structure (beads, membrane, fiber axis) and the whole packed scene are different
  tasks with different scales.

### 3.2 Users and tasks

Recipe authors (Ludovic and cellPACK users), curators, educators and LLM-assisted builders. The tasks, in order of
frequency as the menus and presets suggest:

1. **Open** a recipe: an example, a file (JSON, CSV), a link, an LLM's output (Skills); append one into another.
2. **Curate**: find what is missing (amounts, structures, UniProt), fill it, check it.
3. **Find and assign a structure**: PDB, UniProt, AlphaFold.
4. **Shape an ingredient**: orientation on a membrane or a fiber, beads and levels of detail, sprite.
5. **Build the tree**: add, move, reparent, delete compartments and ingredients; add interactions.
6. **See the whole**: the packed scene (Mol\* v6; not built: parity §5).
7. **Export** for cellPACK, cellPACK-gpu, cellPAINT, a spreadsheet.

### 3.3 Today's app

Fourteen dockview panels (`Workspace.tsx:135-148`), three presets (Default, Recipe creation, Recipe curation,
`Workspace.tsx:402-470`), four Layout Options toggles, five menus with 40 leaves of which 10 open "Not yet available"
(`menuConfig.ts`). Four panels are stubs (Object Properties, Topology, Uniprot mapping, Table Options). Selection is
already shared (`recipeStore.selectedNode`), but properties are spread across the Recipe table cells, Ingredient
Options and a planned Object Properties panel; options for one view sit in a separate panel (Recipe Options, Ingredient
Options); the two search tables apply to "the selected ingredient" from far away. These are the inconsistencies the
design removes.

## 4. Principles

**P1. One Focus, every view.** What the person points at is one short list, held once; the outline, the Recipe view,
the Table, the Ingredient and Scene views, the inspector and the commands all read it. Click points at one thing; ⇧, ⌘
or Ctrl adds or removes; Esc clears. *Why:* a curator moves between a circle, a row and a structure; if any of them shows
a different "current" ingredient, the interface stops making sense. Stories Untold's Focus, Prism's "No third copy",
Mesoscale Explorer's canvas-or-tree selection (§2). *Shows:* the pills in the status bar, the soft accent on the circle,
the row and the tree node at once (screens 1-6).

**P2. The inspector edits the Focus.** Every property of the Focus is edited in one place, the inspector on the right,
whatever view it was picked in. Views show and pick; they do not each carry an editor, with one exception: the Table
edits one property across many rows (bulk curation of counts, PDB ids), the job a spreadsheet does; one object's
properties are still the inspector's. *Why:* today the same ingredient
is edited in table cells, in Ingredient Options and (planned) in Object Properties; one home means one place to look.
Figma's properties panel, Prism's "one home for persistent UI" (§2). *Shows:* Ingredient Options' orientation and beads
become inspector sections (screen 4); Object Properties is the inspector; multi-Focus edits all (screen 2).

**P3. Places keep their job.** Five regions, always in the same place: top bar (menus, search), column (the recipe
outline), stage (one or two views), inspector, status bar (the Focus, messages). Arrangements change what the stage
shows, never what a region is for. *Why:* "easy to find" fails when a preset moves panels around; a fixed frame is
learned once. *Shows:* the anatomy on screen 1; Build, Curate and Overview are stage arrangements (screens 1-3).

**P4. Every action is a command.** One registry of commands with a title, a category, a key and an enablement; the
menus, the ⌘K palette, the toolbars and the inspector's buttons are views of it. ⌘K also finds ingredients by name, PDB or
UniProt. *Why:* an action then exists once, is found by typing, and behaves the same from anywhere. Prism commands.md,
Stories Untold command mode (§2). *Shows:* screen 9; the menus in the top bar.

**P5. Problems sit on the object.** What is missing or doubtful (no structure, no amount, no UniProt, no principal axis
on a surface ingredient, a structure name that is not a PDB id and not a file) is computed once and shown wherever the object is: a dot in
the outline and the Table, a list at the top of the inspector with a fix for each, a "Needs attention" filter, a count
in the status bar. *Why:* §3.1: every real recipe has gaps, and finding them is the curation task. *Shows:* screens 2-4.

**P6. Essentials first, the rest one step away.** The inspector opens the sections a task needs (Amount and Structure
for curation; Placement and Beads in the Ingredient view) and folds the rest (Custom data, Advanced). View options float
over their view, most-used visible, the rest under "More". *Why:* NN/g progressive disclosure (§2.4); an ingredient has
~30 properties. *Shows:* screens 3-4; the glass toolbars.

**P7. Not yet possible says why, in place.** A command that cannot run stays visible, greyed, with its reason ("Point at
two ingredients", "Not built yet: sprite export"); no dialog. *Why:* 10 of 40 menu items open the same "Not yet
available" dialog today, which hides what exists and what does not. Prism `when`, Stories Untold (§2). *Shows:* the
menus, screen 7's greyed examples, screen 9.

**P8. Colour carries data; the accent carries the Focus.** Chrome is paper and ink; the one warm accent marks the Focus,
the focus ring and the primary action, nothing else; depth, ingredient and category colours are data, edged in ink; a
setting that is on is ink, not accent. Every interface pair is checked for contrast (WCAG 2.2). *Why:* the Recipe view is a field of blue-grey
depth colours: a warm accent stands out where a blue one would not, as legacy's yellow and orange selection did
(recipe-view.md §2.6). Stories Untold's one accent, Prism's accent rule (§2). *Shows:* every screen, light and dark.

## 5. Information architecture

### 5.1 The regions

| Region | Job | Contents |
| --- | --- | --- |
| Top bar | where you are, everything reachable | brand; menus Recipe, Edit, View, Structure, Help (from the commands); the recipe's name, unsaved dot, size and file; ⌘K search; theme; help |
| Column (left, 260 px) | the recipe as a document | tabs Recipe and Interactions; a filter field; chips All, Needs attention *n*, Surface, Interior, Fibers; the outline: compartments (reading face, depth swatch), their surface and interior groups, ingredients (swatch, name, count, problem dot) |
| Stage (centre) | one or two views of the recipe | tabs Recipe view, Table, Ingredient, Scene; ⇧-click a second tab to split, one over the other or side by side; each view's options float over it (glass, Prism) |
| Inspector (right, 340 px) | the Focus, edited | header (kind, name, breadcrumb to its compartments), problems with fixes, folding sections; for a card (Find a structure), the card in its place |
| Status bar | the Focus and what happened | Focus pills with ×, Clear; the latest message; ⌘K |

Pages (Open a recipe, Settings, Help) cover the stage, as Prism's pages; Esc goes back. The palette is modal over the
whole shell.

### 5.2 Objects: where each is seen, pointed at, edited

| Object | Seen | Pointed at (into the Focus) | Edited |
| --- | --- | --- | --- |
| Recipe (root) | top bar; outline root; Recipe view background and label | outline root, empty Recipe view | inspector (nothing in Focus shows the recipe): name, format, totals |
| Compartment | outline (reading face); Recipe view disk with circular label; Scene view | outline, Recipe view disk, Table group row | inspector: contents, geometry (type, thickness, radius), appearance; Edit layout to move and reparent |
| Ingredient | outline; Recipe view circle (surface ones on the membrane, with the membrane mark); Table row; Ingredient view; Scene view instances | any of those; ⌘K by name, PDB, UniProt | inspector sections: Amount, Structure, Placement, Beads and levels of detail, Appearance, Interactions, Custom data, Advanced; Table cells for bulk edits |
| Interaction | column Interactions tab; a line between two circles in the Recipe view | the tab's row, the line | inspector: partners, PDB, selections; added by pointing at two ingredients, Edit › Add interaction |
| Residues of a structure | Ingredient view; the sequence band | the 3D view, the band | the inspector's Structure and Placement sections act on them (chains, membrane-facing residues) |
| Problem | dot in outline and Table; inspector list; status count | "Needs attention" filter; Focus › Go to the next problem | its fix (Find…, Set, Orient…) |

### 5.3 The Focus

- A short ordered list of recipe objects (and, in the Ingredient view, Mol\*'s residue selection). Held once; every
  view reads it. Not saved with the recipe; kept with the URL so a link opens on the same object (open item).
- Click points at one; ⇧, ⌘ or Ctrl toggles one in or out; each pill's × removes it; Esc (outside a field) clears.
- Names are not unique (HIV has four ingredient names twice, one in each of two compartments). A pill, a status
  message and a Go-to row show the name alone when it is unique in the recipe and "name · compartment" when another
  ingredient has it; the Go-to row also says "side of compartment" in every case. A link or recipe file that names
  an ingredient by name alone opens the first match and says so.
- Hover is not the Focus: hovering a row lights the circle (and back) without changing the inspector.
- The inspector shows the Focus: one object, its sections; several, what they share ("Together") and the actions for
  several (Add interaction with two ingredients, Delete). Nothing: the recipe.
- Every view keeps the Focus visible: soft accent fill and accent ring in the Recipe view (the ring alone fails 3:1 over
  light depth colours, §6.7), soft accent row with an accent edge in the Table and outline, the rest faded in the Scene
  view.

### 5.4 Commands, menus, keys

- The registry (`web/design/mockups/mock.js` `C`): about 60 commands in six categories, Recipe, Edit, View, Focus,
  Structure, Help. Each: id, title, category, key, `when` (true, or the reason it cannot run), and what it opens.
- **Menus** are the categories, built from the registry: Recipe (new, open, append, examples, import, export, with an
  LLM), Edit, View (stage views, arrangements, panels, Focus), Structure, Help. The top bar's menus replace Load, Save,
  Workspace, Layout Options and Skills (§7).
- **⌘K** (and ⇧⌘P) opens the palette anywhere: recent commands, then matches by category, then "Go to" ingredients
  matched by name, PDB or UniProt; rows show the key or the reason they cannot run. Commands act on the Focus.
- **Context menu**: a right-click in any view or on any row opens the Focus-able commands for what is under the pointer
  (its name as the header: Rename, Set colour, Delete, Find a structure, Open in 3D, Add interaction), from the
  registry, as Stories Untold's stage menu.
- **Keys** (proposed): 1-4 stage views, ⌘K palette, ⌘O open, ⌘S / ⇧⌘S export, ⌘F find a structure, E edit layout, F
  frame the Focus, ⌥↑ parent compartment, ⌘' next problem, F2 rename, ⌫ delete, Esc innermost first (palette, menu,
  card, then the Focus), ? shortcuts.
- **Single-key shortcuts** (1-4, A, E, F, ?) follow WCAG 2.1.4 (Level A, "Character Key Shortcuts"): they fire only
  with no modifier and not while a field, select or text area has the keyboard, and Settings › Keyboard turns them
  off or remaps each one. Modified keys (⌘K, ⌘S, F2, ⌥↑) are not affected. Mockups only draw the keys; the one live
  key, H on screen 1, follows the same rule.
- **Arrangements** replace the presets: Overview (Recipe view beside the Ingredient view; was Default), Build (Recipe view
  over the Table; was Recipe creation), Curate (Table beside the Ingredient view; was Recipe curation). An arrangement
  sets the stage only; the column and inspector are always there (P3).

### 5.5 Cards and pages

- **Find a structure** (screen 6) is a card in the inspector's place for the ingredient in the Focus: one query, PDB,
  UniProt and AlphaFold results in one list with tabs to narrow, filters (by name, sequence, UniProt, organism), hover to
  preview in the Ingredient view, Use to write it (one undo step). It replaces the PDB and UniProt search tables, which
  applied to a selection made elsewhere.
- **Open a recipe** (screen 7) is a page over the stage with every way in: examples (cards with real sizes; the ones not
  built greyed with why), a file (drop or choose; CSV leads to column mapping), a link (`?recipe=`), an LLM (three
  steps: copy the skill, ask, paste the JSON, validated before it opens); a switch "Open as a new recipe / Append into
  …" (append leads to the Column merging step); and the imports into this recipe (colour palette, counts and
  molarities; colour mapping and data directory greyed with why).
- **First run** (screen 8): the same ways in, under "What will you pack?", no empty panels.

### 5.6 States

- **Empty**: first run (screen 8); an empty compartment shows "Add an ingredient" in its inspector; an empty view says
  what would fill it ("Point at an ingredient to see it in 3D").
- **Loading**: a task line in the status bar with progress and cancel (Prism's status column); the stage keeps the last
  state until the new one is ready.
- **Error**: in the status bar, kept until dismissed, with a link to the detail; a recipe that fails to parse says where
  and why on the Open page.
- **Not built / cannot run**: greyed with the reason (P7).
- **Unsaved**: a muted ink dot beside the recipe's name; leaving asks once.

## 6. The design system

The tokens are `web/design/mockups/tokens.css`: the next version of `web/src/styles/theme.css`, keeping its names where
the role is the same. Values: Stories Untold's paper-and-ink palette; structure after Prism's (§2.2).

### 6.1 Interface colour

| Token | Light | Dark | Role | Was (`theme.css`) |
| --- | --- | --- | --- | --- |
| `--color-bg` | `#f8f6f1` | `#1a1917` | paper: column, inspector, bars | `--color-bg` `#ffffff` / `#1c1f24` |
| `--color-bg-canvas` | `#ebe8e1` | `#22211e` | the stage behind 3D views | `--color-bg-canvas`, `--color-molstar-canvas-bg` |
| `--color-bg-subtle` | `#f0ede6` | `#2a2925` | hover, search field | `--color-bg-subtle` |
| `--color-bg-muted` | `#e6e2d9` | `#33312c` | pressed, a setting that is on | `--color-bg-muted` |
| `--color-raised` | `#ffffff` | `#26241f` | fields, cards, menus | `--color-control-bg` |
| `--color-border` | `#dcd8cf` | `#36342f` | hairlines | `--color-border` |
| `--color-border-strong`, `--color-field-edge` | `#8a867e` | `#7a766e` | field and control edges (3:1): inputs, selects, chips, buttons | `--color-border-strong` |
| `--color-text` | `#1c1b19` | `#efece6` | ink | `--color-text` |
| `--color-text-muted` | `#5f5c56` | `#b3aea4` | labels, secondary | `--color-text-muted` |
| `--color-text-subtle` | `#6a665f` | `#9a958b` | hints, disabled reasons | new |
| `--color-accent` | `#b93e19` | `#f0703f` | the Focus, focus ring, primary action | `--color-accent` `#2f6fed` / `#5b8dfb` |
| `--color-accent-soft` | `#f9ebe4` | `#3a2219` | the Focus's fill | `--color-accent-soft` |
| `--color-accent-text` | `#ffffff` | `#1a1917` | text on the accent | `--color-accent-text` |
| `--color-select`, `-soft` | = accent, accent-soft | | the Focus in views | new (named for the role) |
| `--color-danger`, `-warning`, `-success`, `-info` | `#b3261e` `#87590a` `#2f7d4f` `#3c6fb0` | `#f28b82` `#e0b35a` `#6fbf8e` `#82aee6` | status, also text | `--color-danger` (others new) |
| `--color-recipe-canvas-bg` | `#e1e1e1` | `#1f1e1b` | the Recipe view background (legacy root colour; dark: the theme's, recipe-view.md §10.3) | same name |
| `--color-scrim`, `--color-glass` | | | behind modals; what floats over a view | `--color-overlay` |

Kept: `--color-recipe-label-halo` (paper; labels from depth 5 need it, §6.2). Dropped: `--color-surface-strong(-hover)`
(a dark menu bar; the new top bar is paper), `--color-focus-ring-inverse` (one ring colour passes on every
surface, checked).

### 6.2 Data colour

- **Depth** (`--color-depth-0..6`, 7 clamps): legacy's `color(depth)`, an HCL ramp from `hsl(360,100%,100%)` at depth
  -1 to `hsl(228,30%,40%)` at 6 (`js/main.js:156-159`), taken from the legacy oracle
  (`recipe-view-oracle/hiv.json` on lane `recipe-view-canvas`: `#dce8e4` `#b8d1cf` `#95b9bf` `#75a1b2` `#5b88a6`
  `#4c6e97`), so the Recipe view keeps its teal-grey look (recipe-view.md §2.4, §6.3); recomputing it with d3 v7
  gives lavender, not legacy's colours. Legacy's black labels fail 4.5:1 from depth 5 (3.27:1): they take a paper
  halo. In dark, a ramp from the canvas to a light slate (proposal, §8 D10).
- **Categories** (`--data-cat-1..8`): Okabe–Ito, in order (as Mol\*'s `lists.ts:292`): group by, colour by a category,
  one colour per ingredient in the Scene view. Okabe–Ito's vermilion is near the accent: in a view the Focus is never
  shown by colour alone (ring, soft fill, the rest faded, the pill). Past 8 categories, colour by compartment and vary
  lightness, and rely on the legend and hover for identity.
  Several Okabe–Ito colours are under 3:1 on the paper and the stage (yellow 1.08:1): every data mark (a Scene view
  instance, a sequence feature, a swatch) takes a thin ink edge, which meets 3:1 on every surface (WCAG 1.4.11);
  the data colours themselves are not required to.
- **Ingredient colour**: the recipe's own (`color`), shown as is; when absent, the depth colour (as legacy for a null
  colour, recipe-view.md §10.8).
- **Sequences and continuous properties**: a two-colour ramp chosen per property (legacy's Min/Max colour inputs);
  colour mapping by property is not built (§9).
- **Membrane faces** in the Ingredient view: outer red, inner blue, as Stories Untold.

### 6.3 Type

Serif (`Iowan Old Style`, `Charter`, Georgia) for names one reads: the recipe, compartments, headings, cards; sans
(system) for the interface; mono for ids and numbers (PDB, UniProt, gene ids, counts). Sizes 11 / 12 / 13 / 16 / 22 px;
panel text 12 px (Prism). The Recipe view keeps legacy's faces: compartment names in a condensed sans on the circle
(legacy used Oswald, which the mockups do not load: system fallback `Avenir Next Condensed`, `Arial Narrow`), the root
and ingredient labels in Georgia (recipe-view.md §2.7). No web fonts.

### 6.4 Space, size, density

Spacing 2 / 4 / 8 / 12 / 16 / 24 px (Prism). Controls 24 / 28 px; rows 28 px (outline, inspector) and 24 px compact
(the Table, which holds 180 rows for Mpn); targets at least 24 px. Column 260 px, inspector 340 px (Prism's right panel
default is 340, `shell.md`), both resizable. Radii 2 / 4 / 8: 8 for what floats (cards, glass), 4 for controls.

### 6.5 Components

From `web/src/components/ui/` (Radix Themes), extended: Button (primary, default, link), Switch, Slider, segmented
control, select, text and number field, vector field (three numbers), chip (filter, toggle), pill (a Focus item, with
×), tabs, folding section, tree row, table (sticky header, compact rows, problem column), glass toolbar with menus,
legend, card, page, palette, dropdown menu, problem row (dot, text, fix). Each is drawn in `mock.css`; a principle that a
component embodies is named in its comment.

### 6.6 Motion

Hover instant; reveals 100-200 ms; nothing under `prefers-reduced-motion` (Prism, Stories Untold). The Recipe view's
simulation is its own (recipe-view.md §3) and rests when idle (§10.4).

### 6.7 Accessibility

- **Contrast, checked.** The pairs in `tokens.css` (`contrast-pairs`: text, muted and subtle text on every surface;
  accent and status colours as text; the accent on its soft fill; field edges and the focus ring at 3:1; the Recipe
  view's ink on depth colours) are measured by `check.mjs` in both themes: all pass. One finding shaped the design: the
  accent ring alone over the depth colours falls to 2.65:1 at depth 2 (the colour of HIV's ingredients) and lower
  deeper, so a Focus circle takes the soft accent fill
  as well, as legacy filled yellow (recipe-view.md §2.6).
- **Keyboard.** Every region reachable; the outline is an ARIA tree, the Table an ARIA grid, the palette a combobox with
  a listbox; Esc closes the innermost thing; focus visible as a 2 px accent ring.
- **Targets** at least 24 px (chips, pills' ×, tree rows, table rows).
- **Not by colour alone.** Problems have a dot and text; the Focus has a ring and a pill; a disabled command has a
  reason.
- **The canvas has words.** Views carry an `aria-label`; the status bar says what changed.

## 7. Coverage

Every menu leaf (`menuConfig.ts`, as path) and every panel (`Workspace.tsx`, as `Panel › title`) → where it lives. The
first cell is checked by `check.mjs` against the code; "command" is the registry id in `mock.js`.

| Today | New home | Command | Note |
| --- | --- | --- | --- |
| Load › New Recipe › Empty Recipe | Recipe › New empty recipe; first run "New empty recipe" | `recipe.new` | |
| Load › New Recipe › From File (.json, _serialized.json, .xlsx, .csv, .zip) | Open page › From a file (drop or choose) | `recipe.open` | .xlsx, .zip greyed with why (not built) |
| Load › New Recipe › From Examples › HIV mature | Open page and first run › Examples card; Recipe › Examples | `recipe.example` | |
| Load › New Recipe › From Examples › HIV immature | Examples card | `recipe.example` | |
| Load › New Recipe › From Examples › HIV mature and Blood plasma | Examples card | `recipe.example` | |
| Load › New Recipe › From Examples › HIV immature and Blood plasma | Examples card | `recipe.example` | |
| Load › New Recipe › From Examples › Influenza envelope | Examples card | `recipe.example` | |
| Load › New Recipe › From Examples › Influenza complete | Examples card | `recipe.example` | |
| Load › New Recipe › From Examples › Exosome | Examples card | `recipe.example` | |
| Load › New Recipe › From Examples › Mycoplasma Genitalium auto | Examples card, greyed: ".zip import; MG_*.zip is not in data/" | `recipe.example` | placeholder today; stays visible with why |
| Load › New Recipe › From Examples › Mycoplasma Genitalium curated | same card as auto | `recipe.example` | |
| Load › New Recipe › From YASARA Petworld › Sars-cov-2 mature | Examples card "YASARA PetWorld", greyed: "whole-model loading in the Scene view" | `recipe.example` | one card for the four |
| Load › New Recipe › From YASARA Petworld › HIV | same card | `recipe.example` | |
| Load › New Recipe › From YASARA Petworld › Synapse vesicle | same card | `recipe.example` | |
| Load › New Recipe › From YASARA Petworld › PreSynapse | same card | `recipe.example` | |
| Load › Append From › Examples › HIV and Blood Plasma | Open page, "Append into …" switch, Examples | `recipe.append` | |
| Load › Append From › Examples › Blood Plasma | same | `recipe.append` | |
| Load › Append From › Examples › Mycoplasma Pneumonia | same | `recipe.append` | |
| Load › Append From › Examples › Exosome | same | `recipe.append` | today it replaces instead of merging (legacy quirk); proposed: it appends (§8 D7) |
| Load › Append From › File (.json, _serialized.json) | Open page, "Append into …", From a file | `recipe.append` | then Column merging, as today |
| Load › Colors › Load Color palette (Ingredient-Colors) | Recipe › Import a colour palette…; Open page › Into this recipe | `recipe.importPalette` | |
| Load › Colors › Load Color Mapping (Properties-Colors) | Recipe › Import a colour mapping…, greyed: "colouring by property" | `recipe.importMapping` | placeholder today |
| Load › Load Molarity/Count | Recipe › Import counts and molarities… | `recipe.importMolarity` | |
| Load › Setup Data Directory (PDB, geoms) | Recipe › Set the data directory…, greyed: "a local data server"; offered beside a structure file ("Use a local copy…") | `recipe.dataDirectory` | placeholder today |
| Save › cellPACK/cellPAINT recipe | Recipe › Export for cellPACK / cellPAINT (.json), ⌘S | `recipe.export.cellpack` | "Save" becomes "Export": the app holds the recipe; files are exports |
| Save › cellPACK-gpu recipe | Recipe › Export for cellPACK-gpu, ⇧⌘S | `recipe.export.gpu` | |
| Save › cellPAINT recipe and sprites (.zip) | Recipe › Export for cellPAINT with sprites, greyed: "sprite export" | `recipe.export.paintZip` | placeholder today |
| Save › Spreadsheet CSV | Recipe › Export as a spreadsheet (.csv) | `recipe.export.csv` | |
| Save › Color palette | Recipe › Export the colour palette | `recipe.export.palette` | |
| Save › Color mapping | Recipe › Export the colour mapping, greyed | `recipe.export.mapping` | placeholder today |
| Save › Molarity/Count | Recipe › Export counts and molarities | `recipe.export.molarity` | |
| Workspace › Default | View › Arrangement: Overview | `view.arrangement` | screen 1 |
| Workspace › Recipe creation | View › Arrangement: Build | `view.arrangement` | screen 2 |
| Workspace › Recipe curation | View › Arrangement: Curate | `view.arrangement` | screen 3 |
| Layout Options › Show Sequence Feature | the sequence band over the Ingredient view; View › Show sequence features | `view.sequence` | appears when an ingredient with a UniProt id is in Focus |
| Layout Options › Show Objects Properties | the inspector, always there | — | P2 |
| Layout Options › Show Interaction Table | the column's Interactions tab; View › Show interactions | `view.interactions` | |
| Layout Options › Show Search Table | Find a structure card (inspector's place), ⌘F | `structure.find` | |
| Skills › Copy LLM Recipe Skill | Recipe › With an LLM › Copy the skill; Open page step 1 | `llm.copySkill` | the disclaimer stays, inline in the step |
| Skills › Open SKILLS.md | Recipe › With an LLM › Open SKILLS.md; Open page step 1 | `llm.openSkills` | |
| Panel › Recipe View | stage view "Recipe view" | `view.recipe` | legacy look kept (recipe-view.md) |
| Panel › Recipe Options | the Recipe view's glass toolbar (Colour, Size, Label, Group, Edit, Interaction, More: forces, stroke, sprites, legend) | `edit.layout` and the toolbar | |
| Panel › Ingredient View | stage view "Ingredient" | `view.ingredient` | Mol\* v6 |
| Panel › Ingredient Options | inspector sections Structure, Placement, Beads and levels of detail, Appearance; the Ingredient view's toolbar (representation, colour, chains) | `structure.*` | |
| Panel › Mol-* | stage view "Scene" (whole packed model) | `view.scene` | today it shows the selected ingredient's PDB; the Ingredient view does that |
| Panel › Recipe table | stage view "Table" | `view.table` | |
| Panel › Table Options | the Table's header (columns, sort, density) | — | a stub today |
| Panel › Object Properties | the inspector | — | a stub today; P2 |
| Panel › Sequence features | the sequence band over the Ingredient view | `view.sequence` | |
| Panel › Topology | a "Topology" fold of the sequence band | — | a stub today; open (§9) |
| Panel › Uniprot mapping | a "UniProt mapping" fold of the sequence band | — | a stub today; open (§9) |
| Panel › Interaction table | the column's Interactions tab | `view.interactions` | |
| Panel › Uniprot search table | Find a structure card, UniProt tab | `structure.find` | |
| Panel › PDB search table | Find a structure card, PDB tab | `structure.find` | |

### 7.2 Controls (checked by the reviewer, not the script)

| Today (file) | Control | New home |
| --- | --- | --- |
| `RecipeCanvasToolbar.tsx` | Edit Mode switch | Recipe view toolbar "Edit"; Edit › Edit layout (E) |
| | Add ingredient, Add compartment | inspector of a compartment; Edit menu; the "+" in an outline group (open) |
| | Add interaction (2 selected) | Recipe view toolbar "Interaction"; inspector "Together"; Edit menu |
| | Group by | toolbar "Group" menu |
| | Node color (15 modes + properties), Min/Max colour, Apply to ingredient color, Use color linear mapping | toolbar "Colour" menu (modes; the min/max ramp and Apply in it) |
| | Node size, Scale radius by | toolbar "Size" menu |
| | Node label | toolbar "Label" menu |
| | Node image (sprites), Show legend, Stroke line width | toolbar "More" |
| | Forces (Parent, Surface, Link, Cluster, Collision) | toolbar "More" › Forces |
| `RecipeCanvas.tsx` | context menu: Rename, Delete, Colour; zoom, pan, drag, drag to reparent, Ctrl+click multi | the context menu, from the registry, in every view (§5.4); Edit menu and inspector (Rename F2, Delete ⌫, Set colour); the same gestures; ⇧/⌘/Ctrl-click adds to the Focus |
| `IngredientOptions.tsx` | Representation, Colour | Ingredient view toolbar |
| | chain checkboxes | Ingredient view toolbar "Chains" |
| | Membrane orientation (axis, offset, reset) | inspector Placement (principal axis, offset, Orient from OPM, drag in 3D) |
| | Fiber orientation (axis, length, offset, preview copies, twist, build from chains, reset) | inspector Placement (fiber), Structure › Build a fiber from chains |
| | Clustering / LOD (level, beads, auto, overwrite radius, colour by, level toggles) | inspector Beads and levels of detail |
| | Sprite (capture, 2D scale, membrane Y offset, fiber length) | inspector Appearance › Sprite; Structure › Capture the sprite |
| `RecipeTable.tsx` | Name, Compartment, Location, Count, Molarity, PDB, Type cells; Delete | Table (adds MW, UniProt, Beads, a problem column); Delete in Edit and inspector |
| `InteractionTable.tsx` | Source, Target, Name 1/2, PDB, Selection 1/2, Delete | Interactions tab; the interaction's inspector |
| `PdbSearchPanel.tsx` | by name / by sequence, query, Search, Apply | Find a structure: query, "by name / by sequence" chips, Use |
| `UniprotSearchPanel.tsx` | query, Search, Apply (accession, label) | Find a structure, UniProt tab, Use |
| `ColumnMappingDialog.tsx` | one select per field | kept: the step after choosing a CSV on the Open page |
| `MergeDialog.tsx` | fields to merge, create new ingredients | kept: the step after "Append into …" |
| `MenuBar.tsx` | theme toggle | top bar ☾/☀; View › Switch theme |
| `SkillMenu.tsx` | safety confirm, copy alert | inline in the LLM steps (no native dialogs) |

### 7.3 Legacy features not in today's menus (from parity.md and index.html)

| Legacy | New home |
| --- | --- |
| URL `?recipe=`, `?recipe_url=`, `?recipe_json=`, `?recipe_format=` (parity §1, missing) | Open page › From a link; every loaded recipe gets a shareable link |
| Whole packed model, per-ingredient colour, highlight sync (`MS_LoadModel`, parity §5) | Scene view (screen 5) |
| Help, FAQ, About, Contact, Settings (parity §6, missing) | Help menu; Settings page |
| Grid context menu "Search PDB using name / label / uniprot / alphafold" (`index.html:483-489`) | Find a structure, with its filter chips |
| Node "resize" (`index.html:671-676`) | inspector Appearance (open) |
| Spreadsheet XL export (commented out) | not proposed |

## 8. Decisions for Ludovic

Each is a proposal; confirm or reject.

- **D1. "Untold story" = Stories Untold** (per Ludovic, 2026-11-04), primary with Prism; MolViewStories secondary.
- **D2. The Focus** (Stories Untold's term) is the one selection, a list, shared by every view, with pills. Today's
  `recipeStore.selectedNode` (one node) and the Recipe view's `nodes_selections` (Ctrl+click) merge into it.
- **D3. Fixed regions instead of free docking** (P3): column, stage (one or two views), inspector; arrangements set the
  stage. Dockview's free drag-and-drop goes; View › Reset layout stays.
- **D4. Inspector replaces Ingredient Options, Object Properties and Table Options**; view options float over their
  view.
- **D5. A warm accent** (`#b93e19` / `#f0703f`, Stories Untold's) replaces today's blue, and marks the Focus in every
  view, including the Recipe view, where the Focus is the soft accent fill with the accent ring instead of legacy's
  yellow fill and orange stroke (the same idea, one colour). The lane porting the Recipe view keeps legacy's colours
  until this is decided.
- **D6. Paper and ink** (warm off-white, serif names) instead of today's white and grey.
- **D7. Append › Exosome appends.** Today it replaces the recipe, a legacy quirk kept on purpose
  (`menuConfig.ts:124-127`); in the new design it is one more example to append, as its menu says.
- **D8. "Save" becomes "Export"**, and placeholders become greyed commands with a reason (P7).
- **D9. One Find-a-structure card** for PDB, UniProt and AlphaFold instead of two search tables.
- **D10. Dark Recipe view ramp**: the depth ramp runs from the canvas toward a light slate in dark, a proposal beside
  recipe-view.md §10.3 (which fixes only the background).

## 9. Open, and constraints

- **Mol\* instances.** Today two Mol\* instances are kept mounted because hiding a dockview tab unmounts it
  (`Workspace.tsx` docstring). This design switches stage views by tab: it requires that a hidden 3D view stays mounted,
  inert and paused (Prism: "Hidden UI is inert", `styling.md`), or that one Mol\* v6 instance serves both the
  Ingredient and the Scene view. To decide in the Mol\* v6 spike lane.
- **An agent.** Stories Untold sends the Focus with every prompt to an agent. Mesoscope's LLM path today is Skills (copy,
  ask elsewhere, paste). The Focus and the command registry are what an in-app agent would need; not proposed here.
- **Undo.** Proposed (Edit › Undo); the modern app has none today.
- **Topology and UniProt mapping** (PDB Component Library): their place is a fold of the sequence band; their content
  is not designed.
- **Colour mapping by property**, **.xlsx / .zip import**, **sprite export**, **data directory**: not built; shown
  greyed.
- **Compact mode** (phones, narrow windows): not designed; Prism's bottom sheet is the reference.
- **The Focus in the URL** (open a link on an ingredient): proposed, not designed.

## 10. Mockups

`web/design/mockups/` (open `index.html`; `?theme=dark` for dark):

| Screen | File | Shows |
| --- | --- | --- |
| Index | `index.html` | all screens, light and dark |
| 1 Shell | `01-shell.html` | the regions, annotated (H hides the labels); Overview arrangement, HIV |
| 2 Build | `02-build.html` | HIV, Recipe view over the Table, two ingredients in the Focus, Edit layout on |
| 3 Curate | `03-curate.html` | Mpn, 180 ingredients, the Table beside the Ingredient view, "Needs attention" |
| 4 Ingredient | `04-ingredient.html` | HIV Env on its membrane, Placement and Beads open |
| 5 Scene | `05-scene.html` | the packed HIV model, the capsid in the Focus |
| 6 Find a structure | `06-structure.html` | the card for mpn665: PDB, UniProt, AlphaFold |
| 7 Open and import | `07-open.html` | every way in; `?append=1` for append |
| 8 First run | `08-first-run.html` | no recipe yet |
| 9 Commands | `09-palette.html` | ⌘K with "export" typed |

Also live on screens 1-3: the column's Interactions tab (empty for HIV, which has none: the empty state names the way
in) and the context menu (right-click an outline row, a Recipe view circle or a Table row).

Shared: `tokens.css` (§6), `mock.css`, `mock.js` (the command registry, the Focus, the views), `shared-pages.js`,
`sample-data.js` (generated by `tools/make-sample-data.mjs` from `data/HIV_serialized.json` and `data/Mpn_1.0_2.json`;
the Recipe view layout is a d3 pack approximating legacy, not legacy's algorithm). The 3D views are drawn in SVG (HIV's
real level-0 beads; the Scene view is an illustration); the app would use Mol\* v6.

`check.mjs` (from `web/`: `node design/mockups/check.mjs`) opens every page from `file://` in Chromium at 1440×900 in
both themes and fails on a console error, a page error, any request that is not `file:`/`data:`, or a wrong
`data-theme`; it saves the screenshots; it checks that every menu path and panel title in the code has a row in §7; and
it measures the contrast pairs in `tokens.css`.
