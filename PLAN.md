# Game Plan: Сердце Туманности 2.0

## Visual target

The visual target is a calm but high-energy 2D cosmic control room: a cyan living core stays central, the HUD remains compact, and the bottom dock preserves the three original actions. The generated reference is stored at `/home/ubuntu/webdev-static-assets/nebula-heart-visual-target.png` and defines the palette, central scale, dark-space contrast, and restrained glow density.

## Risk Tasks

### 1. Safe evolution of existing player saves

- **Why isolated:** Existing cloud and local saves use unversioned arrays. New persistent systems must not invalidate current progress or assume all fields are present.
- **Approach:** Introduce a versioned migration and sanitisation layer that pads legacy arrays, clamps malformed numbers, initializes new structures, and serializes a compact state envelope.
- **Verify:** A legacy save containing only the version 1.1 fields loads without an exception; its dust, gravity, orbits, harmonies, signals, remnants, language and sound settings are retained.

### 2. Time-based engagement systems

- **Why isolated:** Daily constellations, expeditions and rifts combine real time, offline progress and user-device clocks. Poor handling can duplicate rewards or make time events inaccessible.
- **Approach:** Use one coherent clock provider, prefer GamePush server time when available, store a claimed day key and expedition finish timestamp, and make every reward idempotent.
- **Verify:** Re-opening the game after a completed expedition gives its reward exactly once; changing screen orientation or opening a sheet does not reset a rift or mission state.

### 3. Browser audio lifecycle

- **Why isolated:** Mobile browsers reject autoplay, ads trigger platform pause events, and continuous music must never continue in a hidden tab.
- **Approach:** Build a small Web Audio sequencer that unlocks after first gameplay gesture, uses separate music/effect gains, respects player settings and reduced-motion preference, and suspends/resumes on application pauses.
- **Verify:** The first core interaction unlocks audio without console errors; the music fades out on pause/hidden state and resumes only when allowed; disabling sound makes all game audio silent.

## Main Build

The new version keeps the core tap, three-button dock and bottom-sheet navigation. It extends the current idle loop with **Constellation Contracts** (three daily goals that reward stellar keys), **Deep-Space Expeditions** (a timed, one-active-at-a-time choice that brings targeted rewards), **Celestial Research** (permanent, unlockable research nodes paid with keys), **Anomaly Chains** (short rift streaks that reward precise reactions), and **Discovery milestones** tied to forms and collapse count. The player gets strategic choices without forcing more persistent screens into the primary interface.

The user interface will gain a concise Mission/Expedition status strip in the stage area, semantic button labels, explicit affordability and cooldown states, a one-hand portrait layout, and a desktop/landscape layout that uses side information instead of leaving unused space. Typography will use a system-safe high-legibility stack and fluid sizes. Motion, haptics and sound remain optional and safe for mobile browsers.

- **Assets needed:** One generated visual target for art direction; the in-game background will use CSS gradients, stars and a low-opacity local atmospheric layer to remain small, fast and compatible with GamePush ZIP hosting.
- **Verify:**
  - Tap input reliably produces dust, feedback and optional haptic response.
  - Every dock, sheet and menu button has a visible state and a working handler.
  - Portrait, narrow landscape and desktop layouts have no overflow, clipped buttons or unreadable labels.
  - Legacy and newly created saves load safely; offline income is capped and correctly reported.
  - Ads are only requested from explicit player actions or the collapse transition; gameplay pauses around platform overlays.
  - No browser console errors occur during boot, a purchase, a rift, an expedition claim, research purchase, a collapse and a settings change.
  - The result remains consistent with the reference: dark navy field, cyan/violet focus, readable HUD, central luminous core and three-part dock.

## Content and retention principles

The game deliberately avoids forced timers, predatory interruption or navigation bloat. Daily contracts create a short return reason, expeditions create a medium-term reason, research and collapses create long-term goals, and rift chains turn the central tap from passive repetition into occasional high-attention moments. Every system is introduced contextually and can be understood without a tutorial wall.
