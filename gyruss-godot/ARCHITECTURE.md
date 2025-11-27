# Gyruss Godot 4.5.1 - Technical Architecture

## Overview

The Godot implementation of Gyruss is a high-performance port of the HTML5/JavaScript version, built using Godot Engine 4.5.1 with GDScript. It maintains feature parity with the original while leveraging Godot's scene-node architecture and built-in game loop.

**Technology Stack:**
- Godot Engine 4.5.1
- GDScript (statically typed where beneficial)
- Single-pass global renderer (no per-node _draw calls)
- Autoload singleton pattern for global systems

**Architecture Pattern:** Autoload singletons + centralized rendering + dictionary-based entity storage.

---

## File Structure

```
gyruss-godot/
├── project.godot          # Godot project configuration
├── scenes/
│   └── main.tscn         # Main game scene (MainRenderer + UIRenderer nodes)
├── scripts/
│   ├── autoload/         # Global singleton scripts (autoloaded)
│   │   ├── constants.gd       # Global constants and utility functions
│   │   ├── game_manager.gd    # Game state, entity management, main loop
│   │   ├── input_handler.gd   # Centralized input handling
│   │   └── audio_manager.gd   # Audio system (placeholder)
│   ├── entities/         # Entity implementations (class_name for global access)
│   │   ├── player.gd         # PlayerEntity class
│   │   ├── enemy.gd          # EnemyEntity static methods
│   │   ├── bullet.gd         # BulletEntity static methods
│   │   ├── missile.gd        # MissileEntity static methods
│   │   ├── satellite.gd      # SatelliteEntity static methods
│   │   └── particle.gd       # Particle (simple Dictionary)
│   ├── bosses/          # Boss implementations (class_name inheritance)
│   │   ├── boss_base.gd      # BossBase parent class
│   │   ├── cosmic_serpent.gd # CosmicSerpent boss
│   │   ├── star_destroyer.gd # StarDestroyer boss
│   │   └── galactic_core.gd  # GalacticCore boss
│   └── rendering/       # Rendering systems
│       ├── main_renderer.gd  # Global canvas with 14-layer pipeline
│       └── ui_renderer.gd    # HUD overlay (CanvasLayer)
└── assets/              # Future assets (currently empty)
```

**Autoload Configuration (project.godot):**
```ini
[autoload]
Constants="*res://scripts/autoload/constants.gd"
GameManager="*res://scripts/autoload/game_manager.gd"
InputHandler="*res://scripts/autoload/input_handler.gd"
AudioManager="*res://scripts/autoload/audio_manager.gd"
```

The asterisk (*) means the singleton is instantiated immediately on game start.

---

## Godot 4.5.1 Specifics

### Why Godot 4.5.1?

- **Performance:** Native C++ engine runs faster than JavaScript (60 FPS on lower-end hardware)
- **Export Options:** Can build for Windows, Linux, macOS, Web, Mobile
- **Scene System:** Natural fit for UI and game structure
- **Built-in Physics:** Delta time, collision, signals all built-in
- **Active Development:** Latest stable LTS release

### GDScript Key Features Used

**Static Typing (optional but recommended):**
```gdscript
var enemies: Array[Dictionary] = []  # Typed array
var score: int = 0
var player: PlayerEntity = null

func update(delta: float) -> void:
    # Type hints improve performance and catch errors
```

**Signals (Event System):**
```gdscript
signal state_changed(new_state: GameState)
signal score_changed(new_score: int)

# Emit
state_changed.emit(GameState.PLAYING)

# Connect (in another script)
GameManager.state_changed.connect(_on_state_changed)
```

**Match Statements (Switch-Case):**
```gdscript
match state:
    GameState.ATTRACT:
        update_attract(delta)
    GameState.PLAYING:
        update_playing(delta)
    GameState.BOSS:
        update_boss(delta)
```

**Class Names (Global Access):**
```gdscript
# In player.gd
class_name PlayerEntity

# Anywhere else (no preload needed!)
var player = PlayerEntity.new()
```

**Enums:**
```gdscript
enum GameState { ATTRACT, PLAYING, WARP, BONUS, BOSS, VICTORY, GAME_OVER }
var state: GameState = GameState.ATTRACT
```

---

## Coordinate System

### Polar Coordinates (Primary System)

**Identical to HTML/JS implementation:**

```
Center: Vector2(450, 450)  # Constants.SCREEN_CENTER
Angle: 0 to TAU radians (0 = right, PI/2 = down, PI = left, 3*PI/2 = up)
Radius: Distance from center in pixels
```

**Key Constants:**
```gdscript
const PLAYER_ORBIT_RADIUS = 378.0  # Player's fixed orbit
const SCREEN_CENTER = Vector2(450.0, 450.0)
const TWO_PI = TAU  # Godot constant
```

### CRITICAL: Entity Spawn Direction

**Enemies spawn at NEGATIVE radius and move INWARD:**
```gdscript
# Enemy spawning
var enemy = EnemyEntity.create("fighter", angle, -20.0, 150.0)
# radius = -20.0 (OFF-SCREEN)
# speed = 150.0 pixels/sec

# Each frame:
enemy.radius += enemy.v_radius * delta  # -20 → -10 → 0 → 100 → 378 (breach!)
```

**Starfield spawns at CENTER and moves OUTWARD:**
```gdscript
# Star creation
star.radius = rand_range(1.0, 40.0)  # Near center
star.speed = 50.0  # Outward velocity

# Each frame:
star.radius += star.speed * delta  # 1 → 50 → 100 → 450 (respawn!)

# Respawn condition
if star.radius > 450.0:  # Reached edge
    star.radius = rand_range(1.0, 40.0)  # Back to center
```

**Common Mistake:**
```gdscript
# WRONG (enemy moves outward)
enemy.radius += abs(enemy.speed) * delta

# RIGHT (enemy moves inward)
enemy.radius += enemy.v_radius * delta  # v_radius is positive, radius starts negative
```

### Conversion Functions

```gdscript
# In Constants autoload
func polar_to_cartesian(angle: float, radius: float) -> Vector2:
    return Vector2(
        SCREEN_CENTER.x + cos(angle) * radius,
        SCREEN_CENTER.y + sin(angle) * radius
    )

func cartesian_to_polar(pos: Vector2) -> Vector2:
    var dx = pos.x - SCREEN_CENTER.x
    var dy = pos.y - SCREEN_CENTER.y
    var angle = atan2(dy, dx)
    var radius = sqrt(dx * dx + dy * dy)
    return Vector2(angle, radius)  # .x = angle, .y = radius

func wrap_angle(angle: float) -> float:
    var result = fmod(angle, TWO_PI)
    if result < 0:
        result += TWO_PI
    return result
```

**Usage Example:**
```gdscript
# Player ship rendering
var player_pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
draw_circle(player_pos, Constants.PLAYER_SIZE, Color.CYAN)

# Enemy movement
enemy.angle += enemy.v_angle * delta
enemy.radius += enemy.v_radius * delta
enemy.angle = Constants.wrap_angle(enemy.angle)
```

---

## Rendering Pipeline

### Single-Pass Global Renderer

**Key Difference from HTML/JS:** 
- HTML/JS: Canvas drawing in single `draw(ctx)` function
- Godot: Single `MainRenderer._draw()` method called every frame

**Why Centralized Rendering?**
1. **Performance:** One draw call per frame (not per entity)
2. **Layer Control:** Explicit ordering (no z-index guessing)
3. **Simplicity:** All rendering code in one place
4. **Consistency:** Matches HTML/JS architecture

### MainRenderer.gd Structure

```gdscript
extends Node2D
# MainRenderer - Global canvas with 14-layer pipeline

func _process(delta):
    update_starfield(delta)  # Move stars
    update_particles(delta)  # Age particles
    queue_redraw()           # Request redraw

func _draw():
    # Layer 1: Background gradient
    draw_background()
    
    # Layer 2: Animated nebula (TODO)
    # draw_nebula()
    
    # Layer 3: Starfield
    draw_starfield()
    
    # Layer 4: Orbit ring
    draw_orbit_ring()
    
    # Layer 5: Enemies
    draw_enemies()
    
    # Layer 6: Satellites
    draw_satellites()
    
    # Layer 7: Boss
    draw_boss()
    
    # Layer 8: Enemy bullets
    draw_enemy_bullets()
    
    # Layer 9: Player
    draw_player()
    
    # Layer 10: Player bullets
    draw_player_bullets()
    
    # Layer 11: Missiles
    draw_missiles()
    
    # Layer 12: Particles
    draw_particles()
    
    # Layer 13: Warp effect
    if GameManager.state == GameManager.GameState.WARP:
        draw_warp_effect()
    
    # Layer 14: Debug overlays (if enabled)
    if InputHandler.debug_mode:
        draw_debug_info()
```

### Drawing Methods

**Canvas Drawing Functions:**
```gdscript
# Circles
draw_circle(position: Vector2, radius: float, color: Color)

# Lines
draw_line(from: Vector2, to: Vector2, color: Color, width: float)

# Arcs
draw_arc(center: Vector2, radius: float, start_angle: float, 
         end_angle: float, points: int, color: Color, width: float)

# Rectangles
draw_rect(rect: Rect2, color: Color, filled: bool = true)

# Polygons
draw_colored_polygon(points: PackedVector2Array, color: Color)
draw_polyline(points: PackedVector2Array, color: Color, width: float)

# Transformations
draw_set_transform(position: Vector2, rotation: float, scale: Vector2)
# Must reset: draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
```

**Example: Player Ship Rendering**
```gdscript
func draw_player():
    if GameManager.player == null:
        return
    
    var player = GameManager.player
    
    # Blinking effect during invulnerability
    if player.hit_timer > 0:
        player.blink_timer += get_process_delta_time() * 8.0
        if int(player.blink_timer) % 2 == 0:
            return  # Skip drawing every other frame
    
    # Convert polar to cartesian
    var pos = Constants.polar_to_cartesian(player.angle, Constants.PLAYER_ORBIT_RADIUS)
    var ship_angle = player.angle + PI / 2.0  # Point toward center
    
    # Transform to player position and rotation
    draw_set_transform(pos, ship_angle, Vector2.ONE)
    
    # Draw ship triangle
    var size = Constants.PLAYER_SIZE
    var points = PackedVector2Array([
        Vector2(0, -size),
        Vector2(-size * 0.6, size * 0.5),
        Vector2(size * 0.6, size * 0.5)
    ])
    
    draw_colored_polygon(points, Color.CYAN)
    draw_polyline(points + PackedVector2Array([points[0]]), Color.WHITE, 1.5)
    
    # Thrusters (animated)
    var thruster_intensity = 0.7 + 0.3 * sin(world_time * 25.0)
    draw_circle(Vector2(-size * 0.3, size * 0.5), 3.0, 
                Color(1.0, 0.5, 0.0, thruster_intensity))
    draw_circle(Vector2(size * 0.3, size * 0.5), 3.0, 
                Color(1.0, 0.5, 0.0, thruster_intensity))
    
    # Reset transform (CRITICAL!)
    draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
```

### UIRenderer (Separate Layer)

```gdscript
extends CanvasLayer
# UIRenderer - HUD overlay on top of game

var score_label: Label
var lives_label: Label
var planet_label: Label

func _ready():
    # Create UI labels
    score_label = Label.new()
    add_child(score_label)
    
    # Connect to GameManager signals
    GameManager.score_changed.connect(_on_score_changed)
    GameManager.lives_changed.connect(_on_lives_changed)

func _on_score_changed(new_score: int):
    score_label.text = "SCORE: %d" % new_score
```

**Why CanvasLayer?**
- Renders on top of Node2D scene (UI always visible)
- Independent of camera transforms
- Pixel-perfect positioning

---

## State Machine

### Game States (Enum)

```gdscript
enum GameState {
    ATTRACT,      # Title screen, waiting for input
    PLAYING,      # Active gameplay, spawning waves
    WARP,         # 2.8-second tunnel animation
    BONUS,        # Harmless enemy wave
    BOSS,         # Boss battle
    VICTORY,      # Boss defeated
    GAME_OVER     # All lives lost
}
```

### State Flow Diagram

```
    ┌─────────────┐
    │   ATTRACT   │ ← start_attract_mode()
    └──────┬──────┘
           │ Space pressed
           ↓
    ┌─────────────┐
    │   PLAYING   │ ←────────────┐
    └──────┬──────┘              │
           │ 3 satellite waves   │
           │ completed           │
           ↓                     │
    ┌─────────────┐              │
    │    WARP     │              │
    └──────┬──────┘              │
           │                     │
      ┌────┴────┐                │
      │         │                │
  warps > 0  warps == 0         │
      │         │                │
      └────→────┤                │
                ↓                │
         ┌─────────────┐         │
         │    BOSS     │         │
         └──────┬──────┘         │
                │                │
          boss defeated          │
                ↓                │
         ┌─────────────┐         │
         │   BONUS     │         │
         └──────┬──────┘         │
                │                │
         planet complete         │
                └────────────────┘

    Lives == 0 → GAME_OVER
```

### State Transitions (Code)

```gdscript
# In GameManager._process(delta)
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

# State change example
func start_warp():
    if state == GameState.WARP:
        return
    
    state = GameState.WARP
    warp_timer = 0.0
    satellite_wave_active = false
    state_changed.emit(state)  # Signal UI
    AudioManager.play_warp_sound()

func complete_warp():
    warps_to_planet -= 1  # CRITICAL: Decrement counter
    
    if warps_to_planet <= 0:
        planet_index += 1
        warps_to_planet = 3  # Reset for next planet
        
        if planet_index == 6:
            state = GameState.BOSS
            create_boss(boss_index)
        else:
            state = GameState.BONUS
            spawn_bonus_wave()
        
        planet_changed.emit(Constants.PLANETS[planet_index])
    else:
        state = GameState.PLAYING
        spawn_timer = Constants.rand_range(Constants.WAVE_DELAY_MIN, Constants.WAVE_DELAY_MAX)
    
    satellite_waves_completed = 0
    state_changed.emit(state)
```

### Warp System (Critical Logic)

**Warp Counter Mechanics:**
```gdscript
# Each planet has 3 warps before boss
var warps_to_planet: int = 3

# On game start
func reset_game():
    planet_index = 0
    warps_to_planet = 3  # Neptune starts with 3 warps

# Each warp completion
func complete_warp():
    warps_to_planet -= 1  # 3 → 2 → 1 → 0
    
    if warps_to_planet <= 0:
        # Boss time!
        warps_to_planet = 3  # Reset for next planet
        # ... transition to boss or bonus
```

**Common Mistake:**
```gdscript
# WRONG (warps never decrement)
func complete_warp():
    if warps_to_planet <= 0:
        warps_to_planet = 3
        # Boss logic
    # Missing: warps_to_planet -= 1

# RIGHT
func complete_warp():
    warps_to_planet -= 1  # Always decrement first!
    if warps_to_planet <= 0:
        warps_to_planet = 3
```

---

## Entity System

### Dictionary-Based Entities

**Why Dictionaries instead of Classes?**
- **Lightweight:** No class overhead for hundreds of bullets
- **Flexible:** Easy to add/remove properties dynamically
- **Serializable:** Can save/load easily
- **Fast:** GDScript dictionaries are highly optimized

**Entity Storage:**
```gdscript
# In GameManager
var enemies: Array[Dictionary] = []
var bullets: Array[Dictionary] = []
var enemy_bullets: Array[Dictionary] = []
var boss_bullets: Array[Dictionary] = []
var satellites: Array[Dictionary] = []
var missiles: Array[Dictionary] = []
var particles: Array[Dictionary] = []
var stars: Array[Dictionary] = []
```

**Enemy Dictionary Structure:**
```gdscript
{
    "type": "fighter",              # "fighter", "saucer", "bomber"
    "angle": 1.57,                  # Current angle (radians)
    "radius": -20.0,                # Current radius (negative = off-screen)
    "v_angle": 0.0,                 # Angular velocity
    "v_radius": 150.0,              # Radial velocity (positive = inward)
    "base_angle": 1.57,             # Original spawn angle
    "phase": 0.0,                   # Sine wave phase
    "oscillation_amplitude": 0.3,   # Oscillation range
    "oscillation_frequency": 2.0,   # Oscillation speed
    "hp": 1,                        # Current health
    "max_hp": 1,                    # Maximum health
    "size": 12.0,                   # Render size
    "color": Color(...),            # Render color
    "fire_rate": 0.003,            # Probability to fire per frame
    "harmless": false               # Bonus stage flag
}
```

**Bullet Dictionary Structure:**
```gdscript
{
    "angle": 0.0,                   # Polar angle
    "radius": 370.0,                # Polar radius
    "speed": -400.0,                # Radial velocity (negative = inward)
    "weapon": { ... },              # Weapon config dict
    "damage": 1,                    # Damage value
    "pierce": false                 # Plasma piercing flag
}
```

**Particle Dictionary Structure:**
```gdscript
{
    "position": Vector2(100, 200),  # Cartesian position
    "vx": 50.0,                     # X velocity
    "vy": -30.0,                    # Y velocity
    "life": 0.8,                    # Total lifetime
    "age": 0.0,                     # Current age
    "rotation": 1.57,               # Rotation angle
    "rot_speed": 2.0,               # Rotation velocity
    "type": "normal",               # "normal", "spark", "smoke", "explosion"
    "color": Color.RED,             # Base color
    "size": 4.0                     # Render size
}
```

### Entity Factories (Static Methods)

**Why Static Methods?**
- No need to instantiate factory classes
- Clear "create this entity" semantic
- Matches functional programming style
- Centralized creation logic

**Enemy Factory:**
```gdscript
# In enemy.gd
class_name EnemyEntity

static func create(type: String, angle: float, radius: float, speed: float) -> Dictionary:
    var enemy = {
        "type": type,
        "angle": angle,
        "radius": radius,
        "v_angle": 0.0,
        "v_radius": speed,
        "base_angle": angle,
        "phase": randf() * TAU,
        "oscillation_amplitude": deg_to_rad(20.0),
        "oscillation_frequency": 2.0,
        "fire_rate": 0.003,
        "harmless": false
    }
    
    # Type-specific properties
    match type:
        "fighter":
            enemy.hp = Constants.ENEMY_FIGHTER_HP
            enemy.max_hp = Constants.ENEMY_FIGHTER_HP
            enemy.size = Constants.ENEMY_FIGHTER_SIZE
            enemy.score = Constants.ENEMY_FIGHTER_SCORE
        "saucer":
            enemy.hp = Constants.ENEMY_SAUCER_HP
            enemy.max_hp = Constants.ENEMY_SAUCER_HP
            enemy.size = Constants.ENEMY_SAUCER_SIZE
            enemy.score = Constants.ENEMY_SAUCER_SCORE
        "bomber":
            enemy.hp = Constants.ENEMY_BOMBER_HP
            enemy.max_hp = Constants.ENEMY_BOMBER_HP
            enemy.size = Constants.ENEMY_BOMBER_SIZE
            enemy.score = Constants.ENEMY_BOMBER_SCORE
    
    # Random color
    var color_index = randi() % Constants.ENEMY_COLORS.size()
    enemy.color = Color(Constants.ENEMY_COLORS[color_index])
    
    return enemy

static func update(enemy: Dictionary, delta: float) -> void:
    # Update oscillation
    enemy.phase += enemy.oscillation_frequency * delta
    var oscillation = sin(enemy.phase) * enemy.oscillation_amplitude
    enemy.angle = enemy.base_angle + oscillation
    
    # Move inward
    enemy.radius += enemy.v_radius * delta
    
    # Fire at player
    if randf() < enemy.fire_rate and not enemy.harmless:
        fire_at_player(enemy)

static func fire_at_player(enemy: Dictionary) -> void:
    # Create bullet aimed at player
    if GameManager.player == null:
        return
    
    var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
    var player_pos = Constants.polar_to_cartesian(GameManager.player.angle, 
                                                   Constants.PLAYER_ORBIT_RADIUS)
    
    var dx = player_pos.x - enemy_pos.x
    var dy = player_pos.y - enemy_pos.y
    var angle_to_player = atan2(dy, dx)
    
    # Convert to polar for bullet
    var bullet_polar = Constants.cartesian_to_polar(enemy_pos)
    
    var bullet = {
        "angle": bullet_polar.x,
        "radius": bullet_polar.y,
        "speed": 200.0,  # Outward speed
        "color": Color.RED,
        "size": 4.0
    }
    
    GameManager.enemy_bullets.append(bullet)
    AudioManager.play_enemy_fire()
```

### Player Entity (Class Instance)

**Why Class for Player?**
- Only one player (no mass storage needed)
- Complex state (weapons, upgrades, invulnerability)
- Frequent method calls (update, fire, take_damage)
- Clear ownership of behavior

```gdscript
# In player.gd
class_name PlayerEntity
extends Node  # Technically not needed, but keeps consistency

var angle: float = 0.0
var lives: int = 3
var missiles: int = 3
var current_weapon: Dictionary = Constants.WEAPONS.Laser
var upgrades: Dictionary = { ... }
var hit_timer: float = 0.0
var invulnerable: bool = false

func update(delta: float):
    # Handle rotation
    var rotation_input = 0.0
    if InputHandler.is_left_pressed():
        rotation_input -= 1.0
    if InputHandler.is_right_pressed():
        rotation_input += 1.0
    
    angle += rotation_input * deg_to_rad(rotation_speed) * delta
    angle = Constants.wrap_angle(angle)
    
    # Handle firing
    fire_timer += delta
    if InputHandler.is_fire_pressed():
        fire()
    
    # Update hit invulnerability
    if hit_timer > 0:
        hit_timer -= delta

func fire():
    var fire_rate = current_weapon.get("fireRate", 0.15)
    if fire_timer < fire_rate:
        return
    
    fire_timer = 0.0
    
    # Create bullet based on weapon type
    match current_weapon.name:
        "Laser":
            fire_laser(1)
        "Plasma":
            fire_plasma(1)
        "Wave":
            fire_wave(1)

func take_damage():
    if hit_timer > 0 or invulnerable:
        return
    
    if upgrades.shield:
        upgrades.shield = false
        hit_timer = 1.0
        return
    
    lives -= 1
    hit_timer = 2.0
    
    if lives <= 0:
        die()
    else:
        reset_weapons_and_upgrades()
```

### Boss Entities (Class Instances)

**Boss Inheritance Hierarchy:**
```
BossBase (base class)
  ├── CosmicSerpent (10 segments, serpentine movement)
  ├── StarDestroyer (8 turrets, charge attacks)
  └── GalacticCore (6 orbitals, energy beams)
```

**BossBase Class:**
```gdscript
class_name BossBase
extends Node

var hp: int = 100
var max_hp: int = 100
var is_destroying: bool = false
var death_timer: float = 0.0
var death_duration: float = 5.0
var x: float = 450.0
var y: float = 450.0

func update(delta: float):
    if is_destroying:
        update_destruction(delta)
        return
    
    update_movement(delta)
    
    fire_timer += delta
    if fire_timer >= fire_rate:
        fire()
        fire_timer = 0.0

func update_movement(_delta: float):
    # Override in subclass
    pass

func fire():
    # Override in subclass
    pass

func take_damage(damage: int) -> bool:
    if is_destroying:
        return false
    
    hp -= damage
    
    var pos = Vector2(x, y)
    GameManager.spawn_explosion(pos, 10, Color.RED)
    
    if hp <= 0:
        start_destruction()
        return true
    
    return false

func start_destruction():
    is_destroying = true
    death_timer = 0.0
    AudioManager.play_boss_death()

func update_destruction(delta: float):
    death_timer += delta
    
    # Continuous explosions
    if randf() < 10.0 * delta:
        var offset_x = randf_range(-50, 50)
        var offset_y = randf_range(-50, 50)
        var pos = Vector2(x + offset_x, y + offset_y)
        GameManager.spawn_explosion(pos, 15, Color(1.0, 0.5, 0.0))
    
    # Final explosion
    if death_timer >= death_duration:
        final_explosion()
        GameManager.boss_defeated()

func final_explosion():
    for i in range(50):
        var angle = (float(i) / 50.0) * TAU
        var distance = randf_range(0, 80)
        var offset = Vector2(cos(angle) * distance, sin(angle) * distance)
        var pos = Vector2(x, y) + offset
        GameManager.spawn_explosion(pos, 20, Color.YELLOW)
```

**Boss Creation:**
```gdscript
# In GameManager
func create_boss(index: int):
    boss_bullets.clear()
    boss_type = index % 3
    
    match boss_type:
        0:
            boss_instance = CosmicSerpent.new()
        1:
            boss_instance = StarDestroyer.new()
        2:
            boss_instance = GalacticCore.new()
```

### Entity Update Patterns

**In-Place Array Filtering:**
```gdscript
# Reverse iteration for safe removal
func update_enemy_list(delta: float):
    var i = enemies.size() - 1
    while i >= 0:
        var enemy = enemies[i]
        EnemyEntity.update(enemy, delta)
        
        var remove_enemy = false
        
        # Check breach
        if enemy.radius > Constants.PLAYER_ORBIT_RADIUS + 60.0:
            if player != null:
                player.take_damage()
            remove_enemy = true
        
        # Check off-screen
        elif enemy.radius < -250.0:
            remove_enemy = true
        
        if remove_enemy:
            enemies.remove_at(i)
        
        i -= 1
```

**Why Reverse Iteration?**
```gdscript
# WRONG (forward iteration skips elements)
for i in range(enemies.size()):
    if should_remove(enemies[i]):
        enemies.remove_at(i)  # Shifts all elements left!
        # Next iteration reads enemies[i+1], skipping the new enemies[i]

# RIGHT (reverse iteration)
var i = enemies.size() - 1
while i >= 0:
    if should_remove(enemies[i]):
        enemies.remove_at(i)  # Doesn't affect earlier indices
    i -= 1
```

---

## Global Class_name Pattern

### Why class_name Instead of Preload?

**Problem with const preload:**
```gdscript
# In game_manager.gd
const PlayerEntity = preload("res://scripts/entities/player.gd")
const EnemyEntity = preload("res://scripts/entities/enemy.gd")

# In enemy.gd (trying to access GameManager)
const GameManager = preload("res://scripts/autoload/game_manager.gd")
# ERROR: Cyclic reference! GameManager loads Enemy, Enemy loads GameManager
```

**Solution with class_name:**
```gdscript
# In player.gd
class_name PlayerEntity
# Now globally accessible, no preload needed

# In enemy.gd
class_name EnemyEntity

# Anywhere else:
var player = PlayerEntity.new()  # Works!
EnemyEntity.update(enemy, delta)  # Works!
GameManager.add_score(100)        # Works! (autoload singleton)
```

**class_name Syntax:**
```gdscript
# At top of script (before extends)
class_name ClassName

# Optional: with inheritance
class_name BossBase
extends Node

# Optional: with docstring
## Documentation comment
class_name CosmicSerpent
extends BossBase
```

**Global Access:**
```gdscript
# No preload needed anywhere
var player = PlayerEntity.new()
var enemy = EnemyEntity.create("fighter", 0.0, -20.0, 150.0)
var boss = CosmicSerpent.new()

# Call static methods
EnemyEntity.update(enemy, delta)
BulletEntity.update_player_bullets(delta)
```

**Avoids "Class_name Already Used" Errors:**
```gdscript
# WRONG (multiple files with same class_name)
# player.gd
class_name Player

# enemy.gd  
class_name Player  # ERROR: Player already defined!

# RIGHT (unique names)
# player.gd
class_name PlayerEntity

# enemy.gd
class_name EnemyEntity
```

---

## Collision Detection

### Distance-Squared Checks

**Utility Functions:**
```gdscript
# In Constants
func dist_sq(x1: float, y1: float, x2: float, y2: float) -> float:
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)

func dist_sq_vec(a: Vector2, b: Vector2) -> float:
    return a.distance_squared_to(b)  # Built-in Godot method
```

**Player vs Enemy Bullets:**
```gdscript
# In BulletEntity.update_enemy_bullets(delta)
for bullet in GameManager.enemy_bullets:
    # Update position
    bullet.radius += bullet.speed * delta
    
    # Check player collision
    if GameManager.player != null:
        var bullet_pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
        var player_pos = Constants.polar_to_cartesian(
            GameManager.player.angle,
            Constants.PLAYER_ORBIT_RADIUS
        )
        
        var hit_radius = Constants.PLAYER_SIZE + bullet.size
        var hit_radius_sq = hit_radius * hit_radius
        
        if Constants.dist_sq_vec(bullet_pos, player_pos) <= hit_radius_sq:
            GameManager.player.take_damage()
            # Remove bullet (will happen in cleanup pass)
```

**Player Bullets vs Enemies:**
```gdscript
# In BulletEntity.update_player_bullets(delta)
for bullet in GameManager.bullets:
    bullet.radius += bullet.speed * delta  # Negative = inward
    
    # Check enemy collisions
    for enemy in GameManager.enemies:
        if enemy.radius < 0:
            continue  # Off-screen
        
        var bullet_pos = Constants.polar_to_cartesian(bullet.angle, bullet.radius)
        var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
        
        var hit_radius = enemy.size + bullet.weapon.size
        var hit_radius_sq = hit_radius * hit_radius
        
        if Constants.dist_sq_vec(bullet_pos, enemy_pos) <= hit_radius_sq:
            enemy.hp -= bullet.damage
            
            if enemy.hp <= 0:
                GameManager.spawn_explosion(enemy_pos, 20, enemy.color)
                GameManager.add_score(enemy.score)
                # Mark for removal
            
            if not bullet.get("pierce", false):
                # Remove bullet (unless plasma piercing)
                break
```

**Missile Blast Radius:**
```gdscript
# In MissileEntity.explode(missile)
var explosion_pos = Vector2(missile.x, missile.y)
var blast_radius = missile.blast_radius

for enemy in GameManager.enemies:
    if enemy.radius < 0:
        continue
    
    var enemy_pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
    var dist = explosion_pos.distance_to(enemy_pos)  # Now we need actual distance
    
    if dist < blast_radius:
        # Damage falloff: 100% at center, 0% at edge
        var damage_ratio = 1.0 - (dist / blast_radius)
        var damage = int(missile.damage * damage_ratio)
        
        enemy.hp -= damage
        
        if enemy.hp <= 0:
            GameManager.spawn_explosion(enemy_pos, 15, enemy.color)
            GameManager.add_score(enemy.score)
```

### Boss Multi-Part Collision

**Boss Collision Shapes:**
```gdscript
# In BossBase
func get_collision_shapes() -> Array:
    # Override in subclass
    # Return array of { position: Vector2, radius: float, [extra data] }
    return []

# In CosmicSerpent
func get_collision_shapes() -> Array:
    var shapes = []
    for i in range(segments.size()):
        shapes.append({
            "position": segments[i].position,
            "radius": segments[i].radius,
            "segment_index": i
        })
    return shapes

# In StarDestroyer
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
```

**Collision Detection Against Boss:**
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
                
                if not bullet.get("pierce", false):
                    # Remove bullet
                    break
                
                if destroyed:
                    break
```

---

## Input Handling

### InputHandler Autoload

**Centralized Input State:**
```gdscript
# In input_handler.gd
extends Node

var left_pressed: bool = false
var right_pressed: bool = false
var fire_pressed: bool = false
var fire_just_pressed: bool = false
var missile_pressed: bool = false
var debug_invulnerable_pressed: bool = false
var debug_warp_pressed: bool = false
var debug_boss_pressed: bool = false
var restart_pressed: bool = false

func _input(event):
    if event is InputEventKey:
        var pressed = event.pressed
        
        match event.keycode:
            KEY_LEFT, KEY_A:
                left_pressed = pressed
            KEY_RIGHT, KEY_D:
                right_pressed = pressed
            KEY_SPACE:
                if pressed and not fire_pressed:
                    fire_just_pressed = true
                fire_pressed = pressed
            KEY_M:
                if pressed and not missile_pressed:
                    missile_just_pressed = true
                missile_pressed = pressed
            KEY_T:
                if pressed:
                    debug_invulnerable_pressed = true
            # ... etc
```

**Usage in Player:**
```gdscript
func update(delta: float):
    var rotation_input = 0.0
    if InputHandler.is_left_pressed():
        rotation_input -= 1.0
    if InputHandler.is_right_pressed():
        rotation_input += 1.0
    
    angle += rotation_input * deg_to_rad(rotation_speed) * delta
    
    if InputHandler.is_fire_pressed():
        fire()
```

**Why Centralized Input?**
- **Single source of truth:** No conflicts between entities
- **Easy debugging:** Check InputHandler state in debugger
- **Clean separation:** Input != game logic
- **Mobile support:** Touch events map to same flags

---

## Audio System

### Current Implementation (Placeholder)

```gdscript
# In audio_manager.gd
extends Node

var sound_enabled: bool = true

func init_audio():
    print("[AUDIO] Audio system initialized (placeholder)")

func play_laser():
    if sound_enabled:
        print("[SFX] Laser fire")

func play_explosion():
    if sound_enabled:
        print("[SFX] Explosion")

func toggle_sound():
    sound_enabled = not sound_enabled
    print("[AUDIO] Sound ", "enabled" if sound_enabled else "disabled")
```

### Future Implementation (AudioStreamPlayer)

**Using Godot's Audio System:**
```gdscript
# Future audio_manager.gd
extends Node

var laser_sound: AudioStreamPlayer
var explosion_sound: AudioStreamPlayer
var bgm_player: AudioStreamPlayer

func _ready():
    # Create audio players
    laser_sound = AudioStreamPlayer.new()
    laser_sound.stream = preload("res://assets/sounds/laser.wav")
    add_child(laser_sound)
    
    explosion_sound = AudioStreamPlayer.new()
    explosion_sound.stream = preload("res://assets/sounds/explosion.wav")
    add_child(explosion_sound)
    
    bgm_player = AudioStreamPlayer.new()
    bgm_player.stream = preload("res://assets/music/bgm.mp3")
    bgm_player.bus = "Music"
    add_child(bgm_player)
    bgm_player.play()

func play_laser():
    if sound_enabled and not laser_sound.playing:
        laser_sound.play()

func play_explosion():
    if sound_enabled:
        explosion_sound.play()
```

**Audio Bus Layout:**
```
Master
  ├── SFX (sound effects)
  │   ├── Volume: -6 dB
  │   └── Effects: None
  └── Music (background music)
      ├── Volume: -12 dB
      └── Effects: Reverb
```

---

## Performance Considerations

### Frame Rate Target

- **60 FPS** (16.67ms per frame)
- Uses `_process(delta)` for game loop
- Delta time compensates for variable frame rates

### Optimization Techniques

**1. Distance-Squared Checks**
```gdscript
# Fast (no sqrt)
var dist_sq = pos1.distance_squared_to(pos2)
if dist_sq < radius_sq:
    # Collision!

# Slow (unnecessary sqrt)
var dist = pos1.distance_to(pos2)
if dist < radius:
    # Collision!
```

**2. Particle Budget Enforcement**
```gdscript
func enforce_particle_budget():
    while particles.size() > Constants.MAX_PARTICLES:
        particles.remove_at(0)  # Remove oldest
```

**3. Off-Screen Culling**
```gdscript
func draw_enemies():
    for enemy in GameManager.enemies:
        if enemy.radius < 0:
            continue  # Don't draw off-screen enemies
        
        # Draw enemy
```

**4. Typed Arrays**
```gdscript
# Fast (type known at compile time)
var enemies: Array[Dictionary] = []

# Slower (type checking at runtime)
var enemies = []
```

**5. Single Rendering Pass**
```gdscript
# Fast (one _draw call per frame)
func _draw():
    draw_background()
    draw_enemies()
    draw_bullets()
    # ... all in one method

# Slow (multiple _draw calls)
# enemy1._draw()
# enemy2._draw()
# enemy3._draw()
# ... hundreds of calls
```

**6. Minimal State Changes**
```gdscript
# Fast (batch same-color draws)
for enemy in enemies:
    draw_circle(enemy.pos, enemy.size, Color.RED)

# Slower (color change per draw)
for enemy in enemies:
    draw_circle(enemy.pos, enemy.size, enemy.unique_color)
```

### Profiling Tools

**Godot Built-in Profiler:**
1. Run game in editor (F5)
2. Debugger panel → Profiler tab
3. Monitor:
   - Frame time (should be < 16.67ms)
   - Physics time
   - Script time
   - Rendering time

**Performance Monitors:**
```gdscript
# Enable FPS display
func _process(_delta):
    if InputHandler.debug_mode:
        print("FPS: ", Engine.get_frames_per_second())
        print("Enemies: ", GameManager.enemies.size())
        print("Bullets: ", GameManager.bullets.size())
        print("Particles: ", GameManager.particles.size())
```

---

## Common Pitfalls

### 1. Ternary Operator Doesn't Exist

**WRONG:**
```gdscript
var value = condition ? true_val : false_val  # SYNTAX ERROR!
```

**RIGHT:**
```gdscript
# Option 1: if/else
var value
if condition:
    value = true_val
else:
    value = false_val

# Option 2: inline if (Python-style)
var value = true_val if condition else false_val
```

### 2. Dictionary Access Without Default

**WRONG:**
```gdscript
var speed = enemy["speed"]  # ERROR if key doesn't exist!
```

**RIGHT:**
```gdscript
var speed = enemy.get("speed", 100.0)  # Default to 100.0
```

### 3. Coordinate System Confusion

**WRONG:**
```gdscript
# Enemies moving outward
enemy.radius += abs(enemy.speed) * delta
```

**RIGHT:**
```gdscript
# Enemies start negative, move toward positive (inward)
enemy.radius += enemy.v_radius * delta  # v_radius is positive
```

### 4. Forgetting to Reset Transform

**WRONG:**
```gdscript
func _draw():
    draw_set_transform(Vector2(100, 100), PI, Vector2.ONE)
    draw_circle(Vector2.ZERO, 10, Color.RED)
    # Next draw call still transformed!
```

**RIGHT:**
```gdscript
func _draw():
    draw_set_transform(Vector2(100, 100), PI, Vector2.ONE)
    draw_circle(Vector2.ZERO, 10, Color.RED)
    draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)  # Reset!
```

### 5. Forward Array Iteration with Removal

**WRONG:**
```gdscript
for i in range(enemies.size()):
    if should_remove(enemies[i]):
        enemies.remove_at(i)  # Skips next element!
```

**RIGHT:**
```gdscript
var i = enemies.size() - 1
while i >= 0:
    if should_remove(enemies[i]):
        enemies.remove_at(i)
    i -= 1
```

### 6. Missing queue_redraw()

**WRONG:**
```gdscript
func _process(delta):
    update_entities(delta)
    # No redraw requested - screen doesn't update!
```

**RIGHT:**
```gdscript
func _process(delta):
    update_entities(delta)
    queue_redraw()  # Request next frame
```

---

## Future Enhancements

### Planned Improvements

1. **Audio System**
   - Replace placeholder with AudioStreamPlayer nodes
   - Procedural sound generation (Web Audio equivalent)
   - Background music looping

2. **Visual Effects**
   - 3-layer animated nebula background
   - Enhanced particle trails
   - Screen shake on explosions

3. **Boss Enhancements**
   - More detailed rendering (match HTML/JS quality)
   - Trail effects on segments/turrets
   - Energy beam rendering

4. **Extra Life System**
   - Award life at score thresholds
   - Match HTML/JS behavior

5. **Performance Optimizations**
   - Object pooling for bullets/particles
   - Spatial partitioning for collision detection
   - LOD system for distant enemies

### Architecture Improvements

**Component-Entity System:**
```gdscript
# Future: Modular entity components
class_name Component
var enabled: bool = true
func update(delta: float): pass

class_name HealthComponent extends Component
var hp: int = 10
var max_hp: int = 10

class_name Entity
var components: Array[Component] = []
func add_component(comp: Component): ...
func get_component(type): ...
```

**Event System:**
```gdscript
# Future: Centralized event bus
class_name EventBus extends Node
signal enemy_died(enemy: Dictionary, pos: Vector2)
signal player_hit(damage: int)
signal score_changed(new_score: int)

# Usage
EventBus.enemy_died.connect(_on_enemy_died)
EventBus.enemy_died.emit(enemy, pos)
```

---

## Conclusion

The Godot architecture maintains the core design of the HTML/JS version while leveraging Godot's strengths:

**Strengths:**
- ✅ Centralized rendering (single _draw call)
- ✅ Autoload singletons (global state management)
- ✅ Dictionary-based entities (lightweight, flexible)
- ✅ class_name pattern (no cyclic dependencies)
- ✅ Built-in delta time and game loop
- ✅ Export to multiple platforms

**Trade-offs:**
- ⚠️ Audio placeholder (future enhancement)
- ⚠️ Simplified visuals (nebula, trails missing)
- ⚠️ Learning curve for GDScript idioms

**Architecture Principles:**
1. **Simplicity:** No over-engineering
2. **Performance:** 60 FPS on mid-range hardware
3. **Maintainability:** Clear code structure
4. **Extensibility:** Easy to add weapons/enemies/bosses

This architecture has proven effective through iterative development and serves as a solid foundation for future enhancements and cross-platform deployment.
