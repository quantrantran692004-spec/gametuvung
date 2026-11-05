# WORD SHOOTER — product analysis and rebuild blueprint

## 1. Product from zero

**Genre:** an arcade space shooter with vocabulary as its reflex mechanic.

**Player fantasy:** an old-school starfighter is at the bottom of the screen. English targets descend through space. The game speaks each word; its Vietnamese meaning is printed on the target. The player recalls and types the English word. A correct answer launches a visible projectile and bursts the target into pixels.

**Main outcome:** get quicker at recognizing and recalling English words while keeping the action readable and satisfying.

**Design reference:** the broad visual language of popular classic space arcade games: near-black starfield, chunky pixel geometry, bright limited-color sprites, high-contrast score display and an always-visible shooter. Build an original screen and assets; do not preserve the current web-dashboard composition or copy a specific game's artwork.

## 2. Product rules

- A round always asks for **Vietnamese clue → English answer**. No mode reverses this direction.
- Speaking the English target is part of the round, not a secondary control.
- A fully correct answer fires automatically. Enter / the on-screen FIRE key submits when needed; typing should not require a hunt for a separate action button.
- The full English word stays visible on every falling target; typed characters appear only in the answer field above the game keyboard.
- A correct full word fires the cannon. The projectile visibly travels to the still-visible target; the target bursts only when the projectile arrives.
- The arena gets the largest share of the viewport. The keyboard remains reachable without scrolling or opening the phone's system keyboard.
- Every falling speed is defined by a **time-to-impact budget**, not a fixed pixel speed that makes a short phone viewport unfair.
- Visual effects celebrate hits, but motion and screen shake must not hide text or controls.

## 3. What stays, what goes

### Keep and reconnect

- Static app / PWA delivery and existing service-worker/offline behavior.
- IndexedDB profiles, vocabulary and session history.
- Vocabulary add/edit/delete, favorites, search, TXT/CSV/XLSX import and JSON backup.
- Answer checking, speech synthesis, sound feedback, spaced-repetition updates and score history.
- Canvas simulation where it already supports falling words, aiming, bullets, explosions and combo.

### Replace or remove

- The generic dashboard look and any page composition that makes the arena feel like a small embedded widget.
- The current muted cabinet palette and soft, rounded, generic card styling.
- Decorative labels, duplicated instructions, hint/replay controls that consume space during a round, and empty HUD fields.
- The unused/broken Word export path and disconnected legacy game screens/handlers.
- Any gameplay code that gives phones less reaction time simply because their canvas is shorter.

## 4. New screen architecture

### Arcade home

One prominent **VÀO TRẬN** control; mode, word pool and speed are adjacent setup choices. Show only one small record/progress strip beneath it. Preserve navigation to word collection, records and settings as secondary destinations. The home screen should look like the title/lobby of a game rather than an analytics dashboard.

### Live arena

1. **Top rail:** compact game mark at left; pause and exit at right. Remove player/session copy from the center.
2. **HUD rail:** score, mode-appropriate timer/progress and combo/lives in one shallow strip. Never spend a full row on explanatory copy.
3. **Play field:** fill all remaining height and width. Near-black navy starfield with a few pixel stars, subtle horizon, square neon frame and no prose labels. Targets are crisp, square-edged cards with a large Vietnamese clue and masked English answer. The cannon is unmistakable at the bottom center and visibly turns/fires toward the selected target.
4. **Input dock:** one compact answer field and three-row QWERTY keyboard. No extra hint, replay, spacebar or second fire button. The final row includes delete and a readable **BẮN** key. Desktop hardware keyboard and touch keys go through the same answer handler.

### Pause and results

Use one centered, pixel-edged overlay over the same arena: resume/replay/return on pause; score, hits, accuracy and next action at results. Persist a completed round once.

### Collection, records and settings

Keep these as secondary game-world panels with the same navy/blue frame, sharp corners and limited neon palette. Keep existing data and import flows. Don't let utility panels leak into the active arena.

## 5. Visual specification

- **Art direction:** an original arcade title screen and shooter scene, with a visible pixel starfighter and pixel explosions. The home screen must read as a game menu before it reads as a website.
- **Base:** deep space plum `#140D23` / panel `#211632` / raised panel `#32214B`.
- **Frame:** vivid violet `#7546A8` with cream `#FFF4D6` text.
- **Gameplay accents:** arcade yellow `#FFE66D` for primary action and score, hot pink `#FF5D8F` for shots and danger, mint `#A0FF92` for success/targets.
- Use hard contrast: unselected modes still look like large, readable buttons; selected mode is filled yellow with dark text. Controls have a clear hit area and an obvious selected state.
- Prefer square corners, stepped/pixel details and pixel-sized stars over glass panels, low-contrast navy controls, blurred neon gradients or a science-fiction control-room aesthetic.
- Use compact mono/condensed labels for arcade HUD; use clear, larger labels for menu and mode choices at phone size.

## 6. Layout and fair-play budgets

- Game screen uses the full dynamic viewport (`100dvh`) and safe-area insets.
- Header target: 38 px; HUD target: 42 px; no center title row or arena instructions.
- Desktop keyboard rows: about 25 px; phone rows: 30–34 px with visible pressed state. The answer field sits directly above them.
- The arena flexes into every remaining pixel and stays at least 180 px high on a small phone landscape layout.
- Spawn at the top edge with enough horizontal margin for the full clue card. Avoid spawning a stack of targets above the visible screen.
- Reaction-time budgets: practice 22 s; slow 18 s; normal 14 s; fast 9 s from spawn to impact. Derive fall speed from actual arena height and elapsed time so desktop and phone have the same budget. Keep spawn cadence slow enough to leave the active field readable (practice uses the existing longer interval).
- Keep simultaneous targets capped at three on narrow screens and six on desktop; do not increase this cap to fill empty space.

## 7. Existing codebase analysis (Graphify baseline)

- This is a static HTML/CSS/JavaScript project with no build step.
- The baseline graph contained 155 nodes, 274 edges and 13 communities. Core hubs: `GameEngine` (26 edges), `VocabManager` (13), `App` (12), `AudioManager` (12), `DB` (12), `UIManager` (10).
- The usable loop already exists: `App.startNewGame()` creates `GameEngine`; `spawnWord()` selects a word and speaks it; typing and answer-check methods select a target; `triggerHit()` updates score/review and starts projectile effects; `render()` paints the field; `endGame()` returns results for persistence.
- Keep the storage and answer-checking core. Rebuild the interaction layer and visual expression around it. `App` still coordinates unrelated workflows and the canvas/game logic directly imports audio and vocabulary services; keep changes scoped so the rewrite doesn't reset profiles or vocabulary.
- The current shipped fall speed is a fixed pixels-per-frame value. It therefore gives less reaction time on a shorter phone canvas. The rebuild replaces that with the reaction-time budget in section 6.
- Refresh `graphify-out/` after all source changes.

## 8. Implementation sequence

1. **Finish product decisions and this blueprint** before more one-off styling. Treat user direction as the source of truth: new classic space arcade game, vivid readable palette, full arcade lobby and a clearly visible firing animation.
2. **Rebuild the live-game layout** to the four-rail structure above. Remove in-arena prose and center session labels; compress the keyboard without sacrificing touch access.
3. **Rebuild the art direction** across home and utility panels: midnight starfield, pixel geometry and limited cyan/yellow/lime/magenta palette.
4. **Normalize the game loop**: height-aware time-to-impact, top-edge spawns, fixed Vietnamese→English flow, one input path, visible cannon shot and hit/miss effects.
5. **Reconnect existing product features** to the new home, collection, records, pause and results views; preserve saved data.
6. **Review actual desktop and phone layouts** for arena share, word readability, reaction time, keyboard fit and stray controls. Apply corrections from the rendered screen.
7. **Update design/product notes and Graphify output** so the repo describes the finished game rather than the former direction.

## 9. Completion criteria

- The screen reads immediately as a classic space arcade game, not a web page.
- A large, open starfield contains clearly falling targets and a visible, animated cannon.
- The answer can be typed with hardware keys or the in-game keyboard; a correct answer produces an unmistakable shot and pixel burst.
- Main gameplay uses no scrolling on desktop or phone portrait; the arena dominates the viewport and the keyboard does not invoke the phone system keyboard.
- Each speed has its documented time-to-impact budget on both phone and desktop.
- Hit/miss, accuracy, combo/lives and results remain consistent with persisted session and vocabulary progress.
- Existing profiles and word lists survive the redesign.
