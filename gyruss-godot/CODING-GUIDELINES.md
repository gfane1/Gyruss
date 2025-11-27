# Gyruss Godot 4.5.1 - Coding Guidelines

## Table of Contents
1. [GDScript Style](#gdscript-style)
2. [Naming Conventions](#naming-conventions)
3. [Project Patterns](#project-patterns)
4. [Best Practices](#best-practices)
5. [Common Pitfalls](#common-pitfalls)
6. [GDScript-Specific Patterns](#gdscript-specific-patterns)
7. [Performance Guidelines](#performance-guidelines)
8. [Debugging with Godot](#debugging-with-godot)

---

## GDScript Style

### Indentation and Formatting

**Indentation:** Tabs (Godot default)

**Line Length:** Soft limit of 100 characters

**Whitespace:**
```gdscript
# Space after keywords
if condition:
    do_something()

# Space around operators
var x = 5 + 3
var result = a * b

# No space before function call parens
func calculate(x, y):
    return x + y

# Space after comma
var array = [1, 2, 3, 4]
func example(a: int, b: int, c: int):
```

**Blank Lines:**
```gdscript
# One blank line between functions
func function_one():
    pass

func function_two():
    pass

# Two blank lines between major sections
# Constants

const MAX_SPEED = 100

# Variables

var position = Vector2.ZERO
```

---

## Naming Conventions

### Variables and Functions (snake_case)

**All variables and functions use snake_case:**

```gdscript
# Variables
var player_angle = 0.0
var fire_timer = 0.5
var enemies_remaining = 12
var is_destroying = false
var has_powerup = true

# Functions
func update_player(delta: float):
    pass

func spawn_explosion(pos: Vector2, count: int, color: Color):
    pass

func polar_to_cartesian(angle: float, radius: float) -> Vector2:
    pass
```

### Constants (SCREAMING_SNAKE_CASE)

```gdscript
const PLAYER_ORBIT_RADIUS = 378.0
const MAX_PARTICLES = 200
const TWO_PI = TAU
const SCREEN_WIDTH = 900
const SCREEN_HEIGHT = 900
```

**Configuration Dictionaries:** Use PascalCase for keys (matches weapon/upgrade names):

```gdscript
const WEAPONS = {
    "Laser": {       # PascalCase key
        "id": "laser",           # snake_case properties
        "damage": 1,
        "cooldown": 0.12
    }
}
```

### Classes (PascalCase)

```gdscript
class_name PlayerEntity
class_name EnemyEntity
class_name BossBase
class_name CosmicSerpent
```

### Enums (PascalCase for Enum, SCREAMING_SNAKE_CASE for Values)

```gdscript
# Enum name: PascalCase
enum GameState {
    ATTRACT,      # SCREAMING_SNAKE_CASE
    PLAYING,
    WARP,
    BOSS
}

enum QualityLevel {
    LOW,
    MEDIUM,
    HIGH
}
```

### Signals (snake_case)

```gdscript
signal state_changed(new_state: GameState)
signal score_changed(new_score: int)
signal enemy_died(enemy: Dictionary)
```

### Private/Internal Members

**GDScript doesn't have true private members.** Use underscore prefix to indicate "internal use":

```gdscript
var _internal_timer: float = 0.0
var _cached_position: Vector2 = Vector2.ZERO

func _internal_helper():
    # Leading underscore indicates internal use
    pass
```

**Note:** This is convention only, not enforced by the language.

---

## Project Patterns

### Autoload Singleton Pattern

**When to use:**
- Global game state (GameManager)
- Global configuration (Constants)
- Global services (AudioManager, InputHandler)

**Structure:**
```gdscript
# scripts/autoload/service_name.gd
extends Node

# State
var some_value: int = 0

# Signals (optional)
signal value_changed(new_value: int)

func _ready():
    # Initialize singleton
    pass

func some_method():
    # Callable from anywhere: ServiceName.some_method()
    pass
```

**Accessing Autoloads:**
```gdscript
# From any script
var score = GameManager.score
var center = Constants.SCREEN_CENTER
InputHandler.is_fire_pressed()
AudioManager.play_laser()
```

### class_name Pattern (Global Class Registration)

**Use class_name to make classes globally accessible:**

```gdscript
# player.gd
class_name PlayerEntity

# Now usable anywhere without preload:
var player = PlayerEntity.new()
```

**Why not const preload?**
```gdscript
# WRONG (cyclic dependency)
# game_manager.gd
const Player = preload("res://scripts/entities/player.gd")

# player.gd
const GameManager = preload("res://scripts/autoload/game_manager.gd")
# ERROR: Cyclic reference!

# RIGHT (class_name + autoload)
# player.gd
class_name PlayerEntity
# Uses GameManager autoload directly (no preload needed)
```

**Naming Convention:**
```gdscript
# File: player.gd
class_name PlayerEntity  # Suffix with "Entity" for clarity

# File: boss_base.gd
class_name BossBase  # Descriptive unique name

# File: cosmic_serpent.gd
class_name CosmicSerpent  # Boss name directly
```

### Dictionary-Based Entity Pattern

**When to use:** Lightweight entities with simple data (enemies, bullets, particles)

**Structure:**
```gdscript
# Enemy Dictionary
var enemy = {
    "type": "fighter",
    "angle": 1.57,
    "radius": -20.0,
    "v_angle": 0.0,
    "v_radius": 150.0,
    "hp": 1,
    "max_hp": 1,
    "size": 12.0,
    "color": Color.CYAN
}

# Stored in array
GameManager.enemies.append(enemy)

# Update with static methods
EnemyEntity.update(enemy, delta)
```

**Accessing Dictionary Values:**
```gdscript
# Safe access with default
var speed = enemy.get("speed", 100.0)  # Returns 100.0 if key missing

# Direct access (only if you know key exists)
var hp = enemy.hp
var angle = enemy["angle"]  # Bracket notation also works
```

### Static Method Pattern

**When to use:** Entity logic that operates on Dictionary data

**Structure:**
```gdscript
# enemy.gd
class_name EnemyEntity

# Factory method (creates Dictionary)
static func create(type: String, angle: float, radius: float, speed: float) -> Dictionary:
    var enemy = {
        "type": type,
        "angle": angle,
        "radius": radius,
        "v_radius": speed
    }
    return enemy

# Update method (modifies Dictionary in-place)
static func update(enemy: Dictionary, delta: float) -> void:
    enemy.angle += enemy.v_angle * delta
    enemy.radius += enemy.v_radius * delta

# Helper methods
static func fire_at_player(enemy: Dictionary) -> void:
    # Create bullet aimed at player
    pass
```

**Why static methods?**
- No need to instantiate factory classes
- Clear "operate on this data" semantic
- Functional programming style
- Matches JavaScript approach

### Signals Pattern

**When to use:** UI updates, loose coupling between systems

**Structure:**
```gdscript
# In GameManager
signal score_changed(new_score: int)

func add_score(points: int):
    score += points
    score_changed.emit(score)  # Emit signal

# In UIRenderer
func _ready():
    GameManager.score_changed.connect(_on_score_changed)

func _on_score_changed(new_score: int):
    score_label.text = "SCORE: %d" % new_score
```

**Signal Naming:**
- Use past tense: `score_changed`, `enemy_died`, `state_entered`
- Or present continuous: `scoring`, `dying`
- Be consistent across project

---

## Best Practices

### 1. Delta Time Everywhere

**Always use delta for time-based changes:**

```gdscript
# Good
func _process(delta: float):
    position.x += velocity.x * delta
    timer -= delta
    angle += angular_speed * delta

# Bad (assumes 60 FPS)
func _process(_delta: float):
    position.x += velocity.x / 60.0
    timer -= 1.0 / 60.0
```

### 2. Type Hints for Performance

**Use type hints where beneficial:**

```gdscript
# Typed variables (faster access)
var enemies: Array[Dictionary] = []
var score: int = 0
var player: PlayerEntity = null

# Typed function parameters
func update_enemy(enemy: Dictionary, delta: float) -> void:
    enemy.radius += enemy.v_radius * delta

# Typed return values
func create_enemy() -> Dictionary:
    return { "hp": 10 }
```

**When to use types:**
- Always for arrays: `Array[Dictionary]`
- Function parameters and returns
- Class/autoload references: `var player: PlayerEntity`
- Skip for simple local variables if obvious

### 3. Early Returns for Readability

```gdscript
# Good
func update(delta: float):
    if is_dead:
        return
    if is_paused:
        return
    
    # Main logic here
    position += velocity * delta

# Bad (nested)
func update(delta: float):
    if not is_dead:
        if not is_paused:
            # Main logic nested
            position += velocity * delta
```

### 4. Reverse Iteration for Array Removal

**When removing items while iterating:**

```gdscript
# Good (reverse iteration)
func update_enemies(delta: float):
    var i = enemies.size() - 1
    while i >= 0:
        var enemy = enemies[i]
        
        if enemy.hp <= 0:
            enemies.remove_at(i)
        else:
            EnemyEntity.update(enemy, delta)
        
        i -= 1

# Bad (forward iteration, skips elements)
for i in range(enemies.size()):
    if enemies[i].hp <= 0:
        enemies.remove_at(i)  # Shifts remaining elements!
```

### 5. Use match for State Machines

```gdscript
# Good (match statement)
match state:
    GameState.ATTRACT:
        update_attract(delta)
    GameState.PLAYING:
        update_playing(delta)
    GameState.BOSS:
        update_boss(delta)

# Bad (if/elif chain)
if state == GameState.ATTRACT:
    update_attract(delta)
elif state == GameState.PLAYING:
    update_playing(delta)
elif state == GameState.BOSS:
    update_boss(delta)
```

### 6. queue_redraw() for Custom Drawing

**Call queue_redraw() when using _draw():**

```gdscript
# Good
func _process(delta: float):
    update_entities(delta)
    queue_redraw()  # Request next frame

func _draw():
    draw_background()
    draw_entities()

# Bad (no redraw, screen doesn't update)
func _process(delta: float):
    update_entities(delta)
    # Missing queue_redraw()!
```

### 7. Reset Transform After Drawing

**Always reset transform after using draw_set_transform():**

```gdscript
# Good
func _draw():
    draw_set_transform(Vector2(100, 100), PI/4, Vector2(2, 2))
    draw_circle(Vector2.ZERO, 10, Color.RED)
    draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)  # Reset!
    
    # Next draw uses default transform
    draw_circle(Vector2(200, 200), 10, Color.BLUE)

# Bad (transform persists)
func _draw():
    draw_set_transform(Vector2(100, 100), PI/4, Vector2(2, 2))
    draw_circle(Vector2.ZERO, 10, Color.RED)
    # Missing reset!
    
    # Next draw still transformed!
    draw_circle(Vector2(200, 200), 10, Color.BLUE)
```

### 8. Use Built-in Vector Math

```gdscript
# Good (built-in methods)
var dist_sq = pos1.distance_squared_to(pos2)
var dist = pos1.distance_to(pos2)
var direction = (target - current).normalized()
var angle = current.angle_to(target)

# Bad (manual calculation)
var dx = pos2.x - pos1.x
var dy = pos2.y - pos1.y
var dist_sq = dx * dx + dy * dy
var dist = sqrt(dx * dx + dy * dy)
```

### 9. Prefer Godot Constants

```gdscript
# Good (Godot constants)
const TWO_PI = TAU
var angle = PI / 2
var half_angle = PI / 4

# Bad (manual calculation)
const TWO_PI = 6.28318530718
var angle = 1.5707963
```

### 10. Comment Non-Obvious Code

```gdscript
# Good (explains why)
# Enemies spawn at negative radius (off-screen) and move inward
enemy.radius = -20.0

# Stars spawn at center and move outward (opposite of enemies)
star.radius = rand_range(1.0, 40.0)

# Bad (states the obvious)
enemy.hp -= 1  # Subtract 1 from hp
```

---

## Common Pitfalls

### 1. No Ternary Operator

**GDScript doesn't support `condition ? true : false` syntax:**

```gdscript
# WRONG (syntax error)
var value = (x > 5) ? 10 : 20

# RIGHT (inline if)
var value = 10 if x > 5 else 20

# OR (if/else block)
var value
if x > 5:
    value = 10
else:
    value = 20
```

### 2. Dictionary Access Without Default

**Always use .get() for optional keys:**

```gdscript
# WRONG (error if key missing)
var speed = enemy["speed"]

# RIGHT (provides default)
var speed = enemy.get("speed", 100.0)

# Also RIGHT (if you know key exists)
if "speed" in enemy:
    var speed = enemy.speed
```

### 3. Coordinate System Confusion

**Enemies vs Stars movement direction:**

```gdscript
# WRONG (enemies moving outward)
enemy.radius += abs(enemy.speed) * delta

# RIGHT (enemies start negative, move toward positive = inward)
enemy.radius += enemy.v_radius * delta  # v_radius is positive

# Stars spawn at center (small radius) and move outward
star.radius += star.speed * delta
if star.radius > 450.0:
    star.radius = rand_range(1.0, 40.0)  # Respawn at center
```

### 4. Forgetting to Clear "Just Pressed" Flags

**Input flags need manual clearing:**

```gdscript
# In InputHandler
var fire_just_pressed: bool = false

func _input(event):
    if event is InputEventKey and event.keycode == KEY_SPACE:
        if event.pressed and not fire_pressed:
            fire_just_pressed = true  # Set on press

func _process(_delta):
    # CRITICAL: Clear each frame
    if fire_just_pressed:
        fire_just_pressed = false
```

### 5. Match Statement Fall-Through

**GDScript match doesn't fall through (unlike C switch):**

```gdscript
# Each case is independent (no fall-through)
match weapon_type:
    "laser":
        damage = 1
        # Doesn't continue to "plasma"
    "plasma":
        damage = 2
    "wave":
        damage = 1

# If you want multiple values for same action:
match weapon_type:
    "laser", "wave":  # Multiple values
        damage = 1
    "plasma":
        damage = 2
```

### 6. Array Type Mismatches

**Typed arrays enforce type at runtime:**

```gdscript
var enemies: Array[Dictionary] = []

enemies.append({"hp": 10})  # OK (Dictionary)

# WRONG (runtime error)
enemies.append(42)  # Error: Expected Dictionary, got int

# To store mixed types, use untyped array
var mixed: Array = []
mixed.append(42)
mixed.append({"hp": 10})
mixed.append("text")
```

### 7. Modulo vs fmod

**Integer vs float modulo:**

```gdscript
# Integer modulo
var result = 10 % 3  # Result: 1 (int)

# Float modulo (use fmod)
var angle = fmod(angle + delta, TAU)  # Keeps angle in 0-TAU range

# WRONG (int modulo on float)
var angle = angle % TAU  # May not work as expected with floats
```

### 8. Signal Connection Gotchas

**Common mistakes:**

```gdscript
# WRONG (missing .connect)
GameManager.score_changed(_on_score_changed)

# RIGHT (use .connect)
GameManager.score_changed.connect(_on_score_changed)

# WRONG (incorrect signature)
signal score_changed(new_score: int)
func _on_score_changed():  # Missing parameter!
    pass

# RIGHT (matching signature)
func _on_score_changed(new_score: int):
    score_label.text = str(new_score)
```

### 9. Enum Comparison Type

**Enums are ints, use proper comparison:**

```gdscript
enum GameState { ATTRACT, PLAYING, BOSS }

var state: GameState = GameState.ATTRACT

# Good
if state == GameState.ATTRACT:
    pass

# Bad (comparing to string)
if state == "ATTRACT":  # Always false! (int != string)
    pass
```

### 10. _ready() vs _enter_tree()

**Execution order:**

```gdscript
# _enter_tree() runs first (when node enters tree)
func _enter_tree():
    # Children may not be ready yet
    pass

# _ready() runs after all children are ready
func _ready():
    # Safe to access child nodes
    var child = get_node("Child")
```

---

## GDScript-Specific Patterns

### String Interpolation

**Multiple ways to format strings:**

```gdscript
# % formatting (C-style)
var text = "Score: %d" % score
var text2 = "HP: %d/%d" % [hp, max_hp]

# str() conversion
var text = "Score: " + str(score)

# Format strings (verbose but flexible)
var text = "Score: {0}".format([score])
```

### Array Comprehension

```gdscript
# Create array with comprehension
var squares = []
for i in range(10):
    squares.append(i * i)

# GDScript doesn't have Python-style [x*x for x in range(10)]
# Use loops instead
```

### Lambda Functions

**GDScript supports lambdas:**

```gdscript
# Lambda (anonymous function)
var double = func(x): return x * 2
print(double.call(5))  # Output: 10

# With signals
button.pressed.connect(func(): print("Pressed!"))

# Sorting with lambda
var enemies_by_distance = enemies.duplicate()
enemies_by_distance.sort_custom(func(a, b): return a.distance < b.distance)
```

### Callable and Signal

```gdscript
# Callable wraps function reference
var my_func = Callable(self, "function_name")
my_func.call()

# Signal.emit()
signal my_signal(value: int)
my_signal.emit(42)

# Signal.connect()
my_signal.connect(_on_my_signal)

func _on_my_signal(value: int):
    print("Received: ", value)
```

### Preload vs Load

```gdscript
# preload (compile-time, faster)
const Scene = preload("res://scenes/enemy.tscn")
var instance = Scene.instantiate()

# load (runtime, flexible)
var scene = load("res://scenes/" + enemy_type + ".tscn")
var instance = scene.instantiate()

# Use preload when path is known at compile time
# Use load when path is dynamic
```

### Export Variables

**For inspector editing:**

```gdscript
@export var max_speed: float = 100.0
@export_range(0, 10) var difficulty: int = 5
@export var enemy_scene: PackedScene

# Shows in Godot inspector for easy tweaking
```

### Tool Scripts

**Run scripts in editor:**

```gdscript
@tool  # Runs in editor
extends Node2D

func _ready():
    # Runs in editor AND game
    if Engine.is_editor_hint():
        # Editor-only code
        pass
    else:
        # Game-only code
        pass
```

---

## Performance Guidelines

### Hot Loop Optimizations

**Code that runs every frame for every entity:**

```gdscript
# HOT (runs 60 times/sec × 100+ entities)
func update_enemies(delta: float):
    for enemy in enemies:
        # Keep this fast!
        enemy.radius += enemy.v_radius * delta
        enemy.angle += enemy.v_angle * delta

# COLD (runs once per entity creation)
func create_enemy():
    # OK to do expensive setup here
    var enemy = {
        "trail_points": [],
        "animation_data": []
    }
    for i in range(50):
        enemy.trail_points.append(Vector2.ZERO)
    return enemy
```

### Typed vs Untyped Performance

```gdscript
# Faster (type known at compile time)
var enemies: Array[Dictionary] = []
for enemy: Dictionary in enemies:
    enemy.hp -= 1

# Slower (runtime type checking)
var enemies = []
for enemy in enemies:
    enemy.hp -= 1
```

### Distance-Squared Checks

```gdscript
# Fast (no sqrt)
var dist_sq = pos1.distance_squared_to(pos2)
var hit_radius_sq = hit_radius * hit_radius
if dist_sq < hit_radius_sq:
    # Collision!

# Slow (sqrt is expensive)
var dist = pos1.distance_to(pos2)
if dist < hit_radius:
    # Collision!
```

### Minimize Object Allocation

```gdscript
# Bad (creates new Vector2 every frame)
func _process(delta):
    for enemy in enemies:
        var pos = Vector2(enemy.x, enemy.y)  # Allocation!
        draw_circle(pos, 10, Color.RED)

# Good (reuse existing Vector2 or use directly)
func _process(delta):
    for enemy in enemies:
        draw_circle(Vector2(enemy.x, enemy.y), 10, Color.RED)
```

### Use Local Variables in Loops

```gdscript
# Slower (property access each iteration)
func update_enemies(delta):
    for enemy in GameManager.enemies:
        enemy.hp -= 1

# Faster (local reference)
func update_enemies(delta):
    var enemy_list = GameManager.enemies  # Cache reference
    for enemy in enemy_list:
        enemy.hp -= 1
```

### Batch Similar Draw Calls

```gdscript
# Faster (batched)
func _draw():
    # All red circles together
    for enemy in red_enemies:
        draw_circle(enemy.pos, 10, Color.RED)
    
    # All blue circles together
    for enemy in blue_enemies:
        draw_circle(enemy.pos, 10, Color.BLUE)

# Slower (color change per draw)
func _draw():
    for enemy in all_enemies:
        draw_circle(enemy.pos, 10, enemy.color)  # Color varies
```

### Particle Budget Enforcement

```gdscript
# Prevent runaway particle spawning
func enforce_particle_budget():
    while particles.size() > MAX_PARTICLES:
        particles.remove_at(0)  # Remove oldest

# Call after spawning
func spawn_explosion(pos, count):
    for i in range(count):
        particles.append(create_particle(pos))
    enforce_particle_budget()
```

### Off-Screen Culling

```gdscript
# Don't render off-screen entities
func draw_enemies():
    for enemy in GameManager.enemies:
        if enemy.radius < 0:
            continue  # Off-screen, skip
        
        var pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
        draw_circle(pos, enemy.size, enemy.color)
```

---

## Debugging with Godot

### Print Debugging

```gdscript
# Basic print
print("Value: ", value)

# Formatted print
print("Score: %d, Lives: %d" % [score, lives])

# Print with color (in editor console)
print_rich("[color=red]ERROR[/color]: Something went wrong")

# Conditional print
if DEBUG:
    print("[DEBUG] Enemy spawned at: ", angle)
```

### Breakpoints

1. Click left gutter in script editor (red dot appears)
2. Run game with F5
3. Game pauses when breakpoint hit
4. Inspect variables in debugger panel
5. Use Step Over (F10), Step Into (F11), Continue (F12)

### Remote Scene Tree

**While game is running:**
1. Debugger panel → Remote tab
2. View live scene tree
3. Inspect node properties in real-time
4. Modify values (some changes apply immediately)

### Performance Monitors

**Built-in monitors:**

```gdscript
func _process(_delta):
    if InputHandler.debug_mode:
        print("FPS: ", Engine.get_frames_per_second())
        print("Static Memory: ", OS.get_static_memory_usage())
```

**Profiler:**
1. Run game (F5)
2. Debugger panel → Profiler tab
3. Monitor frame time, script time, physics time
4. Identify bottlenecks

### Debug Drawing

```gdscript
# Collision circles (temporary)
func _draw():
    # Normal rendering
    draw_enemies()
    
    # Debug overlays
    if InputHandler.debug_mode:
        # Draw collision circles
        for enemy in GameManager.enemies:
            var pos = Constants.polar_to_cartesian(enemy.angle, enemy.radius)
            draw_circle(pos, enemy.size, Color(1, 0, 0, 0.3))  # Red transparent
```

### assert() for Sanity Checks

```gdscript
# Assert condition (crashes if false in debug builds)
func take_damage(amount: int):
    assert(amount > 0, "Damage must be positive")
    hp -= amount

# Disable in release builds automatically
```

### Custom Debug Overlay

```gdscript
# In main_renderer.gd
func draw_debug_info():
    if not InputHandler.debug_mode:
        return
    
    var debug_text = [
        "STATE: %s" % GameState.keys()[GameManager.state],
        "PLANET: %s" % Constants.PLANETS[GameManager.planet_index],
        "ENEMIES: %d" % GameManager.enemies.size(),
        "BULLETS: %d" % GameManager.bullets.size(),
        "PARTICLES: %d" % GameManager.particles.size(),
        "FPS: %d" % Engine.get_frames_per_second()
    ]
    
    var y = 20.0
    for line in debug_text:
        draw_string(ThemeDB.fallback_font, Vector2(10, y), line, 
                    HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color.WHITE)
        y += 20.0
```

### Remote Debugging (Mobile/Web)

**For mobile/web exports:**
1. Project Settings → Debug → Remote
2. Enable "Remote Debug"
3. Run exported game
4. Connect Godot editor to running game
5. Full debugging capabilities

---

## Code Review Checklist

Before committing code, verify:

### Functionality
- [ ] Code runs without errors
- [ ] Feature works as intended
- [ ] Edge cases handled
- [ ] No regressions in existing features

### Style
- [ ] snake_case for variables/functions
- [ ] PascalCase for classes
- [ ] SCREAMING_SNAKE_CASE for constants
- [ ] Consistent indentation (tabs)
- [ ] No trailing whitespace

### Performance
- [ ] Delta time used for movement
- [ ] Distance-squared for collisions
- [ ] No unnecessary allocations in hot loops
- [ ] queue_redraw() called when needed

### Safety
- [ ] Type hints for arrays and returns
- [ ] .get() for optional Dictionary keys
- [ ] Reverse iteration for array removal
- [ ] Transform reset after draw_set_transform()
- [ ] Signal connections have matching signatures

### Maintainability
- [ ] Non-obvious code commented
- [ ] Magic numbers extracted to constants
- [ ] Functions are single-purpose
- [ ] No duplicate code (DRY)

---

## Git Commit Guidelines

### Commit Message Format

```
[Component] Short description

Detailed explanation if needed (optional).
- Bullet points for changes
- Keep under 72 chars per line
```

**Examples:**
```
[Entities] Add Wave weapon oscillation effect

[Boss] Implement Galactic Core destruction sequence
- 6-second destruction with platform explosions
- Energy beam fade-out effects
- Final core implosion

[Audio] Replace placeholder with AudioStreamPlayer nodes

[Rendering] Optimize particle drawing with batching
```

### Component Tags

- `[Entities]` - Player, enemies, bullets, particles
- `[Boss]` - Boss implementations
- `[Audio]` - Sound effects, music
- `[Rendering]` - Visual effects, rendering pipeline
- `[Gameplay]` - Game balance, mechanics, wave spawning
- `[UI]` - HUD, menus, overlays
- `[Autoload]` - Singleton scripts (GameManager, etc.)
- `[Refactor]` - Code reorganization
- `[Fix]` - Bug fixes
- `[Docs]` - Documentation updates

---

## Testing Workflows

### Manual Testing

**Every code change should be tested:**

1. **Functionality Test**
   - Does the feature work?
   - Are there edge cases?
   - Does it match the spec?

2. **Regression Test**
   - Did existing features break?
   - Test related systems
   - Play through full wave

3. **Performance Test**
   - Check FPS (should be 60)
   - Monitor entity counts
   - Look for frame drops

4. **Visual Test**
   - Are graphics rendering correctly?
   - No visual artifacts?
   - Animations smooth?

### Debug Key Testing

**Use debug keys for rapid iteration:**

```gdscript
T - Toggle invulnerability
W - Skip to warp
B - Jump to boss (cycles through all 3)
R - Restart game
S - Toggle sound
```

### Playthrough Testing

**Full game test (every major change):**
1. Start from ATTRACT
2. Play through Neptune (3 warps → boss)
3. Verify weapon persistence through warps
4. Test all 3 boss types (use B key)
5. Verify game over → restart

---

## Common Code Smells

### 1. Duplicate Code

**Bad:**
```gdscript
# In multiple places
var pos = Vector2(
    Constants.SCREEN_CENTER.x + cos(angle) * radius,
    Constants.SCREEN_CENTER.y + sin(angle) * radius
)
```

**Good:**
```gdscript
# Centralized utility function
var pos = Constants.polar_to_cartesian(angle, radius)
```

### 2. Magic Numbers

**Bad:**
```gdscript
if enemy.radius > 398:
    # What is 398?
    pass
```

**Good:**
```gdscript
const PLAYER_ORBIT_RADIUS = 378.0
const PLAYER_SIZE = 20.0

if enemy.radius > PLAYER_ORBIT_RADIUS + PLAYER_SIZE:
    # Enemy breached player orbit
    pass
```

### 3. Long Functions

**Bad:**
```gdscript
func update(delta):
    # 200 lines of code
    # Multiple responsibilities
    # Hard to test/maintain
```

**Good:**
```gdscript
func update(delta):
    update_movement(delta)
    update_combat(delta)
    update_animations(delta)

func update_movement(delta):
    # Single responsibility
    # Easy to test
```

### 4. Deeply Nested Conditions

**Bad:**
```gdscript
if state == GameState.PLAYING:
    if enemies.size() > 0:
        if not player.is_dead:
            if player.can_fire:
                if InputHandler.is_fire_pressed():
                    player.fire()
```

**Good:**
```gdscript
if state != GameState.PLAYING:
    return
if enemies.size() == 0:
    return
if player.is_dead:
    return
if not player.can_fire:
    return

if InputHandler.is_fire_pressed():
    player.fire()
```

### 5. God Object

**Bad:**
```gdscript
# GameManager does EVERYTHING
# 2000+ lines
# Movement, rendering, input, audio, collision, spawning...
```

**Good:**
```gdscript
# Separate concerns
# GameManager: state machine, entity storage
# MainRenderer: rendering
# InputHandler: input
# AudioManager: audio
# Entity scripts: entity behavior
```

---

## Conclusion

These coding guidelines maintain consistency and quality across the Godot implementation:

**Key Principles:**
1. **Consistency:** snake_case, PascalCase, SCREAMING_SNAKE_CASE
2. **Clarity:** Descriptive names, comments for non-obvious code
3. **Performance:** Delta time, distance-squared, type hints
4. **Safety:** .get() for dictionaries, reverse iteration
5. **Maintainability:** Single responsibility, DRY principle

**GDScript Specifics:**
- Use `inline if` instead of ternary
- `.get()` for optional Dictionary keys
- `match` for state machines
- `queue_redraw()` for custom drawing
- Reset transforms after `draw_set_transform()`

**Before Committing:**
- Run game and test feature
- Check for errors/warnings
- Verify no regressions
- Follow commit message format
- Update documentation if needed

Following these guidelines ensures the codebase remains maintainable, performant, and extensible for future development and collaboration.
