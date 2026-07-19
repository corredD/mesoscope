import { useEffect, useRef, useState } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/index.js'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18.js'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec.js'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context.js'
import { Ccp4Provider } from 'molstar/lib/mol-plugin-state/formats/volume.js'
import { useRecipeStore } from '../../state/recipeStore'
import { useThemeStore } from '../../state/themeStore'
import { resolveStructureSource } from '../../domain/pdb/structureSource'
import { setMolstarCanvasTheme } from '../../domain/pdb/molstarCanvasTheme'
import type { IngredientData } from '../../domain/recipe/types'
import 'molstar/lib/mol-plugin-ui/skin/light.scss'
import './Viewer.css'

/**
 * Replaces the "Mol-*" placeholder tab. Not a wrap of js/molstar_wrapper.js,
 * which drives Mol*'s older bundled `BasicMolStarWrapper` example app
 * (`extras/molstar/`) — the user chose the current `molstar` npm package and
 * its plugin-UI API (`createPluginUI`) instead. Scope, same cut as
 * NglViewer.tsx: load the selected ingredient's PDB structure. NOT ported:
 * highlight sync with NGL/the recipe table, `MS_ChangeColor`/per-ingredient
 * coloring, membrane/spacefill toggles, `MS_LoadModel` (loading a full
 * cellPACK results file into Mol-star) — those need their own slice.
 *
 * `source.pdb` resolution (`resolveStructureSource`, see its docstring): a
 * bare accession (no extension) is fetched from RCSB as mmCIF; a `.pdb`/
 * `.cif` filename is fetched from the cellPACK_data GitHub repo and parsed
 * as a structure trajectory; a `.mrc` filename is fetched from the same
 * repo but parsed as a CCP4/MRC volume (`Ccp4Provider`) and rendered as an
 * isosurface — a materially different Mol-star pipeline (binary download +
 * `mol-plugin-state/formats/volume.js`'s parse/visuals, not
 * `builders.structure`), since a density map isn't a structure.
 */
export function MolstarViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [plugin, setPlugin] = useState<PluginUIContext | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const selectedPdb = useRecipeStore((s) => (s.selectedNode?.data as IngredientData | undefined)?.source?.pdb)
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    let created: PluginUIContext | null = null
    createPluginUI({ target: containerRef.current, render: renderReact18, spec: DefaultPluginUISpec() }).then((p) => {
      if (disposed) {
        p.dispose()
        return
      }
      created = p
      setPlugin(p)
    })
    return () => {
      disposed = true
      created?.dispose()
      setPlugin(null)
    }
  }, [])

  useEffect(() => {
    if (!plugin) return
    void setMolstarCanvasTheme(plugin, theme)
  }, [plugin, theme])

  useEffect(() => {
    const pdb = selectedPdb
    if (!plugin) return
    plugin.clear()
    setStatus(null)
    if (!pdb) return
    const source = resolveStructureSource(pdb)
    if (!source) return

    const from = source.kind === 'id' ? 'RCSB' : 'the cellPACK_data repo'
    const fail = (err: unknown) => {
      console.error('Mol-star: unable to load', pdb, err)
      setStatus(`Unable to load "${pdb}" from ${from}.`)
    }

    if (source.kind === 'repo-file' && source.extension === 'mrc') {
      plugin.builders.data
        .download({ url: source.url, isBinary: true }, { state: { isGhost: true } })
        .then((data) => Ccp4Provider.parse(plugin, data))
        .then((parsed) => Ccp4Provider.visuals?.(plugin, parsed))
        .catch(fail)
      return
    }

    const url = source.kind === 'id' ? `https://files.rcsb.org/download/${source.id}.cif` : source.url
    const format = source.kind === 'id' ? 'mmcif' : source.extension === 'cif' ? 'mmcif' : 'pdb'
    plugin.builders.data
      .download({ url }, { state: { isGhost: true } })
      .then((data) => plugin.builders.structure.parseTrajectory(data, format))
      .then((trajectory) => plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default'))
      .catch(fail)
  }, [plugin, selectedPdb])

  return (
    <div className="molstar-viewer-shell" data-molstar-viewer="model" data-canvas-theme={theme}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {status && <p className="panel-note viewer-status">{status}</p>}
    </div>
  )
}
