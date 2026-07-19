import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { FIELD_LABELS } from '../../domain/files/columnMapping'
import { MERGEABLE_FIELDS, type MergeFieldFlags, type MergeOptions } from '../../domain/recipe/mergeRecipe'
import './ColumnMappingDialog.css'

interface MergeDialogProps {
  incomingName: string
  initialFlags: MergeFieldFlags
  onConfirm: (options: MergeOptions) => void
  onCancel: () => void
}

/**
 * Port of the legacy "Column Merging" modal (`#mergemodal`,
 * modal_merge.js:merge_getModal). Only shows checkboxes for fields that
 * actually change a value on merge — see mergeRecipe.ts's docstring for the
 * (empirically verified) live/dead split; the other ~9 `allfield` checkboxes
 * legacy renders here do nothing and aren't reproduced.
 */
export function MergeDialog({ incomingName, initialFlags, onConfirm, onCancel }: MergeDialogProps) {
  const [flags, setFlags] = useState(initialFlags)
  const [createWhenMerge, setCreateWhenMerge] = useState(true)

  const toggleAll = (checked: boolean) => {
    const next = { ...flags }
    for (const field of MERGEABLE_FIELDS) next[field] = checked
    setFlags(next)
  }

  return (
    <Dialog title="Column Merging" onClose={onCancel}>
      <p className="column-mapping-hint">
        Merging "{incomingName}" into the current recipe. Fields checked below will be overwritten on
        ingredients/compartments whose name already exists; unchecked fields are left as-is.
      </p>
      <label className="column-mapping-row">
        <span>Select all</span>
        <input
          type="checkbox"
          checked={MERGEABLE_FIELDS.every((f) => flags[f])}
          onChange={(e) => toggleAll(e.target.checked)}
        />
      </label>
      <div className="column-mapping-grid">
        {MERGEABLE_FIELDS.map((field) => (
          <label key={field} className="column-mapping-row">
            <span>{field === 'source' ? 'protein structure (PDB, biological unit, chain, model)' : FIELD_LABELS[field]}</span>
            <input
              type="checkbox"
              checked={flags[field]}
              onChange={(e) => setFlags((prev) => ({ ...prev, [field]: e.target.checked }))}
            />
          </label>
        ))}
      </div>
      <Switch className="column-mapping-create-switch" checked={createWhenMerge} onCheckedChange={setCreateWhenMerge}>
        Create new ingredient upon merge
      </Switch>
      <div className="column-mapping-actions">
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onConfirm({ fieldFlags: flags, createWhenMerge })}>
          Merge
        </Button>
      </div>
    </Dialog>
  )
}
