window.Gyruss = window.Gyruss || {};

// --- CONSTANTS ---
Gyruss.C = {
  WIDTH: 900,
  HEIGHT: 900,
  CX: 450,
  CY: 450,
  TWO_PI: Math.PI * 2,
  PLAYER_ORBIT_RADIUS: 378,
  PLAYER_SIZE: 20,
  PLANETS: ['Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Mars', 'Earth', 'THE CORE'],
  ENEMY_COLORS: ['#24d8ff', '#ff6ae6', '#ffe066', '#ff9376', '#9d7bff'],
  WEAPONS: {
    LASER: { id: 'laser', color: '#ffd966', damage: 1, cooldown: 0.12, speed: 600, size: 3 },
    PLASMA: { id: 'plasma', color: '#66ffcc', damage: 2, cooldown: 0.2, speed: 500, size: 5 },
    WAVE: { id: 'wave', color: '#ff66aa', damage: 1, cooldown: 0.15, speed: 550, spreadAngle: 0.2 }
  },
  UPGRADES: {
    SHIELD: { id: 'shield', duration: 10, color: '#66aaff' },
    RAPID_FIRE: { id: 'rapid_fire', duration: 15, multiplier: 2 },
    TRIPLE_SHOT: { id: 'triple_shot', duration: 20 }
  }
};

// --- GAME STATE ---
Gyruss.Game = {
  state: 'attract',
  score: 0,
  wave: 0,
  spawnTimer: 0,
  worldTime: 0,
  firstInputArmed: false,
  gameOverTimer: 0,
  planetIndex: 0,
  warpsToPlanet: 3,
  satelliteWavesCompleted: 0,
  satellitesDestroyed: 0,
  satellitesInCurrentWave: 0,

  // Entities
  player: null,
  boss: null,
  bullets: [],
  enemies: [],
  particles: [],
  stars: [],
  satellites: [],
  enemyBullets: [],
  missiles: [],
  
  // Input state
  keysDown: {},
  keysPressed: {},

  init() {
    const canvas = document.getElementById('gameCanvas');
    this.ctx = canvas.getContext('2d', { alpha: false });
    
    if (!canvas || !this.ctx) {
      console.error('Canvas or 2D context not found.');
      return;
    }

    // Initialize systems
    Gyruss.Audio.init();
    this.initStarfield(350); // Increased from 200 for denser starfield
    
    // Input handlers
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault();
      if (!this.keysDown[e.code]) this.keysPressed[e.code] = true;
      this.keysDown[e.code] = true;
      this.armAudioAndInput();
      if (e.code === 'KeyT' && this.player) this.player.invulnerable = !this.player.invulnerable;
      if (e.code === 'KeyS') Gyruss.Audio.toggleSound();
    });

    document.addEventListener('keyup', (e) => { this.keysDown[e.code] = false; });

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.keysDown['Space'] = true;
      this.armAudioAndInput();
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (Gyruss.C.WIDTH / rect.width);
      const y = (e.clientY - rect.top) * (Gyruss.C.HEIGHT / rect.height);
      if (this.player) this.player.angle = Math.atan2(y - Gyruss.C.CY, x - Gyruss.C.CX);
    });

    canvas.addEventListener('pointerup', () => { this.keysDown['Space'] = false; });

    canvas.addEventListener('pointermove', (e) => {
      if (this.keysDown['Space'] && this.player) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (Gyruss.C.WIDTH / rect.width);
        const y = (e.clientY - rect.top) * (Gyruss.C.HEIGHT / rect.height);
        this.player.angle = Math.atan2(y - Gyruss.C.CY, x - Gyruss.C.CX);
      }
    });

    this.startAttractMode();
    requestAnimationFrame((t) => this.loop(t));
  },

  armAudioAndInput() {
    if (!this.firstInputArmed) {
      this.firstInputArmed = true;
      Gyruss.Audio.initAudioContext();
      if (Gyruss.Audio.bgm && !Gyruss.Audio.audioStarted && Gyruss.Audio.soundEnabled) {
        Gyruss.Audio.bgm.play().catch(() => Gyruss.Audio.audioStarted = false);
        Gyruss.Audio.audioStarted = true;
      }
    }
    if (this.state === 'attract' || this.state === 'gameover' || this.state === 'victory') this.resetGame();
  },

  startAttractMode() {
    this.state = 'attract';
    this.initStarfield(200);
  },

  resetGame() {
    this.state = 'playing';
    this.score = 0;
    this.wave = 0;
    this.spawnTimer = 0.85;
    this.worldTime = 0;
    this.gameOverTimer = 0;
    this.planetIndex = 0;
    this.warpsToPlanet = 3;
    this.satelliteWavesCompleted = 0;
    this.satellitesDestroyed = 0;
    this.satellitesInCurrentWave = 0;
    if (!this.player) this.player = new Gyruss.Player();
    this.player.reset();
    this.bullets.length = this.enemies.length = this.particles.length = 
    this.satellites.length = this.enemyBullets.length = 0;
    this.boss = null;
    this.spawnNextWave();
  },

  triggerWarp() {
    if (this.state !== 'playing' && this.state !== 'bonus') return;
    this.state = 'warp';
    this.worldTime = 0;
    Gyruss.Audio.sfx.play('warp');
    this.player.hitTimer = 3.0;
    this.satelliteWavesCompleted = 0;
    this.satellitesDestroyed = 0;
    this.satellitesInCurrentWave = 0;
    this.score += 1000;
    [...this.enemies, ...this.satellites].forEach(e => {
      const pos = e.getPos();
      this.spawnExplosion(pos.x, pos.y, e.isPowerUp ? '#ffff00' : (e.color || Gyruss.C.ENEMY_COLORS[0]), 15);
    });
    this.enemies.length = this.satellites.length = 0;
    setTimeout(() => {
      this.warpsToPlanet--;
      if (this.warpsToPlanet <= 0) {
        if (this.planetIndex === Gyruss.C.PLANETS.length - 2) { // Penultimate -> boss
          this.state = 'boss';
          this.planetIndex++;
          this.warpsToPlanet = 1;
          // Progressive boss based on planet progression
          const bossIndex = Math.min(2, Math.floor(this.planetIndex / 3));
          this.boss = this.createBoss(bossIndex);
        } else {
          this.state = 'bonus';
          this.planetIndex++;
          this.warpsToPlanet = 3;
          this.spawnBonusWave();
        }
      } else {
        this.state = 'playing';
        this.spawnNextWave();
      }
    }, 2800);
  },

  triggerGameOver() {
    this.state = 'gameover';
    this.gameOverTimer = 0;
    const playerPos = Gyruss.Utils.polarToCartesian(this.player.angle, Gyruss.C.PLAYER_ORBIT_RADIUS);
    this.spawnExplosion(playerPos.x, playerPos.y, '#ffffff', 50);
    this.enemies.length = this.bullets.length = this.enemyBullets.length = 0;
  },

  spawnExplosion(x, y, color, count) {
    // Main explosion particles
    for (let i = 0; i < count * 0.6; i++) {
      this.particles.push(new Gyruss.Particle(x, y, color, 'normal'));
    }
    
    // Sparks
    for (let i = 0; i < count * 0.3; i++) {
      this.particles.push(new Gyruss.Particle(x, y, '#ffffff', 'spark'));
    }
    
    // Smoke trails
    for (let i = 0; i < count * 0.1; i++) {
      this.particles.push(new Gyruss.Particle(x, y, '#666666', 'smoke'));
    }
    
    // Use big explosion for large particle counts (boss explosions)
    if (count >= 100) {
      Gyruss.Audio.sfx.play('bigExplosion');
    } else {
      Gyruss.Audio.sfx.play('explosion');
    }
  },

  spawnNextWave() {
    this.wave++;
    const waveType = Math.random();
    if (waveType < 0.4) this.spawnSpiralWave();
    else if (waveType < 0.8) this.spawnVShapeWave();
    else this.spawnArcWave();
  },

  spawnSpiralWave() {
    const count = Math.min(24, 8 + this.wave);
    const baseRadius = Gyruss.C.WIDTH * 0.15;
    for (let i = 0; i < count; i++) {
      this.enemies.push(new Gyruss.Enemy({
        angle: (i / count) * Gyruss.C.TWO_PI * 2,
        radius: -20 - i * 5,
        targetRadius: Gyruss.Utils.rand(baseRadius, baseRadius * 1.8),
        angularSpeed: Gyruss.Utils.rand(0.8, 1.6) * (Math.random() > 0.5 ? 1 : -1),
        type: Math.random() > 0.7 ? 'saucer' : 'fighter'
      }));
    }
  },

  spawnVShapeWave() {
    const count = Math.min(10, 4 + Math.floor(this.wave / 2));
    const startAngle = Gyruss.Utils.rand(0, Gyruss.C.TWO_PI);
    for (let i = 0; i < count; i++) {
      const mirror = Math.random() > 0.5 ? 1 : -1;
      this.enemies.push(new Gyruss.Enemy({
        angle: startAngle + (i * 0.2 * mirror),
        radius: -20,
        targetRadius: Gyruss.C.PLAYER_ORBIT_RADIUS * 0.6,
        angularSpeed: 0.5 * mirror,
        type: 'fighter'
      }));
    }
  },

  spawnArcWave() {
    const count = Math.min(12, 5 + this.wave);
    const startAngle = Gyruss.Utils.rand(0, Gyruss.C.TWO_PI);
    const angSpeed = Gyruss.Utils.rand(1, 2) * (Math.random() > 0.5 ? 1 : -1);
    for (let i = 0; i < count; i++) {
      this.enemies.push(new Gyruss.Enemy({
        angle: startAngle + i * 0.1,
        radius: Gyruss.C.WIDTH * 0.6 + i * 20,
        enterSpeed: -200,
        targetRadius: Gyruss.C.PLAYER_ORBIT_RADIUS * Gyruss.Utils.rand(0.4, 0.7),
        angularSpeed: angSpeed,
        type: 'saucer'
      }));
    }
  },

  spawnSatelliteWave() {
    const centerAngle = Gyruss.Utils.rand(0, Gyruss.C.TWO_PI);
    this.satellites.push(new Gyruss.Satellite(centerAngle - 0.2, false));
    this.satellites.push(new Gyruss.Satellite(centerAngle, true));
    this.satellites.push(new Gyruss.Satellite(centerAngle + 0.2, false));
    this.satellitesInCurrentWave = 3;
    this.satellitesDestroyed = 0;
    
    // Reset weapon to laser only at the very start of a completely new satellite cycle
    // (This should only happen when transitioning from regular waves to satellites for the first time)
    if (this.satelliteWavesCompleted === 0 && this.satellitesDestroyed === 0 && this.player) {
      this.player.currentWeapon = Gyruss.C.WEAPONS.LASER;
    }
  },

  spawnBonusWave() {
    const count = 20;
    for (let i = 0; i < count; i++) {
      this.enemies.push(new Gyruss.Enemy({
        angle: (i / count) * Gyruss.C.TWO_PI,
        radius: -20,
        targetRadius: Gyruss.Utils.rand(Gyruss.C.WIDTH * 0.1, Gyruss.C.WIDTH * 0.3),
        angularSpeed: Gyruss.Utils.rand(2, 3) * (i % 2 === 0 ? 1 : -1),
        type: 'fighter'
      }));
    }
  },

  skipToBoss() {
    if (this.state === 'boss') {
      this.currentBossIndex = (this.currentBossIndex + 1) % 3;
    } else {
      this.state = 'boss';
      if (this.currentBossIndex === undefined) this.currentBossIndex = 0;
      else this.currentBossIndex = (this.currentBossIndex + 1) % 3;
    }
    
    this.boss = this.createBoss(this.currentBossIndex);
    this.enemies.length = this.satellites.length = this.enemyBullets.length = 0;
  },

  createBoss(bossIndex) {
    switch(bossIndex) {
      case 0: return new Gyruss.CosmicSerpent();
      case 1: return new Gyruss.StarDestroyer();
      case 2: return new Gyruss.GalacticCore();
      default: return new Gyruss.CosmicSerpent();
    }
  },

  initStarfield(count) {
    this.stars.length = 0;
    for (let i = 0; i < count; i++) {
      const starType = Math.random();
      let type, size, brightness, twinkleSpeed;
      
      if (starType < 0.6) {
        type = 'tiny';
        size = Gyruss.Utils.rand(0.5, 1.5);
        brightness = Gyruss.Utils.rand(0.4, 0.8);
        twinkleSpeed = Gyruss.Utils.rand(1, 3);
      } else if (starType < 0.85) {
        type = 'normal';
        size = Gyruss.Utils.rand(1, 2.5);
        brightness = Gyruss.Utils.rand(0.6, 1.0);
        twinkleSpeed = Gyruss.Utils.rand(2, 4);
      } else if (starType < 0.96) {
        type = 'bright';
        size = Gyruss.Utils.rand(2, 4);
        brightness = Gyruss.Utils.rand(0.8, 1.0);
        twinkleSpeed = Gyruss.Utils.rand(1, 2);
      } else {
        type = 'brilliant';
        size = Gyruss.Utils.rand(3, 6);
        brightness = 1.0;
        twinkleSpeed = Gyruss.Utils.rand(0.5, 1.5);
      }
      
      this.stars.push({
        angle: Gyruss.Utils.rand(0, Gyruss.C.TWO_PI),
        radius: Gyruss.Utils.rand(1, Gyruss.C.WIDTH * 0.5),
        speed: Gyruss.Utils.rand(14, 64),
        parallax: Gyruss.Utils.rand(0.35, 1),
        color: Math.random() > 0.6 ? '#a4dfff' : (Math.random() > 0.5 ? '#ffeab9' : '#ffffff'),
        type: type,
        size: size,
        brightness: brightness,
        twinkleSpeed: twinkleSpeed,
        twinklePhase: Math.random() * Gyruss.C.TWO_PI
      });
    }
  },

  update(dt) {
    this.worldTime += dt;
    
    // Stars
    this.stars.forEach(s => {
      const warpFactor = this.state === 'warp' ? 15 : 1;
      s.radius += s.speed * dt * warpFactor * s.parallax;
      if (s.radius > Gyruss.C.WIDTH * 0.5) {
        s.radius = Gyruss.Utils.rand(1, 40);
        s.angle = Gyruss.Utils.rand(0, Gyruss.C.TWO_PI);
      }
    });

    // Quick warp for testing
    if (this.keysPressed['KeyW']) this.triggerWarp();
    // Skip to boss for testing - works in any state now
    if (this.keysPressed['KeyB']) this.skipToBoss();
    // Missile firing - improved responsiveness
    if (this.keysPressed['KeyM'] && this.player) this.player.fireMissile();
    
    if (this.state === 'attract') return;

    if (this.player) this.player.update(dt);
    if (this.state === 'gameover') this.gameOverTimer += dt;
    if (this.state === 'victory') this.gameOverTimer += dt;

    const updateAndFilter = (arr, ...args) => {
      for (let i = arr.length - 1; i >= 0; i--) if (!arr[i].update(dt, ...args)) arr.splice(i, 1);
    };
    updateAndFilter(this.bullets);
    updateAndFilter(this.missiles);
    updateAndFilter(this.particles);
    updateAndFilter(this.satellites);
    const playerPos = this.player ? Gyruss.Utils.polarToCartesian(this.player.angle, Gyruss.C.PLAYER_ORBIT_RADIUS) : null;
    updateAndFilter(this.enemyBullets);
    updateAndFilter(this.enemies, playerPos);
    
    if (this.boss) this.boss.update(dt, playerPos);

    // Spawning logic
    if ((this.state === 'playing' || this.state === 'bonus') && this.enemies.length === 0 && this.satellites.length === 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        if (this.state === 'playing') {
          if (this.wave % 3 === 0) {
            // Check if we need to spawn satellites or if we've completed the satellite phase
            if (this.satelliteWavesCompleted < 3 && this.satellites.length === 0) {
              this.spawnSatelliteWave();
              this.satelliteWavesCompleted++;
            } else if (this.satelliteWavesCompleted >= 3 || this.satellitesDestroyed >= this.satellitesInCurrentWave) {
              this.satelliteWavesCompleted = 0;
              this.triggerWarp();
            }
          } else {
            this.spawnNextWave();
          }
        } else { // Bonus stage cleared
          this.triggerWarp();
        }
        this.spawnTimer = 2.0;
      }
    }

    // Collision detection
    if (this.player) {
      const playerHitboxSizeSq = (Gyruss.C.PLAYER_SIZE * 0.8)**2;
      // Enemy bullets vs player
      if (this.player.hitTimer <= 0) {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
          if (Gyruss.Utils.distSq(playerPos.x, playerPos.y, this.enemyBullets[i].x, this.enemyBullets[i].y) < playerHitboxSizeSq) {
            this.player.handleHit();
            this.enemyBullets.splice(i, 1);
            break;
          }
        }
      }
      // Enemies vs player
      if (this.player.hitTimer <= 0 && this.state !== 'bonus') {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemyPos = this.enemies[i].getPos();
          if (Gyruss.Utils.distSq(playerPos.x, playerPos.y, enemyPos.x, enemyPos.y) < (Gyruss.C.PLAYER_SIZE + 12)**2) {
            this.player.handleHit();
            this.spawnExplosion(enemyPos.x, enemyPos.y, this.enemies[i].color, 20);
            this.enemies.splice(i, 1);
            break;
          }
        }
      }
    }

    // Player bullets vs entities
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let bulletHit = false;
      const bulletPos = Gyruss.Utils.polarToCartesian(this.bullets[i].angle, this.bullets[i].radius);

      const checkHit = (entity, sizeSq, onHit) => {
        if (bulletHit) return;
        const entityPos = entity.getPos();
        if (Gyruss.Utils.distSq(bulletPos.x, bulletPos.y, entityPos.x, entityPos.y) < sizeSq) {
          onHit(entity, entityPos);
          this.bullets.splice(i, 1);
          bulletHit = true;
        }
      };

      // vs Enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        checkHit(this.enemies[j], (18*18), (enemy, pos) => {
          if (enemy.takeDamage()) {
            this.score += enemy.points;
            this.spawnExplosion(pos.x, pos.y, enemy.color, 15);
            this.enemies.splice(j, 1);
          } else {
            Gyruss.Audio.sfx.play('hit');
          }
        });
      }
      
      // vs Satellites
      for (let j = this.satellites.length - 1; j >= 0; j--) {
        checkHit(this.satellites[j], 15 * 15, (sat, pos) => {
          this.score += sat.points;
          this.satellitesDestroyed++;
          if (sat.isPowerUp) {
            Gyruss.Audio.sfx.play('powerUp'); // Power-up pickup sound
            if (sat.powerUpType in Gyruss.C.WEAPONS) {
              // Weapon upgrades are now permanent until life loss or satellite phase reset
              this.player.setWeapon(sat.powerUpType);
            } else {
              this.player.applyUpgrade(sat.powerUpType);
            }
          }
          this.spawnExplosion(pos.x, pos.y, sat.isPowerUp ? sat.color : '#ffffff', 25);
          this.satellites.splice(j, 1);
          if (this.satellites.length === 0 && this.enemies.length === 0 &&
              (this.state === 'playing' || this.state === 'bonus')) {
            this.spawnTimer = Math.min(this.spawnTimer, 0.15);
          }
        });
      }

      // vs Boss
      if (this.boss && !bulletHit) {
        const hitResult = this.boss.checkBulletCollision(bulletPos.x, bulletPos.y);
        if (hitResult.hit) {
          this.boss.takeDamage(hitResult.segmentIndex, this.bullets[i].damage || 1);
          Gyruss.Audio.sfx.play('hit');
          this.bullets.splice(i, 1);
          bulletHit = true;
        }
      }
    }
    this.keysPressed = {};
  },

  drawUI() {
    this.ctx.fillStyle = '#a9bcd0';
    this.ctx.font = '20px "Segoe UI", Tahoma, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE ${this.score.toString().padStart(6, '0')}`, 24, 34);

    this.ctx.textAlign = 'right';
    if (this.player) {
      this.ctx.fillText(`LIVES ${this.player.lives}`, Gyruss.C.WIDTH - 24, 34);
      
      // Show active weapon and upgrades
      let y = 64;
      if (this.player.currentWeapon.id !== 'laser') {
        this.ctx.fillStyle = this.player.currentWeapon.color;
        this.ctx.fillText(this.player.currentWeapon.id.toUpperCase(), Gyruss.C.WIDTH - 24, y);
        y += 25;
      }
      for (const [upgrade, timeLeft] of this.player.activeUpgrades) {
        const upgrade_def = Gyruss.C.UPGRADES[upgrade.toUpperCase()];
        if (upgrade_def) {
          this.ctx.fillStyle = upgrade_def.color || '#a9bcd0';
          this.ctx.fillText(`${upgrade.toUpperCase()} ${Math.ceil(timeLeft)}s`, Gyruss.C.WIDTH - 24, y);
          y += 25;
        }
      }
    }

    if (this.state !== 'attract' && this.state !== 'gameover' && this.state !== 'victory') {
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${this.warpsToPlanet} WARPS TO ${Gyruss.C.PLANETS[this.planetIndex]}`, Gyruss.C.CX, 34);
    }
    
    if (this.state === 'warp') {
      const progress = Math.min(1, this.worldTime / 2.6);
      
      // Warp tunnel effect
      this.ctx.fillStyle = `rgba(110, 210, 255, ${0.35 + 0.25 * Math.sin(progress * Math.PI)})`;
      this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
      
      // Show destination planet
      if (progress > 0.3 && this.planetIndex < Gyruss.C.PLANETS.length) {
        const planetProgress = Math.min(1, (progress - 0.3) / 0.7);
        this.drawPlanet(Gyruss.C.PLANETS[this.planetIndex], planetProgress);
        
        // Planet name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '32px "Segoe UI", Tahoma, sans-serif';
        this.ctx.globalAlpha = planetProgress;
        this.ctx.fillText(Gyruss.C.PLANETS[this.planetIndex], Gyruss.C.CX, Gyruss.C.CY + 200);
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
      }
      
      // Warp text
      this.ctx.fillStyle = '#e9fbff';
      this.ctx.textAlign = 'center';
      this.ctx.font = '36px "Segoe UI", Tahoma, sans-serif';
      this.ctx.fillText('W A R P', Gyruss.C.CX, Gyruss.C.CY - 100 + 200 * (1-progress));
    } else if (this.state === 'bonus') {
      this.ctx.fillStyle = '#e9fbff';
      this.ctx.textAlign = 'center';
      this.ctx.font = '36px "Segoe UI", Tahoma, sans-serif';
      this.ctx.fillText('BONUS STAGE', Gyruss.C.CX, Gyruss.C.CY);
    } else if (this.state === 'attract') {
      this.drawCenteredText('GYRUSS', 60, -80);
      this.drawCenteredText('HTML5 v6.6', 30, -30);
      this.drawCenteredText('Press Fire to Start', 22, 50, '#ffeab9');
    } else if (this.state === 'gameover') {
      this.drawCenteredText('GAME OVER', 60, -40);
      if (this.gameOverTimer > 1) this.drawCenteredText('Press Fire to Restart', 22, 20, '#ffeab9');
    } else if (this.state === 'victory') {
      this.drawCenteredText('VICTORY', 60, -40);
      this.drawCenteredText(`FINAL SCORE: ${this.score}`, 30, 0);
      if (this.gameOverTimer > 1) this.drawCenteredText('Press Fire to Play Again', 22, 40, '#ffeab9');
    }
  },

  drawCenteredText(text, size, yOffset, color = '#ffffff') {
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px "Segoe UI", Tahoma, sans-serif`;
    this.ctx.fillText(text, Gyruss.C.CX, Gyruss.C.CY + yOffset);
  },

  drawPlanet(planetName, progress) {
    const ctx = this.ctx;
    const centerX = Gyruss.C.CX;
    const centerY = Gyruss.C.CY;
    const baseSize = 150;
    const size = baseSize * (0.5 + progress * 0.5);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    switch(planetName) {
      case 'Neptune':
        // Blue ice giant
        const neptuneGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        neptuneGrad.addColorStop(0, '#87ceeb');
        neptuneGrad.addColorStop(0.6, '#4682b4');
        neptuneGrad.addColorStop(1, '#191970');
        ctx.fillStyle = neptuneGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Storm patterns
        ctx.strokeStyle = '#6495ed';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 3; i++) {
          const stormY = (i - 1) * size * 0.4;
          ctx.beginPath();
          ctx.ellipse(0, stormY, size * 0.8, size * 0.15, 0, 0, Gyruss.C.TWO_PI);
          ctx.stroke();
        }
        break;
        
      case 'Uranus':
        // Pale blue-green with rings
        const uranusGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        uranusGrad.addColorStop(0, '#e0ffff');
        uranusGrad.addColorStop(0.6, '#40e0d0');
        uranusGrad.addColorStop(1, '#008b8b');
        ctx.fillStyle = uranusGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Vertical rings (unique to Uranus)
        ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = '#b0e0e6';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 5; i++) {
          const ringR = size * (1.2 + i * 0.1);
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR, ringR * 0.1, 0, 0, Gyruss.C.TWO_PI);
          ctx.stroke();
        }
        break;
        
      case 'Saturn':
        // Golden planet with prominent rings
        const saturnGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        saturnGrad.addColorStop(0, '#ffd700');
        saturnGrad.addColorStop(0.6, '#daa520');
        saturnGrad.addColorStop(1, '#b8860b');
        ctx.fillStyle = saturnGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Atmospheric bands
        ctx.strokeStyle = '#ffdf80';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 4; i++) {
          const bandY = (i - 1.5) * size * 0.3;
          ctx.beginPath();
          ctx.ellipse(0, bandY, size * 0.9, size * 0.1, 0, 0, Gyruss.C.TWO_PI);
          ctx.stroke();
        }
        
        // Famous rings
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 7; i++) {
          const ringR = size * (1.3 + i * 0.08);
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR, ringR * 0.15, 0, 0, Gyruss.C.TWO_PI);
          ctx.stroke();
        }
        break;
        
      case 'Jupiter':
        // Giant with Great Red Spot
        const jupiterGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        jupiterGrad.addColorStop(0, '#fff8dc');
        jupiterGrad.addColorStop(0.4, '#daa520');
        jupiterGrad.addColorStop(0.8, '#cd853f');
        jupiterGrad.addColorStop(1, '#8b4513');
        ctx.fillStyle = jupiterGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Bands
        ctx.strokeStyle = '#f4a460';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 6; i++) {
          const bandY = (i - 2.5) * size * 0.25;
          ctx.beginPath();
          ctx.ellipse(0, bandY, size * 0.95, size * 0.08, 0, 0, Gyruss.C.TWO_PI);
          ctx.stroke();
        }
        
        // Great Red Spot
        const spotGrad = ctx.createRadialGradient(size * 0.3, size * 0.2, 0, size * 0.3, size * 0.2, size * 0.3);
        spotGrad.addColorStop(0, '#ff6347');
        spotGrad.addColorStop(1, '#8b0000');
        ctx.fillStyle = spotGrad;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(size * 0.3, size * 0.2, size * 0.25, size * 0.15, 0, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        break;
        
      case 'Mars':
        // Red planet
        const marsGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        marsGrad.addColorStop(0, '#ffa07a');
        marsGrad.addColorStop(0.6, '#cd5c5c');
        marsGrad.addColorStop(1, '#8b0000');
        ctx.fillStyle = marsGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Surface features
        ctx.fillStyle = '#a0522d';
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Gyruss.C.TWO_PI;
          const dist = Gyruss.Utils.rand(size * 0.3, size * 0.8);
          const featureSize = Gyruss.Utils.rand(5, 15);
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, featureSize, 0, Gyruss.C.TWO_PI);
          ctx.fill();
        }
        
        // Polar ice cap
        ctx.fillStyle = '#f0f8ff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, -size * 0.7, size * 0.2, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        break;
        
      case 'Earth':
        // Blue marble
        const earthGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        earthGrad.addColorStop(0, '#87ceeb');
        earthGrad.addColorStop(0.6, '#4682b4');
        earthGrad.addColorStop(1, '#191970');
        ctx.fillStyle = earthGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Continents
        ctx.fillStyle = '#228b22';
        ctx.globalAlpha = 0.8;
        const continents = [
          {x: -size * 0.4, y: size * 0.2, w: size * 0.6, h: size * 0.4},
          {x: size * 0.1, y: -size * 0.3, w: size * 0.4, h: size * 0.5},
          {x: -size * 0.2, y: -size * 0.6, w: size * 0.3, h: size * 0.3}
        ];
        
        continents.forEach(cont => {
          ctx.beginPath();
          ctx.ellipse(cont.x, cont.y, cont.w / 2, cont.h / 2, 0, 0, Gyruss.C.TWO_PI);
          ctx.fill();
        });
        
        // Clouds
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Gyruss.C.TWO_PI;
          const dist = Gyruss.Utils.rand(size * 0.4, size * 0.9);
          const cloudSize = Gyruss.Utils.rand(8, 20);
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, cloudSize, 0, Gyruss.C.TWO_PI);
          ctx.fill();
        }
        break;
        
      default: // THE CORE
        // Dark mechanical structure
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#ff6600');
        coreGrad.addColorStop(0.6, '#cc3300');
        coreGrad.addColorStop(1, '#000000');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        
        // Mechanical details
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        const spokes = 16;
        for (let i = 0; i < spokes; i++) {
          const angle = (i / spokes) * Gyruss.C.TWO_PI;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * size * 0.3, Math.sin(angle) * size * 0.3);
          ctx.lineTo(Math.cos(angle) * size * 0.9, Math.sin(angle) * size * 0.9);
          ctx.stroke();
        }
        
        // Concentric rings
        for (let r = 0.4; r <= 0.8; r += 0.2) {
          ctx.beginPath();
          ctx.arc(0, 0, size * r, 0, Gyruss.C.TWO_PI);
          ctx.stroke();
        }
        break;
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  draw() {
    // Enhanced deep space background
    const bgGrad = this.ctx.createRadialGradient(Gyruss.C.CX, Gyruss.C.CY, 0, Gyruss.C.CX, Gyruss.C.CY, Gyruss.C.WIDTH);
    bgGrad.addColorStop(0, '#0f0f2a');
    bgGrad.addColorStop(0.3, '#0a0a20');
    bgGrad.addColorStop(0.7, '#050510');
    bgGrad.addColorStop(1, '#000000');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);

    // Animated nebula effects with color cycling
    this.ctx.save();
    const nebulaTime = this.worldTime * 0.3;
    
    // Central red nova - arcade-style background glow (most prominent)
    const novaAlpha = 0.25 + Math.sin(nebulaTime * 0.5) * 0.08;
    this.ctx.globalAlpha = novaAlpha;
    const novaGrad = this.ctx.createRadialGradient(
      Gyruss.C.CX, Gyruss.C.CY, 0,
      Gyruss.C.CX, Gyruss.C.CY, 550
    );
    novaGrad.addColorStop(0, '#660000');
    novaGrad.addColorStop(0.3, '#440000');
    novaGrad.addColorStop(0.6, '#220000');
    novaGrad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = novaGrad;
    this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    
    // Primary nebula - red/orange with animation (secondary layer)
    const nebula1Alpha = 0.06 + Math.sin(nebulaTime) * 0.02;
    this.ctx.globalAlpha = nebula1Alpha;
    const nebulaGrad1 = this.ctx.createRadialGradient(
      Gyruss.C.CX * 0.25 + Math.cos(nebulaTime * 0.5) * 30, 
      Gyruss.C.CY * 0.3 + Math.sin(nebulaTime * 0.7) * 20, 0,
      Gyruss.C.CX * 0.25, Gyruss.C.CY * 0.3, 350
    );
    nebulaGrad1.addColorStop(0, '#ff6644');
    nebulaGrad1.addColorStop(0.3, '#ff4422');
    nebulaGrad1.addColorStop(0.7, '#cc2200');
    nebulaGrad1.addColorStop(1, 'transparent');
    this.ctx.fillStyle = nebulaGrad1;
    this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    
    // Secondary nebula - blue/purple with animation
    const nebula2Alpha = 0.06 + Math.sin(nebulaTime * 1.3) * 0.02;
    this.ctx.globalAlpha = nebula2Alpha;
    const nebulaGrad2 = this.ctx.createRadialGradient(
      Gyruss.C.CX * 1.8 + Math.cos(nebulaTime * 0.8) * 40, 
      Gyruss.C.CY * 0.7 + Math.sin(nebulaTime * 0.6) * 35, 0,
      Gyruss.C.CX * 1.8, Gyruss.C.CY * 0.7, 280
    );
    nebulaGrad2.addColorStop(0, '#6644ff');
    nebulaGrad2.addColorStop(0.4, '#4422cc');
    nebulaGrad2.addColorStop(0.8, '#220088');
    nebulaGrad2.addColorStop(1, 'transparent');
    this.ctx.fillStyle = nebulaGrad2;
    this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    
    // Tertiary nebula - green/teal accent
    const nebula3Alpha = 0.04 + Math.sin(nebulaTime * 0.9) * 0.015;
    this.ctx.globalAlpha = nebula3Alpha;
    const nebulaGrad3 = this.ctx.createRadialGradient(
      Gyruss.C.CX * 0.1 + Math.cos(nebulaTime * 1.1) * 25, 
      Gyruss.C.CY * 1.6 + Math.sin(nebulaTime * 0.4) * 30, 0,
      Gyruss.C.CX * 0.1, Gyruss.C.CY * 1.6, 200
    );
    nebulaGrad3.addColorStop(0, '#44ff88');
    nebulaGrad3.addColorStop(0.5, '#22cc44');
    nebulaGrad3.addColorStop(1, 'transparent');
    this.ctx.fillStyle = nebulaGrad3;
    this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    
    this.ctx.restore();

    // Enhanced multi-type starfield
    this.ctx.save();
    this.ctx.translate(Gyruss.C.CX, Gyruss.C.CY);
    const warpIntensity = this.state === 'warp' ? Math.min(1, this.worldTime / 1.5) : 0;
    
    this.stars.forEach((s, index) => {
      const pos = Gyruss.Utils.polarToCartesian(s.angle, s.radius);
      const baseSize = s.size * s.parallax * (1 + warpIntensity * 12);
      const twinkle = s.brightness * (0.6 + 0.4 * Math.sin(s.twinklePhase + this.worldTime * s.twinkleSpeed));
      
      this.ctx.globalAlpha = twinkle;
      const starX = pos.x - Gyruss.C.CX;
      const starY = pos.y - Gyruss.C.CY;
      
      switch(s.type) {
        case 'tiny':
          this.ctx.fillStyle = s.color;
          this.ctx.fillRect(starX - baseSize/2, starY - baseSize/2, baseSize, baseSize);
          break;
          
        case 'normal':
          const normalGrad = this.ctx.createRadialGradient(starX, starY, 0, starX, starY, baseSize * 1.5);
          normalGrad.addColorStop(0, '#ffffff');
          normalGrad.addColorStop(0.3, s.color);
          normalGrad.addColorStop(1, 'transparent');
          this.ctx.fillStyle = normalGrad;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, baseSize * 1.5, 0, Gyruss.C.TWO_PI);
          this.ctx.fill();
          break;
          
        case 'bright':
          // Core
          this.ctx.fillStyle = '#ffffff';
          this.ctx.shadowBlur = 6;
          this.ctx.shadowColor = s.color;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, baseSize * 0.8, 0, Gyruss.C.TWO_PI);
          this.ctx.fill();
          
          // Glow
          const brightGrad = this.ctx.createRadialGradient(starX, starY, 0, starX, starY, baseSize * 2.5);
          brightGrad.addColorStop(0, s.color);
          brightGrad.addColorStop(0.4, s.color + '80');
          brightGrad.addColorStop(1, 'transparent');
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = brightGrad;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, baseSize * 2.5, 0, Gyruss.C.TWO_PI);
          this.ctx.fill();
          break;
          
        case 'brilliant':
          // Spectacular star with cross rays and intense glow
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = s.color;
          
          // Core
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, baseSize, 0, Gyruss.C.TWO_PI);
          this.ctx.fill();
          
          // Cross rays
          this.ctx.strokeStyle = s.color;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          const rayLength = baseSize * 4;
          this.ctx.moveTo(starX - rayLength, starY);
          this.ctx.lineTo(starX + rayLength, starY);
          this.ctx.moveTo(starX, starY - rayLength);
          this.ctx.lineTo(starX, starY + rayLength);
          this.ctx.moveTo(starX - rayLength * 0.7, starY - rayLength * 0.7);
          this.ctx.lineTo(starX + rayLength * 0.7, starY + rayLength * 0.7);
          this.ctx.moveTo(starX - rayLength * 0.7, starY + rayLength * 0.7);
          this.ctx.lineTo(starX + rayLength * 0.7, starY - rayLength * 0.7);
          this.ctx.stroke();
          
          // Intense outer glow
          this.ctx.shadowBlur = 0;
          const brilliantGrad = this.ctx.createRadialGradient(starX, starY, 0, starX, starY, baseSize * 4);
          brilliantGrad.addColorStop(0, s.color + 'FF');
          brilliantGrad.addColorStop(0.2, s.color + 'CC');
          brilliantGrad.addColorStop(0.6, s.color + '40');
          brilliantGrad.addColorStop(1, 'transparent');
          this.ctx.fillStyle = brilliantGrad;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, baseSize * 4, 0, Gyruss.C.TWO_PI);
          this.ctx.fill();
          break;
      }
      
      this.ctx.shadowBlur = 0;
    });
    
    this.ctx.restore();
    this.ctx.globalAlpha = 1;

    // Enhanced orbit ring with glow effect
    const ringGrad = this.ctx.createLinearGradient(0, Gyruss.C.CY - Gyruss.C.PLAYER_ORBIT_RADIUS, 0, Gyruss.C.CY + Gyruss.C.PLAYER_ORBIT_RADIUS);
    ringGrad.addColorStop(0, '#1a2f50');
    ringGrad.addColorStop(0.5, '#2a4f80');
    ringGrad.addColorStop(1, '#1a2f50');
    
    this.ctx.strokeStyle = ringGrad;
    this.ctx.lineWidth = 3;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#2a4f80';
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.arc(Gyruss.C.CX, Gyruss.C.CY, Gyruss.C.PLAYER_ORBIT_RADIUS, 0, Gyruss.C.TWO_PI);
    this.ctx.stroke();
    
    // Inner highlight ring
    this.ctx.strokeStyle = '#4080cc';
    this.ctx.lineWidth = 1;
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = '#4080cc';
    this.ctx.globalAlpha = 0.4;
    this.ctx.beginPath();
    this.ctx.arc(Gyruss.C.CX, Gyruss.C.CY, Gyruss.C.PLAYER_ORBIT_RADIUS - 2, 0, Gyruss.C.TWO_PI);
    this.ctx.stroke();
    
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    // Entities
    if (this.player && this.state !== 'attract') this.player.draw(this.ctx);
    if (this.boss) this.boss.draw(this.ctx);
    
    const drawAll = (arr) => arr.forEach(e => e.draw(this.ctx));
    drawAll(this.enemies);
    drawAll(this.bullets);
    for (let m of this.missiles) m.draw(this.ctx);
    drawAll(this.satellites);
    drawAll(this.enemyBullets);
    
    this.ctx.globalCompositeOperation = 'lighter';
    drawAll(this.particles);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;

    // UI & Text
    this.drawUI();
  },

  loop(time) {
    const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }
};

// Start game when window loads
window.addEventListener('load', () => Gyruss.Game.init());