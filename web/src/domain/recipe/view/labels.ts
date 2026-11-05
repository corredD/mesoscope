/**
 * Labels as legacy draws them (`DrawLabels`, `drawCircularText`; recipe-view.md §2.7, rows 34-38).
 */
import type { IngredientData } from '../types'

/** Start angle in degrees (0 = top) of each compartment's title, by compartment order (main.js:5497). */
export const ROTATION_TEXT = [-14, 4, 23, -18, -10.5, -20, 20, 20, 46, -30, -25, -20, 20, 15, -30, -15, -45, 12, -15, -16, 15, 15, 5, 18, 5, 15, 20, -20, -25]

export const TITLE_FONT = 'Oswald'
export const LABEL_FONT = 'Georgia'

const and = (text: string) => text.replace(/,? and /g, ' & ')

export interface Letter {
  char: string
  /** Clockwise from the top, in degrees, of the letter's centre. */
  angle: number
}

export interface CompartmentTitle {
  fontSize: number
  /** Distance of the letters' baseline from the centre: the outer edge of the band, r+5. */
  radius: number
  letters: Letter[]
}

/**
 * A compartment's curved title (main.js:3809-3816, 5500-5536): font round(r/10), 10 when that is 4 or less, on the
 * outer edge r+5, centred on `ROTATION_TEXT[counter]`. Past the table's 29 entries the angle is undefined and
 * legacy draws nothing (§8.4): null. `measure` gives a character's advance width at the font size.
 */
export function compartmentTitle(name: string, r: number, counter: number, measure: (char: string, fontSize: number) => number): CompartmentTitle | null {
  const start = ROTATION_TEXT[counter]
  if (start === undefined) return null
  let fontSize = Math.round(r / 10)
  if (fontSize <= 4) fontSize = 10
  const radius = r + 5
  const chars = Array.from(and(name))
  const widths = chars.map((c) => measure(c, fontSize))
  const total = widths.reduce((a, b) => a + b, 0)
  let at = (start * Math.PI) / 180 - total / radius / 2
  const letters = chars.map((char, i) => {
    const angle = at + widths[i] / 2 / radius
    at += widths[i] / radius
    return { char, angle: (angle * 180) / Math.PI }
  })
  return { fontSize, radius, letters }
}

/** An ingredient label's text for the "Node label" option (main.js:3830-3842). */
export function ingredientLabelText(data: IngredientData, option: string): string {
  if (option === 'pdb') return and(data.source?.pdb ? data.source.pdb : data.name)
  if (option === 'None') return and(data.name)
  const value = data[option]
  return value ? and(String(value)) : ''
}

/** Shown when hovered, or zoomed past 1.5 with an option other than None (main.js:3828, row 36). */
export function ingredientLabelVisible(hovered: boolean, zoom: number, option: string): boolean {
  return hovered || (zoom > 1.5 && option !== 'None')
}

/** Font round(r/2), 5 when that is 4 or less, drawn at (x−r, y+r+fs) centre-aligned (main.js:3829-3843, §8.5). */
export function ingredientLabelGeometry(r: number): { fontSize: number; x: number; y: number } {
  let fontSize = Math.round(r / 2)
  if (fontSize <= 4) fontSize = 5
  return { fontSize, x: -r, y: r + fontSize }
}

/** A rough advance width where no canvas is available to measure (tests, SSR). */
export function estimateCharWidth(char: string, fontSize: number): number {
  return (char === ' ' ? 0.28 : /[A-Z0-9_]/.test(char) ? 0.6 : 0.5) * fontSize
}

let measureContext: CanvasRenderingContext2D | null | undefined
const widthCache = new Map<string, number>()

/** The advance width a canvas gives the character in legacy's title font; cached per (char, size). */
export function measureCharWidth(char: string, fontSize: number): number {
  const key = `${fontSize}|${char}`
  const cached = widthCache.get(key)
  if (cached !== undefined) return cached
  if (measureContext === undefined) {
    try {
      measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
    } catch {
      measureContext = null
    }
  }
  let width = estimateCharWidth(char, fontSize)
  if (measureContext) {
    measureContext.font = `${fontSize}px ${TITLE_FONT}`
    width = measureContext.measureText(char).width
  }
  widthCache.set(key, width)
  return width
}
