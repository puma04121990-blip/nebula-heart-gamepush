# Development Memory: Сердце Туманности 2.0

## Confirmed baseline

The repository is a public, dependency-free HTML5 GamePush project. It has a mobile-first single-screen composition, a central clicker control, three persistent dock actions and bottom-sheet dialogs. Existing mechanics include passive orbit production, click harmonies, tide multipliers, resonance combos, rifts, auto-tune signals, collapse prestige, remnants, offline income, rewarded ads and GamePush/localStorage saves.

## Decisions that must hold

The central core and the existing three dock actions remain the primary navigation. New retention systems must live in the stage status area or the existing sheets. Russian and English remain equal supported languages. The game must function entirely without GamePush credentials in local mode. Audio must be generated at runtime and unlock only after a player gesture.

## Observed implementation issues

The original project has no save schema version or migration. Its `tick` function calls `renderHud()` and refreshes an open shop every animation frame, which is unnecessary on mobile. Sound is a short click beep only. Wide screens center the portrait column but do not meaningfully use landscape space. GamePush pause events stop economic accrual but do not control audio, haptics or modal focus. The original wrapper correctly waits for `player.ready`, uses a preloader and reserves lower UI space for a sticky banner, but needs a serialised sync queue and orientation/device events.

## Verification notes

The source loaded locally with no console errors. The original portrait-style screen remained readable on the 882×768 visual check but used excessive empty space and presented a narrow modal in landscape. The official GamePush documentation confirms that `player.set` changes require `player.sync`, rewarded advertising must always give a reward, fullscreen advertising must not interrupt gameplay or VK navigation, and sticky banners can occupy 50–100px, or 110px in VK Direct Games. 
