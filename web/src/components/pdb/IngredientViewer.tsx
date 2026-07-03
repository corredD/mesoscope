import { useEffect, useRef, useState } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/index.js'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18.js'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec.js'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context.js'
import { Ccp4Provider } from 'molstar/lib/mol-plugin-state/formats/volume.js'
import { useRecipeStore } from '../../state/recipeStore'
import { useIngredientViewerStore } from '../../state/ingredientViewerStore'
import { resolveStructureSource } from '../../domain/pdb/structureSource'
import { clearCustomShapes } from '../../domain/pdb/molstarCustomShapes'
import type { IngredientData } from '../../domain/recipe/types'
import 'molstar/lib/mol-plugin-ui/skin/light.scss'
import './Viewer.css'

/**
 * Replaces the "NGL View" panel — renamed "Ingredient View" — with a Mol-star
 * canvas, per the modernization goal: NGL is dropped for per-ingredient
 * structure viewing in favor of Mol-star, with the same level of control as
 * legacy's "NGL Options" panel (chain selection, membrane/fiber orientation,
 * clustering/LOD, sprite 2D — all built in the sibling `IngredientOptions.tsx`,
 * which shares this component's plugin instance via `ingredientViewerStore`).
 *
 * This is a SEPARATE, second Mol-star plugin instance from the "Mol-*" tab's
 * `MolstarViewer.tsx` — that one is deliberately left untouched, reserved for
 * a later phase (loading a full packed cellPACK results file, legacy's
 * `MS_LoadModel`), not per-ingredient reference structures. Verified two
 * independent `createPluginUI` instances coexist without fighting over
 * WebGL/canvas resources (each owns its own canvas/context).
 *
 * Uses a lean plugin spec (`components.controls.{top,left,right,bottom}:
 * 'none'`) rather than `MolstarViewer.tsx`'s full `DefaultPluginUISpec()` —
 * this panel's controls live entirely in `IngredientOptions.tsx`, so Mol-star's
 * own default left/right/log panels would just duplicate/compete with them.
 * The default viewport toolbar (reset view, screenshot, etc.) is kept.
 *
 * `source.pdb` resolution is identical to `MolstarViewer.tsx`
 * (`resolveStructureSource`) — see that file's docstring.
 */
export function IngredientViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [plugin, setPlugin] = useState<PluginUIContext | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const selectedNode = useRecipeStore((s) => s.selectedNode)
  const setStorePlugin = useIngredientViewerStore((s) => s.setPlugin)
  const setStructureInfo = useIngredientViewerStore((s) => s.setStructureInfo)
  const setTrajectoryRef = useIngredientViewerStore((s) => s.setTrajectoryRef)

  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    let created: PluginUIContext | null = null
    const spec = {
      ...DefaultPluginUISpec(),
      components: { controls: { top: 'none', left: 'none', right: 'none', bottom: 'none' } },
    } as Parameters<typeof createPluginUI>[0]['spec']
    createPluginUI({ target: containerRef.current, render: renderReact18, spec }).then((p) => {
      if (disposed) {
        p.dispose()
        return
      }
      created = p
      setPlugin(p)
      setStorePlugin(p)
    })
    return () => {
      disposed = true
      created?.dispose()
      setPlugin(null)
      setStorePlugin(null)
      setStructureInfo([], null, null)
      setTrajectoryRef(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const pdb = (selectedNode?.data as IngredientData | undefined)?.source?.pdb
    if (!plugin) return
    let cancelled = false

    const fail = (err: unknown, from: string) => {
      if (cancelled) return
      console.error('Ingredient viewer: unable to load', pdb, err)
      setStatus(`Unable to load "${pdb}" from ${from}.`)
    }

    // `plugin.clear()`/`clearCustomShapes` must both finish before the new structure
    // and its shapes are built — found live: firing the new build without awaiting
    // the previous clear let a stray custom shape (LOD beads) from the *previous*
    // ingredient survive on screen after switching, since the state-tree removal and
    // the new build's own state-tree writes weren't actually sequenced.
    Promise.resolve(plugin.clear())
      .then(() => clearCustomShapes(plugin))
      .then(async () => {
        if (cancelled) return
        setStatus(null)
        setStructureInfo([], null, null)
        setTrajectoryRef(null)
        if (!pdb) return
        const source = resolveStructureSource(pdb)
        if (!source) return
        const from = source.kind === 'id' ? 'RCSB' : 'the cellPACK_data repo'

        if (source.kind === 'repo-file' && source.extension === 'mrc') {
          await plugin.builders.data
            .download({ url: source.url, isBinary: true }, { state: { isGhost: true } })
            .then((data) => Ccp4Provider.parse(plugin, data))
            .then((parsed) => Ccp4Provider.visuals?.(plugin, parsed))
            .catch((err) => fail(err, from))
          return
        }

        const url = source.kind === 'id' ? `https://files.rcsb.org/download/${source.id}.cif` : source.url
        const format = source.kind === 'id' ? 'mmcif' : source.extension === 'cif' ? 'mmcif' : 'pdb'
        await plugin.builders.data
          .download({ url }, { state: { isGhost: true } })
          .then((data) => plugin.builders.structure.parseTrajectory(data, format))
          .then((trajectory) => {
            if (cancelled) return
            // Only parses the trajectory and hands it off — `IngredientOptions.tsx`'s own
            // effect builds the actual hierarchy/representation (`buildIngredientRepresentation`),
            // for the first build *and* every later chain/representation/color/membrane
            // change alike. Building it here too, even just once for the "initial" view, used
            // to race a second build fired by `IngredientOptions` for auto-enabled state (e.g.
            // membrane orientation defaulting on for a surface ingredient) — the ingredient
            // would flash with the wrong (untransformed) initial view before the correct
            // rebuild landed. One single builder avoids that outright.
            setTrajectoryRef(trajectory)
          })
          .catch((err) => fail(err, from))
      })

    return () => {
      cancelled = true
    }
  }, [plugin, selectedNode, setStructureInfo, setTrajectoryRef])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 200 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {status && <p className="panel-note viewer-status">{status}</p>}
    </div>
  )
}
