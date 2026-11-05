# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Vietnamese-speaking people practising English vocabulary. This is inferred from the Vietnamese prompts and English answers in the current product; age, proficiency level, and learning setting are open.

## Product Purpose

WORD SHOOTER helps players recall English vocabulary through short rounds that ask them to retrieve and type a word. Success means remembering more words over time while keeping practice approachable.

## Positioning

The game pairs active vocabulary recall with the feel of a classic space arcade shooter. Spoken English targets descend through a starfield; the player types the English word from a Vietnamese clue and a starfighter shoots it. It works offline and keeps vocabulary, profiles, and progress on the current device.

## Operating Context

Players use the web app on desktop or phone, sometimes offline. They can maintain a local word bank, import and export it, play a short session, and return to due words later.

## Capabilities and Constraints

- Existing product name: WORD SHOOTER.
- Static HTML, CSS, and JavaScript; no build step.
- IndexedDB stores profiles, vocabulary, and sessions per browser/device. There is no cross-device sync.
- A service worker supports offline access.
- CSV, TXT, and JSON are suitable local vocabulary exchange formats.
- The answer direction is Vietnamese clue to English recall; keep that direction consistent through the game.

## Evidence on Hand

- Current source: `index.html`, `js/`, `css/`.
- Product description and feature claims: `README.md`.
- Deployment details: `DEPLOY.md`.
- No external account, remote API, or cross-device sync is present in the current code.
- The player chose a falling-word loop: the English target is spoken while falling, the Vietnamese clue stays visible, and a correct typed answer fires a projectile that breaks the target.
- The primary learning outcome is faster recall and typing reflexes. Desktop and phone are equally important.

## Product Principles

- Ask the player to retrieve a word before revealing it.
- Use mistakes to schedule more practice rather than punish the learner.
- Keep personal progress on-device and usable offline.
- Show real saved progress; do not invent activity or mastery.
