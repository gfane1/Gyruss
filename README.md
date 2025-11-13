# Gyruss HTML5

A modern HTML5/Canvas remake of Konami's classic *Gyruss* (1983) arcade game, featuring neon vector graphics, particle effects, and Xbox Live Arcade-style polish.

## Quick Start

Serve the files with a local web server and open `index.html` in your browser:

**Python:**
```bash
python -m http.server 8000
```

**Node:**
```bash
npx http-server -p 8000
```

**VS Code:**
Use the Live Server extension and click "Go Live"

Then open http://localhost:8000 in your browser.

⚠️ **Important:** Do NOT open `index.html` via `file://` — audio and module loading will fail. Always use HTTP.

## How to Play

- **Rotate:** `←` / `→` arrow keys or `A` / `D`
- **Fire:** `Space` bar
- **Sound toggle:** `S` key or click the button

### Objective
Orbit around the screen's perimeter and fire inward to destroy enemies. Clear waves to warp through planets (Neptune → Earth → The Core), collect power-ups from satellites, and defeat the final boss.

## Dev/Debug Keys

- `T` — Toggle invulnerability
- `W` — Warp skip (jump to next wave)
- `B` — Skip to boss battle
- `M` — Fire missile
- `R` — Restart (after game over)

## Architecture

The game uses a modular structure with a global `Gyruss` namespace:

- **`index.html`** — Entry point, loads all scripts in order
- **`src/utils.js`** — Math helpers (polar coords, angle wrapping, distance checks)
- **`src/audio.js`** — Web Audio API sound effects and music handling
- **`src/entities.js`** — Player, Enemy, Bullet, Missile, Satellite, Particle classes
- **`src/boss.js`** — Cosmic Serpent boss entity
- **`src/game.js`** — Game state, main loop, wave spawning, collision detection

### Key Patterns

- **Coordinate system:** Polar (angle + radius) — use `Gyruss.Utils.polarToCartesian()`
- **Frame delta:** All movement uses `dt` for frame-rate independence
- **Entity lifecycle:** `update(dt)` / `draw(ctx)` pattern
- **Collision:** Distance-squared checks (`Gyruss.Utils.distSq`)

## Project Structure

```
Gyruss/
├── .github/
│   └── copilot-instructions.md  # AI agent guidance
├── src/
│   ├── audio.js                 # Sound system
│   ├── boss.js                  # Boss entities
│   ├── entities.js              # Game entities
│   ├── game.js                  # Core game loop
│   └── utils.js                 # Helper functions
├── bgm.mp3                      # Background music (optional)
├── Design.md                    # Full design specification
├── index.html                   # Entry point
└── README.md                    # This file
```

## Adding Features

**New weapon:**
1. Add entry to `Gyruss.C.WEAPONS` in `src/game.js`
2. Update `Gyruss.Player.fire()` in `src/entities.js`
3. Update `Gyruss.Bullet.draw()` for visual effects

**New power-up:**
1. Add entry to `Gyruss.C.UPGRADES` in `src/game.js`
2. Implement behavior in `Gyruss.Player.applyUpgrade()` in `src/entities.js`

**New enemy wave:**
1. Create spawn function in `Gyruss.Game` (e.g., `spawnSpiralWave`)
2. Add new `Gyruss.Enemy(...)` instances with custom config

See `.github/copilot-instructions.md` for detailed guidance.

## Technical Details

- **Platform:** HTML5 Canvas + JavaScript (ES5+)
- **Audio:** Web Audio API (synthesized SFX) + `<audio>` for BGM
- **No build step** — vanilla JS, no transpilation or bundling
- **Browser support:** Modern browsers with Canvas 2D and Web Audio API

## Credits

Original game by Konami (1983). This is an independent remake for educational purposes.

## License

See repository for license information.
