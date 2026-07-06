/**
 * JSX typings for the Nightingale custom elements (`@nightingale-elements/nightingale-*`,
 * see `SequenceFeaturesPanel.tsx`) — this app's first Web Component integration, so there's
 * no existing precedent to follow and no official React type defs for these tags exist.
 *
 * Deliberately loose and deliberately omits `sequence`/`data` (the feature array): those hold
 * non-attribute-serializable data (a string is fine for `sequence`, but a plain HTML attribute
 * can't carry the `Feature[]` array `nightingale-track` needs) and Nightingale's own components
 * only expose them as JS *properties*, not attributes — confirmed by reading the installed
 * package's own `.d.ts` (`nightingale-track.d.ts`: `set data(data: Feature[])`). React's JSX
 * attribute/prop diffing doesn't reliably push non-primitive values onto a custom element's
 * properties across re-renders, so `SequenceFeaturesPanel.tsx` sets these imperatively via a
 * ref instead — matches the pattern React's own docs recommend for wrapping web components.
 * `height`/`length`/`display-start`/`display-end`/`layout`/`highlight` are all plain
 * string/number attributes (Lit reflects them), so JSX attributes work fine for those.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type NightingaleElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  height?: number | string
  length?: number | string
  'display-start'?: number | string
  'display-end'?: number | string
  layout?: 'non-overlapping' | 'default'
  highlight?: string
  'highlight-color'?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'nightingale-manager': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      'nightingale-sequence': NightingaleElementProps
      'nightingale-track': NightingaleElementProps
    }
  }
}
