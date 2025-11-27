# Gyruss HTML5/JavaScript - Project Overview

## Table of Contents
1. [Introduction](#introduction)
2. [Game Structure](#game-structure)
3. [Entity Relationships](#entity-relationships)
4. [Game Flow](#game-flow)
5. [Module Dependencies](#module-dependencies)
6. [Data Flow](#data-flow)

---

## Introduction

Gyruss is a tube-shooter arcade game where the player orbits the screen perimeter and fires inward toward waves of incoming enemies. This document provides a high-level overview of how the HTML5/JavaScript implementation is structured.

**Core Concept:** Classic arcade gameplay with modern enhancements - Xbox Live Arcade quality visuals, multiple weapons, power-ups, and epic boss battles.

---

## Game Structure

### Entry Point: `index.html`

```
index.html
  ├── Canvas element (900x900)
  ├── Audio element (bgm.mp3)
  ├── Control hints UI
  └── Script loading:
        1. utils.js
        2. audio.js
        3. entities.js
        4. boss.js
        5. game.js (calls init())
```

### Main Game Loop

```
Gyruss.Game.init()
  ↓
requestAnimationFrame(loop)
  ↓
loop(timestamp)
  ├── Calculate dt
  ├── Update state
  │   ├── Handle input
  │   ├── Update player
  │   ├── Update enemies
  │   ├── Update bullets
  │   ├── Update missiles
  │   ├── Update particles
  │   ├── Check collisions
  │   └── Spawn waves
  ├── Clear canvas
  ├── Draw all entities
  └── Request next frame
```

---

## Entity Relationships

### Class Hierarchy

```
Entities (all independent classes):
  
Gyruss.Player
  ├── Properties: angle, lives, weapons, upgrades
  ├── Methods: update(), fire(), handleHit(), draw()
  └── Relationship: singleton (Gyruss.Game.player)

Gyruss.Enemy
  ├── Properties: angle, radius, hp, type, state
  ├── Methods: update(), takeDamage(), draw()
  └── Relationship: many instances in Gyruss.Game.enemies[]

Gyruss.Bullet
  ├── Properties: angle, radius, weapon, speed
  ├── Methods: update(), draw()
  └── Relationship: 
        - Player bullets: Gyruss.Game.bullets[]
        - Enemy bullets: Gyruss.Game.enemyBullets[]

Gyruss.Missile
  ├── Properties: x, y, target, blastRadius
  ├── Methods: update(), draw()
  └── Relationship: many instances in Gyruss.Game.missiles[]

Gyruss.Satellite
  ├── Properties: angle, radius, powerupType
  ├── Methods: update(), applyPowerup(), draw()
  └── Relationship: many instances in Gyruss.Game.satellites[]

Gyruss.Particle
  ├── Properties: x, y, vx, vy, life, type
  ├── Methods: update(), draw()
  └── Relationship: many instances in Gyruss.Game.particles[]

Boss Entities:
  
Gyruss.CosmicSerpent
  ├── 10 segments, trail following
  └── Stored in Gyruss.Game.boss

Gyruss.StarDestroyer
  ├── 8 turrets, charge attacks
  └── Stored in Gyruss.Game.boss

Gyruss.GalacticCore
  ├── 6 orbitals, energy beams
  └── Stored in Gyruss.Game.boss
```

### Entity Interactions

```
Player ←──────→ Enemy Bullets (collision = take damage)
  ↓
  fires
  ↓
Player Bullets ←──────→ Enemies (collision = damage enemy)
  │
  └──────────→ Boss Parts (collision = damage boss part)

Player ←──────→ Satellites (collision = collect powerup)

Player
  │
  launches
  │
  ↓
Missiles ←──────────→ Enemies (blast radius damage)

All entities ──────→ Particles (spawned on damage/death)
```

---

## Game Flow

### State Machine Diagram

```
        ┌─────────────┐
        │   ATTRACT   │ ← Start here
        └──────┬──────┘
               │ Space pressed
               ↓
        ┌─────────────┐
        │   PLAYING   │ ←───────┐
        └──────┬──────┘         │
               │ 3 satellite    │
               │ waves cleared  │
               ↓                │
        ┌─────────────┐         │
        │    WARP     │         │
        └──────┬──────┘         │
               │                │
          ┌────┴────┐           │
          │         │           │
    warps > 0   warps == 0     │
          │         │           │
          └────→────┤           │
                    ↓           │
             ┌─────────────┐    │
             │    BOSS     │    │
             └──────┬──────┘    │
                    │           │
              boss defeated     │
                    ↓           │
             ┌─────────────┐    │
             │   BONUS     │    │
             └──────┬──────┘    │
                    │           │
             planet complete    │
                    └───────────┘

        Lives == 0 → GAME_OVER
```

### Wave Progression

```
Wave Cycle (repeats 3 times per planet):
  
Wave 1: Enemy formation (spiral/arc/V-shape)
  ↓
Wave 2: Enemy formation
  ↓
Wave 3: Satellite wave (3 satellites, center has powerup)
  ↓
WARP (2.8 seconds)
  ↓
Repeat 2 more times
  ↓
3rd WARP completed → BOSS

After BOSS → BONUS stage → Next planet
```

### Planet Progression

```
Neptune (Planet 0)
  → 3 warps → Boss → Bonus →
Uranus (Planet 1)
  → 3 warps → Boss → Bonus →
Saturn (Planet 2)
  → 3 warps → Boss → Bonus →
Jupiter (Planet 3)
  → 3 warps → Boss → Bonus →
Mars (Planet 4)
  → 3 warps → Boss → Bonus →
Earth (Planet 5)
  → 3 warps → Boss → Bonus →
THE CORE (Planet 6)
  → Final boss → VICTORY
```

---

## Module Dependencies

### Dependency Graph

```
game.js (Gyruss.Game, Gyruss.C)
  ├── Depends on: utils.js, audio.js, entities.js, boss.js
  └── Initializes: game loop, canvas context, input handlers

entities.js (Player, Enemy, Bullet, Missile, Satellite, Particle)
  ├── Depends on: utils.js, audio.js, game.js (for Gyruss.C)
  └── Used by: game.js

boss.js (CosmicSerpent, StarDestroyer, GalacticCore)
  ├── Depends on: utils.js, audio.js, game.js
  └── Used by: game.js

audio.js (Gyruss.Audio)
  ├── Depends on: nothing
  └── Used by: game.js, entities.js, boss.js

utils.js (Gyruss.Utils)
  ├── Depends on: nothing
  └── Used by: everything
```

### Module Responsibilities

| Module | Responsibility | Lines of Code |
|--------|---------------|---------------|
| `game.js` | Game state, main loop, constants, wave spawning | ~1050 |
| `entities.js` | Entity classes (Player, Enemy, Bullet, etc.) | ~1620 |
| `boss.js` | Boss implementations with destruction sequences | ~1020 |
| `audio.js` | Web Audio API sfx generation, bgm control | ~210 |
| `utils.js` | Math utilities (polar/cartesian, angles, distance) | ~50 |

---

## Data Flow

### Input → Action → Update → Render

```
Keyboard/Touch Input
  ↓
Input handlers set flags in Gyruss.Game.keysDown/keysPressed
  ↓
Player.update(dt) reads input flags
  ↓
Player position/state changes
  ↓
Collision detection checks player vs enemies/bullets
  ↓
Entity states update (HP, position, timers)
  ↓
Entity arrays filtered (remove dead entities)
  ↓
Particles spawned from explosions
  ↓
All entities drawn to canvas in layer order
  ↓
Canvas displayed to screen
```

### Spawning Flow

```
Gyruss.Game.update(dt)
  ↓
Check if wave spawn timer expired
  ↓
Determine wave type (spiral/arc/V/satellite)
  ↓
Generate wave pattern:
  - Calculate angles for each enemy
  - Set initial radius (negative = off-screen)
  - Set velocity and oscillation params
  ↓
Create Enemy instances
  ↓
Add to Gyruss.Game.enemies[]
  ↓
Enemies update() each frame
  - Move inward (radius increases)
  - Oscillate (sine wave on angle)
  - Transition states (entering → orbiting → leaving)
  - Fire bullets at player
  ↓
Collision with player bullets
  ↓
Take damage / destroy
  ↓
Spawn particles + play sfx
```

### Weapon Upgrade Flow

```
Satellite spawned with powerupType
  ↓
Player collides with satellite
  ↓
Satellite.applyPowerup() called
  ↓
Check powerup type:
  - Weapon change: Gyruss.Game.player.setWeapon(type)
  - Temporary upgrade: player.applyUpgrade(type)
  ↓
Weapon persists through warps/bosses
  ↓
Reset only on:
  - Life loss (player.handleHit())
  - New satellite cycle start (wave 1 after warp)
```

### Boss Battle Flow

```
3 warps completed on planet
  ↓
Gyruss.Game.state = 'boss'
  ↓
Create boss instance (CosmicSerpent/StarDestroyer/GalacticCore)
  ↓
Store in Gyruss.Game.boss
  ↓
Each frame:
  boss.update(dt, playerPos)
    - Move (pattern-specific AI)
    - Scale aggression based on health ratio
    - Fire bullets at intervals
  ↓
  Player bullets check collision with boss parts
    - boss.takeDamage(dmg)
    - Reduce HP
    - If HP <= 0: boss.isDestroying = true
  ↓
  Boss destruction sequence (4-6 seconds):
    - Spawn particles from parts
    - Flash effects
    - Final massive explosion
  ↓
  Gyruss.Game.state = 'victory'
  ↓
  Award score, advance planet
```

---

## Coordination Mechanisms

### Singleton Pattern

```javascript
Gyruss.Game = {
  // Single source of truth for game state
  state: 'attract',
  score: 0,
  wave: 0,
  player: null,
  enemies: [],
  // ... all entity arrays
}
```

**Why singleton?**
- Simplifies entity access (no dependency injection needed)
- Centralized state management
- Easy to inspect in DevTools
- Matches arcade game model (single game instance)

### Event System (Implicit)

No formal event bus. Instead, direct method calls:

```javascript
// Enemy dies
enemy.takeDamage(dmg);
  ↓
if (hp <= 0) {
  Gyruss.Game.spawnExplosion(x, y, color, count);
  Gyruss.Audio.sfx.play('explosion');
  Gyruss.Game.score += enemy.scoreValue;
}
```

**Advantages:**
- Explicit call chains (easy to trace)
- No hidden side effects
- Simple to debug

**Disadvantages:**
- Tight coupling between modules
- Harder to extend with plugins

### Timing System

All time-based logic uses **delta time** (dt):

```javascript
// Consistent regardless of frame rate
entity.x += entity.vx * dt;
timer -= dt;
```

**Why dt?**
- Frame-rate independent physics
- Smooth gameplay on varied hardware
- Handles frame drops gracefully

---

## Configuration & Constants

### Centralized Constants

```javascript
Gyruss.C = {
  // Screen
  WIDTH: 900,
  HEIGHT: 900,
  CX: 450,
  CY: 450,
  
  // Player
  PLAYER_ORBIT_RADIUS: 378,
  PLAYER_SIZE: 20,
  
  // Weapons
  WEAPONS: {
    LASER: { damage: 1, speed: 600, cooldown: 0.12, ... },
    PLASMA: { damage: 2, speed: 500, cooldown: 0.2, ... },
    WAVE: { damage: 1, speed: 550, cooldown: 0.15, ... }
  },
  
  // Upgrades
  UPGRADES: {
    SHIELD: { duration: 10, ... },
    RAPID_FIRE: { duration: 15, multiplier: 2, ... },
    TRIPLE_SHOT: { duration: 20, ... }
  },
  
  // Planets
  PLANETS: ['Neptune', 'Uranus', 'Saturn', ...],
  
  // Colors
  ENEMY_COLORS: ['#24d8ff', '#ff6ae6', ...]
}
```

**Benefits:**
- Single place to tweak game balance
- Easy to expose as debug UI controls
- Type safety (JSDoc comments provide hints)

---

## Extension Points

### Adding New Weapons

1. Add to `Gyruss.C.WEAPONS`
2. Implement firing logic in `Player.fire()`
3. Add rendering in `Bullet.draw()`
4. Add sound in `Gyruss.Audio.sfx`

### Adding New Enemy Types

1. Add constants (size, HP, score) to `Gyruss.C`
2. Modify `Enemy` constructor to handle new type
3. Add type-specific rendering in `Enemy.draw()`
4. Create spawn pattern in `Gyruss.Game.spawnXxxWave()`

### Adding New Bosses

1. Create new class in `boss.js`
2. Implement `update(dt, playerPos)` and `draw(ctx)`
3. Add to `Gyruss.Game.createBoss()` switch
4. Define multi-part collision system

### Adding New Power-Ups

1. Add to `Gyruss.C.UPGRADES`
2. Implement in `Player.applyUpgrade(type)`
3. Add visual indicator in `Player.draw()`
4. Add to satellite powerup pool

---

## Testing Strategy

### Manual Testing

- **Play-through testing**: Complete full game from Neptune to THE CORE
- **Boss testing**: Use B key to quickly test all bosses
- **Weapon testing**: Use satellite waves to test each weapon
- **Edge cases**: Test with 0 lives, 0 missiles, max upgrades

### Debug Features

- **Invulnerability (T)**: Test without dying
- **Warp skip (W)**: Test wave progression quickly
- **Boss jump (B)**: Test bosses in sequence
- **Debug overlay**: Monitor entity counts and FPS

### Performance Testing

- Monitor FPS with debug overlay
- Stress test: Spawn many enemies + particles
- Mobile testing: Touch controls, smaller screens

### Browser Compatibility Testing

- Chrome (primary)
- Firefox
- Safari
- Edge

---

## Common Workflows

### Typical Development Session

1. Open `index.html` in VS Code
2. Start Live Server
3. Edit `src/entities.js` or `src/game.js`
4. Save → Live Server auto-reloads
5. Test with debug keys (T, W, B)
6. Check console for errors/warnings

### Adding Visual Effects

1. Find entity's `draw()` method
2. Add canvas drawing code
3. Test timing with `entity.age` or `Gyruss.Game.worldTime`
4. Tweak colors/sizes in `Gyruss.C`

### Debugging Collision Issues

1. Enable debug overlay (T key)
2. Add `console.log` in collision detection code
3. Draw collision circles (temporary visualization)
4. Check distance calculations with breakpoints

---

## Conclusion

The Gyruss HTML5/JavaScript implementation follows a straightforward object-oriented design with a singleton game state and modular entity classes. The architecture prioritizes:

- **Clarity**: Easy to understand and modify
- **Accessibility**: All state inspectable via `window.Gyruss`
- **Extensibility**: New weapons, enemies, bosses added with minimal changes
- **Performance**: 60 FPS on modern browsers with 200+ entities

This structure has evolved through iterative development and serves as both a playable game and a reference implementation for the Godot port.
