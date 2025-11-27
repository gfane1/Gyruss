# Gyruss HTML5/JavaScript - Coding Guidelines

## Table of Contents
1. [Code Style](#code-style)
2. [Naming Conventions](#naming-conventions)
3. [Project Patterns](#project-patterns)
4. [Best Practices](#best-practices)
5. [Common Pitfalls](#common-pitfalls)

---

## Code Style

### JavaScript Version

**Target:** ES5+ with selective ES6 features (classes, arrow functions, let/const)

**Why not full ES6/ESNext?**
- Broader browser compatibility
- No transpilation required
- Simpler debugging
- Faster iteration (no build step)

### Formatting

**Indentation:** 2 spaces (no tabs)

**Line Length:** Soft limit of 100 characters

**Braces:** K&R style (opening brace on same line)
```javascript
// Good
function update(dt) {
  if (condition) {
    doSomething();
  }
}

// Bad
function update(dt)
{
  if (condition)
  {
    doSomething();
  }
}
```

**Semicolons:** Always use them
```javascript
// Good
const x = 5;
player.update(dt);

// Bad
const x = 5
player.update(dt)
```

**Whitespace:**
- Space after keywords: `if (condition)`
- Space around operators: `x + y`, `a === b`
- No space before function call parens: `func(arg)`
- Space after comma: `func(a, b, c)`

---

## Naming Conventions

### Variables & Functions

**camelCase** for everything except constants and classes:

```javascript
// Variables
let playerAngle = 0;
let fireTimer = 0.5;
let enemiesRemaining = 12;

// Functions
function updatePlayer(dt) { }
function spawnExplosion(x, y, color, count) { }
function polarToCartesian(angle, radius) { }
```

### Constants

**SCREAMING_SNAKE_CASE** for true constants:

```javascript
const PLAYER_ORBIT_RADIUS = 378;
const MAX_PARTICLES = 200;
const TWO_PI = Math.PI * 2;
```

**Configuration Objects:** Use camelCase keys:

```javascript
Gyruss.C.WEAPONS = {
  LASER: {
    id: 'laser',         // camelCase
    damage: 1,
    cooldown: 0.12,
    speed: 600
  }
};
```

### Classes

**PascalCase** for class names:

```javascript
class Player { }
class Enemy { }
class Bullet { }
class CosmicSerpent { }
```

### Private-ish Members

No true private members in ES5. Use **underscore prefix** to indicate "internal use only":

```javascript
class Enemy {
  constructor() {
    this._oscillationPhase = 0;  // Internal, don't access directly
    this.hp = 3;                 // Public
  }
  
  _updateOscillation(dt) { }  // Internal method
  update(dt) { }              // Public method
}
```

**Note:** This is convention only - not enforced by language.

### File Names

**kebab-case** for file names (if we had many files):
- `game-manager.js`
- `audio-system.js`

**Current naming** (existing convention):
- `game.js`
- `entities.js`
- `boss.js`
- `utils.js`
- `audio.js`

Keep it simple for small projects.

---

## Project Patterns

### Namespace Pattern

All code attaches to `window.Gyruss`:

```javascript
// Start every file with:
window.Gyruss = window.Gyruss || {};

// Add classes/objects:
Gyruss.Player = class Player { ... };
Gyruss.Game = { ... };
Gyruss.Utils = { ... };
```

**Why?**
- Avoids global namespace pollution
- Easy to inspect in DevTools: `window.Gyruss`
- Clear module boundaries
- No bundler required

### Singleton Pattern

Game state is a singleton object:

```javascript
Gyruss.Game = {
  state: 'attract',
  score: 0,
  player: null,
  enemies: [],
  bullets: [],
  
  init() { ... },
  update(dt) { ... },
  draw(ctx) { ... }
};
```

**When to use:**
- Single instance needed (game state, audio manager)
- Global access required

**When NOT to use:**
- Entities (player, enemies, bullets) - use classes

### Entity Pattern

Entities are classes with `update(dt)` and `draw(ctx)` methods:

```javascript
class Entity {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.age = 0;
  }
  
  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
```

**Key principles:**
- `dt` for frame-rate independence
- `age` for animation/lifetime
- Separate `update` and `draw`

### Polar Coordinate Pattern

Use polar (angle + radius) as primary representation:

```javascript
// Store polar coordinates
this.angle = Math.PI / 2;
this.radius = 378;

// Convert to cartesian only when drawing
const pos = Gyruss.Utils.polarToCartesian(this.angle, this.radius);
ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
```

**Why?**
- Natural for circular orbits
- Simpler collision detection
- Easier wave patterns

### Collision Detection Pattern

Use **distance-squared** checks (avoid `Math.sqrt`):

```javascript
// Good (fast)
const dx = x1 - x2;
const dy = y1 - y2;
const distSq = dx*dx + dy*dy;
const radiusSum = r1 + r2;

if (distSq < radiusSum * radiusSum) {
  // Collision!
}

// Bad (slow)
const dist = Math.sqrt(dx*dx + dy*dy);
if (dist < r1 + r2) {
  // Collision!
}
```

**Utility function:**
```javascript
Gyruss.Utils.distSq = function(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx*dx + dy*dy;
};
```

---

## Best Practices

### 1. Delta Time Everywhere

**Always** use `dt` for time-based changes:

```javascript
// Good
update(dt) {
  this.angle += this.angularSpeed * dt;
  this.timer -= dt;
}

// Bad
update() {
  this.angle += this.angularSpeed / 60;  // Assumes 60 FPS!
  this.timer -= 1/60;
}
```

### 2. Early Returns for Readability

```javascript
// Good
update(dt) {
  if (this.isDead) return;
  if (this.isPaused) return;
  
  // Main update logic here
  this.x += this.vx * dt;
}

// Bad
update(dt) {
  if (!this.isDead) {
    if (!this.isPaused) {
      // Main update logic nested
      this.x += this.vx * dt;
    }
  }
}
```

### 3. Reverse Iteration for Array Removal

When removing items while iterating:

```javascript
// Good (reverse iteration)
for (let i = enemies.length - 1; i >= 0; i--) {
  if (enemies[i].hp <= 0) {
    enemies.splice(i, 1);
  }
}

// Bad (forward iteration, skips elements)
for (let i = 0; i < enemies.length; i++) {
  if (enemies[i].hp <= 0) {
    enemies.splice(i, 1);  // Shifts remaining elements!
  }
}
```

### 4. Object Reuse for Vectors

Reuse objects instead of creating new ones in hot loops:

```javascript
// Good
const tempPos = { x: 0, y: 0 };

function update(dt) {
  for (const enemy of enemies) {
    Gyruss.Utils.polarToCartesianInto(enemy.angle, enemy.radius, tempPos);
    // Use tempPos.x, tempPos.y
  }
}

// Bad (creates garbage)
function update(dt) {
  for (const enemy of enemies) {
    const pos = Gyruss.Utils.polarToCartesian(enemy.angle, enemy.radius);
    // pos object created every frame, every enemy!
  }
}
```

**Note:** Current implementation doesn't do this (yet), but it's a good optimization for mobile.

### 5. Canvas State Management

Minimize `save()` / `restore()` calls:

```javascript
// Good
ctx.fillStyle = color;
ctx.fillRect(x, y, w, h);

// Only save/restore when using transformations
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.scale(sx, sy);
drawComplexShape();
ctx.restore();

// Bad (unnecessary)
ctx.save();
ctx.fillStyle = color;
ctx.fillRect(x, y, w, h);
ctx.restore();  // fillStyle doesn't need save/restore
```

### 6. Consistent Coordinate Systems

**Always** clarify which coordinate system you're using:

```javascript
// Good (explicit conversion)
const polarPos = { angle: this.angle, radius: this.radius };
const cartesianPos = Gyruss.Utils.polarToCartesian(polarPos.angle, polarPos.radius);

// Bad (mixed coordinates)
const pos = { x: this.angle, y: this.radius };  // Confusing!
```

### 7. Magic Numbers → Named Constants

```javascript
// Good
const PLAYER_ORBIT_RADIUS = 378;
const PLAYER_SIZE = 20;

if (enemy.radius > PLAYER_ORBIT_RADIUS + PLAYER_SIZE) {
  // Enemy breached player orbit
}

// Bad
if (enemy.radius > 398) {  // What is 398?
  // ...
}
```

---

## Common Pitfalls

### 1. Forgetting Delta Time

**Problem:**
```javascript
update() {
  this.x += 5;  // Moves 5 pixels per frame (variable speed!)
}
```

**Solution:**
```javascript
update(dt) {
  this.x += 300 * dt;  // Moves 300 pixels per second (constant speed)
}
```

### 2. Angle Wrapping

**Problem:**
```javascript
this.angle += 0.1 * dt;
// After many frames: angle = 1000.5 (huge number!)
```

**Solution:**
```javascript
this.angle += 0.1 * dt;
this.angle = Gyruss.Utils.wrapAngle(this.angle);  // Keep in 0-2π range
```

### 3. Off-by-One in Array Removal

**Problem:**
```javascript
for (let i = 0; i < bullets.length; i++) {
  if (bullets[i].offScreen) {
    bullets.splice(i, 1);
    // i now points to next element, but loop increments i!
  }
}
```

**Solution:**
```javascript
// Reverse iteration
for (let i = bullets.length - 1; i >= 0; i--) {
  if (bullets[i].offScreen) {
    bullets.splice(i, 1);  // Safe!
  }
}
```

### 4. Canvas State Leak

**Problem:**
```javascript
ctx.globalAlpha = 0.5;
drawEntity();
// globalAlpha still 0.5 for next draw!
```

**Solution:**
```javascript
const oldAlpha = ctx.globalAlpha;
ctx.globalAlpha = 0.5;
drawEntity();
ctx.globalAlpha = oldAlpha;

// OR use save/restore
ctx.save();
ctx.globalAlpha = 0.5;
drawEntity();
ctx.restore();
```

### 5. Sqrt in Collision Detection

**Problem:**
```javascript
const dist = Math.sqrt(dx*dx + dy*dy);
if (dist < r1 + r2) { /* collision */ }
// sqrt() is expensive!
```

**Solution:**
```javascript
const distSq = dx*dx + dy*dy;
const radiusSum = r1 + r2;
if (distSq < radiusSum * radiusSum) { /* collision */ }
```

### 6. Audio Context Autoplay

**Problem:**
```javascript
// Page load
const audioCtx = new AudioContext();
audioCtx.resume();  // Blocked by browser!
```

**Solution:**
```javascript
// Wait for user interaction
document.addEventListener('keydown', () => {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    audioCtx.resume();
  }
}, { once: true });
```

### 7. Polar/Cartesian Confusion

**Problem:**
```javascript
ctx.arc(this.angle, this.radius, 10, 0, Math.PI*2);  // Wrong coordinates!
```

**Solution:**
```javascript
const pos = Gyruss.Utils.polarToCartesian(this.angle, this.radius);
ctx.arc(pos.x, pos.y, 10, 0, Math.PI*2);
```

---

## Code Comments

### When to Comment

**Do comment:**
- Non-obvious algorithms
- Magic numbers (if not extractable)
- Workarounds for browser bugs
- Complex math/physics

**Don't comment:**
- Obvious code
- Redundant statements

```javascript
// Good
// Use sine oscillation to create wave effect
const oscillation = Math.sin(this.age * frequency) * amplitude;

// Bad
this.angle += 0.1;  // Add 0.1 to angle (obvious!)
```

### JSDoc for Public APIs

```javascript
/**
 * Convert polar coordinates to cartesian
 * @param {number} angle - Angle in radians (0 = right, π/2 = down)
 * @param {number} radius - Distance from center in pixels
 * @returns {{x: number, y: number}} Cartesian coordinates
 */
Gyruss.Utils.polarToCartesian = function(angle, radius) {
  return {
    x: Gyruss.C.CX + Math.cos(angle) * radius,
    y: Gyruss.C.CY + Math.sin(angle) * radius
  };
};
```

---

## File Organization

### Typical File Structure

```javascript
// 1. Namespace declaration
window.Gyruss = window.Gyruss || {};

// 2. Constants (if any)
const INTERNAL_CONSTANT = 42;

// 3. Class/object definitions
Gyruss.EntityName = class EntityName {
  constructor() { }
  update(dt) { }
  draw(ctx) { }
};

// 4. Helper functions (if any)
function internalHelper() { }

// 5. Initialization (if needed)
// Usually done in game.js init()
```

### Module Boundaries

| File | Contents |
|------|----------|
| `utils.js` | Pure functions, no state, no dependencies |
| `audio.js` | Audio context, sfx generators, bgm control |
| `entities.js` | Entity classes, depends on utils/audio |
| `boss.js` | Boss classes, depends on utils/audio/entities |
| `game.js` | Game state, main loop, wave spawning, depends on all |

---

## Performance Guidelines

### Critical Path Optimizations

**Hot loop** = code that runs every frame for every entity

```javascript
// HOT: Runs 60 times/sec for 100+ entities
update(dt) {
  // Keep this fast!
  this.x += this.vx * dt;
  this.y += this.vy * dt;
}

// COLD: Runs once per entity creation
constructor() {
  // OK to do expensive setup here
  this.trailPoints = new Array(50).fill(null).map(() => ({x:0, y:0}));
}
```

### Optimization Checklist

- [ ] Use distance-squared for collisions
- [ ] Avoid `Math.sqrt()` in hot loops
- [ ] Minimize object allocations per frame
- [ ] Use typed arrays for large data (if needed)
- [ ] Batch similar canvas operations
- [ ] Early-exit from update/draw if possible
- [ ] Enforce entity budgets (max particles, etc.)

### When to Optimize

1. **Measure first** - Use browser profiler
2. **Find bottleneck** - Don't guess
3. **Optimize hot path only** - Don't waste time on cold code
4. **Verify improvement** - Measure again

**Current performance:** 60 FPS with 200 entities on mid-range hardware. No optimization needed unless targeting mobile or adding more entities.

---

## Debugging Guidelines

### Console Logging

```javascript
// Development logging
console.log('[WARP] Starting warp to', planetName);
console.log('[BOSS] Spawned', bossType, 'with', hp, 'HP');

// Warnings for recoverable issues
console.warn('[AUDIO] Web Audio API not supported, falling back to silent mode');

// Errors for critical issues
console.error('[CANVAS] Failed to get 2D context');
```

**Production:** Remove or gate behind debug flag:

```javascript
if (Gyruss.DEBUG) {
  console.log('[DEBUG]', message);
}
```

### Debugging Tools

1. **Browser DevTools**
   - Console: Inspect `window.Gyruss` object
   - Debugger: Breakpoints in source files
   - Performance: Profile frame rate
   - Network: Check asset loading

2. **In-Game Debug Keys**
   - T: Invulnerability + debug overlay
   - W: Skip waves
   - B: Jump to boss

3. **Temporary Visualizations**
   ```javascript
   // Draw collision circles
   if (DEBUG_COLLISION) {
     ctx.strokeStyle = 'red';
     ctx.arc(x, y, hitRadius, 0, Math.PI*2);
     ctx.stroke();
   }
   ```

---

## Git Commit Guidelines

### Commit Message Format

```
[Component] Short description

Detailed explanation if needed.
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

[Audio] Fix plasma weapon sound timing issue

[Gameplay] Increase player start lives to 5
```

### Component Tags

- `[Entities]` - Player, enemies, bullets, particles
- `[Boss]` - Boss implementations
- `[Audio]` - Sound effects, music
- `[Gameplay]` - Game balance, mechanics
- `[UI]` - HUD, menus, overlays
- `[Rendering]` - Visual effects, canvas drawing
- `[Refactor]` - Code reorganization
- `[Fix]` - Bug fixes
- `[Docs]` - Documentation updates

---

## Testing Checklist

Before committing changes:

### Functionality
- [ ] Game starts without errors
- [ ] Player can move and fire
- [ ] Enemies spawn and behave correctly
- [ ] Collisions detect properly
- [ ] Wave progression works
- [ ] Boss battles complete
- [ ] Game over / victory screens show

### Visual
- [ ] No visual glitches or artifacts
- [ ] Particle effects look good
- [ ] Boss destruction sequences play fully
- [ ] HUD displays correctly
- [ ] Warp effect plays smoothly

### Audio
- [ ] Sound effects play on actions
- [ ] No audio errors in console
- [ ] Background music loops
- [ ] Toggle sound (S key) works

### Performance
- [ ] 60 FPS maintained
- [ ] No memory leaks (check DevTools)
- [ ] Entity counts stay reasonable

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)

---

## Conclusion

These guidelines have evolved through development of Gyruss HTML5. They prioritize:

- **Readability** - Code should be obvious
- **Consistency** - Follow established patterns
- **Performance** - But only when measured
- **Simplicity** - No over-engineering

When in doubt:
1. Check existing code for examples
2. Prioritize clarity over cleverness
3. Test before committing
4. Profile before optimizing

Happy coding! 🚀
