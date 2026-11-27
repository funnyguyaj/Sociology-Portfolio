---
version: 1
slug: "main-html"
primary_target: "main.html"
related_targets: []
---

# Surface: one-page portfolio (main.html)

Mode: Experience. The body of work leads; the interface recedes.

Audience: employers, grad committees, editors arriving from a link; they scan, then open the work.
Constraints: HTML is frozen (user edits it); only style.css and script.js change. Static, vanilla, no build. No invented content: Experience, Contact, portrait are omitted until supplied. Staged: 1 CSS, 2 dot field + filters (+ marquee), 3 pinned header.

## Direction contract

THESIS: The page is a population. A field of dots (people) sits above the name; choosing a theme (race, gender, queerness, resistance) lights the dots and the matching publications at once. Refuses the headshot-plus-bio-card portfolio.

OWN-WORLD: Incumbent cool paper (#EDF0F3) and navy ink (#16202E) kept as ground and text. Theme colours borrowed from the sociological data-plate tradition: crimson, ochre, green, rose, each a working filter key. Bricolage Grotesque for the name and headings, Source Serif 4 for titles and prose. Hairline rules, tabular years, authored SVG arrow.

STORY: Visitor learns who she is (name, field), sees her subjects as a living field, filters to a theme, opens a publication.

FIRST VIEWPORT: Rebuilt from the user-supplied mockup (Downloads/portfolio-v2.html). Dot field fills the hero; "Analicia" centred in the dotted space above the intro, shrinking into a pinned top bar on scroll; intro, four theme buttons and hint at the bottom; marquee of the real publication titles along the hero bottom (pauses on hover/focus, direction follows scroll). Primary action: theme buttons, then publication rows.

FORM: brief-pinned composition on an incumbent partial palette. seed: none (pinned) — "the dot-field hero with theme buttons that filter the publications, the name that starts huge and shrinks into a pinned top bar, the marquee of publication titles, and editorial styling for the publication rows".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions
- Theme taxonomy per publication needs the user's confirmation (Stage 2).
- Bio, Experience, Contact, portrait content pending from user.
