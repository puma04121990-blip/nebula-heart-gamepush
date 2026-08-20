# QA: Atlas of Echoes Rebuild

## First field check

The rebuilt game loads into a visibly different observation field rather than the former core clicker: a textured night atlas, distinct signal silhouettes, a central empty anomaly space, action instruments and the Atlas/Lenses/Encounters dock are all present on a landscape browser check. Selecting Pulse produced a distinct gold focus ring and replaced the field guidance with the signal-specific instruction to listen, confirming the first decision step is readable and connected to the new UI.

## Signal listening check

Pulse changed from an unknown node to a labelled, listened signal with its trait shown in the field and accessibility label. Selecting Beacon then moved the gold focus ring to its distinct needle-shaped silhouette and issued a new, signal-specific instruction. The field therefore supports deliberate observation of multiple visual signal types rather than repeated tapping of one central object.

## Constellation preparation check

Listening to Beacon revealed its “golden direction” trait and made the Connect action active. Activating Connect changed the explanatory copy to a clear source-selection step and gave the action its active visual state. This confirms that the primary loop is stateful: the player must observe before creating a constellation rather than simply accumulating a resource.

## Issue found: first-link accessibility

In the first generated field, the two listened signals Pulse and Beacon were not a legal pair. The interface correctly rejected the link, but the fallback toast displayed the untranslated key `invalidLink`, and the initial two-signal state could produce no highlighted compatible target. This is a blocking onboarding defect: the first field must always include at least one legal link between the first two signals and all error messages must be localized.

## First-link fix retest started

After a reload with the corrected rules, the persisted field retained the two listened signals and the Connect action entered source-selection mode normally. The next two selections are used to confirm that the formerly rejected first pair now creates a visible thread.

## First-link fix confirmed

Pulse and Beacon now form the first thread successfully. The connection incremented the thread count from 0 to 1 and appeared as a thin luminous line linking the two visual objects in the observatory. The first interactive sequence no longer dead-ends.

## Anomaly choice check

The showcase state presents a completed constellation around a central eclipse seal, then opens a dedicated modal for the anomaly. The modal offers two equally prominent narrative actions — Preserve and Release — with clear consequences rather than a numeric upgrade. This gives the session a visible end-state and a personal decision point.

## Resolution and persistence check

Choosing Preserve converted the completed constellation into a named Sky record, incremented the Atlas count from two to three and presented the player with a shareable result instead of a purchase screen. The browser console remained free of runtime errors after this full observation → anomaly → resolution cycle.

## Atlas and anomaly-variant check

The showcase now names the active rare event as “Слепая звезда”, demonstrating a second anomaly rather than a repeated generic encounter. The Atlas opens with two visibly distinct card families — Bridge and Loop — and each displays its signal and thread count. The grid is compact and readable at desktop size; the next check will cover opening a card and the Lenses sheet.

## Personal-record detail check

Opening the Loop card produced a distinct detail view tied to “Письмо без адреса”, including its seal and the outcome-specific sentence about sealing the letter. This demonstrates that the Atlas stores and replays meaningful narrative traces from different anomaly types, rather than only scores or currencies.

## Lenses progression check

The Lenses sheet presents persistent progression as perception tools rather than production multipliers. The demo showed Echo, Mirror and Horizon as already owned, while Hush was purchasable with insights. Buying Hush updated the available insight count from five to one and changed its state to “Открыто”, confirming the collection-to-unlock progression loop works.

## Social-card entry check

The Atlas cards now use stable count labels (“Голоса” and “Нити”), avoiding Russian pluralization errors at different totals. Each record remains one tap away from the share action, so the social route begins with a personal, legible artifact rather than a generic invite.

## Safe sharing test setup

The share flow is tested with the browser’s native sharing function replaced by a local no-op test handler. This permits validation of Echo-card generation and payload construction without posting or sending content on the user’s behalf.

## Echo-card sharing check

The share action completed through a local test handler without publishing anything. It produced a localized confirmation and a payload containing the game title plus an `AE3` challenge code with only a seed, chapter, constellation family and anomaly type. No name, account identifier or personal data is embedded. The code is valid for reconstructing a friend’s challenge field while preserving a different personal outcome.

## Echo challenge import entry check

The Encounters sheet presents a focused paste-and-accept flow. Its explanatory copy makes the privacy boundary explicit: a challenge contains the sky pattern only, without a friend’s name, account or personal data. The sheet also clearly distinguishes an empty encounter history from the import action.

## Echo challenge import check

The validated `AE3` code was accepted and converted into a new field labelled “Эхо друга”. The new map preserved the challenge’s chapter and anomaly metadata while beginning with fresh observation choices. The player is invited to make their own decisions, which supports sharing without copying another player’s personal outcome.

## Mobile orientation check

At 390×844 portrait, the chapter card, observation brief, five signal silhouettes, anomaly and three large action instruments remain visible without overlap. The bottom dock stays reachable and the field prompt remains legible. At 844×390 landscape, the observation field occupies the left content area while actions move into a dedicated right rail; labels remain readable and touch targets are separated. Both checks used the fully rebuilt showcase rather than the former clicker layout.

## Low-landscape regression fix

The first low-landscape screenshot revealed that the inherited 350px minimum sky height hid the dock. Removing that minimum initially collapsed the field; the compact landscape rule now explicitly makes the field fill its assigned grid track. The final 844×390 screenshot shows the complete constellation field, action rail and bottom dock simultaneously, with no overlap or clipped controls.

## Fresh showcase and console check

A fresh Russian demo launch rendered the Blind Star observation, the five differentiated signal forms, the action rail and all three dock destinations. The browser console produced no output, indicating no detected script or asset-loading errors in the final showcase path.

## Audio gesture test setup

The showcase was restarted with music enabled, then the player selected a signal. This executes the same first-gesture audio-unlock path used in the normal game. The local HTTP server returns `assets/atlas-echoes-nocturne.mp3` successfully with `Content-Type: audio/mpeg`.

## Audio loading hardening

The music engine now explicitly calls `HTMLAudioElement.load()` only when its network state is empty after the first authorized gesture, then invokes `play()`. This makes the background loop request resilient in embedded WebViews while preserving the no-autoplay design. The headless browser’s resource timing list remains empty for this media element, so it is not used as a playback verdict; JavaScript syntax checks and direct HTTP checks pass.

A concise engine-level status is available solely for the final QA path; it reports unlock status, settings, media network readiness, source and any media error without affecting gameplay.

## Audio playback confirmed

Immediately after selecting a signal, the music status reported `unlocked: true`, `enabled: true`, `paused: false`, `networkState: 1`, `readyState: 4`, the expected local MP3 source and no media error. The background loop is therefore loaded and playing after a real gameplay gesture; the absence of an entry in the headless resource-timing list is an instrumentation limitation, not a playback failure.

## Settings controls check

The settings sheet uses a wide, clearly selected RU/EN segmented control rather than square language buttons. Background music, observation effects, haptics and sky motion are each shown as separate labelled pill switches with `role="switch"`, descriptive helper text and visible on-state. The controls are legible and comfortably spaced at desktop width.

## English localization check

Switching to English immediately translated the document title, chapter, counters, observation brief, signal names and traits, anomaly label, three primary actions, dock, settings title, section labels, descriptions and switch states. The English showcase displayed no untranslated runtime key or clipped primary text at desktop width.

## New-player check setup

Only the current game’s two progress keys and its language key were removed from local browser storage. No account, external service or unrelated browser data was accessed or changed.

## New-player flow check

With no save present, the game opened on Chapter Silence with zero records, a clean field of five differentiated signals, a direct first-observation prompt and the Listen action available. The Atlas correctly displayed a quiet-state explanation and anomaly placeholder rather than an empty or broken grid. This confirms the first-player route is clear and does not inherit demo content.
