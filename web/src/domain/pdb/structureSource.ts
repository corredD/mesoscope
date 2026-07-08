/**
 * Resolves an ingredient's `source.pdb` field to something actually
 * fetchable, replacing the "isn't wired up yet" gate this module used to
 * export as `isLikelyRcsbId` (see git history / README's "Phase 4 progress:
 * viewer mount" section for that earlier, narrower cut).
 *
 * The real rule (confirmed with the user, matching legacy's
 * `NGL_getUrlStructure`/`LM_getUrlStructure`, js/ngl.js:4890-4959):
 *  - A `source.pdb` with a `.pdb`/`.cif`/`.mrc` extension is a **filename**,
 *    resolved from a local uploaded folder first (legacy `pathList_`, the
 *    Phase 4 item 8 "Setup Data Directory" feature — still a placeholder in
 *    this app, so not available yet) or otherwise the cellPACK_data GitHub
 *    repo (legacy `cellpack_repo+"other/"+pdbname`,
 *    `https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/`
 *    — confirmed live and CORS-open: `access-control-allow-origin: *`).
 *  - A `source.pdb` with no extension is an accession/ID code, fetched
 *    automatically from RCSB (legacy's bare-4-character-code branch).
 *
 * Only `.pdb`/`.cif`/`.mrc` are recognized extensions (per the user's
 * spec) — `.mrc` is a density/volume map, not a structure, so consumers
 * need to branch on `extension` to pick the right representation/parser
 * (isosurface vs cartoon). EMDB-id/AlphaFold-prefix special-casing that
 * legacy also has (js/ngl.js:4929,5014) is out of scope here — not part of
 * what was asked for, and not exercised by any local fixture.
 */

export type StructureExtension = 'pdb' | 'cif' | 'mrc'

export type StructureSource =
  | { kind: 'id'; id: string }
  | { kind: 'repo-file'; url: string; extension: StructureExtension }

const EXTENSION_RE = /\.(pdb|cif|mrc)$/i

const CELLPACK_REPO = 'https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/'

export function resolveStructureSource(pdb: string): StructureSource | null {
  if (!pdb) return null
  const match = EXTENSION_RE.exec(pdb)
  if (!match) return { kind: 'id', id: pdb }
  return {
    kind: 'repo-file',
    url: `${CELLPACK_REPO}other/${pdb}`,
    extension: match[1].toLowerCase() as StructureExtension,
  }
}

/**
 * Resolves an ingredient's sprite/thumbnail image to a fetchable URL — legacy's `getThumbnail`
 * (main.js:4308-4383): `sprite.image` (a filename) resolves from the same cellPACK_data repo as
 * `resolveStructureSource` (legacy `cellpack_repo+"images/"+filename`, confirmed live via a
 * real file in that repo, `images/Albumin_C.png`, 200 OK); if there's no `sprite.image`, legacy
 * falls back to a PDBe-generated chain-image thumbnail keyed by the ingredient's `source.pdb`
 * accession. Local-folder overrides (legacy's `pathList_` priority, checked first) aren't
 * available yet — same scope gap `resolveStructureSource` already discloses (Phase 4 item 8,
 * "Setup Data Directory" is still a placeholder).
 */
export function resolveSpriteImageUrl(spriteImage: string | null, pdb: string | undefined): string | null {
  if (spriteImage) return `${CELLPACK_REPO}images/${spriteImage}`
  if (pdb && !EXTENSION_RE.test(pdb)) return `https://www.ebi.ac.uk/pdbe/static/entry/${pdb.toLowerCase()}_deposited_chain_front_image-200x200.png`
  return null
}
