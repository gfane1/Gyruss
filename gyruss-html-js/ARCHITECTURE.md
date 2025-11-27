# Gyruss HTML5/JavaScript - Technical Architecture

## Overview

The HTML5/JavaScript implementation of Gyruss is built as a pure client-side web application using vanilla JavaScript (ES5+) with HTML5 Canvas for rendering and Web Audio API for sound generation. No external libraries or build tools are required.

**Technology Stack:**
- HTML5 Canvas 2D Context
- Vanilla JavaScript (ES5+ with some ES6 features)
- Web Audio API for procedural sound generation
- No frameworks, no build step, no bundler

**Architecture Pattern:** Singleton game state with modular entity classes.

---

## File Structure

```
gyruss-html-js/
├── index.html          # Entry point, canvas setup, script loading
├── bgm.mp3            # Background music (optional, user-provided)
├── src/
│   ├── utils.js       # Math utilities (polar/cartesian, angles, distance)
│   ├── audio.js       # Web Audio API sfx + bgm control
│   ├── entities.js    # Player, Enemy, Bullet, Missile, Satellite, Particle classes
│   ├── boss.js        # CosmicSerpent, StarDestroyer, GalacticCore boss classes
│   └── game.js        # Constants, Game singleton, main loop, state machine
├── Design.md          # Original design specification
└── README.md          # HTML/JS specific readme
```

**Load Order (Critical):**
1. `utils.js` - Foundation utilities
2. `audio.js` - Audio system
3. `entities.js` - Entity classes
4. `boss.js` - Boss classes
5. `game.js` - Game state and main loop (calls init)

Scripts must load in this order because later modules depend on earlier ones.

---

## Global Namespace

All game code attaches to the `window.Gyruss` object to avoid polluting global scope:

```javascript
window.Gyruss = window.Gyruss || {};

// Constants
Gyruss.C = { ... }

// Game singleton
Gyruss.Game = { ... }

// Utility functions
Gyruss.Utils = { ... }

// Audio system
Gyruss.Audio = { ... }

// Entity classes
Gyruss.Player = class { ... }
Gyruss.Enemy = class { ... }
// etc.
```

**Why no ES6 modules?**
- No build step required
- Works in any browser without bundler
- Simpler debugging with DevTools
- Easier to inspect global state

---

## Coordinate System

### Polar Coordinates (Primary System)

The game uses **polar coordinates** (angle + radius) as the primary spatial representation:

```
Center (CX, CY): (450, 450)  // Screen center
Angle: 0 to 2π radians (0 = right, π/2 = down, π = left, 3π/2 = up)
Radius: Distance from center in pixels
```

**Key Constants:**
- `PLAYER_ORBIT_RADIUS = 378` pixels from center
- Enemies spawn at negative radius (-20 to -120) OFF-SCREEN
- Enemies move INWARD (radius increases from negative → positive)
- Starfield spawns at center (radius 1-40) and moves OUTWARD

### Conversion Functions

```javascript
// Polar → Cartesian
Gyruss.Utils.polarToCartesian(angle, radius)
// Returns: { x, y }

// Cartesian → Polar
Gyruss.Utils.cartesianToPolar(x, y)
// Returns: { angle, radius }

// Angle wrapping (keep within 0-2π)
Gyruss.Utils.wrapAngle(angle)
```

### Why Polar?

1. **Natural Orbital Motion** - Player orbits at fixed radius
2. **Simplified Collision** - Distance checks use radius directly
3. **Enemy Patterns** - Spiral and arc formations trivial to generate
4. **Visual Clarity** - Mental model matches game design

---

## Rendering Pipeline

### Canvas Setup

```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
// 900x900 square canvas, no alpha for performance
```

### Frame Loop

```javascript
requestAnimationFrame(timestamp) → loop(timestamp)
  ↓
Calculate dt (delta time)
  ↓
Update game state
  ↓
Update entities
  ↓
Clear canvas
  ↓
Draw all layers
  ↓
Request next frame
```

### Draw Layer Order

All drawing happens in `Gyruss.Game.draw(ctx)`:

1. **Background**
   - Radial gradient (dark blue → black)
   - Nebula layers (3 layers with alpha blending)

2. **Starfield**
   - 4 tiers (tiny, normal, bright, brilliant)
   - Twinkling effect via alpha modulation
   - Parallax movement

3. **Orbit Ring**
   - Dashed circle at `PLAYER_ORBIT_RADIUS`
   - Cyan color with glow effect

4. **Enemies**
   - Draw from back to front
   - Oscillating sine wave motion rendering
   - Type-specific colors and sizes

5. **Enemy Bullets**
   - Red/orange projectiles
   - Trail effect (fading previous positions)

6. **Satellites**
   - Power-up carriers
   - Solar panels, antenna, glowing core
   - Pulsing animation

7. **Player Ship**
   - Multi-layer thruster effects
   - Weapon glow
   - Shield overlay (if active)

8. **Player Bullets**
   - Weapon-specific rendering:
     - Laser: Simple lines with glow
     - Plasma: Orbs with energy cores
     - Wave: Oscillating beam patterns

9. **Missiles**
   - Homing projectiles
   - Exhaust trail
   - Target tracking line (debug)

10. **Boss**
    - Multi-part entities (segments/turrets/orbitals)
    - Trail effects
    - Energy beams
    - Destruction sequence

11. **Particles**
    - Explosion debris
    - Sparks (fast, bright)
    - Smoke (slow, rising)
    - Alpha fade over lifetime

12. **UI Overlay**
    - HUD text (score, lives, planet)
    - Boss health bar
    - Debug info (if enabled)

13. **Warp Effect**
    - Expanding circles
    - Tunnel vignette
    - Speed lines

14. **Game Over / Victory Screen**
    - Centered text
    - Gradient background

---

## Entity System

### Entity Lifecycle

```
Constructor → reset() → update(dt) → draw(ctx) → [repeat] → destroy
```

### Entity Classes

**Player (`Gyruss.Player`):**
```javascript
Properties:
- angle: float           // Position on orbit ring
- lives: int            // Remaining lives
- missiles: int         // Missile count
- currentWeapon: object // Active weapon config
- activeUpgrades: Map   // Temporary power-ups
- fireTimer: float      // Cooldown timer
- hitTimer: float       // Invulnerability after hit

Methods:
- update(dt)           // Handle input, timers, upgrades
- fire()               // Create bullets based on weapon
- fireMissile()        // Launch homing missile
- handleHit()          // Take damage, check game over
- applyUpgrade(type)   // Activate temporary power-up
- setWeapon(type)      // Change weapon (persists through warps)
- draw(ctx)            // Render ship with effects
```

**Enemy (`Gyruss.Enemy`):**
```javascript
Properties:
- angle, radius: float     // Polar position
- vAngle, vRadius: float   // Polar velocity
- phase: float             // Sine wave phase for oscillation
- hp: int                  // Health points
- type: string             // 'fighter', 'saucer', etc.
- state: string            // 'entering', 'orbiting', 'leaving'

Methods:
- update(dt)              // Move, oscillate, fire, state transitions
- takeDamage(dmg)         // Reduce HP, spawn particles, check death
- draw(ctx)               // Render enemy with type-specific visuals
```

**Bullet (`Gyruss.Bullet`):**
```javascript
Properties:
- angle, radius: float   // Polar position
- speed: float           // Radial velocity (negative = inward)
- weapon: object         // Weapon config (damage, color, etc.)

Methods:
- update(dt)            // Move inward, check collisions
- draw(ctx)             // Weapon-specific rendering
```

**Missile (`Gyruss.Missile`):**
```javascript
Properties:
- x, y: float             // Cartesian position
- vx, vy: float           // Velocity vector
- target: Enemy           // Tracking target
- age: float              // Lifetime tracker
- blastRadius: float      // Explosion AOE

Methods:
- update(dt)             // Homing logic, move, explode on impact
- draw(ctx)              // Render missile + exhaust trail
```

**Satellite (`Gyruss.Satellite`):**
```javascript
Properties:
- angle, radius: float    // Polar position
- powerupType: string     // 'plasma', 'wave', 'shield', etc.
- hasCollected: bool      // Pickup state

Methods:
- update(dt)             // Orbit, check player collision
- applyPowerup()         // Grant upgrade to player
- draw(ctx)              // Render satellite with glow
```

**Particle (`Gyruss.Particle`):**
```javascript
Properties:
- x, y: float            // Position
- vx, vy: float          // Velocity
- age, life: float       // Lifetime tracking
- type: string           // 'normal', 'spark', 'smoke', 'explosion'
- color: string          // RGB color
- size: float            // Render size

Methods:
- update(dt)            // Move, age, apply friction/gravity
- draw(ctx)             // Alpha-blended rectangle/circle
```

### Boss Entities

All bosses inherit common patterns but have unique implementations:

**Common Boss Structure:**
```javascript
Properties:
- health, maxHealth: int     // HP tracking
- time: float                // Age for animation
- aggressionLevel: float     // 1.0 to 3.0 based on health ratio
- isDestroying: bool         // Death sequence flag
- deathTimer: float          // Destruction animation timer
- fireTimer: float           // Bullet cooldown

Methods:
- update(dt, playerPos)     // Movement AI, aggression scaling, firing
- takeDamage(dmg)           // Reduce HP, trigger destruction if HP <= 0
- draw(ctx)                 // Multi-part rendering with effects
```

**Specific Boss Types:**

1. **CosmicSerpent:**
   - 10 segments following trail
   - Serpentine + spiral + figure-8 movement
   - Head fires multi-bullet spread
   - 4-second cascading explosion

2. **StarDestroyer:**
   - 8 turrets in orbital formation
   - Turrets charge and unleash 5-bullet spreads
   - Formation shifts between tight/spread
   - 5-second sequential turret explosions

3. **GalacticCore:**
   - 6 orbital platforms
   - Wave pattern movement with spiral
   - Energy beams connecting platforms
   - 6-second platform-by-platform destruction

---

## State Machine

```
Game States:
  ATTRACT → PLAYING → WARP → BONUS → BOSS → VICTORY → GAME_OVER
     ↑___________________________________________________|
```

### State Transitions

**ATTRACT:**
- Starfield animating
- Title text displayed
- Waiting for Space press
- Transition: Space → PLAYING

**PLAYING:**
- Main gameplay loop
- Spawn waves, handle collisions
- Track satellite wave progress
- Transitions:
  - 3 satellite waves cleared → WARP
  - All lives lost → GAME_OVER
  - W key (debug) → WARP

**WARP:**
- 2.8-second tunnel animation
- Player invulnerable
- Clear all entities
- Decrement `warpsToPlanet` counter
- Transitions:
  - Timer expires + warps remaining → PLAYING
  - Timer expires + warps == 0 → BOSS
  - Timer expires + planet complete → BONUS

**BONUS:**
- Harmless enemy wave
- No damage from collisions
- Perfect clear = bonus points
- Transitions:
  - All enemies destroyed → next planet → PLAYING
  - Skip → PLAYING

**BOSS:**
- Boss battle active
- Boss-specific mechanics
- Transitions:
  - Boss HP == 0 → VICTORY
  - All lives lost → GAME_OVER

**VICTORY:**
- Victory screen displayed
- Advance to next planet
- Transitions:
  - Timer expires → next planet → PLAYING
  - Final planet → end game

**GAME_OVER:**
- Game over screen
- Waiting for restart
- Transitions:
  - Space/R → ATTRACT

---

## Collision Detection

### Player vs Enemy Bullets

```javascript
// Polar distance check
const dx = playerPos.x - bulletPos.x;
const dy = playerPos.y - bulletPos.y;
const distSq = dx*dx + dy*dy;
const hitRadius = PLAYER_SIZE + BULLET_SIZE;

if (distSq < hitRadius * hitRadius) {
  // Hit!
}
```

### Player Bullets vs Enemies

```javascript
// Check all bullets against all enemies
for (const bullet of bullets) {
  for (const enemy of enemies) {
    const bulletPos = polarToCartesian(bullet.angle, bullet.radius);
    const enemyPos = polarToCartesian(enemy.angle, enemy.radius);
    const distSq = distSquared(bulletPos, enemyPos);
    
    if (distSq < (ENEMY_SIZE + BULLET_SIZE)^2) {
      enemy.takeDamage(bullet.weapon.damage);
      removeBullet();
    }
  }
}
```

### Missiles vs Enemies

```javascript
// Missiles use cartesian positions with blast radius
if (missile.exploded) {
  for (const enemy of enemies) {
    const enemyPos = polarToCartesian(enemy.angle, enemy.radius);
    const dist = distance(missile.pos, enemyPos);
    
    if (dist < missile.blastRadius) {
      const damage = missile.damage * (1 - dist / missile.blastRadius);
      enemy.takeDamage(damage);
    }
  }
}
```

### Boss Multi-Part Collision

```javascript
// Boss segments/turrets/orbitals have individual hitboxes
for (const bullet of bullets) {
  for (const part of boss.parts) {
    if (collides(bullet, part)) {
      part.takeDamage(bullet.damage);
      removeBullet();
    }
  }
}
```

**Optimization:** Uses distance-squared checks (avoids expensive `sqrt()`) with early rejection based on bounding radius.

---

## Audio System

### Web Audio API Architecture

```javascript
Gyruss.Audio = {
  audioCtx: AudioContext,      // Web Audio context
  bgm: HTMLAudioElement,       // Background music <audio> tag
  sfx: { play(name), ... },    // SFX generator object
  soundEnabled: boolean        // Master toggle
}
```

### Procedural Sound Generation

All sound effects are generated procedurally using Web Audio API oscillators, noise, and filters:

**Laser:**
```javascript
Oscillator (triangle wave, 1200Hz → 400Hz sweep)
  ↓
Gain (0.2 → 0.001 fade)
  ↓
Destination
```

**Explosion:**
```javascript
White Noise Buffer
  ↓
Low-Pass Filter (1600Hz → 50Hz sweep)
  ↓
Gain (0.4 → 0.001 fade)
  ↓
Destination
```

**Plasma:**
```javascript
Oscillator (sine wave with vibrato, 800Hz)
  ↓
Gain (0.25 → 0.001 fade)
  ↓
Destination
```

**Wave:**
```javascript
Oscillator (sawtooth wave, 600Hz with wobble)
  ↓
Gain (0.2 → 0.001 fade)
  ↓
Destination
```

**Hit:**
```javascript
Oscillator (square wave, 200Hz → 100Hz)
  ↓
Gain (0.3 → 0.001 fade)
  ↓
Destination
```

**Warp:**
```javascript
Oscillator (sine wave sweep, 100Hz → 1200Hz)
  ↓
Gain (0.15 → 0.001 fade)
  ↓
Destination
```

### Background Music

Optional `bgm.mp3` file loops using standard HTML5 `<audio>` element:

```javascript
const bgm = document.getElementById('bgmAudio');
bgm.loop = true;
bgm.play(); // Triggered on first user interaction
```

---

## Performance Considerations

### Frame Rate Target

- **60 FPS** (16.67ms per frame)
- Uses `requestAnimationFrame` for vsync
- Delta time (`dt`) compensates for variable frame rates

### Optimization Techniques

1. **Distance-Squared Collision Checks**
   - Avoids expensive `Math.sqrt()` calls
   - Only compute sqrt when necessary (e.g., normalization)

2. **Particle Budget Enforcement**
   - Max 200 particles (configurable: `MAX_PARTICLES`)
   - Remove oldest when limit exceeded
   - Prevents runaway particle spawning

3. **Off-Screen Culling**
   - Enemies beyond screen bounds removed
   - Bullets beyond radius limits removed
   - Reduces unnecessary update/draw calls

4. **Canvas Optimizations**
   - Alpha disabled in canvas context (`{ alpha: false }`)
   - Minimal state changes (reduce `save()`/`restore()`)
   - Batch similar draw operations

5. **Object Pooling (Considered but Not Implemented)**
   - Current approach: Create/destroy entities as needed
   - Garbage collection handles cleanup
   - Could be added for mobile optimization

### Performance Monitoring

Debug mode (T key) shows:
```
FPS: 60
Enemies: 12
Bullets: 45
Particles: 180
```

---

## Input Handling

### Keyboard Input

Two input state objects:

```javascript
keysDown: {}     // Currently held keys (cleared on keyup)
keysPressed: {}  // Single-frame presses (cleared each frame)
```

**Polling Pattern:**
```javascript
// In update loop
if (Gyruss.Game.keysDown['ArrowLeft']) {
  player.angle -= player.speed * dt;
}

if (Gyruss.Game.keysPressed['KeyW']) {
  triggerWarp();
  Gyruss.Game.keysPressed['KeyW'] = false; // Consume
}
```

### Touch/Pointer Input

Canvas pointer events mapped to Space key:

```javascript
canvas.addEventListener('pointerdown', (e) => {
  keysDown['Space'] = true;
  
  // Touch position sets player angle
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (WIDTH / rect.width);
  const y = (e.clientY - rect.top) * (HEIGHT / rect.height);
  player.angle = Math.atan2(y - CY, x - CX);
});
```

**Mobile Considerations:**
- Touch to position + auto-fire
- No need for virtual buttons
- Single-finger control scheme

---

## Memory Management

### Entity Arrays

```javascript
Gyruss.Game = {
  enemies: [],        // Array<Enemy>
  bullets: [],        // Array<Bullet>
  enemyBullets: [],   // Array<Bullet>
  missiles: [],       // Array<Missile>
  satellites: [],     // Array<Satellite>
  particles: [],      // Array<Particle>
  stars: []           // Array<{angle, radius, speed, ...}>
}
```

**Cleanup Strategy:**
- In-place array filtering during update
- Remove dead entities immediately
- No manual memory management needed (GC handles it)

```javascript
// Example: Remove dead enemies
for (let i = enemies.length - 1; i >= 0; i--) {
  if (enemies[i].hp <= 0 || enemies[i].offScreen) {
    enemies.splice(i, 1);
  }
}
```

### Garbage Collection

Modern browsers handle GC efficiently. No special considerations needed except:
- Don't create unnecessary temp objects in hot loops
- Reuse vectors when possible
- Clear arrays with `.length = 0` instead of `= []`

---

## Debug Features

### Debug Keys

- **T**: Toggle invulnerability (preserves weapons/upgrades)
- **W**: Warp skip (all enemies explode, immediate warp)
- **B**: Jump to boss (cycles through all 3 bosses)
- **R**: Restart game

### Debug Overlay

Press T to toggle debug info:

```
STATE: PLAYING
PLANET: Jupiter (2 WARPS TO Mars)
ENEMIES: 12 / BULLETS: 45 / PARTICLES: 180
FPS: 60
WEAPON: Plasma / UPGRADES: Shield(8.5s), Triple Shot(14.2s)
INVULNERABLE MODE: ON
```

### Console Logging

Strategic logging in key areas:

```javascript
console.log('[WARP] Triggered, planet:', planetName);
console.log('[BOSS] Created:', bossType);
console.warn('[AUDIO] Web Audio not available');
```

---

## Browser Compatibility

**Supported Browsers:**
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+ (Chromium-based)

**Required APIs:**
- Canvas 2D Context
- Web Audio API (degrades gracefully if missing)
- requestAnimationFrame
- ES6 Classes (minimal usage, can be transpiled)

**Fallback Behavior:**
- No Web Audio → silent gameplay (console warnings)
- No bgm.mp3 → no background music
- Touch not supported → keyboard only

---

## Future Enhancements

Potential architecture improvements:

1. **Component-Entity System**
   - Decouple rendering, physics, AI
   - More modular entity definitions

2. **Asset Management**
   - Sprite sheets for enemies/player
   - Texture atlas for particles
   - Preload audio samples

3. **Physics Engine**
   - Matter.js or custom
   - More realistic collisions
   - Particle physics

4. **Network Multiplayer**
   - WebSocket server
   - Client-side prediction
   - Lag compensation

5. **Web Worker Audio**
   - Off-main-thread audio processing
   - Custom audio worklet for effects

---

## Conclusion

The HTML5/JavaScript architecture prioritizes simplicity, clarity, and maintainability over complex abstractions. The modular structure with a global namespace strikes a balance between organization and accessibility for debugging and extension.

Key architectural strengths:
- ✅ No build step required
- ✅ Clear separation of concerns (entities, audio, utils, game loop)
- ✅ Polar coordinate system matches game design
- ✅ Procedural audio generation (no asset dependencies)
- ✅ Extensible entity system
- ✅ Comprehensive debug tooling

This architecture has proven robust through iterative development and serves as a solid foundation for the Godot port and future enhancements.
