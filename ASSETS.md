# Assets: Сердце Туманности 2.0

## Art direction

The game uses **restrained living-cosmos sci-fi** rather than noisy space spectacle. The field stays close to midnight navy, while the interactive core carries cyan energy, orbit and research systems use violet, and rare high-value events use warm gold. Visual feedback should favor pulses, orbit motion and clean particles over heavy imagery, so that the UI remains legible on a small device and the game ZIP remains light.

| Asset | Location | Role | Implementation decision |
| --- | --- | --- | --- |
| Visual target | `/home/ubuntu/webdev-static-assets/nebula-heart-visual-target.png` | Reference for density, composition, palette and central-core scale. | Kept outside the game bundle as a production reference. |
| Atmospheric backdrop | `assets/nebula-atmosphere.jpg` | Optional low-opacity source for an enhanced space layer. | Compressed derivative of the visual target; CSS gradients remain the primary fallback. |

## Visual target prompt

> Create a clean 2D HTML5 idle-clicker game screenshot concept for a premium VK Games catalogue title, landscape 16:9. Main interaction: a luminous turquoise nebula core centered and occupying about 28% of the screen height, with two thin elliptical orbit rings and a small golden rift spark nearby. Environment: deep midnight-blue space with very subtle star dust, one diffuse violet nebula cloud in the upper left, and a muted cyan glow behind the core; keep the background dark enough for white UI text. HUD layout: two compact dark translucent information cards at the upper left for Stardust and Flow, one small menu button at upper right; a thin stage label and progress bar above the core. Bottom: three equal, clearly separated dark translucent navigation buttons for Orbits, Collapse, and Dust Quantum. Add no readable words or numerals, no logos, no device frame. Style: sharp modern game-engine UI art direction, restrained sci-fi, deep navy #070b16 base, cyan #5ce1e6, violet #c084fc, occasional warm gold; high readability and generous safe areas for portrait and landscape responsive implementation. Avoid characters, spaceships, planets, dense interfaces, excessive light flares, photorealism, text, watermarks, and visual clutter.

## Asset constraints

The deployed game should retain no text-bearing image UI and no large mandatory image dependency. All in-game labels remain HTML text for localization and accessibility. The decorative backdrop is intentionally optional and must never be required for a playable or readable screen.
