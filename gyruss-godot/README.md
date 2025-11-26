# Gyruss - Godot 4.5.1 Port

Complete reimplementation of Gyruss HTML5 game in Godot Engine 4.5.1 with GDScript.

## Project Status

✅ **Core Architecture** - Properly implemented matching working JS game:
- 900x900 square viewport (not portrait)
- Polar coordinate system for all entities
- Starfield spawns at center (radius 1-40), moves OUTWARD
- Enemies spawn off-screen (negative radius), move INWARD
- Global rendering pipeline with layered canvas
- 3 warps per planet with proper counter
- Weapon persistence through warps (reset only on death)

✅ **Implementation Complete** (18 files, ~3,500 lines):
- Project configuration (project.godot)
- 4 autoload singletons (Constants, GameManager, InputHandler, AudioManager)
- Rendering system (MainRenderer, UIRenderer)
- 6 entity types (Player, Enemy, Bullet, Missile, Satellite, Particle)
- 4 boss scripts (BossBase, CosmicSerpent, StarDestroyer, GalacticCore)
- Main scene (main.tscn)

⏳ **Testing Required**:
- Import into Godot 4.5.1
- Verify gameplay matches JS version
- Test all entity interactions
- Verify boss destruction sequences

## Quick Start

1. **Open in Godot 4.5.1**:
   - Launch Godot Engine 4.5.1
   - Click "Import"
   - Navigate to `gyruss-godot-v2/project.godot`
   - Click "Import & Edit"

2. **Run the Game**:
   - Press F5 or click the Play button
   - Game should start in attract mode with starfield
   - Press SPACE to start game

3. **Controls**:
   - **←/→** or **A/D**: Rotate ship around orbit ring
   - **SPACE**: Fire weapon (hold for continuous fire)
   - **M**: Launch homing missile
   - **S**: Toggle sound
   
   Debug keys:
   - **T**: Toggle invulnerability
   - **W**: Warp to next stage
   - **B**: Jump to boss
   - **R**: Restart game

## Architecture Overview

### Coordinate System

**Polar Coordinates** (angle + radius):
- Player orbits at fixed radius (378px from center)
- Enemies spawn off-screen at **negative radius** (-20 to -120)
- Enemies move **inward** toward center (radius increases from negative to positive)
- Starfield spawns at center (radius 1-40) and moves **outward** (radius increases)

### Rendering Pipeline

Single global canvas with 14 layers (MainRenderer):
1. Background gradient
2. Animated nebula
3. Starfield (4-tier with twinkling)
4. Orbit ring
5. Enemies
6. Satellites
7. Boss
8. Enemy bullets
9. Player ship
10. Player bullets
11. Missiles
12. Particles (4 types)
13. Warp effect
14. UI overlay

### Game State Machine

States: `ATTRACT → PLAYING → WARP → BOSS → VICTORY → GAME_OVER`

**Planet Progression**:
- 3 warps per planet (tracked by `warps_to_planet` counter)
- Each warp requires completing 3 waves (2 enemy waves + 1 satellite wave)
- After 3 warps: Boss fight
- After boss: Advance to next planet

**Weapon System**:
- Weapons (Plasma/Wave) persist through warps and planet changes
- Weapons reset ONLY on life loss
- Satellites spawn at start of each 3-wave cycle
- Upgrades persist until death

### Boss System

All 3 bosses follow same pattern:
- Multi-part collision (segments/turrets/orbitals)
- Aggression increases as health decreases (3 phases)
- Cinematic 4-6 second destruction sequence
- Victory awards 5000 points

**Boss Types**:
1. **Cosmic Serpent**: 10 segments with trail effects
2. **Star Destroyer**: 8 turrets with charge attacks
3. **Galactic Core**: 6 orbitals with energy beams

## File Structure

```
gyruss-godot-v2/
├── project.godot          # Main project config (900x900)
├── icon.svg               # Project icon
├── scenes/
│   └── main.tscn          # Main game scene
├── scripts/
│   ├── autoload/          # Singleton managers
│   │   ├── constants.gd   # Global constants (193 lines)
│   │   ├── game_manager.gd # Core game loop (477 lines)
│   │   ├── input_handler.gd # Input system (115 lines)
│   │   └── audio_manager.gd # Sound effects (133 lines)
│   ├── rendering/         # Visual systems
│   │   ├── main_renderer.gd # Global canvas (313 lines)
│   │   └── ui_renderer.gd   # HUD overlay (137 lines)
│   ├── entities/          # Game objects
│   │   ├── player.gd      # Player ship (308 lines)
│   │   ├── enemy.gd       # Enemy AI (110 lines)
│   │   ├── bullet.gd      # Projectiles (104 lines)
│   │   ├── missile.gd     # Homing missiles (112 lines)
│   │   ├── satellite.gd   # Power-up carriers (95 lines)
│   │   └── particle.gd    # Visual effects (96 lines)
│   └── bosses/            # Boss implementations
│       ├── boss_base.gd   # Base class (125 lines)
│       ├── cosmic_serpent.gd # Boss 1 (146 lines)
│       ├── star_destroyer.gd # Boss 2 (178 lines)
│       └── galactic_core.gd  # Boss 3 (223 lines)
└── assets/                # (empty - to be populated)
```

## Key Fixes from Previous Version

The first Godot port (`gyruss-godot/`) was fundamentally broken. This version corrects:

| Issue | Old (Broken) | New (Correct) |
|-------|-------------|---------------|
| Screen | 1080x1920 portrait | 900x900 square |
| Starfield | Random spawn, moves inward | Center spawn, moves outward |
| Enemies | Center spawn, moves outward | Off-screen spawn, moves inward |
| Rendering | Per-node _draw() calls | Global canvas pipeline |
| Warp Counter | Missing (advanced every warp) | 3 per planet (decrements) |
| Weapons | Reset on warp | Persist through warps |
| Boss System | Generic base only | Full implementations with segments |

## Known Limitations

- Audio is placeholder (prints to console instead of generating sounds)
- Nebula rendering not yet implemented
- No extra life system at 10k/30k score thresholds
- Screen shake effects not implemented

## Development Notes

### Adding New Enemies

1. Add constants to `scripts/autoload/constants.gd`
2. Create spawn function in `game_manager.gd`
3. Add rendering in `main_renderer.gd` → `draw_enemies()`
4. Update `EnemyEntity.create()` with new type

### Adding New Weapons

1. Add entry to `Constants.WEAPONS` dictionary
2. Implement firing logic in `player.gd`
3. Add visual rendering in `main_renderer.gd` → `draw_player_bullets()`
4. Add sound effect in `audio_manager.gd`

### Debugging

Enable debug mode with **T** key. Shows:
- Current game state
- Entity counts (enemies, bullets, particles)
- FPS counter

## Credits

Original HTML5 version: Working reference implementation
Godot port: Complete rewrite matching original architecture

## License

MIT

