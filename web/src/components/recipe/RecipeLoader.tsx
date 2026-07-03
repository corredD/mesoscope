import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { readFileAsText } from '../../domain/files/loadFile'
import { guessAllColumns, type ColumnMapping } from '../../domain/files/columnMapping'
import { buildRecipeFromCsvRows, parseCsvText } from '../../domain/files/parseCsvRecipe'
import { defaultMergeFieldFlags } from '../../domain/recipe/mergeRecipe'
import { parseLegacyRecipe } from '../../domain/recipe/parseLegacyRecipe'
import { validateRecipeJson } from '../../domain/recipe/validateRecipe'
import { useRecipeStore } from '../../state/recipeStore'
import { ColumnMappingDialog } from './ColumnMappingDialog'
import { MergeDialog } from './MergeDialog'
import type { ColorPalette } from '../../domain/colors/colorPalette'
import type { RecipeGraph } from '../../domain/recipe/types'
import type { MolarityCountEntry } from '../../domain/recipe/serializeRecipe'

export interface RecipeLoaderHandle {
  /** Load > New Recipe > From File. Legacy accepts .json/_serialized.json/.xlsx/.csv/.zip
   *  (js/main.js `#jsfile_input`); .xlsx/.zip are still deferred — see
   *  web/README-modernization.md — but .csv now goes through the column mapping dialog below. */
  pickRecipeFile: () => void
  /** Load > Colors > Load Color palette (Ingredient-Colors). */
  pickColorPaletteFile: () => void
  /** Load > Load Molarity/Count. */
  pickMolarityFile: () => void
  /** Load > Append From > Examples > <recipe>. Fetches and parses `url`, then opens MergeDialog. */
  mergeFromUrl: (url: string) => Promise<void>
  /** Load > Append From > File. JSON only for now — see MergeDialog/mergeRecipe.ts docstrings. */
  pickMergeFile: () => void
}

async function fetchAndParseRecipe(url: string): Promise<RecipeGraph> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const json = await response.json()
  const validation = validateRecipeJson(json)
  if (!validation.ok) throw new Error(validation.errors.join(' '))
  return parseLegacyRecipe(json, validation.format)
}

async function readJsonFile(file: File): Promise<unknown> {
  const text = await readFileAsText(file)
  return JSON.parse(text)
}

const UNSUPPORTED_RECIPE_EXTENSIONS = ['.xlsx', '.zip']

/**
 * Owns the hidden file `<input>` elements for local-file loads — the
 * modern equivalent of legacy's `#jsfile_input`/`#colorpalette_input`/
 * `#molarity_input` (index.html), triggered imperatively by MenuBar.
 */
export const RecipeLoader = forwardRef<RecipeLoaderHandle>((_props, ref) => {
  const recipeInputRef = useRef<HTMLInputElement>(null)
  const paletteInputRef = useRef<HTMLInputElement>(null)
  const molarityInputRef = useRef<HTMLInputElement>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const loadFromJson = useRecipeStore((s) => s.loadFromJson)
  const loadParsedGraph = useRecipeStore((s) => s.loadParsedGraph)
  const applyColorPalette = useRecipeStore((s) => s.applyColorPalette)
  const applyMolarityCount = useRecipeStore((s) => s.applyMolarityCount)
  const mergeGraph = useRecipeStore((s) => s.mergeGraph)
  const setError = useRecipeStore((s) => s.setError)

  const [csvPending, setCsvPending] = useState<{
    headers: string[]
    rows: string[][]
    initialMapping: ColumnMapping
  } | null>(null)
  const [mergePending, setMergePending] = useState<{ incoming: RecipeGraph; name: string } | null>(null)

  useImperativeHandle(ref, () => ({
    pickRecipeFile: () => recipeInputRef.current?.click(),
    pickColorPaletteFile: () => paletteInputRef.current?.click(),
    pickMolarityFile: () => molarityInputRef.current?.click(),
    mergeFromUrl: async (url) => {
      try {
        const incoming = await fetchAndParseRecipe(url)
        setMergePending({ incoming, name: incoming.nodes[0]?.data.name ?? url })
      } catch (err) {
        setError(`Unable to load "${url}" to merge: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    pickMergeFile: () => mergeInputRef.current?.click(),
  }))

  const handleMergeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.zip')) {
      setError(
        `"${file.name}": merging from .csv/.xlsx/.zip isn't wired up yet (the column-mapping step for merges isn't built — see web/README-modernization.md). Use a .json or _serialized.json file.`,
      )
      return
    }
    try {
      const json = await readJsonFile(file)
      const validation = validateRecipeJson(json)
      if (!validation.ok) throw new Error(validation.errors.join(' '))
      const incoming = parseLegacyRecipe(json, validation.format)
      setMergePending({ incoming, name: incoming.nodes[0]?.data.name ?? file.name })
    } catch (err) {
      setError(`Unable to load "${file.name}" to merge: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleRecipeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const lowerName = file.name.toLowerCase()
    if (UNSUPPORTED_RECIPE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      setError(
        `"${file.name}": .xlsx/.zip recipe import isn't wired up yet (needs a spreadsheet parser / zip import — see the migration plan's Phase 4). Use a .json, _serialized.json, or .csv file.`,
      )
      return
    }
    if (lowerName.endsWith('.csv')) {
      try {
        const { headers, rows } = parseCsvText(await readFileAsText(file))
        setCsvPending({ headers, rows, initialMapping: guessAllColumns(headers) })
      } catch (err) {
        setError(`Unable to read "${file.name}": ${err instanceof Error ? err.message : String(err)}`)
      }
      return
    }
    try {
      loadFromJson(await readJsonFile(file))
    } catch (err) {
      setError(`Unable to load "${file.name}": ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handlePaletteFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      applyColorPalette(await readJsonFile(file) as ColorPalette)
    } catch (err) {
      setError(`Unable to load color palette "${file.name}": ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleMolarityFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      applyMolarityCount(await readJsonFile(file) as Record<string, MolarityCountEntry>)
    } catch (err) {
      setError(`Unable to load molarity/count "${file.name}": ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <>
      <input
        ref={recipeInputRef}
        type="file"
        accept=".json,.xlsx,.csv,.zip"
        style={{ display: 'none' }}
        onChange={handleRecipeFile}
        aria-label="Load recipe from file"
      />
      <input
        ref={paletteInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handlePaletteFile}
        aria-label="Load color palette"
      />
      <input
        ref={molarityInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleMolarityFile}
        aria-label="Load molarity/count"
      />
      <input
        ref={mergeInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleMergeFile}
        aria-label="Merge recipe from file"
      />
      {csvPending && (
        <ColumnMappingDialog
          headers={csvPending.headers}
          initialMapping={csvPending.initialMapping}
          onCancel={() => setCsvPending(null)}
          onConfirm={(mapping) => {
            loadParsedGraph(buildRecipeFromCsvRows(csvPending.headers, csvPending.rows, mapping), 'classic')
            setCsvPending(null)
          }}
        />
      )}
      {mergePending && (
        <MergeDialog
          incomingName={mergePending.name}
          initialFlags={defaultMergeFieldFlags()}
          onCancel={() => setMergePending(null)}
          onConfirm={(options) => {
            mergeGraph(mergePending.incoming, options)
            setMergePending(null)
          }}
        />
      )}
    </>
  )
})
RecipeLoader.displayName = 'RecipeLoader'
