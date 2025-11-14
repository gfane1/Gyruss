# Gyruss HTML5 Game Design Specification  
**Current Version Target:** v6.0 (Final Release)
**Future Milestone:** v6.0 (Full Xbox Live–style release)  
**Platform:** HTML5 Canvas + JavaScript  
**Packaging:** Bundled into `Gyruss_vX.zip` per release (v5.4 onward).  
**Purpose:** Provide complete rules, design, technical guidance, and changelog to enable recreation and continuation of the game in any new environment.  

---

## 1. Game Concept & Vision

### Inspiration
- Based on Konami’s *Gyruss* (1983), a tube-shooter arcade game with space/warp themes.  
- Modernised with Xbox Live Arcade polish: neon vector visuals, rich backgrounds, particle FX, and enhanced boss battles.  

### Core Gameplay Loop
- Player ship orbits the perimeter of the screen.  
- Ship fires inward toward the centre, destroying incoming enemies.  
- Enemies spawn in spirals and formations, dive inward, orbit, fire outward, and exit.  
- Player clears waves, warps forward, passes bonus stages, and eventually faces bosses.  

---

## 2. Game Rules & Mechanics

### Player
- **Movement**: Rotate 360° around orbit ring (← / → or A/D). Always faces inward.  
- **Weapons System**: Three weapon types with unique properties:
  - **Laser** (default): Fast, accurate, low damage (1), cyan color.
  - **Plasma**: Slower, higher damage (2), enhanced visual effects, teal color.
  - **Wave**: Oscillating beam with spread pattern, pink color.
- **Upgrade System**: Temporary power-ups from satellites:
  - **Shield**: 10-second invulnerability with blue glow effect.
  - **Rapid Fire**: 15-second doubled fire rate.
  - **Triple Shot**: 20-second three-bullet spread pattern.
- **Lives**: Player starts with 5 lives. Losing all lives = Game Over.
- **Damage**: Collision with enemies or bullets costs 1 life. Upgrades and weapons reset on hit (except in invulnerable test mode).
- **Missiles**: M key fires homing missiles with blast radius damage.
- **Game Over**: Triggered when lives = 0. Display message "GAME OVER – Press Fire to Restart."

### Special Controls (for dev/testing)
- **T**: Toggle invulnerability mode (HUD indicator: "INVULNERABLE").  
- **W**: Warp skip (all enemies explode, warp FX triggers, jump to next stage).  
- **B**: Skip directly to boss battle.  
- **R**: Restart after Game Over (Replaced with "Press Fire").  

### Enemies
- **Spawn Behaviour**:  
  - Appear from centre or screen edges in spirals, arcs, mirrored V-shapes.  
  - Travel with combined angular + radial velocity.  
  - From v5.4 onward, use **sine-wave radial oscillation** for diving inward and looping outward again.  
- **Orbiting**: After initial dive, some enemies orbit around the centre.  
- **Shooting**: Probability-based outward bullet firing at player.  
- **Types**:  
  - Fighters (small, fast, 1 hit, 100 pts).  
  - Saucers (larger, tougher, 2 hits, 150 pts).  
  - Bosses: Cosmic Serpent.

### Satellites & Power-Ups
- **Satellite Waves**: Appear every 3rd wave in groups of 3.
- **Progression System**: 3 satellite waves must be completed before warping.
- **Power-Up Types**: Center satellite (glowing) contains random upgrade:
  - Weapon upgrades: Plasma or Wave weapons.
  - Temporary upgrades: Shield, Rapid Fire, or Triple Shot.
- **Visual Design**: Power-up satellites feature solar panels, antenna, and glowing cores.
- **Timer System**: Satellites disappear after 6 seconds if not destroyed.
- **Scoring**: 50 points per satellite + upgrade value.

### Scoring
- Fighter: 100 pts  
- Saucer: 150 pts  
- Satellite: 50 pts (+upgrade if central)  
- Warp skip (W): +1000 pts bonus  
- Bonus stages: additional points; perfect-clear yields large bonus  
- Boss defeat: major score payout  

### Progression
- Travel between planets (Neptune → Earth → The Core).
- HUD shows: “X WARPS TO [PLANET].”  
- On reaching planet: bonus stage (enemies harmless, collisions safe).  
- Destroy all bonus enemies = perfect-clear score bonus.  

### Boss Battles (Enhanced v6.2+)
**Three Epic Progressive Boss Types:**

1. **Cosmic Serpent** - Dynamic multi-segment serpentine entity with spectacular movement.
   - **10 segments** with individual health (Head: 5 HP, Body: 3 HP each).
   - **Complex movement**: Serpentine + spiral + figure-8 patterns with aggression scaling.
   - **Dynamic behavior**: Movement speed and firing rate increase as health decreases.
   - **Visual effects**: Glowing particle trails, energy beams connecting segments, pulsing cores.
   - **Epic destruction**: 4-second cascading explosion sequence with screen effects.

2. **Star Destroyer** - Advanced formation-based turret platform with tactical gameplay.
   - **8 orbital turrets** with enhanced armor plating (15 HP each).
   - **Dynamic formations**: Alternates between tight orbit and spread attack patterns.
   - **Charge attacks**: Turrets build energy and unleash devastating 5-bullet spreads.
   - **Central command core**: Glowing structure with pulsing energy rings.
   - **Epic destruction**: 5-second sequential turret explosions ending in core meltdown.

3. **Galactic Core** - Ultimate orbital fortress with universe-threatening power.
   - **6 heavily armed orbital platforms** (20 HP each) with complex movement patterns.
   - **Wave formations**: Sophisticated orbital mechanics with spiral and wave effects.
   - **Desperate mode**: Triple-fire rapid attacks when heavily damaged.
   - **Magnificent core**: Massive energy center with radiating power beams to orbitals.
   - **Epic destruction**: 6-second universe-shaking finale with multiple core explosions.

**Enhanced Boss Features:**
- **Cinematic destruction sequences** (4-6 seconds) with cascading explosions.
- **Screen shake and visual effects** during boss death sequences.
- **Dynamic difficulty scaling** based on boss health remaining.
- **Weapon persistence**: Special weapons retained through boss victories.
- **Spectacular visual upgrades** with enhanced gradients, particle effects, and animations.

---

## 3. Visual & Audio Design

### Visual Style
- **Theme**: Neon vector graphics with particle FX.  
- **Backgrounds**: Black base, layered nebula gradients (blue, purple, red).  
- **Starfield**: Radiating white points, streak FX during warps.  
- **HUD**: Neon monospace font; cyan/yellow for score and warp counter.  

### Player Ship
- Vector design with teal→green gradient hull.  
- Glowing cockpit orb.  
- Thruster flame with cyan→blue gradient.  

### Enemies
- Fighters: glowing blue diamonds.  
- Saucers: glowing magenta ellipses.  

### Explosions
- Neon-coloured particles emitted radially.  
- Use shadowBlur for glow (implemented with 'lighter' composite operation).
- Fade within 0.5 seconds.  

### Warp Effects
- All enemies explode in neon bursts.  
- Screen flashes white briefly.  
- Tunnel of streaking stars appears, leading to next stage/planet.  

### Audio
- **Music**: Synth/organ loop of Bach's *Toccata & Fugue in D minor* (bgm.mp3).
- **Sound FX**: (Generated via Web Audio API)
  - **Weapon sounds**: Laser (triangle wave), Plasma (dual oscillator), Wave (LFO modulation).
  - **Explosions**: Regular (filtered noise) and Big Explosion (boss defeats with distortion).
  - **Effects**: Warp (frequency sweep), Hit (sawtooth), Power-up (ascending tone).
  - **Interactive**: S key and button toggle, auto-initializes on first input.
  - **Fallback**: Graceful degradation if Web Audio API unavailable.

---

## 4. Technical Architecture

### File Structure
/Gyruss_vX.zip
index.html
bgm.mp3
Design.md
philosophicalthoughts.txt
Design.md
philosophicalthoughts.txt

### Main Loop
- Uses `requestAnimationFrame`.  
- Delta-time (dt) ensures frame-rate independent movement.  

### Systems
- **Input Handling**: Event listeners track keydown/keyup states.  
- **Entity System**: Class-based structure for Player, Enemy, Bullet, Particle, Satellite, Boss.
- **Collision Detection**: Distance-based circle checks.  
- **Wave Manager**: Spawns different formations and entity types based on game progression.
- **Progression System**: Tracks planet progression, triggers warps, bonus stages, and boss encounters.

---

## 5. Code Development Process

(Original sections retained)

---

## 6. Current Status (v6.2+)
✅ **Complete Game Loop**: Full progression from Neptune through Earth to The Core.
✅ **Epic Boss System**: Three spectacular bosses with enhanced graphics, dynamic movement, and cinematic destruction.
✅ **Advanced Weapon System**: Laser, Plasma, and Wave weapons with persistence through boss victories.
✅ **Upgrade System**: Shield, Rapid Fire, and Triple Shot temporary power-ups with proper cycling.
✅ **Satellite Progression**: Proper wave-based progression with weapon cycling at cycle start only.
✅ **Spectacular Visual Effects**: Enhanced particle systems, boss trail effects, energy beams, screen shake.
✅ **Epic Destruction Sequences**: 4-6 second boss death animations with cascading explosions.
✅ **Complete Audio System**: Weapon-specific SFX, enhanced explosion sounds, dynamic music.
✅ **Weapon Persistence**: Special weapons retained through warps, boss fights, and planet changes.
✅ **Enhanced Boss Graphics**: Multi-gradient segments, energy cores, charging effects, armor plating.
✅ **Dynamic Boss Behavior**: Aggression scaling, formation changes, charge attacks, desperate modes.
✅ **Responsive Design**: Canvas scales properly, touch controls for mobile.
✅ **Debug Tools**: Comprehensive test keys (T, W, B, M, S) for development.
✅ **Code Architecture**: Modular ES5+ class system with enhanced boss classes and effects.

---

## 7. Roadmap
- **v6.0** → Final polished release (Xbox Live Arcade quality). **[COMPLETED]**

---

## 8. Change Log

This section must be updated on every release.  

---

### v5.4
- Neon player ship with cockpit glow + thruster flame.  
- Fighters & saucers with sine-wave dive/loop.  
- Warp skip (W): explosions, flash, tunnel FX.  
- Particle explosions + neon bullets.  
- Background nebula + starfield.  
- Music loop + FX.  
- Console error logging.  
- Test controls: T (invuln), R (restart).  

---

### v5.5
- Added enemy formations (spirals, arcs, V-shapes).  
- Added satellite power-up system.  
- Double-shot upgrade enabled.  
- Spawn cap added to prevent overload.  
- Improved particle FX fade.  
- Bug fixes (dt timing, entity cleanup).  

---

### v5.6
- Planet system (Neptune → Earth).  
- Bonus stages implemented (harmless enemies).  
- Warp counter HUD (“X WARPS TO [PLANET]”).  
- Warp transitions polished (FX fade, star tunnel).  
- Perfect-clear bonus scoring.  

---

### v5.7 (Rolled into v6.0)
- **Boss encounters**: Implemented the Cosmic Serpent as the final boss.
- **Boss Mechanics**: Boss features multi-segment body, unique sine-wave motion, health system, and projectile attacks.
- **Progression Gates**: Planet progression now leads to the final boss encounter at The Core.

---

### v5.8 (Rolled into v6.0)
- **New enemy types**: Saucers now require multiple hits.
- **Enemy AI**: All standard enemies now fire projectiles at the player.
- **Difficulty Scaling**: Waves become progressively more challenging.
- **Enhanced Visuals**: Player ship model updated to final spec with thruster flame. Added 'lighter' composite for glowing particle effects.

---

### v5.9 (Rolled into v6.0)
- **Balancing**: Player fire rate, enemy health, and spawn rates adjusted for better game flow.
- **Attract/Demo Mode**: An attract screen is now shown on startup.
- **UI Polish**: Added Game Over, Victory, and transitional screens.
- **Audio Polish**: Synthesized sound effects added for all major game actions via the Web Audio API.

---

### v6.0 (Final Milestone)
- **Full Modernisation**: Achieved goal of a polished, complete game loop reminiscent of Xbox Live Arcade titles.
- **Bug Fixes**: Corrected critical player ship rendering and orientation bugs from the previous build.
- **Code Refactor**: Entire codebase was rewritten using a modern, class-based object-oriented structure for stability and future maintainability.
- **Feature Complete**: Integrated all previously planned features including the full planet system, bonus stages, power-ups, varied enemy formations, and the final boss battle.
- **Final Release**: This version represents the complete vision outlined in the design specification.

**Release:** **Gyruss_HTML5_Game_v6.0.zip**