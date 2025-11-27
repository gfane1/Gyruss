# Gyruss - Classic Arcade Game Recreated

Modern recreation of Konami's classic 1983 tube-shooter arcade game *Gyruss*, featuring enhanced Xbox Live Arcade quality visuals, spectacular boss battles, and two complete implementations.

![Game Version](https://img.shields.io/badge/HTML5-v6.2+-blue)
![Game Version](https://img.shields.io/badge/Godot-4.5.1-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎮 About the Game

Gyruss is a space shooter where you pilot a ship around the perimeter of the screen, firing inward to destroy waves of incoming enemies. Battle through the solar system from Neptune to Earth, facing increasingly difficult enemy formations and epic boss battles.

### Key Features

- **360° Orbital Combat** - Player ship rotates around screen perimeter
- **Three Weapon Types** - Laser (fast), Plasma (powerful), Wave (spread)
- **Epic Boss Battles** - Three spectacular multi-stage bosses with cinematic destruction sequences
- **Power-Up System** - Collect satellites for weapon upgrades and temporary abilities
- **Planet Progression** - Journey from Neptune through the solar system to Earth and beyond
- **Enhanced Graphics** - Xbox Live Arcade quality visuals with 4-tier starfield, animated nebula, particle effects

## 📁 Repository Structure

This repository contains **two complete implementations**:

```
Gyruss/
├── gyruss-html-js/        # Original HTML5/JavaScript version (reference implementation)
│   ├── index.html         # Entry point
│   ├── bgm.mp3           # Background music (optional)
│   ├── src/              # Game source code
│   │   ├── game.js       # Core game loop and state
│   │   ├── entities.js   # Player, enemies, bullets, particles
│   │   ├── boss.js       # Three epic boss implementations
│   │   ├── audio.js      # Web Audio API sound effects
│   │   └── utils.js      # Math utilities
│   ├── ARCHITECTURE.md   # Technical architecture
│   ├── PROJECT-OVERVIEW.md
│   ├── CODING-GUIDELINES.md
│   └── design.md         # Complete game design specification
│
├── gyruss-godot/          # Godot Engine 4.5.1 port (faster, missing some effects)
│   ├── project.godot     # Godot project file
│   ├── scenes/           # Game scenes
│   │   └── main.tscn     # Main game scene
│   ├── scripts/          # GDScript source code
│   │   ├── autoload/     # Singleton managers
│   │   ├── entities/     # Entity classes
│   │   ├── bosses/       # Boss classes
│   │   └── rendering/    # Rendering pipeline
│   ├── ARCHITECTURE.md   # Godot architecture
│   ├── PROJECT-OVERVIEW.md
│   ├── CODING-GUIDELINES.md
│   ├── design.md         # Godot implementation status
│   └── TROUBLESHOOTING.md
│
├── differences.md         # Feature comparison between implementations
└── README.md             # This file
```

## 🚀 Quick Start

### Option 1: HTML/JavaScript Version (Recommended for Testing)

The HTML/JS version is the **reference implementation** with all features complete.

#### Requirements
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Local web server (required for audio and proper module loading)

#### Running with VS Code Live Server (Easiest Method)

1. **Install VS Code** (if not already installed):
   - Download from https://code.visualstudio.com/

2. **Install Live Server Extension**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "Live Server" by Ritwick Dey
   - Click Install

3. **Open and Run**:
   ```bash
   # Clone or download this repository
   cd Gyruss/gyruss-html-js
   
   # Open folder in VS Code
   code .
   
   # Right-click index.html → "Open with Live Server"
   # OR click "Go Live" button in status bar
   ```

4. **Game opens in browser** at `http://localhost:5500` (or similar port)

#### Alternative: Python Simple HTTP Server

```bash
cd Gyruss/gyruss-html-js
python -m http.server 8000
# Open browser to http://localhost:8000
```

#### Alternative: Node.js HTTP Server

```bash
cd Gyruss/gyruss-html-js
npx http-server -p 8000
# Open browser to http://localhost:8000
```

**⚠️ Important:** Do NOT open `index.html` directly via `file://` protocol - audio and some features will not work correctly.

#### Adding Background Music (Optional)

Place a file named `bgm.mp3` in the `gyruss-html-js/` folder (next to `index.html`). The game will automatically play it on loop once you press any key.

### Option 2: Godot Version (For Development/Porting)

The Godot version is **faster** but has missing visual effects. Use this for performance testing or as a base for further development.

#### Requirements
- Godot Engine 4.5.1 (exact version required)

#### Setup Instructions

1. **Download Godot Engine 4.5.1**:
   - Visit https://godotengine.org/download
   - Download Godot 4.5.1 (standard version, NOT Mono/.NET)
   - Extract and run `Godot_v4.5.1_win64.exe` (or Mac/Linux equivalent)

2. **Import Project**:
   - Launch Godot
   - Click "Import" button
   - Navigate to `Gyruss/gyruss-godot/project.godot`
   - Click "Import & Edit"
   - Wait for initial import (creates .godot folder)

3. **Run Game**:
   - Press **F5** or click the **Play** button (▶)
   - Game window opens at 900x900 resolution

4. **Known Limitations**:
   - Audio is placeholder (console output only)
   - No nebula background
   - Simplified particle effects
   - Less spectacular boss graphics
   - See `differences.md` for complete list

## 🎯 Game Controls

Both versions use identical controls:

### Basic Controls
- **← / →** or **A / D** - Rotate ship around orbit ring
- **Space** - Fire weapon (hold for continuous fire)
- **M** - Launch homing missile (limited supply)
- **S** - Toggle sound on/off

### Debug/Test Controls (for development)
- **T** - Toggle invulnerability mode
- **W** - Skip to next warp/stage
- **B** - Jump directly to boss battle
- **R** - Restart game

## 📖 Documentation

### HTML/JavaScript Version
- **[ARCHITECTURE.md](gyruss-html-js/ARCHITECTURE.md)** - Technical implementation details
- **[PROJECT-OVERVIEW.md](gyruss-html-js/PROJECT-OVERVIEW.md)** - High-level game structure
- **[CODING-GUIDELINES.md](gyruss-html-js/CODING-GUIDELINES.md)** - Code style and patterns
- **[design.md](gyruss-html-js/design.md)** - Complete game design specification

### Godot Version
- **[ARCHITECTURE.md](gyruss-godot/ARCHITECTURE.md)** - Godot-specific architecture
- **[PROJECT-OVERVIEW.md](gyruss-godot/PROJECT-OVERVIEW.md)** - Scene structure and node hierarchy
- **[CODING-GUIDELINES.md](gyruss-godot/CODING-GUIDELINES.md)** - GDScript conventions
- **[design.md](gyruss-godot/design.md)** - Implementation status and feature parity
- **[TROUBLESHOOTING.md](gyruss-godot/TROUBLESHOOTING.md)** - Common issues and solutions

### Comparison
- **[differences.md](differences.md)** - Feature comparison and missing elements in Godot version

## 🎨 Visual Features (HTML/JS Version)

- **4-Tier Starfield System** - Layered parallax stars with twinkling effects
- **Animated 3-Layer Nebula** - Dynamic background with color shifting
- **Enhanced Player Ship** - Multi-layer thrusters with flickering effects
- **Spectacular Weapon Effects** - Energy cores, plasma orbs, oscillating wave beams
- **Advanced Particle System** - Normal particles, sparks, smoke, and explosion types
- **Epic Boss Graphics** - Glowing trails, energy beams, pulsing cores, cascading explosions
- **Screen Shake** - Dynamic camera shake on major explosions
- **Damage Flash** - Visual feedback on all entity hits

## 🎮 Gameplay Features

### Weapons
- **Laser** (default) - Fast, accurate, low damage
- **Plasma** - Slower, high damage, enhanced visual effects
- **Wave** - Oscillating spread pattern

### Upgrades (Temporary Power-Ups)
- **Shield** - 10-second invulnerability
- **Rapid Fire** - 15-second doubled fire rate
- **Triple Shot** - 20-second three-bullet spread

### Boss Battles
1. **Cosmic Serpent** - 10-segment serpentine entity with complex movement patterns
2. **Star Destroyer** - 8-turret platform with charge attacks and tactical formations
3. **Galactic Core** - 6-orbital fortress with wave mechanics and ultimate firepower

### Progression System
- Travel through 7 planets: Neptune → Uranus → Saturn → Jupiter → Mars → Earth → THE CORE
- 3 warps required per planet
- Each warp requires 3 waves (2 enemy waves + 1 satellite wave)
- Bonus stages between planets

## 🛠 Development

### For HTML/JS Development

The JavaScript version uses vanilla ES5+ with no build step. Edit files in `src/` and refresh browser.

**Key Files:**
- `src/game.js` - Game state, main loop, wave spawning
- `src/entities.js` - Player, enemies, bullets, particles (1600+ lines)
- `src/boss.js` - Three boss implementations (1000+ lines)
- `src/audio.js` - Web Audio API sound generation
- `src/utils.js` - Math utilities (polar/cartesian conversion)

### For Godot Development

The Godot version uses GDScript with autoload singletons and a global rendering pipeline.

**Key Components:**
- **Autoloads** (4 singletons): Constants, GameManager, InputHandler, AudioManager
- **Rendering** (2 scripts): MainRenderer (world), UIRenderer (HUD)
- **Entities** (6 classes): Player, Enemy, Bullet, Missile, Satellite, Particle
- **Bosses** (4 classes): BossBase, CosmicSerpent, StarDestroyer, GalacticCore

**Testing in Godot:**
1. Make changes in `scripts/` folder
2. Press F5 to run
3. Use debug keys (T, W, B) for faster testing

## 🐛 Known Issues

### HTML/JS Version
- No known critical issues
- Some browsers may require user interaction before playing audio

### Godot Version
- Audio is placeholder (console prints only)
- Missing nebula background
- Simplified particle effects
- Boss graphics less detailed than HTML/JS version
- No extra life system at score thresholds
- See `TROUBLESHOOTING.md` for common errors

## 📊 Performance

| Feature | HTML/JS | Godot |
|---------|---------|-------|
| Frame Rate | ~60 FPS | ~60-120 FPS |
| Startup Time | Instant | 2-3 seconds |
| Memory Usage | ~50 MB | ~80 MB |
| Particle Count | 200 max | 200 max |
| Starfield Density | 350 stars | 350 stars |
| Visual Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Audio Quality | ⭐⭐⭐⭐ | ⚠️ Placeholder |

## 🤝 Contributing

Contributions welcome! Focus areas for Godot version:

1. **Audio Implementation** - Replace placeholder audio with Web Audio API equivalent
2. **Visual Effects** - Port nebula, enhanced particles, screen shake
3. **Boss Polish** - Add trail effects, energy beams, better destruction sequences
4. **UI Enhancements** - Match HTML/JS version's polish

See `differences.md` for complete list of missing features.

## 📜 License

MIT License - See LICENSE file for details.

## 🙏 Credits

- **Original Game**: Konami (1983)
- **This Implementation**: Modern recreation with enhanced graphics and gameplay
- **Inspiration**: Xbox Live Arcade visual style

## 📞 Support

- **Documentation**: See project-specific docs in each folder
- **Issues**: Check `TROUBLESHOOTING.md` (Godot) or browser console (HTML/JS)
- **Questions**: Review `.github/copilot-instructions.md` for AI agent guidance

---

**Ready to play?** Choose your platform above and start your journey through the solar system! 🚀
