import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { FIELD_LABELS, MAPPABLE_FIELDS, type ColumnMapping, type MappableField } from '../../domain/files/columnMapping'
import './ColumnMappingDialog.css'

interface ColumnMappingDialogProps {
  headers: string[]
  initialMapping: ColumnMapping
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

/**
 * Port of the legacy "Column Mapping" modal (`#slickdetail`, index.html:627 —
 * one `<select>` per field, pre-selected by `GuessColumn`). The merge-field
 * checkboxes legacy shows in this same modal when `MERGE` is set
 * (`createOneColumnSelect`, main.js:590-599) aren't here — merge-on-append
 * is a separate, not-yet-built feature (see web/README-modernization.md).
 */
export function ColumnMappingDialog({ headers, initialMapping, onConfirm, onCancel }: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState(initialMapping)

  const setField = (field: MappableField, value: number) => {
    setMapping((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog title="Column Mapping" onClose={onCancel}>
      <p className="column-mapping-hint">
        Match each recipe field to a column in the file, or leave it "Absent" to skip it.
      </p>
      <div className="column-mapping-grid">
        {MAPPABLE_FIELDS.map((field) => (
          <label key={field} className="column-mapping-row">
            <span>{FIELD_LABELS[field]}</span>
            <select value={mapping[field]} onChange={(e) => setField(field, Number(e.target.value))}>
              <option value={-1}>Absent</option>
              {headers.map((header, index) => (
                <option key={index} value={index}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="column-mapping-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={() => onConfirm(mapping)}>
          Load
        </button>
      </div>
    </Dialog>
  )
}
