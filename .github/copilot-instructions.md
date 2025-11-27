# Copilot / AI Agent Instructions — Gyruss

Purpose: Quickly orient an AI coding agent to be productive in this repository containing two implementations of the Gyruss arcade game.

## Repository Structure

This repository contains **two complete implementations** of the Gyruss arcade game:

1. **`gyruss-html-js/`** — Original HTML5/JavaScript version (working reference implementation)
2. **`gyruss-godot/`** — Godot Engine 4.5.1 port (faster but with missing features)

**IMPORTANT**: When the user asks you to work on the project, determine which codebase they're referring to. The HTML/JS version is more feature-complete. The Godot version is faster but lacks many visual effects and polish.

## Project-Specific Documentation

Each implementation has its own comprehensive documentation:

### For HTML/JS Implementation (`gyruss-html-js/`)
- **ARCHITECTURE.md** — Technical architecture, rendering pipeline, coordinate systems
- **PROJECT-OVERVIEW.md** — High-level game structure, entity relationships, game flow
- **CODING-GUIDELINES.md** — Code style, naming conventions, patterns, best practices
- **design.md** — Complete design specification with all features documented

### For Godot Implementation (`gyruss-godot/`)
- **ARCHITECTURE.md** — GDScript architecture, autoload singletons, scene structure
- **PROJECT-OVERVIEW.md** — Godot-specific game structure, node hierarchy, signals
- **CODING-GUIDELINES.md** — GDScript style, Godot conventions, performance patterns
- **design.md** — Current implementation status and feature parity with HTML/JS

Refer to the appropriate documentation files based on which codebase you're working with.

---

## HTML/JS Implementation (`gyruss-html-js/`)

### Entry Point & Structure
- **Entry point:** `index.html` (loads `src/utils.js`, `src/audio.js`, `src/entities.js`, `src/boss.js`, `src/game.js`).
- **Authoritative code:** work in `src/` files. The modular `src/` files are the active codepath used by `index.html`.

Architecture (big picture):
- `Gyruss.C` (`src/game.js`) — global constants and configuration (screen size, weapons, upgrades).
- `Gyruss.Game` (`src/game.js`) — singleton game state, main loop (`requestAnimationFrame`), spawn/flow logic.
- `Gyruss.*` classes (`src/entities.js`) — Player, Enemy, Bullet, Missile, Satellite, Particle.
- `Gyruss.CosmicSerpent`, `Gyruss.StarDestroyer`, `Gyruss.GalacticCore` (`src/boss.js`) — three epic boss entity classes with Xbox Live Arcade quality graphics, dynamic movement, aggression scaling, and cinematic 4-6 second destruction sequences.
- `Gyruss.Audio` (`src/audio.js`) — Web Audio API sfx and bgm handling; `bgm.mp3` expected next to `index.html`.
- `Gyruss.Utils` (`src/utils.js`) — small math helpers (polar/cartesian, rand, distSq).

Key patterns & conventions (project-specific):
- Global namespace: modules attach to `window.Gyruss` (not using ES modules). Keep new modules on `Gyruss`.
- Game loop uses dt (frame delta) everywhere for time-based motion. Use `update(dt)` / `draw(ctx)` pattern for entities.
- Spatial system: polar coordinates (angle + radius). Use `Gyruss.Utils.polarToCartesian()` and `Gyruss.Utils.wrapAngle()`.
- Collision: distance-squared checks with `distSq` helpers — follow existing sizes to keep consistent hitboxes.
- Entity storage: arrays on `Gyruss.Game` (e.g., `Gyruss.Game.enemies`, `Gyruss.Game.bullets`) and in-place filtering during update.

Dev workflows / how to run locally:
- There is no build step — serve the files via a static web server and open `http://localhost:PORT`.
  - Python: `python -m http.server 8000`
  - Node: `npx http-server -p 8000`
  - VS Code: use the Live Server extension.
- Do NOT open `index.html` via `file://` — audio/BGM and module loading can fail. Use HTTP.

Debugging / handy dev keys (runtime shortcuts):
- `←` / `→` or `A` / `D`: rotate player
- `Space`: fire (continuous when held)
- `T`: toggle invulnerability (preserves weapons/upgrades in test mode)
- `W`: warp (skip wave/stage)
- `B`: jump to boss (cycles through all 3 boss types)
- `M`: fire missile (homing with blast radius)
- `S`: toggle sound (also `#soundToggle` button)

Examples of common edits and where to make them:
- Add/change weapons: update `Gyruss.C.WEAPONS` in `src/game.js`, implement firing logic in `Gyruss.Player.fire()`, add visual effects in `Gyruss.Bullet.draw()`, and add sound in `src/audio.js`.
- New upgrade/power-up: add entry to `Gyruss.C.UPGRADES` (`src/game.js`) and implement behavior in `Gyruss.Player.applyUpgrade()` (`src/entities.js`).
- New boss: create class in `src/boss.js` following pattern of existing enhanced bosses (with `isDestroying`, `deathTimer`, dynamic movement, trail effects), add to `createBoss()` switch in `src/game.js`.
- Boss enhancements: add trail effects arrays, aggression scaling based on health ratios, charging mechanics, epic destruction sequences with multiple explosion phases.
- New enemy/wave pattern: add a spawn helper in `Gyruss.Game` (e.g., `spawnSpiralWave` in `src/game.js`) and push a `new Gyruss.Enemy(...)`.
- Audio changes: edit `src/audio.js` (sfx functions live there) and ensure `Gyruss.Audio.initAudioContext()` is called before playing.
- Visual effects: enhanced particle system in `Gyruss.Particle` class with multiple types (normal, spark, smoke, explosion), spectacular explosion spawning in `Gyruss.Game.spawnExplosion()`, screen shake effects, energy beam rendering.
- Enhanced graphics: 4-tier starfield system, 3-layer animated nebula, detailed player ship with multi-layer thrusters, advanced enemy designs with variants, spectacular weapon effects with energy cores.

Integration points / external dependencies:
- `bgm.mp3` (optional) placed beside `index.html` for background music. If missing, audio code falls back gracefully.
- Runs in modern browsers with Web Audio API support. If unsupported, `console.warn` messages appear — tests are manual in-browser.

Editing guidance / safety:
- Prefer editing `src/*.js` files (they are modular and reflect the intended structure).
- Keep the global `Gyruss` namespace intact; other parts of the code expect `Gyruss.C`, `Gyruss.Game`, and `Gyruss.Audio`.
- Maintain script load order in `index.html` (utils → audio → entities → boss → game) when adding new scripts.

Notes & pitfalls discovered in code:
- The repository uses the modular `src/` files as the single active entrypoint; edit the `src/` modules only.
- Weapon persistence: Special weapons (Plasma/Wave) persist through warps, boss victories, and planet changes. Only reset on life loss or start of new satellite cycles.
- Boss destruction: All bosses use `isDestroying` flag and `deathTimer` for 4-6 second cinematic destruction sequences instead of instant victory.
- Boss scaling: Movement speed, firing rates, and visual effects intensify as boss health decreases using health ratios and aggression multipliers.
- Enhanced graphics: Game now features Xbox Live Arcade quality visuals with 4-tier starfield, detailed ship designs, advanced particle effects, and spectacular weapon rendering.
- Browser compatibility: Use `save()/scale()/arc()/fill()/restore()` pattern instead of `ellipse()` for better browser support.

If anything here is unclear or you'd like me to expand examples (e.g., add a short patch that adds a new weapon or upgrade), tell me which area to update and I'll iterate.
---

## Godot Implementation (`gyruss-godot/`)

### Entry Point & Structure
- **Entry point:** `scenes/main.tscn` (main game scene with MainRenderer and UIRenderer nodes).
- **Project file:** `project.godot` (Godot 4.5.1 project configuration).
- **Authoritative code:** `scripts/` folder containing autoloads, entities, bosses, and rendering systems.

### Architecture (big picture):
- **Constants** (`scripts/autoload/constants.gd`) — global constants singleton (screen size, weapons, upgrades, math utilities).
- **GameManager** (`scripts/autoload/game_manager.gd`) — singleton game state, main loop, spawn/flow logic, entity management.
- **InputHandler** (`scripts/autoload/input_handler.gd`) — centralized input handling for all controls.
- **AudioManager** (`scripts/autoload/audio_manager.gd`) — placeholder sound system (prints to console).
- **MainRenderer** (`scripts/rendering/main_renderer.gd`) — global canvas with 14-layer rendering pipeline.
- **UIRenderer** (`scripts/rendering/ui_renderer.gd`) — HUD overlay on CanvasLayer for UI elements.
- Entity classes (`scripts/entities/`) — PlayerEntity, EnemyEntity, BulletEntity, MissileEntity, SatelliteEntity, Particle (all use class_name for global access).
- Boss classes (`scripts/bosses/`) — BossBase, CosmicSerpent, StarDestroyer, GalacticCore.

### Key patterns & conventions (Godot-specific):
- Global class names: All entities and bosses use `class_name` to be globally accessible without preload.
- Dictionary-based entities: Enemies, bullets, missiles, satellites stored as Dictionary objects in arrays on GameManager.
- Polar coordinates: Identical system to HTML/JS (angle + radius). Use `Constants.polar_to_cartesian()` and `Constants.wrap_angle()`.
- Autoload singletons: Access via `GameManager`, `Constants`, `InputHandler`, `AudioManager` from any script.
- Global rendering: Single MainRenderer._draw() method handles all visual layers (no per-node _draw() calls).

### Dev workflows / how to run locally:
- **Requirements:** Godot Engine 4.5.1 (download from https://godotengine.org/download)
- **Open project:** Import → Navigate to `gyruss-godot/project.godot` → Import & Edit
- **Run game:** Press F5 or click Play button
- **Controls:** Same as HTML/JS version (←/→, Space, T, W, B, M, S, R)

### Known Limitations (see differences.md for full list):
- Audio is placeholder (console prints only, no actual sounds)
- Missing visual effects: nebula background, enhanced particle trails, screen shake
- Simplified boss graphics compared to HTML/JS version
- No extra life system at score thresholds
- Weapon effects less spectacular than HTML/JS

### Examples of common edits and where to make them:
- Add/change weapons: update `Constants.WEAPONS` dict, implement firing in `player.gd`, add visuals in `main_renderer.gd`.
- New upgrade/power-up: add to `Constants.UPGRADES` and implement in `PlayerEntity.apply_upgrade()`.
- New boss: create class in `scripts/bosses/` inheriting from BossBase, add to `GameManager.create_boss()`.
- New enemy/wave pattern: add spawn function in `GameManager`, use `EnemyEntity.create()` factory.
- Audio changes: edit `audio_manager.gd` (currently placeholder, needs Web Audio API equivalent).
- Visual effects: enhance `main_renderer.gd` drawing functions, add particle types in `create_particle()`.

### Integration points / external dependencies:
- Godot Engine 4.5.1 required (earlier versions may have compatibility issues)
- No external assets currently (all graphics drawn procedurally in _draw())
- Future: Add sprite sheets in `assets/` folder for enhanced graphics

### Editing guidance / safety:
- Prefer editing `scripts/` files (modular structure matching HTML/JS).
- Keep autoload singletons intact (other scripts depend on them).
- Use class_name instead of const preload to avoid "duplicate name" warnings.
- Always test in Godot editor after changes (no external build step).

### Notes & pitfalls discovered in code:
- **Coordinate system:** Enemies spawn at NEGATIVE radius, move INWARD. Stars spawn at center, move OUTWARD.
- **Weapon persistence:** Weapons persist through warps (same as HTML/JS). Reset only on life loss.
- **Warp counter:** 3 warps per planet, tracked by `warps_to_planet` (decrements each warp).
- **Boss destruction:** Uses `is_destroying` flag and `death_timer` for cinematic sequences.
- **Ternary operators:** GDScript doesn't support `condition ? true : false`. Use `if/else` or inline `true if condition else false`.
- **Dictionary syntax:** Use `.get("key", default)` for safe access instead of direct `dict["key"]`.

---

## Determining Which Codebase to Work On

When the user makes a request, use these guidelines:

1. **Explicit mentions:** If user says "HTML version", "JavaScript version", "Godot version", "Godot port" — work on that specific codebase.
2. **File path clues:** If they reference `src/` files → HTML/JS. If they reference `scripts/` or `.gd` files → Godot.
3. **Context clues:** 
   - "Visual effects", "polish", "enhanced graphics" → likely HTML/JS (more complete)
   - "Performance", "faster", "Godot issues" → likely Godot version
4. **Default:** If ambiguous, ask which version they want to work with, or propose changes to both if applicable.

## Cross-Implementation Knowledge Transfer

When porting features from HTML/JS to Godot:
- HTML Canvas → Godot _draw() with draw_* methods
- requestAnimationFrame → _process(delta) or _physics_process(delta)
- JavaScript classes → GDScript classes with class_name
- Array methods (push, filter, map) → GDScript equivalents (append, in-place removal, comprehensions)
- Math.PI → PI constant, Math.random() → randf()
- Web Audio API → Godot AudioStreamPlayer nodes (future enhancement)