/**
 * Menu structure, labels, and grouping ported 1:1 from the legacy menu bar
 * (index.html + handlers in js/main.js/query_helper.js/cp_serialized.js —
 * see the migration plan's audit section for the full file:line inventory).
 *
 * Phase 4 wire/defer split (see web/README-modernization.md for the full
 * rationale): items are real (`load-*`/`save-*`/`pick-*`/`merge-*`) when
 * Phase 2/4's domain layer fully supports them against data that exists in
 * this repo; everything else — YASARA + Mycoplasma-auto/curated (zip
 * import, and those files aren't even in the repo), Setup Data Directory,
 * .xlsx/.zip recipe import (merge or otherwise), cellPAINT sprites zip
 * export, and Color Mapping (needs the still-unbuilt canvas
 * coloring-by-property feature) — stays `{ kind: 'placeholder' }` and opens
 * the "not yet available" dialog. Layout Options items are real from Phase 3.
 */
import type { LayoutToggle, LayoutVisibility } from '../../state/layoutStore'
import type { PresetId } from '../../state/presetStore'

export type MenuAction =
  | { kind: 'placeholder' }
  | { kind: 'toggle'; flag: LayoutToggle }
  | { kind: 'preset'; id: PresetId }
  | { kind: 'load-empty' }
  | { kind: 'load-example'; url: string }
  | { kind: 'merge-example'; url: string }
  | { kind: 'pick-recipe-file' }
  | { kind: 'pick-merge-file' }
  | { kind: 'copy-skill' }
  | { kind: 'open-skills-md' }
  | { kind: 'pick-color-palette-file' }
  | { kind: 'pick-molarity-file' }
  | { kind: 'save-classic' }
  | { kind: 'save-serialized' }
  | { kind: 'save-csv' }
  | { kind: 'save-color-palette' }
  | { kind: 'save-molarity' }

export interface MenuLeaf {
  kind: 'leaf'
  label: string | ((layout: LayoutVisibility, preset: PresetId) => string)
  action: MenuAction
}

export interface MenuBranch {
  kind: 'branch'
  label: string
  items: MenuNode[]
}

export type MenuNode = MenuLeaf | MenuBranch

export interface MenuGroup {
  label: string
  items: MenuNode[]
}

function leaf(label: string, action: MenuAction = { kind: 'placeholder' }): MenuLeaf {
  return { kind: 'leaf', label, action }
}

function toggleLeaf(flag: LayoutToggle, shownLabel: string, hiddenLabel: string): MenuLeaf {
  return {
    kind: 'leaf',
    label: (layout) => (layout[flag] ? hiddenLabel : shownLabel),
    action: { kind: 'toggle', flag },
  }
}

/** A workspace-preset menu item — label gets a "(current)" suffix while its preset is active. */
function presetLeaf(id: PresetId, label: string): MenuLeaf {
  return {
    kind: 'leaf',
    label: (_layout, preset) => (preset === id ? `${label} (current)` : label),
    action: { kind: 'preset', id },
  }
}

function branch(label: string, items: MenuNode[]): MenuBranch {
  return { kind: 'branch', label, items }
}

export const MENU: MenuGroup[] = [
  {
    label: 'Load',
    items: [
      branch('New Recipe', [
        leaf('Empty Recipe', { kind: 'load-empty' }),
        leaf('From File (.json, _serialized.json, .xlsx, .csv, .zip)', { kind: 'pick-recipe-file' }),
        branch('From Examples', [
          leaf('HIV mature', { kind: 'load-example', url: 'data/HIV_serialized.json' }),
          leaf('HIV immature', { kind: 'load-example', url: 'data/HIV_immature.json' }),
          leaf('HIV mature and Blood plasma', { kind: 'load-example', url: 'data/BloodPlasmaHIV_serialized.json' }),
          leaf('HIV immature and Blood plasma', { kind: 'load-example', url: 'data/HIV_immature_blood.json' }),
          leaf('Influenza envelope', { kind: 'load-example', url: 'data/InfluenzaA.json' }),
          leaf('Influenza complete', { kind: 'load-example', url: 'data/InfluenzaFull.json' }),
          leaf('Exosome', { kind: 'load-example', url: 'data/exosome_catalase.json' }),
          leaf('Mycoplasma Genitalium auto'), // data/MG_auto_149.zip — not in this repo; zip import also unbuilt
          leaf('Mycoplasma Genitalium curated'), // data/MG_curated_149.zip — same
        ]),
        branch('From YASARA Petworld', [
          leaf('Sars-cov-2 mature'), // Mol-star-only load; deferred with the Mol-star wrap
          leaf('HIV'),
          leaf('Synapse vesicle'),
          leaf('PreSynapse'),
        ]),
      ]),
      branch('Append From', [
        branch('Examples', [
          leaf('HIV and Blood Plasma', { kind: 'merge-example', url: 'data/BloodPlasmaHIV_serialized.json' }),
          leaf('Blood Plasma', { kind: 'merge-example', url: 'data/BloodPlasma_serialized.json' }),
          leaf('Mycoplasma Pneumonia', { kind: 'merge-example', url: 'data/Mpn_1.0_2.json' }),
          // Legacy quirk, replicated as-is (see web/README-modernization.md): this menu item calls
          // the plain, non-merge Exosome loader (LoadExampleExosome), not a merge — clicking it
          // under "Append From" discards the current recipe instead of merging into it.
          leaf('Exosome', { kind: 'load-example', url: 'data/exosome_catalase.json' }),
        ]),
        leaf('File (.json, _serialized.json)', { kind: 'pick-merge-file' }),
      ]),
      branch('Colors', [
        leaf('Load Color palette (Ingredient-Colors)', { kind: 'pick-color-palette-file' }),
        leaf('Load Color Mapping (Properties-Colors)'),
      ]),
      leaf('Load Molarity/Count', { kind: 'pick-molarity-file' }),
      leaf('Setup Data Directory (PDB, geoms)'),
    ],
  },
  {
    label: 'Save',
    items: [
      leaf('cellPACK/cellPAINT recipe', { kind: 'save-classic' }),
      leaf('cellPACK-gpu recipe', { kind: 'save-serialized' }),
      leaf('cellPAINT recipe and sprites (.zip)'),
      leaf('Spreadsheet CSV', { kind: 'save-csv' }),
      leaf('Color palette', { kind: 'save-color-palette' }),
      leaf('Color mapping'),
      leaf('Molarity/Count', { kind: 'save-molarity' }),
    ],
  },
  {
    // Task-oriented whole-arrangement switches, layered on top of "Layout Options" below
    // rather than replacing it (confirmed with the user) — a preset sets sensible defaults
    // for those 4 toggles as part of switching, but they stay manually adjustable afterward.
    // See Workspace.tsx's `WORKSPACE_PRESETS` for what each preset actually shows/hides.
    label: 'Workspace',
    items: [
      presetLeaf('default', 'Default (all panels)'),
      presetLeaf('recipeCreation', 'Recipe creation'),
      presetLeaf('recipeCuration', 'Recipe curation'),
    ],
  },
  {
    label: 'Layout Options',
    items: [
      toggleLeaf('sequenceFeatures', 'Show Sequence Feature', 'Hide Sequence Feature'),
      toggleLeaf('objectProperties', 'Show Objects Properties', 'Hide Objects Properties'),
      toggleLeaf('interactionTable', 'Show Interaction Table', 'Hide Interaction Table'),
      toggleLeaf('searchTable', 'Show Search Table', 'Hide Search Table'),
    ],
  },
  {
    label: 'Skills',
    items: [
      leaf('Copy LLM Recipe Skill', { kind: 'copy-skill' }),
      leaf('Open SKILLS.md', { kind: 'open-skills-md' }),
    ],
  },
]
