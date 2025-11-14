# Copilot / AI Agent Instructions — Gyruss (HTML5)

Purpose: Quickly orient an AI coding agent to be productive in this repository.

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
