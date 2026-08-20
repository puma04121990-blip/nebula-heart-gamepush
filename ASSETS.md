# Assets: Atlas of Echoes

## Visual direction

**Atlas of Echoes** uses poetic astronomical field notes rather than generic luminous science fiction. The playable space is a tactile observatory: midnight ink, fine atlas rings, muted brass, paper-like grain and a deliberately limited palette of living signal light. Every meaningful game element remains responsive HTML, SVG or Canvas, so the interface is localizable, accessible and stable across the GamePush HTML5 package.

> The generated visual reference is a production-only composition target. It is not copied into the game and no gameplay text is baked into images.

| Element | Colour or material | Runtime implementation |
| --- | --- | --- |
| Observatory field | Ink-blue texture, brass atlas lines and restrained star grain. | Layered CSS gradients, pseudo-elements and `atlas-observatory-texture.jpg` at low opacity. |
| Signals | Cyan pulse, violet whisper, gold beacon, silver mirror, ember ash and white-blue comet. | Native HTML elements with distinct inner geometry, motion and accessible labels. |
| Constellation threads | Fine silver, violet or gold lines with luminous caps. | Responsive SVG overlay that reflects player-created links. |
| Anomaly | Dark eclipse with an engraved, luminous halo. | CSS radial treatment with `atlas-anomaly-seal.png` as a decorative plate; reduced-motion fallback remains available. |
| Atlas cards | Deep-blue archival plates, pattern thumbnail and decision seal. | DOM/CSS at runtime; Canvas produces only an optional sharing snapshot. |
| Interface | Observatory instruments, thin brass corners and readable high-contrast typography. | Native HTML/CSS with portrait, low-landscape and desktop layouts. |

## Production assets

| Asset | Bundled location | Purpose | Implementation note |
| --- | --- | --- | --- |
| Observatory texture | `assets/atlas-observatory-texture.jpg` | Subtle material behind the playable sky. | It remains low-contrast and never carries required information. |
| Anomaly seal | `assets/atlas-anomaly-seal.png` | Decorative plate for rare anomalies and Atlas details. | Used alongside CSS effects; it has no embedded UI copy. |
| Atlas Echoes Nocturne | `assets/atlas-echoes-nocturne.mp3` | Original 150-second looping background music. | Loaded only after a player gesture through `audio-engine.js`. |

## Asset constraints

The final package contains no text-bearing UI images, external runtime texture dependencies, paid fonts or assets whose absence prevents play. Signal shapes, threads, labels and actions are native responsive elements. The optional share image is created locally from the player’s own non-personal constellation metadata and is not published automatically.
