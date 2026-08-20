# Architecture: «Атлас Эха»

## Scope

The project stays a dependency-free HTML5 GamePush application. It remains portable as a ZIP with `index.html` in the archive root, functions without platform credentials in local mode, and keeps GamePush as the cloud-save, pause, audio, social-overlay and advertising adapter. The old economy loop is intentionally removed: the browser is now a small interactive observatory, not a passive production dashboard.

| Surface | Responsibility |
| --- | --- |
| `index.html` | Semantic shell for the observatory, field controls, Atlas dock, sheet dialog, toasts and boot. |
| `css/style.css` | Responsive observatory layout, field-journal identity, signal silhouettes, SVG-line presentation, portrait and landscape rules, reduced-motion fallback. |
| `js/i18n.js` | Equal RU/EN content: narrative fragments, signal names, interface, accessibility strings and share text. |
| `js/gp-bridge.js` | Existing GamePush lifecycle, local/cloud persistence, ads, leaderboards and native sharing fallback. |
| `js/audio-engine.js` | Gesture-gated soundscape plus semantic signal, thread and choice feedback. |
| `js/game.js` | State migration, deterministic sky generation, observation state machine, Atlas, challenges, sharing and rendering. |

## Explicit game state machine

Gameplay is driven by named modes rather than anonymous click handlers.

```text
BOOT → FIELD_READY → LISTENING → FIELD_READY
                         ↓
                   LINK_SOURCE → LINK_TARGET → FIELD_READY
                         ↓
                    ANOMALY_CHOICE → RESOLUTION → ATLAS_CARD
                                                       ↓
                                                  FIELD_READY
```

| Mode | Permitted player action | Visible feedback | Exit condition |
| --- | --- | --- | --- |
| `FIELD_READY` | Select one signal, open Atlas or open menu. | Unresolved signals breathe; guidance names the next meaningful action. | Select a signal or complete conditions for anomaly. |
| `LISTENING` | Hold/tap the selected signal. | Its hidden trait, tone and compatible behaviour become visible. | Listen is confirmed once per signal. |
| `LINK_SOURCE` | Select a second compatible signal. | First source is outlined; compatible targets are bright. | A legal pair is chosen or the action is cancelled. |
| `LINK_TARGET` | Confirm the proposed thread. | SVG thread draws from source to target; constellation family is recalculated. | Link completes. |
| `ANOMALY_CHOICE` | Witness, preserve or release the revealed anomaly. | Central seal expands; two equal, readable decisions explain different outcomes. | A decision creates the Nебесная запись. |
| `RESOLUTION` | Review, share or archive the record. | Constellation locks, name appears, rewards are explained as discoveries—not currency. | Archive / share / start next field. |

## State schema and migration

`SAVE_VERSION` is `4`. Migration remains additive and accepts Atlas saves from version 3 onward; it never deletes an old save merely because it lacks Night Letter fields. Legacy idle values are retained as `legacyDust` for transparent acknowledgement but do not grant a competitive power advantage; the first migration creates one archival card, **«Первый отклик»**, based on the old lifetime value. Existing language and accessibility settings remain intact.

```js
{
  version: 4,
  lang: 'ru' | 'en',
  settings: { music, effects, haptics, motion },
  legacyDust: number,
  chapter: 0,
  chapterProgress: { resolved: number, witnesses: number },
  lenses: { echo: 0, mirror: 0, horizon: 0, hush: 0 },
  insight: number,
  currentField: {
    id: string,
    seed: number,
    chapter: number,
    signals: Signal[],
    links: Link[],
    listened: string[],
    anomaly: Anomaly | null,
    motif: 'first' | 'warm' | 'loop' | 'mirror' | 'comet',
    challengeFamily: string, // set only by an imported Echo
    status: 'ready' | 'resolved',
    createdAt: number
  },
  atlas: AtlasCard[],
  anomalyMemory: { [anomalyId]: { seen: number, preserved: number, released: number } },
  encounters: Encounter[],
  stats: { observations, links, constellations, shared, imported, witnessed },
  lastFieldAt: number,
  welcome: boolean
}
```

State arrays are normalised and capped for cloud-save safety: `atlas` retains the newest 48 cards, `encounters` retains the newest 12. Every visible card stores generated data and localisation keys rather than rendered HTML. The save is queued through `GPX.saveProgress` after a completed observation, lens unlock, imported challenge or changed preference; it is never synced on every pointer move.

## Deterministic sky generation

A compact seeded pseudo-random generator builds each field. Its seed derives from `chapter`, a day-safe index, the observation count and—in imported challenges—the decoded public code. Given the same seed and chapter, two devices render the same set of signal types, positions, anomaly and permitted link pairs. No account identifier or personal information enters the seed.

| Generator stage | Data | Purpose |
| --- | --- | --- |
| 1. Sky family | Chapter + seed | Changes palette, background pattern and available signal behaviours. |
| 2. Signal selection | Weighted deterministic picks | Produces five to seven signals with no impossible intro combination. |
| 3. Positions | Bounded polar coordinates | Keeps entities away from HUD, each other, safe areas and the central anomaly. |
| 4. Anomaly test | Observation count + seed | Creates a rare encounter only after enough meaningful links. |
| 5. Night Letter | Seed + actually available signal types | Selects one achievable authored motif and its localised guidance. |
| 6. Prompt | Signal/anomaly traits + Night Letter state | Creates short narrative guidance, outcome flavour and the observer-mark ritual. |

## Data-driven content

Signals, anomaly types, chapters, constellation families, lenses and Night Letter motifs live as static configuration records in `game.js`. This makes later content additions possible without rewriting renderer logic.

| Data record | Required fields |
| --- | --- |
| `SignalDefinition` | `id`, `colour`, `shape`, `motion`, `listenKey`, `compatibility`, `tone` |
| `AnomalyDefinition` | `id`, `minLinks`, `appearanceKey`, `preserveKey`, `releaseKey`, `memorySeal` |
| `ConstellationFamily` | `id`, `test(links)`, `nameKey`, `accent`, `unlock` |
| `LensDefinition` | `id`, `need`, `effect`, `titleKey`, `descriptionKey` |
| ChapterDefinition | `id`, `requiredInsight`, `skyClass`, `signalPool`, `specialRule` |
| `MotifDefinition` | `id`, `glyph`, `nameKey`, `hintKey`, `markKey`, `isAchieved(field)` |

## Rendering ownership

`renderField()` owns the field DOM and an SVG thread layer; it runs on state-changing actions only. `renderHud()` updates short, independent labels. `renderSheet()` owns modal content. CSS handles breathing, drift and line draw animations; JavaScript never runs an economy-style full-screen loop. This keeps touch latency steady on lower-power mobile devices.

### Signal component contract

Each signal is a semantic `<button>` with `data-signal-id`, localised `aria-label`, a `.signal-orb` child and a `.signal-glyph` child. CSS type classes make a Beacon look like a needle, Ash look like ember fragments and Mirror look like a lens. All signal buttons have a minimum 48 px touch footprint and equivalent keyboard activation.

### Thread component contract

The thread layer is an SVG covering the field. It contains one `<path>` per confirmed link and one `<circle>` per endpoint. Coordinates are calculated in field-relative percentages, so portrait and landscape layouts use the same world state. In reduced-motion mode, paths render without the draw animation.

## Atlas and narrative persistence

A resolved field serialises into an `AtlasCard` that captures `seed`, signal IDs, links, pattern family, anomaly decision, chapter, generated title key, Night Letter `motif`, `marked` state, optional Echo `duet` relation and timestamp. The card is an interactive data object: it can reopen a read-only map, be compared with a response from a friend, be used as a visual share card and inform future anomaly dialogue.

## Echo challenge protocol

An outgoing `AE3` Echo contains only a versioned, URL-safe compact payload: `{ v, seed, chapter, family, anomaly, motif }`. It intentionally excludes display name, account ID, cloud state, timestamp, personal decision and free-form text. The recipient validates payload shape and version before creating an `Encounter` field. When resolved, the response records a non-competitive `duet`: `harmony` for the same family or `counterpoint` for a different family. If native share is unavailable, the player can copy the code. If a GamePush social overlay exists, `GPX.share()` receives the card payload without assuming a specific social network API.

## Audio and lifecycle

Sound unlocks after the first player gesture. The audio layer receives semantic calls: `listen(signalType)`, `link(family)`, `anomaly(decision)`, `archive()` and `chapter()`. The existing GamePush `pause` and `resume` events, plus visibility fallback, suspend and resume audio and field interaction safely. Audio is never required to understand a signal: every sound has a visual counterpart.

## Platform and moderation contracts

* `gameStart` occurs after boot, field generation, input readiness and first render.
* `gameplayStart` occurs when a live observation accepts input; `gameplayStop` occurs inside sheets and on pause.
* Cloud save keeps serialised state in the existing `progress` player field and uses `score` as total completed observations.
* Rewarded advertising is offered only from a completed record and grants a clearly labelled optional alternate reading; no ad interrupts an observation.
* The build continues to support RU and EN, portrait, landscape, keyboard operation, safe areas, reduced motion and local fallback.
