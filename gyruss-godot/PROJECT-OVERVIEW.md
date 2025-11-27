# Gyruss Godot 4.5.1 - Project Overview

## Table of Contents
1. [Introduction](#introduction)
2. [Godot Project Structure](#godot-project-structure)
3. [Autoload Singletons](#autoload-singletons)
4. [Scene Hierarchy](#scene-hierarchy)
5. [Entity Relationships](#entity-relationships)
6. [Game Flow](#game-flow)
7. [Rendering System](#rendering-system)
8. [Boss System](#boss-system)
9. [Weapon and Upgrade System](#weapon-and-upgrade-system)
10. [Common Workflows](#common-workflows)
11. [Extension Points](#extension-points)

---

## Introduction

Gyruss is a tube-shooter arcade game where the player orbits the screen perimeter and fires inward toward waves of incoming enemies. This Godot 4.5.1 port maintains the core gameplay of the HTML5/JavaScript version while leveraging Godot's performance and cross-platform capabilities.

**Core Concept:** Classic arcade gameplay with modern enhancements - 60 FPS performance, multiple weapons, power-ups, and epic boss battles with cinematic destruction sequences.

**Project Goals:**
- Maintain feature parity with HTML/JS version
- Achieve 60 FPS on mid-range hardware
- Support keyboard, mouse, and touch controls
- Export to Windows, Linux, Web, and Mobile

---

## Godot Project Structure

### Directory Layout

```
gyruss-godot/
├── project.godot                # Godot project file
├── icon.svg                     # Project icon
├── IMPLEMENTATION_COMPLETE.md   # Implementation status
├── TROUBLESHOOTING.md          # Common issues and solutions
├── README.md                    # Godot-specific readme
│
├── scenes/                      # Scene files (.tscn)
│   └── main.tscn               # Main game scene
│
├── scripts/                     # All GDScript files
│   ├── autoload/               # Global singleton autoloads
│   │   ├── constants.gd        # Constants + utility functions
│   │   ├── game_manager.gd     # Game state + entity management
│   │   ├── input_handler.gd    # Centralized input handling
│   │   └── audio_manager.gd    # Audio system (placeholder)
│   │
│   ├── entities/               # Entity implementations
│   │   ├── player.gd           # PlayerEntity class
│   │   ├── enemy.gd            # EnemyEntity static methods
│   │   ├── bullet.gd           # BulletEntity static methods
│   │   ├── missile.gd          # MissileEntity static methods
│   │   ├── satellite.gd        # SatelliteEntity static methods
│   │   └── particle.gd         # Particle (Dictionary-based)
│   │
│   ├── bosses/                 # Boss implementations
│   │   ├── boss_base.gd        # BossBase parent class
│   │   ├── cosmic_serpent.gd   # Serpent boss (10 segments)
│   │   ├── star_destroyer.gd   # Destroyer boss (8 turrets)
│   │   └── galactic_core.gd    # Core boss (6 orbitals)
│   │
│   └── rendering/              # Rendering systems
│       ├── main_renderer.gd    # Global canvas (14 layers)
│       └── ui_renderer.gd      # HUD overlay
│
└── assets/                      # Future assets folder
    ├── sounds/                  # (planned)
    ├── music/                   # (planned)
    └── textures/                # (planned)
```

### File Organization Principles

**1. Autoloads for Global Systems**
```
Autoloads = Singletons that exist throughout game lifetime
Examples: Constants, GameManager, InputHandler, AudioManager
```

**2. Entities as class_name Scripts**
```
class_name = Global class registration (no preload needed)
Examples: PlayerEntity, EnemyEntity, BossBase
```

**3. Rendering Centralized**
```
Single MainRenderer._draw() instead of per-entity drawing
Why: Better performance, explicit layer ordering
```

**4. Dictionary-Based Storage**
```
Lightweight entities (enemies, bullets) stored as Dictionary in arrays
Why: No class overhead, easy serialization, flexible
```

---

## Autoload Singletons

### What Are Autoloads?

Autoloads are scripts that Godot automatically instantiates at game startup and keeps alive throughout the game's lifetime. They act as global singletons accessible from any script.

**Configuration (project.godot):**
```ini
[autoload]
Constants="*res://scripts/autoload/constants.gd"
GameManager="*res://scripts/autoload/game_manager.gd"
InputHandler="*res://scripts/autoload/input_handler.gd"
AudioManager="*res://scripts/autoload/audio_manager.gd"
```

The asterisk (*) means "instantiate immediately."

### Constants Singleton

**Purpose:** Global game constants and utility functions

**Key Responsibilities:**
- Screen dimensions and center point
- Weapon configurations
- Upgrade definitions
- Enemy stats
- Boss configurations
- Planet names
- Utility functions (polar/cartesian conversion)

**Usage Example:**
```gdscript
# Anywhere in the project:
var center = Constants.SCREEN_CENTER
var pos = Constants.polar_to_cartesian(angle, radius)
var laser = Constants.WEAPONS.Laser
var neptune = Constants.PLANETS[0]
```

**Key Functions:**
```gdscript
# Coordinate conversion
func polar_to_cartesian(angle: float, radius: float) -> Vector2
func cartesian_to_polar(pos: Vector2) -> Vector2

# Angle utilities
func wrap_angle(angle: float) -> float

# Distance checks
func dist_sq(x1: float, y1: float, x2: float, y2: float) -> float
func dist_sq_vec(a: Vector2, b: Vector2) -> float

# Random utilities
func rand_range(min_val: float, max_val: float) -> float
```

### GameManager Singleton

**Purpose:** Core game state and entity management

**Key Responsibilities:**
- Game state machine (ATTRACT → PLAYING → WARP → BOSS → etc.)
- Entity storage (enemies, bullets, particles, etc.)
- Wave spawning logic
- Collision detection
- Score tracking
- Boss management
- Planet progression

**Entity Arrays:**
```gdscript
var enemies: Array[Dictionary] = []        # Enemy entities
var bullets: Array[Dictionary] = []        # Player bullets
var enemy_bullets: Array[Dictionary] = []  # Enemy bullets
var boss_bullets: Array[Dictionary] = []   # Boss bullets
var satellites: Array[Dictionary] = []     # Power-up satellites
var missiles: Array[Dictionary] = []       # Homing missiles
var particles: Array[Dictionary] = []      # Explosion particles
var stars: Array[Dictionary] = []          # Starfield
```

**Player Reference:**
```gdscript
var player: PlayerEntity = null  # Class instance (not Dictionary)
```

**Boss Reference:**
```gdscript
var boss_instance = null  # BossBase subclass instance
```

**Signals:**
```gdscript
signal state_changed(new_state: GameState)
signal score_changed(new_score: int)
signal lives_changed(new_lives: int)
signal planet_changed(planet_name: String)
```

**Usage Example:**
```gdscript
# Check game state
if GameManager.state == GameManager.GameState.PLAYING:
    # Spawn wave

# Add entity
GameManager.enemies.append(enemy_dict)

# Connect to signals
GameManager.score_changed.connect(_on_score_changed)
```

### InputHandler Singleton

**Purpose:** Centralized input state management

**Key Responsibilities:**
- Keyboard input tracking
- Mouse/touch input tracking
- Debug key handling
- Input state queries

**Input State:**
```gdscript
var left_pressed: bool = false
var right_pressed: bool = false
var fire_pressed: bool = false
var fire_just_pressed: bool = false
var missile_pressed: bool = false

# Debug keys
var debug_invulnerable_pressed: bool = false
var debug_warp_pressed: bool = false
var debug_boss_pressed: bool = false
var restart_pressed: bool = false

# Mouse/touch
var mouse_position: Vector2 = Vector2.ZERO
var is_touching: bool = false
```

**Usage Example:**
```gdscript
# In player update
if InputHandler.is_left_pressed():
    angle -= rotation_speed * delta

if InputHandler.is_fire_pressed():
    fire()

if InputHandler.is_missile_pressed():
    fire_missile()
```

**Why Centralized?**
- Single source of truth
- No input conflicts between entities
- Easy to debug (inspect InputHandler in debugger)
- Clean separation of concerns

### AudioManager Singleton

**Purpose:** Audio playback management

**Current Status:** Placeholder (prints to console)

**Key Responsibilities:**
- Sound effect playback
- Background music control
- Master volume toggle

**Usage Example:**
```gdscript
AudioManager.play_laser()
AudioManager.play_explosion()
AudioManager.play_warp_sound()
AudioManager.toggle_sound()
```

**Future Implementation:**
```gdscript
# Will use AudioStreamPlayer nodes
var laser_player: AudioStreamPlayer
var explosion_player: AudioStreamPlayer
var bgm_player: AudioStreamPlayer
```

---

## Scene Hierarchy

### main.tscn Structure

```
Main (Node)
  ├── MainRenderer (Node2D)
  │   # Renders all game entities on single canvas
  │   # 14-layer rendering pipeline
  │   # z_index: 0 (base layer)
  │
  └── UIRenderer (CanvasLayer)
      # HUD overlay (score, lives, planet)
      # Renders on top of game
      # Independent of camera transforms
```

**ASCII Diagram:**
```
┌─────────────────────────────────────────────┐
│ UIRenderer (CanvasLayer)                    │
│ ┌─────────────────────────────────────────┐ │
│ │ Score: 12500    Lives: 3    Mars       │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
           ↓ (layered on top)
┌─────────────────────────────────────────────┐
│ MainRenderer (Node2D)                       │
│ ╔═════════════════════════════════════════╗ │
│ ║   [Game Canvas]                         ║ │
│ ║                                         ║ │
│ ║   🌟    👾        *                     ║ │
│ ║        👾                               ║ │
│ ║              🛸       *                 ║ │
│ ║   *                                     ║ │
│ ║                     🚀 (player)         ║ │
│ ║       *                                 ║ │
│ ║                                         ║ │
│ ╚═════════════════════════════════════════╝ │
└─────────────────────────────────────────────┘
```

### Why This Structure?

**MainRenderer (Node2D):**
- Single draw call per frame
- Complete control over layer ordering
- All game visuals in one place
- Efficient batch rendering

**UIRenderer (CanvasLayer):**
- Always on top (no z-fighting)
- Independent of game camera
- Pixel-perfect UI positioning
- Easy to show/hide

**No Per-Entity Nodes:**
- Enemies are not child nodes (just Dictionaries in arrays)
- Bullets are not child nodes
- Particles are not child nodes
- Why? Godot's node overhead is unnecessary for lightweight entities

---

## Entity Relationships

### Entity Type Hierarchy

```
Entities
│
├── Player (Class Instance)
│   └── PlayerEntity.new()
│       ├── Properties: angle, lives, missiles, weapon
│       ├── Methods: update(), fire(), take_damage()
│       └── Storage: GameManager.player
│
├── Dictionary-Based Entities (Lightweight)
│   ├── Enemy (Dictionary in array)
│   │   └── GameManager.enemies[]
│   │       ├── Factory: EnemyEntity.create()
│   │       └── Update: EnemyEntity.update(enemy, delta)
│   │
│   ├── Bullet (Dictionary in array)
│   │   └── GameManager.bullets[] or enemy_bullets[]
│   │       ├── Factory: { angle, radius, speed, weapon }
│   │       └── Update: BulletEntity.update_player_bullets(delta)
│   │
│   ├── Missile (Dictionary in array)
│   │   └── GameManager.missiles[]
│   │       ├── Factory: { x, y, vx, vy, target }
│   │       └── Update: MissileEntity.update(missile, delta)
│   │
│   ├── Satellite (Dictionary in array)
│   │   └── GameManager.satellites[]
│   │       ├── Factory: SatelliteEntity.create()
│   │       └── Update: SatelliteEntity.update(satellite, delta)
│   │
│   └── Particle (Dictionary in array)
│       └── GameManager.particles[]
│           ├── Factory: GameManager.create_particle()
│           └── Update: MainRenderer.update_particles(delta)
│
└── Boss Entities (Class Instances with Inheritance)
    └── BossBase (parent class)
        ├── CosmicSerpent (10 segments)
        ├── StarDestroyer (8 turrets)
        └── GalacticCore (6 orbitals)
        └── Storage: GameManager.boss_instance
```

### Interaction Diagram

```
        ┌──────────────┐
        │ InputHandler │
        └──────┬───────┘
               │
               ↓ (reads input)
        ┌──────────────┐
        │    Player    │
        └──────┬───────┘
               │
               ├─→ fires → Bullets (player) ─┐
               │                              │
               ├─→ launches → Missiles ───────┤
               │                              │
               └←─ hit by ← EnemyBullets ←───┘
                            │
                            │
                     ┌──────┴──────┐
                     │   Enemies   │
                     └──────┬──────┘
                            │
                            ├─→ fires → EnemyBullets
                            │
                            └←─ damaged by ← Bullets (player)
                                             Missiles (blast)

        ┌──────────────┐
        │ Satellites   │ ←─→ Player (collision = powerup)
        └──────────────┘

        ┌──────────────┐
        │    Boss      │
        └──────┬───────┘
               │
               ├─→ fires → BossBullets ──→ Player
               │
               └←─ damaged by ← Bullets (player)
                                Missiles (blast)

     All destructible entities spawn Particles
```

### Data Flow Example: Enemy Death

```
1. Bullet hits Enemy (collision detected in BulletEntity.update_player_bullets)
   ↓
2. enemy.hp -= bullet.damage
   ↓
3. if enemy.hp <= 0:
   ↓
4. GameManager.spawn_explosion(enemy_pos, 20, enemy.color)
   ├─→ Creates 20 Particle Dictionaries
   └─→ Adds to GameManager.particles[]
   ↓
5. GameManager.add_score(enemy.score)
   └─→ Emits score_changed signal
   ↓
6. AudioManager.play_explosion()
   ↓
7. enemies.remove_at(i) (enemy removed from array)
   ↓
8. MainRenderer._draw() renders particles
   ↓
9. Particles age and fade over time
   ↓
10. Particles removed when age >= life
```

---

## Game Flow

### State Machine Overview

```gdscript
enum GameState {
    ATTRACT,      # Title screen
    PLAYING,      # Active gameplay
    WARP,         # 2.8s tunnel effect
    BONUS,        # Harmless enemy wave
    BOSS,         # Boss battle
    VICTORY,      # Boss defeated
    GAME_OVER     # All lives lost
}
```

### State Transition Graph

```
        ┌─────────────┐
   ┌───→│   ATTRACT   │←──────────────┐
   │    └──────┬──────┘               │
   │           │ Space                │
   │           ↓                      │
   │    ┌─────────────┐               │
   │ ┌─→│   PLAYING   │←─────┐        │
   │ │  └──────┬──────┘      │        │
   │ │         │             │        │
   │ │         │ 3 sat waves │        │
   │ │         │ completed   │        │
   │ │         ↓             │        │
   │ │  ┌─────────────┐      │        │
   │ │  │    WARP     │      │        │
   │ │  └──────┬──────┘      │        │
   │ │         │             │        │
   │ │    ┌────┴────┐        │        │
   │ │    │         │        │        │
   │ │  warps>0  warps==0   │        │
   │ │    │         │        │        │
   │ └────┘         ↓        │        │
   │         ┌─────────────┐ │        │
   │         │    BOSS     │ │        │
   │         └──────┬──────┘ │        │
   │                │        │        │
   │          boss defeated  │        │
   │                ↓        │        │
   │         ┌─────────────┐ │        │
   │         │   BONUS     │ │        │
   │         └──────┬──────┘ │        │
   │                │        │        │
   │         planet complete │        │
   │                └────────┘        │
   │                                  │
   │    Lives == 0                    │
   └───────────────────────────────────┘
          ┌─────────────┐
          │  GAME_OVER  │
          └──────┬──────┘
                 │ R key
                 └────────────────────┘
```

### State Update Methods

```gdscript
# In GameManager._process(delta)
func _process(delta: float):
    world_time += delta
    handle_global_shortcuts()
    
    match state:
        GameState.ATTRACT:
            update_attract(delta)
        GameState.PLAYING:
            update_playing(delta)
        GameState.WARP:
            update_warp(delta)
        GameState.BONUS:
            update_bonus(delta)
        GameState.BOSS:
            update_boss(delta)
        GameState.VICTORY:
            update_victory(delta)
        GameState.GAME_OVER:
            update_game_over(delta)
    
    if state in [GameState.PLAYING, GameState.WARP, GameState.BONUS, GameState.BOSS]:
        update_entities(delta)
```

### Wave Progression System

```
Wave Cycle (repeats 3 times per planet):

Wave 1: Enemy formation (spiral/arc/V-shape)
  ↓
Wave 2: Enemy formation
  ↓
Wave 3: Satellite wave (3 satellites, center has powerup)
  ↓ (satellite_waves_completed++)
WARP (2.8 seconds)
  ↓ (warps_to_planet--)
Repeat 2 more times
  ↓
3rd WARP completed → warps_to_planet == 0
  ↓
BOSS
  ↓
BONUS
  ↓
Next planet (warps_to_planet = 3 again)
```

**Code Flow:**
```gdscript
func update_playing(delta: float):
    spawn_timer -= delta
    
    if spawn_timer <= 0 and enemies.size() == 0 and satellites.size() == 0:
        if is_satellite_wave:
            spawn_satellite_wave()
        else:
            spawn_next_wave()
        
        wave_number += 1
        waves_completed += 1
        
        # Every 3rd wave is a satellite wave
        is_satellite_wave = (waves_completed % WAVES_PER_WARP == 0)
        
        spawn_timer = rand_range(WAVE_DELAY_MIN, WAVE_DELAY_MAX)

func complete_satellite_wave():
    satellite_wave_active = false
    satellite_waves_completed += 1
    
    if satellite_waves_completed >= SATELLITE_WAVES_PER_WARP:
        start_warp()  # Trigger warp after 3 satellite waves
```

### Planet Progression

```
Planet Index    Name        Warps    Boss Type
─────────────────────────────────────────────────
0               Neptune     3        Cosmic Serpent
1               Uranus      3        Star Destroyer
2               Saturn      3        Galactic Core
3               Jupiter     3        Cosmic Serpent (cycle)
4               Mars        3        Star Destroyer (cycle)
5               Earth       3        Galactic Core (cycle)
6               THE CORE    -        Final Boss (random)
```

**Warp Counter Logic (CRITICAL):**
```gdscript
var warps_to_planet: int = 3  # Starts at 3

func complete_warp():
    warps_to_planet -= 1  # MUST decrement first!
    
    if warps_to_planet <= 0:
        # Advance planet
        planet_index += 1
        warps_to_planet = 3  # Reset for next planet
        
        if planet_index == 6:
            # THE CORE - final boss
            state = GameState.BOSS
            create_boss(boss_index)
        elif planet_index < 6:
            # Regular planet - bonus stage
            state = GameState.BONUS
            spawn_bonus_wave()
        else:
            # Victory! (all planets complete)
            state = GameState.VICTORY
        
        planet_changed.emit(PLANETS[planet_index])
    else:
        # Continue on same planet
        state = GameState.PLAYING
        spawn_timer = rand_range(WAVE_DELAY_MIN, WAVE_DELAY_MAX)
    
    # Reset satellite wave progress
    satellite_waves_completed = 0
    satellite_wave_active = false
    state_changed.emit(state)
```

---

## Rendering System

### 14-Layer Rendering Pipeline

All rendering happens in `MainRenderer._draw()`:

```gdscript
func _draw():
    # Layer 1: Background gradient
    draw_background()
    
    # Layer 2: Animated nebula (TODO - not implemented yet)
    # draw_nebula()
    
    # Layer 3: Starfield (4 tiers: tiny, normal, bright, brilliant)
    draw_starfield()
    
    # Layer 4: Orbit ring (player's path)
    draw_orbit_ring()
    
    # Layer 5: Enemies
    draw_enemies()
    
    # Layer 6: Satellites (power-ups)
    draw_satellites()
    
    # Layer 7: Boss (if active)
    draw_boss()
    
    # Layer 8: Enemy bullets
    draw_enemy_bullets()
    
    # Layer 9: Player ship
    draw_player()
    
    # Layer 10: Player bullets
    draw_player_bullets()
    
    # Layer 11: Missiles
    draw_missiles()
    
    # Layer 12: Particles (explosions, sparks, smoke)
    draw_particles()
    
    # Layer 13: Warp effect (tunnel animation)
    if GameManager.state == GameManager.GameState.WARP:
        draw_warp_effect()
    
    # Layer 14: Debug overlays (if enabled)
    if InputHandler.debug_mode:
        draw_debug_info()
```

### Starfield System

**4-Tier Starfield:**
```gdscript
# Star distribution
Tier 1 (60%): Tiny stars   - size 0.8-1.5, speed 5-15, alpha 0.5
Tier 2 (25%): Normal stars - size 1.2-2.2, speed 15-30, alpha 0.7
Tier 3 (11%): Bright stars - size 1.8-2.8, speed 30-50, alpha 0.85
Tier 4 (4%):  Brilliant    - size 2.5-4.0, speed 50-80, alpha 1.0
```

**Movement (CRITICAL):**
```gdscript
# Stars spawn at CENTER and move OUTWARD
func update_starfield(delta: float):
    var warp_factor = 15.0 if GameManager.state == GameManager.GameState.WARP else 1.0
    
    for star in GameManager.stars:
        # Move OUTWARD from center
        star.radius += star.speed * delta * warp_factor * star.parallax
        
        # Respawn at CENTER when reaching edge
        if star.radius > 450.0:  # Half screen width
            star.radius = rand_range(SPAWN_RADIUS_MIN, SPAWN_RADIUS_MAX)
            star.angle = randf() * TAU
```

**Twinkling Effect:**
```gdscript
func draw_starfield():
    for star in GameManager.stars:
        var pos = Constants.polar_to_cartesian(star.angle, star.radius)
        
        # Twinkling for brighter stars
        var pulse = 1.0
        if star.tier >= 2:
            pulse = 0.8 + 0.2 * sin(world_time * star.twinkle_speed + star.twinkle_phase)
        
        var draw_color = Color(
            star.color.r,
            star.color.g,
            star.color.b,
            star.color.a * pulse
        )
        
        draw_circle(pos, star.size, draw_color)
        
        # Glow for brilliant stars
        if star.tier == 3:
            var glow_color = Color(draw_color.r, draw_color.g, draw_color.b, draw_color.a * 0.3)
            draw_circle(pos, star.size * 2.0, glow_color)
```

### Particle System

**Particle Types:**
```gdscript
"normal"     - Standard explosion debris
"spark"      - Fast, bright, short-lived
"smoke"      - Slow, rising, long-lived
"explosion"  - Large, colorful bursts
```

**Particle Update:**
```gdscript
func update_particles(delta: float):
    var i = GameManager.particles.size() - 1
    while i >= 0:
        var p = GameManager.particles[i]
        
        # Update position
        p.position.x += p.vx * delta
        p.position.y += p.vy * delta
        
        # Apply friction
        p.vx *= PARTICLE_FRICTION
        p.vy *= PARTICLE_FRICTION
        
        # Smoke rises
        if p.type == "smoke":
            p.vy -= 20.0 * delta
        
        # Update rotation
        p.rotation += p.rot_speed * delta
        
        # Age particle
        p.age += delta
        if p.age >= p.life:
            GameManager.particles.remove_at(i)
        
        i -= 1
```

**Particle Rendering:**
```gdscript
func draw_particles():
    for p in GameManager.particles:
        var life_ratio = 1.0 - (p.age / p.life)
        var current_size = p.size * life_ratio
        var alpha = life_ratio
        
        var draw_color = Color(p.color.r, p.color.g, p.color.b, alpha)
        
        if p.type == "spark":
            # Elongated spark (using transform)
            draw_set_transform(p.position, p.rotation, Vector2(2.5, 0.6))
            draw_circle(Vector2.ZERO, current_size, draw_color)
            draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
        
        elif p.type == "smoke":
            # Multi-layer smoke
            for layer in range(3):
                var layer_scale = 0.6 + layer * 0.2
                var layer_alpha = (0.4 - layer * 0.1) * life_ratio
                var smoke_color = Color(p.color.r, p.color.g, p.color.b, layer_alpha)
                draw_circle(p.position, p.size * layer_scale * (1.0 + p.age * 0.5), smoke_color)
        
        else:
            # Normal particle
            draw_circle(p.position, current_size, draw_color)
```

### Warp Effect

```gdscript
func draw_warp_effect():
    var warp_progress = GameManager.warp_timer / GameManager.WARP_DURATION
    var tunnel_alpha = sin(warp_progress * PI) * 0.5
    
    # Radial speed lines
    for i in range(16):
        var angle = (float(i) / 16.0) * TAU
        var start_radius = 50.0
        var end_radius = 450.0
        var start = Constants.polar_to_cartesian(angle, start_radius)
        var end_pos = Constants.polar_to_cartesian(angle, end_radius)
        draw_line(start, end_pos, Color(0.0, 0.8, 1.0, tunnel_alpha), 2.0)
```

---

## Boss System

### Boss Inheritance Hierarchy

```
BossBase (abstract parent)
  │
  ├── Properties:
  │   ├── hp, max_hp: int
  │   ├── is_destroying: bool
  │   ├── death_timer, death_duration: float
  │   ├── x, y: float (position)
  │   ├── phase: int (1-3 based on health)
  │   └── age: float
  │
  ├── Methods:
  │   ├── update(delta)
  │   ├── update_movement(delta) [override]
  │   ├── fire() [override]
  │   ├── take_damage(damage) -> bool
  │   ├── start_destruction()
  │   ├── update_destruction(delta)
  │   ├── final_explosion()
  │   └── get_collision_shapes() -> Array [override]
  │
  └── Subclasses:
      ├── CosmicSerpent
      │   ├── 10 segments
      │   ├── Serpentine + spiral movement
      │   ├── 4-second destruction
      │   └── Collision: individual segment hitboxes
      │
      ├── StarDestroyer
      │   ├── 8 turrets
      │   ├── Charge attack pattern
      │   ├── 5-second destruction
      │   └── Collision: individual turret hitboxes
      │
      └── GalacticCore
          ├── 6 orbital platforms
          ├── Wave + spiral movement
          ├── Energy beam connections
          ├── 6-second destruction
          └── Collision: individual orbital hitboxes
```

### Boss State Machine

```
Created
  ↓
Phase 1 (HP > 66%)
  ├─→ Movement pattern (base speed)
  ├─→ Fire rate (base)
  └─→ Normal behavior
  ↓ (HP <= 66%)
Phase 2 (HP > 33%)
  ├─→ Movement speed * 1.5
  ├─→ Fire rate * 1.5
  └─→ Increased aggression
  ↓ (HP <= 33%)
Phase 3 (HP > 0%)
  ├─→ Movement speed * 2.0
  ├─→ Fire rate * 2.0
  └─→ Desperate behavior
  ↓ (HP <= 0)
Destruction Sequence (4-6 seconds)
  ├─→ is_destroying = true
  ├─→ Continuous explosions
  ├─→ Movement slows/stops
  ├─→ Visual effects intensify
  └─→ Final massive explosion
  ↓
Boss Defeated
  └─→ GameManager.boss_defeated()
```

### Boss Update Loop

```gdscript
func update(delta: float):
    last_delta = delta
    age += delta
    
    if is_destroying:
        update_destruction(delta)
        return
    
    # Update movement (AI pattern)
    update_movement(delta)
    
    # Update firing
    fire_timer += delta
    if fire_timer >= fire_rate:
        fire()
        fire_timer = 0.0
    
    # Phase transitions based on health
    update_phase()

func update_phase():
    var health_ratio = float(hp) / float(max_hp)
    
    if health_ratio > 0.66:
        phase = 1
    elif health_ratio > 0.33:
        phase = 2
    else:
        phase = 3

func get_aggression_multiplier() -> float:
    match phase:
        1: return 1.0
        2: return 1.5
        3: return 2.0
        _: return 1.0
```

### Multi-Part Collision System

**Boss Collision Shapes:**
```gdscript
# CosmicSerpent
func get_collision_shapes() -> Array:
    var shapes = []
    for i in range(segments.size()):
        shapes.append({
            "position": segments[i].position,
            "radius": segments[i].radius,
            "segment_index": i
        })
    return shapes

# StarDestroyer
func get_collision_shapes() -> Array:
    var shapes = []
    for i in range(turrets.size()):
        if not turrets[i].destroyed:
            shapes.append({
                "position": turrets[i].position,
                "radius": turrets[i].radius,
                "turret_index": i
            })
    return shapes

# GalacticCore
func get_collision_shapes() -> Array:
    var shapes = []
    for i in range(orbitals.size()):
        if not orbitals[i].destroyed:
            shapes.append({
                "position": orbitals[i].position,
                "radius": orbitals[i].radius,
                "orbital_index": i
            })
    return shapes
```

**Collision Detection:**
```gdscript
# In BulletEntity.update_player_bullets(delta)
if GameManager.boss_instance != null:
    var boss = GameManager.boss_instance
    var shapes = boss.get_collision_shapes()
    
    for bullet in GameManager.bullets:
        var bullet_pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
        
        for shape in shapes:
            var dist_sq = Constants.dist_sq_vec(bullet_pos, shape.position)
            var hit_radius_sq = (shape.radius + bullet.weapon.size) ** 2
            
            if dist_sq <= hit_radius_sq:
                # Apply damage to specific part
                var destroyed = GameManager.apply_boss_damage(shape, bullet.damage)
                
                # Remove bullet (unless piercing)
                if not bullet.get("pierce", false):
                    break
```

### Boss Destruction Sequence

```gdscript
func start_destruction():
    is_destroying = true
    death_timer = 0.0
    AudioManager.play_boss_death()

func update_destruction(delta: float):
    death_timer += delta
    
    # Spawn explosion particles throughout destruction
    var explosions_per_sec = 10.0
    if randf() < explosions_per_sec * delta:
        var offset_x = randf_range(-50, 50)
        var offset_y = randf_range(-50, 50)
        var pos = Vector2(x + offset_x, y + offset_y)
        GameManager.spawn_explosion(pos, 15, Color(1.0, 0.5, 0.0))
    
    # Final explosion
    if death_timer >= death_duration:
        final_explosion()
        GameManager.boss_defeated()

func final_explosion():
    # Massive circular explosion pattern
    for i in range(50):
        var angle = (float(i) / 50.0) * TAU
        var distance = randf_range(0, 80)
        var offset = Vector2(cos(angle) * distance, sin(angle) * distance)
        var pos = Vector2(x, y) + offset
        GameManager.spawn_explosion(pos, 20, Color.YELLOW)
    
    AudioManager.play_explosion()
```

---

## Weapon and Upgrade System

### Weapon System

**Weapon Configurations:**
```gdscript
const WEAPONS = {
    "Laser": {
        "id": "laser",
        "name": "Laser",
        "speed": 600.0,
        "damage": 1,
        "cooldown": 0.12,
        "color": Color("#ffd966"),
        "size": 3.0
    },
    "Plasma": {
        "id": "plasma",
        "name": "Plasma",
        "speed": 500.0,
        "damage": 2,
        "cooldown": 0.2,
        "color": Color("#66ffcc"),
        "size": 5.0,
        "pierce": true  # Penetrates multiple enemies
    },
    "Wave": {
        "id": "wave",
        "name": "Wave",
        "speed": 550.0,
        "damage": 1,
        "cooldown": 0.15,
        "color": Color("#ff66aa"),
        "size": 4.0,
        "spread_angle": 0.2  # Wide arc pattern
    }
}
```

**Weapon Persistence:**
```gdscript
# Weapons persist through:
# - Warps
# - Boss victories
# - Planet changes

# Weapons reset only on:
# - Life loss (player.take_damage() → die())
# - Start of satellite cycle (wave 1 after completing 3 warps)

func take_damage():
    lives -= 1
    if lives <= 0:
        die()
    else:
        reset_weapons_and_upgrades()  # Only here!

func spawn_satellite_wave():
    # Reset to Laser ONLY at very start of satellite cycle
    if satellite_waves_completed == 0 and player != null:
        player.current_weapon = Constants.WEAPONS.Laser
```

**Weapon Firing Logic:**
```gdscript
func fire():
    var fire_rate = current_weapon.get("fireRate", 0.15)
    if upgrades.rapidFire:
        fire_rate *= 0.5  # Upgrade: fire twice as fast
    
    if fire_timer < fire_rate:
        return
    
    fire_timer = 0.0
    
    # Determine shot count (single, double, triple)
    var shot_count = 1
    if upgrades.tripleShot:
        shot_count = 3
    elif upgrades.doubleShot:
        shot_count = 2
    
    # Fire bullets based on weapon type
    match current_weapon.name:
        "Laser":
            fire_laser(shot_count)
        "Plasma":
            fire_plasma(shot_count)
        "Wave":
            fire_wave(shot_count)
```

### Upgrade System

**Upgrade Configurations:**
```gdscript
const UPGRADES = {
    "Shield": {
        "id": "shield",
        "duration": 10.0,
        "color": Color("#66aaff")
    },
    "Rapid Fire": {
        "id": "rapid_fire",
        "duration": 15.0,
        "multiplier": 2.0
    },
    "Triple Shot": {
        "id": "triple_shot",
        "duration": 20.0
    }
}
```

**Upgrade State:**
```gdscript
# In PlayerEntity
var upgrades: Dictionary = {
    "doubleShot": false,
    "tripleShot": false,
    "rapidFire": false,
    "shield": false,
    "speedBoost": false
}
```

**Applying Upgrades:**
```gdscript
func apply_upgrade(upgrade_key: String):
    if upgrade_key in upgrades:
        upgrades[upgrade_key] = true
        AudioManager.play_powerup()
        GameManager.add_score(Constants.UPGRADES[upgrade_key].score)

# Upgrades are temporary (duration-based)
# Future: Add timer system for auto-expiry
```

### Satellite Collection

**Satellite Wave:**
```gdscript
# 3 satellites spawn in arc formation
# Center satellite has powerup
# Left/right satellites award score only

func spawn_satellite_wave():
    satellite_wave_active = true
    var center_angle = randf() * TAU
    
    satellites.append(create_satellite(center_angle - 0.2, false))  # Left
    satellites.append(create_satellite(center_angle, true))         # Center (powerup!)
    satellites.append(create_satellite(center_angle + 0.2, false))  # Right
    
    satellites_in_current_wave = 3
    satellites_destroyed = 0
```

**Powerup Types:**
```gdscript
func get_satellite_powerup_type() -> String:
    var options = ["Plasma", "Wave", "Missile"]
    return options[randi() % options.size()]
```

**Collection Logic:**
```gdscript
# In SatelliteEntity.update(satellite, delta)
if player != null:
    var sat_pos = Constants.polar_to_cartesian(satellite.angle, satellite.radius)
    var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
    
    var collect_radius = 30.0
    if Constants.dist_sq_vec(sat_pos, player_pos) < collect_radius * collect_radius:
        # Collected!
        if satellite.has_powerup:
            apply_powerup_to_player(satellite.powerup_type)
        
        return true  # Mark for removal
```

---

## Common Workflows

### Adding a New Enemy Type

1. **Define Constants**
```gdscript
# In constants.gd
const ENEMY_CRUISER_SIZE = 22.0
const ENEMY_CRUISER_HP = 4
const ENEMY_CRUISER_SCORE = 300
```

2. **Update Factory**
```gdscript
# In enemy.gd EnemyEntity.create()
match type:
    "cruiser":
        enemy.hp = Constants.ENEMY_CRUISER_HP
        enemy.max_hp = Constants.ENEMY_CRUISER_HP
        enemy.size = Constants.ENEMY_CRUISER_SIZE
        enemy.score = Constants.ENEMY_CRUISER_SCORE
```

3. **Add Rendering**
```gdscript
# In main_renderer.gd draw_enemies()
var size = enemy.size  # Already set by factory
# Size determines render radius automatically
```

4. **Create Spawn Pattern**
```gdscript
# In game_manager.gd
func spawn_cruiser_formation():
    for i in range(8):
        var angle = (float(i) / 8.0) * TAU
        var enemy = EnemyEntity.create("cruiser", angle, -30.0, 120.0)
        enemies.append(enemy)
```

### Adding a New Weapon

1. **Define Configuration**
```gdscript
# In constants.gd WEAPONS dict
"Laser": { ... },
"Plasma": { ... },
"Wave": { ... },
"Rocket": {  # NEW
    "id": "rocket",
    "name": "Rocket",
    "speed": 450.0,
    "damage": 3,
    "cooldown": 0.3,
    "color": Color("#ff0000"),
    "size": 6.0,
    "explosion_radius": 30.0
}
```

2. **Implement Firing Logic**
```gdscript
# In player.gd fire() method
match current_weapon.name:
    "Laser":
        fire_laser(shot_count)
    "Plasma":
        fire_plasma(shot_count)
    "Wave":
        fire_wave(shot_count)
    "Rocket":  # NEW
        fire_rocket(shot_count)

func fire_rocket(shot_count: int):
    for i in range(shot_count):
        var bullet = {
            "angle": angle,
            "radius": Constants.PLAYER_ORBIT_RADIUS - 20.0,
            "speed": -450.0,
            "weapon": current_weapon,
            "damage": current_weapon.damage,
            "explosion_radius": current_weapon.explosion_radius
        }
        GameManager.bullets.append(bullet)
    
    AudioManager.play_rocket()
```

3. **Add Visual Effects**
```gdscript
# In main_renderer.gd draw_player_bullets()
for bullet in GameManager.bullets:
    var pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
    var weapon = bullet.weapon
    
    if weapon.name == "Rocket":
        # Custom rendering
        draw_circle(pos, weapon.size, weapon.color)
        draw_circle(pos, weapon.size * 0.7, Color.YELLOW)
        # Trail effect
        var trail_pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius + 10.0)
        draw_line(pos, trail_pos, Color(1, 0.5, 0, 0.5), 3.0)
```

4. **Add to Satellite Powerup Pool**
```gdscript
# In game_manager.gd
func get_satellite_powerup_type() -> String:
    var options = ["Plasma", "Wave", "Missile", "Rocket"]  # Added Rocket
    return options[randi() % options.size()]
```

### Adding a New Boss

1. **Create Boss Script**
```gdscript
# scripts/bosses/quantum_leviathan.gd
class_name QuantumLeviathan
extends BossBase

func _init():
    boss_type = "quantum_leviathan"
    hp = 120
    max_hp = 120
    death_duration = 6.0
    x = Constants.SCREEN_CENTER.x
    y = Constants.SCREEN_CENTER.y

func update_movement(delta: float):
    # Custom movement AI
    var speed = move_speed * get_aggression_multiplier()
    age += delta
    
    # Figure-8 pattern
    x = Constants.SCREEN_CENTER.x + cos(age * 0.5) * 100.0
    y = Constants.SCREEN_CENTER.y + sin(age * 1.0) * 100.0

func fire():
    # Custom firing pattern
    for i in range(8):
        var angle = (float(i) / 8.0) * TAU + age
        var bullet_pos = Vector2(x, y)
        var bullet_vel = Vector2(cos(angle), sin(angle)) * 200.0
        
        GameManager.boss_bullets.append({
            "x": bullet_pos.x,
            "y": bullet_pos.y,
            "vx": bullet_vel.x,
            "vy": bullet_vel.y,
            "color": Color.PURPLE,
            "size": 6.0
        })

func get_collision_shapes() -> Array:
    return [{
        "position": Vector2(x, y),
        "radius": 60.0
    }]
```

2. **Add to Boss Creation**
```gdscript
# In game_manager.gd
func create_boss(index: int):
    boss_type = index % 4  # Now 4 bosses
    match boss_type:
        0:
            boss_instance = CosmicSerpent.new()
        1:
            boss_instance = StarDestroyer.new()
        2:
            boss_instance = GalacticCore.new()
        3:  # NEW
            boss_instance = QuantumLeviathan.new()
```

3. **Add Rendering (optional custom)**
```gdscript
# In main_renderer.gd draw_boss()
var boss = GameManager.boss_instance
if boss == null:
    return

if boss.boss_type == "quantum_leviathan":
    # Custom rendering
    var pos = Vector2(boss.x, boss.y)
    draw_circle(pos, 60.0, Color.PURPLE)
    # ... complex shape
else:
    # Default rendering
    var pos = Vector2(boss.x, boss.y)
    draw_circle(pos, 50.0, Color.RED)
```

---

## Extension Points

### Modding Support (Future)

**Plugin Architecture:**
```gdscript
# scripts/mod_loader.gd
class_name ModLoader

static func load_custom_weapons() -> Dictionary:
    var custom_weapons = {}
    var dir = DirAccess.open("user://mods/weapons/")
    # Load JSON weapon definitions
    return custom_weapons

static func load_custom_enemies() -> Dictionary:
    var custom_enemies = {}
    var dir = DirAccess.open("user://mods/enemies/")
    # Load JSON enemy definitions
    return custom_enemies
```

### Save System (Future)

**Save Data Structure:**
```gdscript
{
    "version": "1.0",
    "high_score": 125000,
    "settings": {
        "sound_enabled": true,
        "music_volume": 0.8,
        "sfx_volume": 1.0
    },
    "progress": {
        "planets_completed": 3,
        "bosses_defeated": ["cosmic_serpent", "star_destroyer"]
    }
}
```

**Save/Load Functions:**
```gdscript
func save_game():
    var save_data = {
        "high_score": GameManager.high_score,
        "settings": {
            "sound_enabled": AudioManager.sound_enabled
        }
    }
    
    var save_file = FileAccess.open("user://gyruss_save.json", FileAccess.WRITE)
    save_file.store_string(JSON.stringify(save_data))
    save_file.close()

func load_game():
    if not FileAccess.file_exists("user://gyruss_save.json"):
        return
    
    var save_file = FileAccess.open("user://gyruss_save.json", FileAccess.READ)
    var json_string = save_file.get_as_text()
    save_file.close()
    
    var json = JSON.new()
    var parse_result = json.parse(json_string)
    if parse_result == OK:
        var save_data = json.data
        GameManager.high_score = save_data.get("high_score", 0)
```

### Multiplayer Extension (Future)

**Architecture:**
```
Player 1 (Host)        Player 2 (Client)
      │                      │
      └──────── Network ─────┘
              (Godot RPC)
              
Shared:
- Enemy positions (host authority)
- Boss state (host authority)
- Score (host tracks both)

Local:
- Player input
- Bullet creation
- Visual effects
```

**Example RPC:**
```gdscript
# In game_manager.gd
@rpc("any_peer", "call_local")
func spawn_enemy_rpc(type: String, angle: float, radius: float):
    var enemy = EnemyEntity.create(type, angle, radius, 150.0)
    enemies.append(enemy)

# Host spawns enemy
if multiplayer.is_server():
    spawn_enemy_rpc.rpc(type, angle, radius)
```

---

## Conclusion

The Godot implementation maintains the core design of the HTML/JS version while leveraging Godot-specific features for improved performance and maintainability:

**Key Design Decisions:**
- ✅ Autoload singletons for global systems
- ✅ Centralized rendering (MainRenderer._draw())
- ✅ Dictionary-based lightweight entities
- ✅ class_name pattern (no cyclic dependencies)
- ✅ Signals for UI updates
- ✅ Polar coordinate system (matches original)

**Workflow Benefits:**
- Fast iteration (no compilation step)
- Visual scene editor for UI
- Built-in profiler and debugger
- Export to multiple platforms

**Common Tasks:**
1. Add enemy: Define constants → Update factory → Create spawn pattern
2. Add weapon: Define config → Implement firing → Add rendering
3. Add boss: Create class → Add to factory → Custom AI
4. Debug: Use Godot profiler → Inspect autoload state → Breakpoints

This architecture has proven effective for rapid development and serves as a solid foundation for cross-platform deployment and future multiplayer support.
