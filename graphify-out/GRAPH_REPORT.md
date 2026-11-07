# Graph Report - 01a1a9fa-cc3e-7340-802c-f358f789a0a1  (2026-11-07)

## Corpus Check
- 37 files · ~17,574 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .css 6, (none) 2)

## Summary
- 390 nodes · 590 edges · 20 communities (12 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `130ae6bc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- IndexedDB Persistence
- Core Game Engine
- App
- Game Features
- package.json
- PixiGameScene.ts
- PWA Manifest
- Audio and Pronunciation
- UIManager
- WORD SHOOTER — product analysis and rebuild blueprint
- Player Profiles
- Static Site Deployment
- Offline Service Worker
- Product
- compilerOptions
- DocExporter
- i18n.js
- sentence-manager.js
- main.tsx
- deploy

## God Nodes (most connected - your core abstractions)
1. `App` - 26 edges
2. `GameEngine` - 26 edges
3. `UIManager` - 19 edges
4. `compilerOptions` - 18 edges
5. `AudioManager` - 13 edges
6. `DB` - 13 edges
7. `VocabManager` - 13 edges
8. `PixiGameScene` - 11 edges
9. `WORD SHOOTER — product analysis and rebuild blueprint` - 10 edges
10. `7. Existing codebase analysis (Graphify baseline)` - 10 edges

## Surprising Connections (you probably didn't know these)
- `7. Existing codebase analysis (Graphify baseline)` --references--> `App`  [INFERRED]
  REBUILD_PLAN.md → js/app.js
- `7. Existing codebase analysis (Graphify baseline)` --references--> `AudioManager`  [INFERRED]
  REBUILD_PLAN.md → js/audio-manager.js
- `7. Existing codebase analysis (Graphify baseline)` --references--> `DB`  [INFERRED]
  REBUILD_PLAN.md → js/db.js
- `7. Existing codebase analysis (Graphify baseline)` --references--> `UIManager`  [INFERRED]
  REBUILD_PLAN.md → js/ui-manager.js
- `7. Existing codebase analysis (Graphify baseline)` --references--> `VocabManager`  [INFERRED]
  REBUILD_PLAN.md → js/vocab-manager.js

## Import Cycles
- None detected.

## Communities (20 total, 8 thin omitted)

### Community 0 - "IndexedDB Persistence"
Cohesion: 0.07
Nodes (13): app, audioManager, DB, db, fallbackCards, fallbackPlayers, profileManager, SpacedRepetition (+5 more)

### Community 1 - "Core Game Engine"
Cohesion: 0.14
Nodes (3): AnswerChecker, GameEngine, 7. Existing codebase analysis (Graphify baseline)

### Community 3 - "Game Features"
Cohesion: 0.15
Nodes (14): Per-device IndexedDB storage, Vocabulary game modes, Multiple player profiles on one device, Vocabulary and accessibility settings, WORD SHOOTER game interface, Canvas 2D game engine, Fuzzy answer checker using Levenshtein distance, Survival, timed, and practice game modes (+6 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (45): author, bugs, url, dependencies, gsap@^3.15.1, howler@^2.2.4, pixi.js@^8.22.0, tailwindcss@^4.3.4 (+37 more)

### Community 5 - "PixiGameScene.ts"
Cohesion: 0.05
Nodes (14): parseBulkWords(), getGameTheme(), themes, characterStates(), EngineFrame, PixiGameScene, PointParticle, Star (+6 more)

### Community 6 - "PWA Manifest"
Cohesion: 0.18
Nodes (10): background_color, categories, description, display, icons, name, orientation, short_name (+2 more)

### Community 8 - "UIManager"
Cohesion: 0.09
Nodes (19): setFeedback(), timers, escapeHtml(), formatDate(), icons, modeNames, UIManager, uiManager (+11 more)

### Community 9 - "WORD SHOOTER — product analysis and rebuild blueprint"
Cohesion: 0.12
Nodes (15): 1. Product from zero, 2. Product rules, 3. What stays, what goes, 4. New screen architecture, 5. Visual specification, 6. Layout and fair-play budgets, 8. Implementation sequence, 9. Completion criteria (+7 more)

### Community 13 - "Product"
Cohesion: 0.20
Nodes (9): Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles, Product Purpose (+1 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, checkJs, isolatedModules, jsx, lib, module (+11 more)

### Community 18 - "main.tsx"
Cohesion: 0.25
Nodes (3): react-dom@^19.3.1, react-dom, rootElement

### Community 19 - "deploy"
Cohesion: 0.06
Nodes (32): runs-on, steps, concurrency, cancel-in-progress, group, environment, needs, permissions (+24 more)

## Knowledge Gaps
- **10 isolated node(s):** `GitHub Pages deployment`, `Static HTML/CSS/JavaScript website`, `Per-device IndexedDB storage`, `Multiple player profiles on one device`, `Vocabulary and accessibility settings` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 187 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `7. Existing codebase analysis (Graphify baseline)` connect `Core Game Engine` to `IndexedDB Persistence`, `App`, `Audio and Pronunciation`, `UIManager`, `WORD SHOOTER — product analysis and rebuild blueprint`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `GitHub Pages deployment`, `Static HTML/CSS/JavaScript website`, `Per-device IndexedDB storage` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `IndexedDB Persistence` be split into smaller, more focused modules?**
  _Cohesion score 0.06845513413506013 - nodes in this community are weakly interconnected._
- **Why does `GameEngine` connect `Core Game Engine` to `IndexedDB Persistence`, `App`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `Core Game Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._
- **Why does `App` connect `App` to `IndexedDB Persistence`, `Core Game Engine`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.056429232192414434 - nodes in this community are weakly interconnected._