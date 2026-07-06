/**
 * JSX typing for `<protvista-uniprot>` (`protvista-uniprot` npm package, see
 * `SequenceFeaturesPanel.tsx`) — this app's first Web Component integration, so there's no
 * existing precedent to follow and no official React type defs for this tag exist.
 *
 * `accession`/`nostructure`/`notooltip` are declared `reflect: true` properties on the
 * component (confirmed by reading the installed package's own source,
 * `protvista-uniprot.ts`'s `static get properties()`), meaning they're also real HTML
 * attributes Lit keeps in sync — so plain JSX attributes work here, unlike the lower-level
 * `nightingale-track`'s `data`/`sequence` (non-attribute-serializable, would have needed
 * imperative property assignment via a ref).
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type ProtvistaUniprotProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  accession?: string
  nostructure?: boolean
  notooltip?: boolean
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'protvista-uniprot': ProtvistaUniprotProps
    }
  }
}
