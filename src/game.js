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
  satelliteChain: 0,

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
    
    // Input handlers
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault();
      if (!this.keysDown[e.code]) this.keysPressed[e.code] = true;
      this.keysDown[e.code] = true;
      this.armAudioAndInput();
      if (e.code === 'KeyM') this.player?.fireMissile();
      if (e.code === 'KeyT') this.player.invulnerable = !this.player.invulnerable;
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
    this.satelliteChain = 0;
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
    this.satelliteChain = 0;
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
          this.boss = new Gyruss.CosmicSerpent();
        } else {
          this.state = 'bonus';
          this.planetIndex++;
          this.warpsToPlanet = 3;
          this.satelliteChain = 0;
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
    for (let i = 0; i < count; i++) this.particles.push(new Gyruss.Particle(x, y, color));
    Gyruss.Audio.sfx.play('explosion');
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
    if (this.state !== 'playing' && this.state !== 'bonus') return;
    this.state = 'boss';
    this.planetIndex = Gyruss.C.PLANETS.length - 1;
    this.warpsToPlanet = 1;
    this.boss = new Gyruss.CosmicSerpent();
    this.enemies.length = this.satellites.length = this.enemyBullets.length = 0;
  },

  initStarfield(count) {
    this.stars.length = 0;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        angle: Gyruss.Utils.rand(0, Gyruss.C.TWO_PI),
        radius: Gyruss.Utils.rand(1, Gyruss.C.WIDTH * 0.5),
        speed: Gyruss.Utils.rand(14, 64),
        parallax: Gyruss.Utils.rand(0.35, 1),
        color: Math.random() > 0.5 ? '#a4dfff' : '#ffeab9'
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
    // Skip to boss for testing
    if (this.keysPressed['KeyB']) this.skipToBoss();
    
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
            if (this.satelliteChain < 3) {
              this.spawnSatelliteWave();
              this.satelliteChain++;
            } else {
              this.satelliteChain = 0;
              this.triggerWarp();
            }
          } else {
            this.satelliteChain = 0;
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
          if (sat.isPowerUp) {
            if (sat.powerUpType in Gyruss.C.WEAPONS) {
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
      if (this.boss) {
        for (let i = 0; i < this.boss.segments.length; i++) {
          if (bulletHit) break;
          const seg = this.boss.segments[i];
          const segPos = Gyruss.Utils.polarToCartesian(seg.angle, seg.radius);
          if (Gyruss.Utils.distSq(bulletPos.x, bulletPos.y, segPos.x, segPos.y) < (seg.isHead ? 25*25 : 15*15)) {
            this.boss.takeDamage(i);
            Gyruss.Audio.sfx.play('hit');
            this.bullets.splice(i, 1);
            bulletHit = true;
          }
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
      
      // Show active upgrades
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
      this.ctx.fillStyle = `rgba(110, 210, 255, ${0.35 + 0.25 * Math.sin(progress * Math.PI)})`;
      this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
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

  draw() {
    // Background
    this.ctx.fillStyle = '#05060b';
    this.ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);

    // Stars
    this.ctx.save();
    this.ctx.translate(Gyruss.C.CX, Gyruss.C.CY);
    const warpIntensity = this.state === 'warp' ? Math.min(1, this.worldTime / 1.5) : 0;
    this.stars.forEach(s => {
      const pos = Gyruss.Utils.polarToCartesian(s.angle, s.radius);
      const size = s.parallax * (1 + warpIntensity * 8);
      this.ctx.fillStyle = s.color;
      this.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.angle + this.worldTime * (1 + s.parallax));
      this.ctx.fillRect(pos.x - Gyruss.C.CX - size / 2, pos.y - Gyruss.C.CY - size / 2, size, size);
    });
    this.ctx.restore();
    this.ctx.globalAlpha = 1;

    // Orbit Ring
    this.ctx.strokeStyle = '#0f1f40';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(Gyruss.C.CX, Gyruss.C.CY, Gyruss.C.PLAYER_ORBIT_RADIUS, 0, Gyruss.C.TWO_PI);
    this.ctx.stroke();

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