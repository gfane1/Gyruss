# Gyruss Godot Design Document

Version: Godot 4.5.1 Port  
Last Updated: November 2025  
Based on: HTML/JS implementation v6.6+

## 1. Overview of the Game

Gyruss Godot is a port of the HTML/JS tube shooter to the Godot Engine 4.5.1. The core gameplay is preserved: player orbits a circular path, enemies spiral inward using polar coordinates, and waves progress through planetary destinations.

**Key Architecture Differences:**
- Godot autoload singletons replace global namespace
- Dictionary-based entities instead of class instances
- Global rendering via MainRenderer node (no per-entity draw)
- GDScript replaces JavaScript

**Implementation Status:**
- ✅ Core gameplay functional (movement, shooting, waves)
- ✅ Polar coordinate system working
- ✅ Three weapon types implemented
- ✅ Three boss types implemented
- ⚠️ Visual effects simplified (no nebula, reduced particles)
- ❌ Audio placeholder only (console logging)
- ⚠️ Performance excellent but visuals less polished

**Progression System:**
- Same 7 planets: Neptune → Uranus → Saturn → Jupiter → Mars → Earth → THE CORE
- 3 warps per planet (9 waves total)
- Satellite waves every 3rd wave
- Bonus stages after planets
- Boss fights at THE CORE

**Game States (enum GameState):**
- `ATTRACT` - Title screen
- `PLAYING` - Active gameplay
- `WARP` - Warp transition
- `BONUS` - Bonus stage
- `BOSS` - Boss battle
- `VICTORY` - Victory screen
- `GAME_OVER` - Game over screen

## 2. Core Game Loop and Main Update Flow

**Entry Point:** `scenes/main.tscn` → Autoloads initialize → `GameManager._ready()`

**Main Scene Structure:**
```
Main (Node2D)
├── MainRenderer (Node2D with global _draw)
├── UIRenderer (CanvasLayer for HUD)
└── Control nodes for buttons
```

**Autoload Singletons (always accessible):**
- `Constants` - Global configuration and math utilities
- `GameManager` - Core game state and entity management
- `InputHandler` - Centralized input processing
- `AudioManager` - Audio system (currently placeholder)

**Game Loop:** `GameManager._process(delta)`

```
_process(delta):
  └─ world_time += delta
  └─ handle_global_shortcuts() [T, W, B, M, S, R keys]
  └─ match state:
      ├─ ATTRACT: update_attract(delta)
      ├─ PLAYING: update_playing(delta)
      ├─ WARP: update_warp(delta)
      ├─ BONUS: update_bonus(delta)
      ├─ BOSS: update_boss(delta)
      ├─ VICTORY: update_victory(delta)
      └─ GAME_OVER: update_game_over(delta)
  └─ update_entities(delta) [if state requires]
      ├─ player.update(delta) if player != null
      ├─ update_bullets(delta)
      ├─ update_missiles(delta)
      ├─ update_enemies(delta)
      ├─ update_satellites(delta)
      ├─ update_enemy_bullets(delta)
      ├─ update_particles(delta)
      ├─ update_starfield(delta)
      ├─ boss.update(delta) if boss != null
      ├─ check_collisions()
      └─ handle_spawning(delta)
  └─ MainRenderer.queue_redraw() [triggers _draw]
```

**Rendering Pipeline:** `MainRenderer._draw()`

```
_draw():
  └─ draw_background() [gradient only, no nebula]
  └─ draw_starfield() [4-tier stars, basic rendering]
  └─ draw_orbit_ring() [simple circle, no glow]
  └─ draw_particles() [simplified particle system]
  └─ draw_enemy_bullets()
  └─ draw_bullets()
  └─ draw_missiles() [basic trails]
  └─ draw_enemies() [procedural shapes]
  └─ draw_satellites() [simple geometry]
  └─ draw_boss() [if active, delegates to boss class]
  └─ draw_player() [if player != null]
  └─ draw_warp_overlay() [if state == WARP]
  └─ UIRenderer draws HUD separately on CanvasLayer
```

**Update Frequency:** 60 FPS via Godot's `_process(delta)`

**Key Constants:** Defined in `Constants` autoload:
- Screen: 900×900px, center at (450, 450)
- Player orbit: 378px radius  
- Player size: 20px
- Weapon data: Dictionary format matching HTML/JS

## 3. Player Controls and Movement

**Input Handling:** Centralized in `InputHandler` autoload

**Input Actions (defined in project.godot):**
- `move_left` - Left arrow / A key
- `move_right` - Right arrow / D key
- `fire` - Space bar
- `missile` - M key
- `sound_toggle` - S key
- `debug_invulnerable` - T key
- `debug_warp` - W key
- `debug_boss` - B key
- `restart` - R key (attract/gameover)

**InputHandler Methods:**
- `is_left_pressed()` → bool
- `is_right_pressed()` → bool
- `is_fire_pressed()` → bool
- `is_missile_pressed()` → bool (one-shot, consumed after read)
- Debug flags: `debug_mode`, `clear_debug_keys()`

**Player Entity:** `PlayerEntity` class (class_name, globally accessible)

**Movement Implementation:**
- Player state stored in `GameManager.player` (PlayerEntity instance)
- Rotation: `angle += rotation_input * deg_to_rad(rotation_speed) * delta`
- Base rotation speed: 220 deg/sec
- Speed boost upgrade: 1.5× multiplier
- Angle wrapping: `Constants.wrap_angle(angle)` keeps within 0-2π

**Position Calculation:**
```gdscript
var pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
```

**Weapon System:**

Three weapon types defined in `Constants.WEAPONS` Dictionary:

1. **Laser** (default)
   - Name: "Laser", Color: #ffd966
   - Damage: 1, Fire rate: 0.15s
   - Single straight shot inward

2. **Plasma** (satellite upgrade)
   - Name: "Plasma", Color: #66ffcc
   - Damage: 2, Fire rate: 0.25s
   - Larger projectile, piercing

3. **Wave** (satellite upgrade)
   - Name: "Wave", Color: #ff66aa
   - Damage: 1, Fire rate: 0.2s
   - Arc of 8 bullets spread across 120°

**Weapon Persistence:**
- Special weapons persist through warps (matches HTML/JS)
- Reset only on death or satellite cycle start
- `player.current_weapon` holds active weapon Dictionary

**Upgrade System:**

Power-ups from golden satellites (defined in `Constants.UPGRADES`):

1. **doubleShot** - Fires 2 bullets with 15° spread
2. **tripleShot** - Fires 3 bullets with 15° spread
3. **rapidFire** - 0.5× fire rate multiplier (faster)
4. **shield** - Block one hit without damage
5. **speedBoost** - 1.5× rotation speed multiplier

Upgrades stored in `player.upgrades` Dictionary (bool flags).

**Missiles:**
- Separate from main firing (M key)
- Homing behavior toward nearest enemy
- Limited count (start with 3)
- Blast radius on impact
- Cooldown handled in game logic

**Hit Detection:**
- Player hitbox: Circular, ~16px effective radius
- Invulnerability: 2.5 second timer after hit
- Blinking visual during invulnerability
- Shield blocks hit without triggering timer

## 4. Enemy Spawning and Wave Logic

**Enemy Storage:** Array of Dictionary objects in `GameManager.enemies`

**Enemy Dictionary Structure:**
```gdscript
{
  "angle": float,          # Current angle in radians
  "radius": float,         # Current radius (negative = outside screen)
  "target_radius": float,  # Destination radius for orbit
  "angular_speed": float,  # Rotation speed (rad/sec)
  "enter_speed": float,    # Inward movement speed
  "type": String,          # "fighter" or "saucer"
  "color": Color,          # Visual color
  "health": int,           # Hit points remaining
  "fire_timer": float,     # Time until next shot
  "state": String          # "entering", "orbiting", "leaving"
}
```

**Wave Patterns:**

Spawn functions in `GameManager`:

1. **spawn_spiral_wave()** - 40% probability
   - Count: 8-24 enemies (scales with wave_number)
   - Spawn: Negative radius (-20 to -(20 + count×5))
   - Pattern: Dual spiral with offset angles
   - Mix: 70% fighters, 30% saucers

2. **spawn_v_shape_wave()** - 40% probability
   - Count: 4-10 enemies
   - Spawn: Negative radius (-20)
   - Pattern: Mirrored V formation
   - Type: Primarily fighters

3. **spawn_arc_wave()** - 20% probability
   - Count: 5-12 enemies
   - Spawn: Large positive radius (540+)
   - Pattern: Sweeping arc formation
   - Type: Primarily saucers

**Enemy Types:**

Created via `EnemyEntity.create()` factory:

- **Fighter**
  - Health: 1 HP
  - Points: 100
  - Speed: Fast inward movement
  - Fires single bullets

- **Saucer**
  - Health: 2 HP
  - Points: 200
  - Speed: Slower, more orbital
  - Fires bullet patterns

**Enemy Behavior State Machine:**

Managed in `GameManager.update_enemies(delta)`:

```
ENTERING:
  - Move inward at enter_speed
  - When radius reaches target_radius, switch to ORBITING

ORBITING:
  - Rotate at angular_speed
  - Maintain target_radius
  - Fire at player periodically (fire_timer)
  - After timeout, switch to LEAVING

LEAVING:
  - Move outward toward edge
  - Remove when off-screen
```

**Satellite Waves:**

Every 3rd wave spawns satellites (triggered by `wave_number % 3 == 0`):

- Function: `GameManager.spawn_satellite_wave()`
- Count: 3 satellites per wave
- Center satellite: Golden, drops power-up
- Side satellites: Silver, no power-up
- Phase tracking: `satellite_waves_completed`, `satellites_in_current_wave`
- After 3rd satellite wave → trigger warp

**Bonus Stages:**

Function: `GameManager.spawn_bonus_wave()`
- 20 enemies in tight formation
- Fast rotation speeds
- No collision damage (state == BONUS disables)
- Clearing bonus stage triggers warp

**Boss System:**

Three boss types in `scripts/bosses/` folder:

1. **CosmicSerpent** (extends BossBase)
   - 8 segments in serpent formation
   - Head orbits, body follows
   - Each segment: 50 HP, 5000 points

2. **StarDestroyer** (extends BossBase)
   - Central core + 6 turrets
   - Turrets orbit and fire independently
   - Core: 200 HP, Turrets: 30 HP each

3. **GalacticCore** (extends BossBase)
   - 12 orbital nodes + central nexus
   - Nodes regenerate from nexus
   - Nexus: 300 HP, Nodes: 20 HP each

**Boss Creation:**
```gdscript
GameManager.create_boss(boss_index):
  match boss_index:
    0: return CosmicSerpent.new()
    1: return StarDestroyer.new()
    2: return GalacticCore.new()
```

**Boss Destruction:**
- `is_destroying` flag triggers death sequence
- `death_timer` counts down (4-6 seconds)
- Multi-phase explosions during countdown
- Victory state after timer reaches 0

## 5. Scoring, Lives, and Game States

**Scoring System:**

Points awarded in `GameManager`:
- Fighters: 100 points
- Saucers: 200 points
- Satellites (side): 500 points
- Satellites (golden): 1000 points + power-up
- Boss segments: 5000 points each
- Warp bonus: 1000 points
- Bonus stage enemies: 50 points each

Score stored in `GameManager.score` (int), emits `score_changed` signal.

**Lives System:**

- Start: 3 lives (defined in `PlayerEntity`)
- Extra lives: Not yet implemented (TODO)
- Lives stored in `player.lives`
- Emits `lives_changed` signal on change
- Death: `player.lives -= 1`, check if `<= 0` → game over

**State Machine:**

Managed by `GameManager.state` (GameState enum):

```
ATTRACT → [press fire] → PLAYING
PLAYING → [clear wave] → WARP → [PLAYING or BONUS or BOSS]
PLAYING → [lives = 0] → GAME_OVER → [press fire] → ATTRACT
BOSS → [boss defeated] → VICTORY → [press fire] → ATTRACT
```

**State Update Functions:**

Each state has dedicated update logic:

- `update_attract(delta)` - Wait for input, minimal updates
- `update_playing(delta)` - Full game logic, spawn waves
- `update_warp(delta)` - Warp timer countdown, transition logic
- `update_bonus(delta)` - Bonus stage, no collision damage
- `update_boss(delta)` - Boss battle updates
- `update_victory(delta)` - Victory timer, wait for restart
- `update_game_over(delta)` - Game over timer, wait for restart

**HUD Display:**

Rendered by `UIRenderer` (CanvasLayer with _draw):

- Top left: "SCORE: XXXXXX"
- Top right: "LIVES: X"
- Top center: "X WARPS TO [PLANET]"
- Right side: Active weapon name (if not Laser)
- Right side: Active upgrades (not yet implemented)

**Planet Progression:**

Tracking in `GameManager`:
- `planet_index` - Current planet (0-6)
- `warps_to_planet` - Countdown (3 → 2 → 1)
- Each warp: `warps_to_planet -= 1`
- At 0: Advance to next planet or boss
- Planet names: `Constants.PLANETS` array

**Debug Controls:**

Same as HTML/JS version:
- T: Toggle invulnerability (`InputHandler.debug_invulnerable_pressed`)
- W: Instant warp (`InputHandler.debug_warp_pressed`)
- B: Jump to boss (`InputHandler.debug_boss_pressed`)
- M: Fire missile (normal control)
- S: Toggle sound (placeholder)
- R: Restart game

## 6. Visual Effects and Audio

**Visual Effects:**

**Starfield System:**

Implementation in `GameManager.init_starfield(count)`:

- 4 tiers matching HTML/JS distribution (60/25/11/4%)
- Function `create_star(tier, size_min, size_max, speed_min, speed_max, color)`
- Stars stored as Dictionary array
- Update: Expand outward each frame
- Rendering: Basic `draw_circle()` per star (no glow/twinkle yet)
- Warp acceleration: 15× speed multiplier

**Missing from HTML/JS:**
- No twinkling animation
- No shadow blur or glow effects
- No brilliant star cross rays
- Simpler color palette

**Background:**

- Deep space gradient: Blue-black radial gradient
- **Missing:** 3-layer animated nebula (major visual gap)
- Only gradient background currently implemented

**Particle System:**

Basic implementation in `GameManager.create_particle()`:

- Particles stored as Dictionary: `{ position, velocity, color, life, max_life, type }`
- Types: "normal", "spark", "smoke", "explosion"
- Update: Move, fade based on life remaining
- Rendering: Simple `draw_circle()` with alpha fade

**Missing from HTML/JS:**
- No smoke turbulence
- No advanced glow effects
- Fewer particles per explosion
- No shadow blur

**Ship Visuals:**

*Player Ship (procedural drawing):*
- Thrusters: Simple triangular shape, basic blue color
- Hull: Triangular body with gradient
- Wings: Side extensions
- **Missing:** Multi-layer thrusters, armor plating detail, flicker animation

*Enemy Visuals (procedural):*
- Fighters: Small triangles
- Saucers: Circles with center dot
- Color-coded by palette
- **Missing:** Detailed variants, trails during movement

**Weapon Effects:**

- Laser: Yellow circle, simple rendering
- Plasma: Cyan circle, slightly larger
- Wave: Pink circles in arc pattern
- **Missing:** Energy cores, glow effects, trailing particles

**Explosion Effects:**

Function: `GameManager.spawn_explosion(x, y, color, count)`
- Creates particles at explosion position
- Count scales with explosion size
- **Missing:** Particle type mixing, screen shake, multi-phase boss explosions

**Screen Effects:**

- Warp overlay: Blue semi-transparent rectangle with alpha pulse
- **Missing:** Screen shake, enhanced warp tunnel, planet rendering

**Orbit Ring:**

- Simple `draw_arc()` with single color
- **Missing:** Gradient, shadow blur, glow effect

**Audio System:**

**Current Implementation:** Placeholder only (`AudioManager` autoload)

All audio functions print to console instead of playing sound:
- `play_laser()` → print("Audio: laser")
- `play_plasma()` → print("Audio: plasma")
- `play_explosion()` → print("Audio: explosion")
- etc.

**Audio Functions (stubs):**
- `play_laser()`
- `play_plasma()`
- `play_wave()`
- `play_explosion()`
- `play_big_explosion()`
- `play_hit()`
- `play_power_up()`
- `play_warp()`
- `play_boss_alert()`
- `toggle_sound()`
- `start_music()`
- `stop_music()`

**Missing from HTML/JS:**
- No actual sound playback
- No AudioStreamPlayer nodes
- No sound effect files (.ogg/.wav)
- No background music
- No Web Audio API equivalent

**TODO:** Implement proper Godot audio using:
- AudioStreamPlayer nodes for SFX
- AudioStreamPlayer for BGM loop
- Sound effect assets (.ogg files)
- Volume control via bus system

---

## Technical Implementation Notes

**Architecture Pattern:**
- Entity-Component-System lite: Entities are Dictionaries, systems are update functions
- No scene instancing for entities (all procedurally drawn)
- Global rendering pipeline (MainRenderer._draw())

**Coordinate System:**
- Same as HTML/JS: Screen space (0,0) top-left, (900,900) bottom-right
- Polar coordinates relative to (450, 450) center
- Conversion: `Constants.polar_to_cartesian(angle, radius)`

**Performance:**
- Faster than HTML/JS (Godot's optimized rendering)
- Dictionary-based entities minimize overhead
- Single _draw() call per frame (no per-entity draw methods)
- Godot's built-in physics and collision (not used yet, manual collision checks)

**Known Limitations:**
- Visual quality lower than HTML/JS (simplified effects)
- No audio system (major gap)
- Missing nebula background (atmosphere reduced)
- Simplified particle effects
- No screen shake
- Less detailed ship sprites

**Future Enhancements:**
- Add nebula background (3 layers with animation)
- Implement proper audio system with assets
- Enhance particle system (more types, glow, turbulence)
- Add screen shake effect
- Improve ship sprite detail
- Add extra life system at score thresholds
