# Gyruss HTML/JS Design Document

Version: 6.6+  
Last Updated: November 2025

## 1. Overview of the Game

Gyruss is a tube shooter where the player defends against waves of incoming enemies from deep space. The player ship orbits a circular path at the edge of the screen, rotating left/right and firing inward toward the center. Enemies spawn from outside and spiral inward using various attack patterns.

**Core Concept:**
- Polar coordinate system (angle + radius) for all entities
- Enemies spawn at negative radius, move inward
- Stars spawn at center, expand outward
- Player orbits at fixed radius (378px)

**Progression:**
- 7 planets: Neptune → Uranus → Saturn → Jupiter → Mars → Earth → THE CORE
- 3 warps per planet (9 waves total per planet)
- Every 3rd wave spawns satellites (3 waves of satellites per planet)
- Bonus stage after reaching each planet
- Boss fight at THE CORE

**Game States:**
- `attract` - Title screen, minimal starfield
- `playing` - Active gameplay, spawning waves
- `warp` - 2.8 second warp tunnel transition
- `bonus` - Bonus stage after planet reached
- `boss` - Boss battle at THE CORE
- `gameover` - Game over screen
- `victory` - Final victory after defeating boss

## 2. Core Game Loop and Main Update Flow

**Entry Point:** `index.html` → `Gyruss.Game.init()` in `src/game.js`

**Main Loop:** `requestAnimationFrame` → `Gyruss.Game.loop(timestamp)`

```
loop(timestamp):
  └─ calculate delta time (dt)
  └─ update(dt)
      ├─ update stars (expand outward, warp acceleration)
      ├─ handle debug keys (T, W, B, M, S)
      ├─ player.update(dt)
      ├─ update all entity arrays with dt
      │   ├─ bullets (move inward, fade out at center)
      │   ├─ missiles (homing behavior, blast radius)
      │   ├─ particles (4 types: normal, spark, smoke, explosion)
      │   ├─ satellites (orbit at fixed radius)
      │   ├─ enemyBullets (move outward toward player)
      │   └─ enemies (state machine: enter → orbit → leave)
      ├─ boss?.update(dt) if active
      ├─ spawn logic (wave timer, satellite phases)
      └─ collision detection
          ├─ player vs enemy bullets
          ├─ player vs enemies
          ├─ bullets vs enemies
          ├─ bullets vs satellites
          ├─ bullets vs boss segments
          └─ missiles vs all targets (blast radius)
  └─ draw()
      ├─ deep space gradient background
      ├─ animated 3-layer nebula (red/orange, blue/purple, green/teal)
      ├─ 4-tier starfield (tiny, normal, bright, brilliant)
      ├─ orbit ring with glow
      ├─ entities layer-by-layer:
      │   ├─ particles (bottom layer)
      │   ├─ enemy bullets
      │   ├─ player bullets
      │   ├─ missiles with trails
      │   ├─ enemies with trails
      │   ├─ satellites
      │   ├─ boss (multi-segment with trails)
      │   └─ player ship with multi-layer thrusters
      └─ UI overlay (score, lives, planet info, weapon status)
```

**Update Frequency:** 60 FPS target, dt-based movement for smooth motion regardless of frame rate

**Key Constants:** Defined in `Gyruss.C` (src/game.js):
- Screen: 900×900px, center at (450, 450)
- Player orbit: 378px radius
- Player size: 20px
- Weapon cooldowns: 0.12s (laser), 0.2s (plasma), 0.15s (wave)

## 3. Player Controls and Movement

**Input Methods:**
- Keyboard: Arrow keys or A/D for rotation, Space to fire
- Mouse/Touch: Pointer down aims and fires, pointer move tracks position
- Debug keys: T (invulnerable), W (warp), B (boss), M (missile), S (sound), R (rapid fire test)

**Movement:**
- Player rotates around fixed orbital path (radius = 378px)
- Rotation speed: 3.2 radians/second
- Angle wraps continuously (0 to 2π)
- Position calculated: `polarToCartesian(angle, PLAYER_ORBIT_RADIUS)`

**Weapon System:**
Three weapon types with visual and behavioral differences:

1. **Laser** (default)
   - Color: #ffd966 (yellow-gold)
   - Damage: 1, Speed: 600, Cooldown: 0.12s
   - Single straight shot

2. **Plasma** (upgrade from satellite)
   - Color: #66ffcc (cyan-green)
   - Damage: 2, Speed: 500, Cooldown: 0.2s
   - Larger projectile with glow effect

3. **Wave** (upgrade from satellite)
   - Color: #ff66aa (pink)
   - Damage: 1, Speed: 550, Cooldown: 0.15s
   - Spread angle: 0.2 radians (wider coverage)

**Weapon Persistence:**
- Special weapons (Plasma/Wave) persist through warps and planet changes
- Only reset on life loss or at start of new satellite cycles
- Allows player to maintain advantage across multiple waves

**Upgrade System:**
Power-ups from golden satellites (random selection):

1. **Shield** - 10 second invulnerability (blue aura)
2. **Rapid Fire** - 15 seconds, 2× fire rate multiplier
3. **Triple Shot** - 20 seconds, fires 3 bullets in spread pattern

**Missiles:**
- Separate from main firing (M key or on-screen button)
- Homing behavior, tracks nearest enemy
- Blast radius damages multiple targets
- 2.5 second cooldown

**Hit Detection:**
- Player hitbox: 80% of PLAYER_SIZE (16px effective radius)
- 2.5 second invulnerability after hit (blinking visual)
- Lives: Start with 5, extra life every 30,000 points
- Shields block one hit without using invulnerability timer

## 4. Enemy Spawning and Wave Logic

**Wave Patterns:**
Three main spawn patterns, randomly selected:

1. **Spiral Wave** (40% chance)
   - 8-24 enemies based on wave number
   - Spawn at negative radius (-20 to -20 - count×5)
   - Dual spiral pattern (offset angles)
   - Mix of fighter and saucer types

2. **V-Shape Wave** (40% chance)
   - 4-10 enemies mirrored across center
   - Start angle randomized
   - Angular spread creates V formation
   - Primarily fighters

3. **Arc Wave** (20% chance)
   - 5-12 enemies in sweeping arc
   - Spawn at large radius (540px+)
   - Move inward with synchronized rotation
   - Primarily saucers

**Enemy Types:**

- **Fighter** - Small, fast, aggressive
  - Colors: Cycle through 5 colors (#24d8ff, #ff6ae6, #ffe066, #ff9376, #9d7bff)
  - Hit points: 1
  - Points: 100
  - Fires single bullets at player

- **Saucer** - Larger, slower, more durable
  - Same color palette
  - Hit points: 2
  - Points: 200
  - Fires bullet spreads

**Enemy Behavior State Machine:**
```
ENTERING → ORBITING → LEAVING
  ↓           ↓          ↓
spawn    maintain    despawn at
         radius      screen edge
```

- **Entering:** Move from spawn position to target orbital radius
- **Orbiting:** Rotate at target radius, fire at player periodically
- **Leaving:** Exit screen if player survives too long

**Enemy Firing:**
- Random firing intervals (1-3 seconds)
- Bullets track player's current position
- Bullet speed: 200-300 (slower than player bullets)

**Satellite Waves:**
Every 3rd wave spawns satellites instead of enemies:
- 3 satellites spawn in formation
- Center satellite is golden (drops power-up when destroyed)
- Side satellites are silver
- Must destroy all 3 to proceed
- 3 satellite waves per planet = 9 total satellites
- After 3rd satellite wave, trigger warp

**Bonus Stages:**
- 20 enemies in tight spiral formation
- All enemies worth bonus points
- No collision damage (enemies are collectibles)
- Fast rotation speed for challenge

**Boss Encounters:**
Three unique bosses at THE CORE, each with distinct patterns:

1. **Cosmic Serpent**
   - 8 segments in snake formation
   - Head rotates around center, body follows
   - Destroy all segments to win
   - Each segment: 50 HP, worth 5000 points

2. **Star Destroyer**
   - Large central core with 6 rotating turrets
   - Turrets fire independently
   - Destroy turrets then core
   - Core: 200 HP, Turrets: 30 HP each

3. **Galactic Core**
   - 12 orbital nodes circling a central nexus
   - Nodes regenerate if nexus survives
   - Must destroy nexus to win
   - Nexus: 300 HP, Nodes: 20 HP each

**Boss Destruction Sequence:**
- 4-6 second cinematic destruction (not instant)
- Multiple explosion phases with increasing intensity
- Screen shake effect during destruction
- Victory state after destruction completes

## 5. Scoring, Lives, and Game States

**Scoring:**
- Fighters: 100 points
- Saucers: 200 points
- Satellites (side): 500 points
- Satellites (center/golden): 1000 points + power-up
- Boss segments: 5000 points each
- Warp bonus: 1000 points
- Bonus stage: 50 points per enemy

**Extra Lives:**
- Award extra life at score thresholds (every 30,000 points)
- Maximum lives: No cap
- Lives displayed in HUD: "LIVES X"

**Game State Transitions:**

```
ATTRACT
  ↓ (press fire)
PLAYING → WARP → (BONUS or BOSS or continue PLAYING)
          ↑   ↓
          └─←─┘
  ↓ (lives = 0)
GAMEOVER
  ↓ (press fire after 1s)
ATTRACT
```

**State Details:**

- **ATTRACT:** Title screen, minimal animation, waits for input
- **PLAYING:** Main gameplay loop, spawn waves, collision detection active
- **WARP:** 2.8 second transition, accelerated starfield, planet visualization
- **BONUS:** Special stage after reaching planet, no collision damage
- **BOSS:** Boss battle, no regular enemies, boss-specific collision
- **VICTORY:** Final win state after defeating final boss
- **GAMEOVER:** Death screen, score display, restart option after 1 second

**HUD Display:**
- Top left: "SCORE XXXXXX" (6 digits, zero-padded)
- Top right: "LIVES X"
- Top center: "X WARPS TO [PLANET NAME]"
- Right side: Active weapon name (if not laser) + upgrade timers

**Planet Progression:**
- 7 planets total, 3 warps each
- Warp counter decrements: 3 → 2 → 1 → (planet reached)
- Planet names displayed during warp transition
- Animated planet graphics for each destination

**Debug Mode Features:**
- T key: Toggle invulnerability (preserves weapons/upgrades)
- W key: Instant warp to next stage
- B key: Jump to boss (cycles through all 3 types)
- M key: Fire missile
- S key: Toggle sound on/off
- Invulnerable mode shows consistent visual (no blinking)

## 6. Visual Effects and Audio

**Visual Effects:**

**Starfield System (4 tiers):**
- Tier 1 (60%): Tiny stars, size 0.5-1.5px, dim twinkle
- Tier 2 (25%): Normal stars, size 1-2.5px, moderate glow
- Tier 3 (11%): Bright stars, size 2-4px, glow + shadow
- Tier 4 (4%): Brilliant stars, size 3-6px, cross rays + intense glow
- Colors: White (#ffffff), blue (#a4dfff), warm (#ffeab9)
- All stars twinkle at different speeds (0.5-4 Hz)
- Expand outward from center, respawn when reaching edge
- Warp mode: 15× speed multiplier with motion blur effect

**Nebula Background (3 layers):**
- Layer 1: Red/orange (#ff6644 to #cc2200), alpha 0.05-0.11
- Layer 2: Blue/purple (#6644ff to #220088), alpha 0.04-0.08
- Layer 3: Green/teal (#44ff88 to #22cc44), alpha 0.025-0.055
- All layers slowly animate position with sine waves
- Creates deep space atmosphere

**Particle System (4 types):**

1. **Normal** - Standard explosion particles
   - Life: 0.4-0.8s, velocity 100-200
   - Fade and shrink over time

2. **Spark** - Bright fast particles
   - Life: 0.2-0.4s, velocity 200-400
   - White color, rapid fade

3. **Smoke** - Slow dark trails
   - Life: 1.0-2.0s, velocity 20-60
   - Gray, gradual fade with turbulence

4. **Explosion** - Large burst particles
   - Life: 0.3-0.6s, velocity 150-300
   - Bright colors, shadow blur effect

**Ship Visuals:**

*Player Ship:*
- Multi-layer thruster system (core, outer glow, side nozzles)
- Thruster flicker animation (25-30 Hz)
- Enhanced wing structures with armor plating
- Gradient hull with surface detail
- Cockpit with glow effect
- Size: 20px base, with thruster extending 24px

*Enemy Variants:*
- Fighters: Triangular, compact design
- Saucers: Disc-shaped with dome, larger
- Both types leave subtle trails during movement
- Color-coded by wave (5 color palette)

**Weapon Effects:**

- **Laser:** Yellow-gold core, white-hot center, radial glow
- **Plasma:** Cyan-green with energy core, larger projectile, intense glow
- **Wave:** Pink with spread pattern, multiple trailing particles

**Explosion Effects:**
- Mixed particle types (60% normal, 30% spark, 10% smoke)
- Boss explosions: 100+ particles, screen shake, multi-phase
- Regular explosions: 15-25 particles, sound effect

**Screen Effects:**
- Screen shake during boss destruction
- Warp tunnel: Blue overlay (#6ed2ff) with pulsing alpha
- Orbit ring: Gradient with shadow blur (blue glow)

**Audio System:**

Uses Web Audio API for all sound effects and background music.

**Sound Effects:**
- `laser` - Pew sound for laser weapon
- `plasma` - Deeper energy discharge for plasma
- `wave` - Whoosh for wave weapon
- `explosion` - Standard enemy destruction
- `bigExplosion` - Large explosions (boss segments, 100+ particles)
- `hit` - Player damage sound
- `powerUp` - Satellite collection
- `warp` - Warp transition sound

**Background Music:**
- `bgm.mp3` - Continuous loop during gameplay
- Auto-starts on first user interaction
- Respects browser autoplay policies
- Toggle with S key or #soundToggle button

**Audio Features:**
- Global sound enable/disable
- Volume control via Web Audio gain nodes
- Graceful fallback if audio context unavailable
- Sound plays synchronized with visual effects

---

## Technical Implementation Notes

**Rendering Pipeline:**
All drawing happens in `Gyruss.Game.draw()` via Canvas 2D context, executed 60 times per second.

**Coordinate System:**
- Screen space: (0,0) at top-left, (900, 900) at bottom-right
- Polar coordinates relative to center (450, 450)
- Conversion: `Gyruss.Utils.polarToCartesian(angle, radius)`

**Performance:**
- Entity arrays filtered in-place during update
- Particle system automatically culls old particles
- Starfield limited to 350 stars during gameplay
- Canvas alpha disabled for performance: `{ alpha: false }`

**Browser Compatibility:**
- Modern browsers with Canvas 2D and Web Audio API
- No ES6 modules (uses global namespace)
- Requires HTTP server (not file://) for audio/assets
