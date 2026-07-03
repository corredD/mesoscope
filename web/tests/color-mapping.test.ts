import { describe, expect, it } from 'vitest'
import { exportColorMapping, importColorMapping, type PropertyMapping } from '../src/domain/colors/colorMapping'

describe('property color mapping', () => {
  it('exports colors per property and re-imports them onto matching keys only', () => {
    const propertyMapping: PropertyMapping = {
      size: { min: 0, max: 50, cmin: 'hsl(0,100%,50%)', cmax: 'hsl(165,100%,50%)', colors: ['red', 'blue'] },
      molarity: { min: 0, max: 1, cmin: 'hsl(0,100%,50%)', cmax: 'hsl(165,100%,50%)', colors: [] },
    }

    const exported = exportColorMapping(propertyMapping)
    expect(exported).toEqual({ size: ['red', 'blue'], molarity: [] })

    importColorMapping(propertyMapping, { size: ['green'], unknownKey: ['ignored'] })
    expect(propertyMapping.size.colors).toEqual(['green'])
    expect(propertyMapping.molarity.colors).toEqual([]) // untouched: not present in imported data
    expect(propertyMapping).not.toHaveProperty('unknownKey') // only pre-existing keys are ever updated
  })
})
