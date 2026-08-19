# Architecture: Сердце Туманности 2.0

## Operating model

The game remains a dependency-free HTML5 application suitable for GamePush ZIP hosting. It intentionally preserves `index.html`, `css/style.css`, `js/gp-bridge.js`, `js/i18n.js` and `js/game.js` as the deployment surface, while the game script becomes a small collection of explicit services rather than a single uncontrolled frame loop.

| Layer | Responsibility | Main elements |
| --- | --- | --- |
| Presentation | Static page structure, safe touch targets, dialog focus and responsive layout. | `index.html`, `style.css` |
| Localisation | All player-visible strings, titles, descriptions and accessibility labels in Russian and English. | `i18n.js` |
| Platform | GamePush initialisation, cloud/local persistence, pause/resume, ads, leaderboards, social overlays, device hints. | `gp-bridge.js` |
| Game rules | State migration, economy formulas, contracts, expeditions, research, event scheduling, collapse and offline income. | `game.js` |
| Audio and feedback | Synthesised ambient sequence, interaction effects, haptics and audio lifecycle. | `audio-engine.js` |

## State model

A serialised state carries a small numeric `version`, the established economy fields, preference fields, and new content state. Arrays remain indexed by static configuration; migrations always normalize their length. Timed content is represented as timestamps and day keys rather than running timers, which makes it reliable after a tab is closed.

| New state field | Purpose | Persistence rule |
| --- | --- | --- |
| `version` | Enables safe migration from the original unversioned save. | Always write the latest number. |
| `contracts` | Daily mission key plus completion and claim flags. | Rebuild only when the day key changes. |
| `keys` | Currency earned through contracts and discoveries. | Never reset on collapse. |
| `research` | Permanent research levels. | Never reset on collapse. |
| `expedition` | One selected expedition with an end timestamp and claim state. | Clear only after one successful claim. |
| `stats` | Lifetime click, rift, collapse and expedition counters. | Used for milestones and UI only. |
| `settings` | Separate music, effects, haptics and motion preferences. | Retained across collapses. |

## Runtime cadence

The rendering loop remains smooth but no longer rebuilds the entire modal every animation frame. Economic accumulation is updated per frame with a reasonable delta cap. HUD updates are throttled to a visible cadence, while expensive sheets update only after a player action or once per second. Persisting is queued after meaningful actions, on visibility loss and at a modest periodic interval; GamePush cloud synchronization is serialised through the platform bridge.

## Interaction contract

The core is the only required active control. The three dock buttons retain their original semantic roles: Orbits opens the workshop and its new Research tab; Collapse opens the prestige and permanent meta-progression sheet; Dust Quantum triggers a rewarded ad only when the player explicitly asks for it. Contracts and expeditions appear in the stage status strip and open in the existing sheet pattern. The menu retains settings, leaderboard, sharing, favorites, legal information and reset.

## Platform contract

GamePush remains optional during local development. With an active SDK, player synchronization completes before loading cloud progress, the preloader occurs before gameplay, sticky advertising receives its safe bottom area, and `gameStart`/`gameplayStart` signal a loaded, playable game. Pause/resume is relayed to gameplay, feedback and audio. The application also listens to native `visibilitychange` as a fallback.
