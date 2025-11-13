// --- GAME ENTITIES ---
window.Gyruss = window.Gyruss || {};

Gyruss.Player = class Player {
  constructor() { this.reset(); }
  reset() {
    this.angle = -Math.PI / 2;
    this.speed = 3.2;
    this.missileCooldown = 0;
    this.fireTimer = 0;
    this.lives = 5;
    this.hitTimer = 2.5;
    this.invulnerable = false;
    this.blinkTimer = 0;
    
    // Weapon system
    this.currentWeapon = Gyruss.C.WEAPONS.LASER;
    this.weaponTimer = 0;
    
    // Upgrade system
    this.activeUpgrades = new Map();
    this.shieldActive = false;
    this.rapidFireMultiplier = 1;
  }
  
  update(dt) {
    let moveDir = 0;
    if (Gyruss.Game.keysDown['ArrowLeft'] || Gyruss.Game.keysDown['KeyA']) moveDir = -1;
    if (Gyruss.Game.keysDown['ArrowRight'] || Gyruss.Game.keysDown['KeyD']) moveDir = 1;
    this.angle = Gyruss.Utils.wrapAngle(this.angle + moveDir * this.speed * dt);

    // Update weapon and upgrade timers
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.missileCooldown > 0) this.missileCooldown -= dt;
    if (this.weaponTimer > 0) {
      this.weaponTimer -= dt;
      if (this.weaponTimer <= 0) {
        this.currentWeapon = Gyruss.C.WEAPONS.LASER;
      }
    }

    // Update active upgrades
    for (const [upgrade, timeLeft] of this.activeUpgrades.entries()) {
      const newTime = timeLeft - dt;
      if (newTime <= 0) {
        this.activeUpgrades.delete(upgrade);
        if (upgrade === 'shield') this.shieldActive = false;
        if (upgrade === 'rapid_fire') this.rapidFireMultiplier = 1;
      } else {
        this.activeUpgrades.set(upgrade, newTime);
      }
    }

    // Handle firing
    if (Gyruss.Game.keysDown['Space'] && this.fireTimer <= 0 &&
        (Gyruss.Game.state === 'playing' || Gyruss.Game.state === 'bonus' || Gyruss.Game.state === 'boss')) {
      this.fire();
    }

    if (this.hitTimer > 0) this.hitTimer = Math.max(0, this.hitTimer - dt);
    this.blinkTimer += dt * 8;
  }

  fireMissile() {
    if (this.missileCooldown > 0 || !(Gyruss.Game.state === 'playing' || Gyruss.Game.state === 'bonus')) return;
    Gyruss.Audio.sfx.play('laser');
    this.missileCooldown = 2.5;
    Gyruss.Game.missiles.push(new Gyruss.Missile(this.angle));
  }

  fire() {
    Gyruss.Audio.sfx.play('laser');
    const weapon = this.currentWeapon;
    this.fireTimer = weapon.cooldown / this.rapidFireMultiplier;
    const spawnRadius = Gyruss.C.PLAYER_ORBIT_RADIUS - 15;

    if (this.activeUpgrades.has('triple_shot')) {
      // Triple shot pattern
      const spread = weapon.spreadAngle || 0.1;
      Gyruss.Game.bullets.push(new Gyruss.Bullet(this.angle, spawnRadius, weapon));
      Gyruss.Game.bullets.push(new Gyruss.Bullet(this.angle - spread, spawnRadius, weapon));
      Gyruss.Game.bullets.push(new Gyruss.Bullet(this.angle + spread, spawnRadius, weapon));
    } else {
      // Single shot
      Gyruss.Game.bullets.push(new Gyruss.Bullet(this.angle, spawnRadius, weapon));
    }
  }

  handleHit() {
    if (this.hitTimer > 0 || this.invulnerable || this.shieldActive) return;
    this.lives--;
    this.hitTimer = 2.5;
    this.weaponTimer = 0;
    this.currentWeapon = Gyruss.C.WEAPONS.LASER;
    this.activeUpgrades.clear();
    this.rapidFireMultiplier = 1;
    this.shieldActive = false;
    Gyruss.Audio.sfx.play('hit');
    if (this.lives <= 0) Gyruss.Game.triggerGameOver();
  }

  applyUpgrade(type) {
    const upgrade = Gyruss.C.UPGRADES[type];
    if (!upgrade) return;

    this.activeUpgrades.set(upgrade.id, upgrade.duration);

    switch (upgrade.id) {
      case 'shield':
        this.shieldActive = true;
        break;
      case 'rapid_fire':
        this.rapidFireMultiplier = upgrade.multiplier;
        break;
      case 'triple_shot':
        // Handled in fire() method
        break;
    }
  }

  setWeapon(type) {
    const weapon = Gyruss.C.WEAPONS[type];
    if (!weapon) return;
    this.currentWeapon = weapon;
    this.weaponTimer = 15; // 15 seconds for special weapons
  }

  draw(ctx) {
    const isVisible = this.invulnerable ? true : (this.hitTimer > 0 ? Math.sin(this.blinkTimer) > 0 : true);
    if (!isVisible) return;

    const pos = Gyruss.Utils.polarToCartesian(this.angle, Gyruss.C.PLAYER_ORBIT_RADIUS);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Thruster
    const thrusterSize = Gyruss.C.PLAYER_SIZE * (0.8 + Math.random() * 0.4);
    const thrustGrad = ctx.createLinearGradient(0, Gyruss.C.PLAYER_SIZE * 0.5, 0, Gyruss.C.PLAYER_SIZE * 0.5 + thrusterSize);
    thrustGrad.addColorStop(0, '#6bf3ff');
    thrustGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = thrustGrad;
    ctx.beginPath();
    ctx.moveTo(0, Gyruss.C.PLAYER_SIZE * 0.5);
    ctx.lineTo(-Gyruss.C.PLAYER_SIZE * 0.4, Gyruss.C.PLAYER_SIZE * 0.5 + thrusterSize);
    ctx.lineTo(Gyruss.C.PLAYER_SIZE * 0.4, Gyruss.C.PLAYER_SIZE * 0.5 + thrusterSize);
    ctx.closePath();
    ctx.fill();

    // Hull
    const hullGrad = ctx.createLinearGradient(-Gyruss.C.PLAYER_SIZE, 0, Gyruss.C.PLAYER_SIZE, 0);
    hullGrad.addColorStop(0, '#00ffaa');
    hullGrad.addColorStop(0.5, '#ffffff');
    hullGrad.addColorStop(1, '#00ffaa');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(0, -Gyruss.C.PLAYER_SIZE);
    ctx.lineTo(Gyruss.C.PLAYER_SIZE * 0.7, Gyruss.C.PLAYER_SIZE * 0.6);
    ctx.lineTo(0, Gyruss.C.PLAYER_SIZE * 0.3);
    ctx.lineTo(-Gyruss.C.PLAYER_SIZE * 0.7, Gyruss.C.PLAYER_SIZE * 0.6);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#00aaff';
    ctx.beginPath();
    ctx.arc(0, 0, Gyruss.C.PLAYER_SIZE * 0.25, 0, Gyruss.C.TWO_PI);
    ctx.fill();

    // Shield and upgrade effects
    if (this.invulnerable || this.shieldActive) {
      ctx.beginPath();
      ctx.arc(0, 0, Gyruss.C.PLAYER_SIZE * 1.2, 0, Gyruss.C.TWO_PI);
      ctx.strokeStyle = this.shieldActive ? Gyruss.C.UPGRADES.SHIELD.color : '#6bf3ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.stroke();
    }

    // Weapon and upgrade indicators
    if (this.currentWeapon.id !== 'laser' || this.activeUpgrades.size > 0) {
      ctx.fillStyle = this.currentWeapon.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.currentWeapon.color;
      ctx.beginPath();
      ctx.arc(0, Gyruss.C.PLAYER_SIZE * 0.8, 4, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }
};

Gyruss.Bullet = class Bullet {
  constructor(angle, radius, weapon) {
    this.angle = angle;
    this.radius = radius;
    this.weapon = weapon || Gyruss.C.WEAPONS.LASER;
    this.speed = this.weapon.speed;
    this.damage = this.weapon.damage;
  }
  
  update(dt) {
    this.radius -= this.speed * dt;
    return this.radius > 20;
  }
  
  draw(ctx) {
    ctx.save();
    const pos = Gyruss.Utils.polarToCartesian(this.angle, this.radius);
    
    if (this.weapon.id === 'plasma') {
      // Plasma ball effect
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 8);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, this.weapon.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    } else if (this.weapon.id === 'wave') {
      // Wave beam effect
      const tail = Gyruss.Utils.polarToCartesian(this.angle, this.radius + 25);
      const gradient = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, this.weapon.color);
      gradient.addColorStop(1, 'transparent');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
    } else {
      // Default laser
      const tail = Gyruss.Utils.polarToCartesian(this.angle, this.radius + 18);
      ctx.strokeStyle = this.weapon.color;
      ctx.lineWidth = this.weapon.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }
};

Gyruss.Missile = class Missile {
  constructor(angle) {
    this.angle = angle;
    this.radius = Gyruss.C.PLAYER_ORBIT_RADIUS - 15;
    this.speed = -250;
  }
  
  update(dt) {
    this.radius += this.speed * dt;
    if (this.radius <= 6) { this.detonate(); return false; }
    return this.radius > -20;
  }
  
  getPos() { return Gyruss.Utils.polarToCartesian(this.angle, this.radius); }
  
  detonate() {
    const pos = this.getPos();
    const blastR = 60;
    Gyruss.Game.spawnExplosion(pos.x, pos.y, '#ffffaa', 50);
    
    // Damage enemies in radius
    for (let j = Gyruss.Game.enemies.length - 1; j >= 0; j--) {
      const epos = Gyruss.Game.enemies[j].getPos();
      if (Gyruss.Utils.distSq(pos.x, pos.y, epos.x, epos.y) <= blastR*blastR) {
        if (Gyruss.Game.enemies[j].takeDamage()) {
          Gyruss.Game.score += Gyruss.Game.enemies[j].points;
          Gyruss.Game.spawnExplosion(epos.x, epos.y, Gyruss.Game.enemies[j].color, 15);
          Gyruss.Game.enemies.splice(j, 1);
        }
      }
    }
    
    // Also pop satellites in radius
    for (let s = Gyruss.Game.satellites.length - 1; s >= 0; s--) {
      const spos = Gyruss.Game.satellites[s].getPos();
      if (Gyruss.Utils.distSq(pos.x, pos.y, spos.x, spos.y) <= blastR*blastR) {
        Gyruss.Game.score += Gyruss.Game.satellites[s].points;
        if (Gyruss.Game.satellites[s].isPowerUp) Gyruss.Game.player.hasDoubleShot = true;
        Gyruss.Game.spawnExplosion(spos.x, spos.y, Gyruss.Game.satellites[s].isPowerUp ? '#ffff00' : '#ffffff', 20);
        Gyruss.Game.satellites.splice(s, 1);
      }
    }
  }
  
  draw(ctx) {
    const pos = this.getPos();
    ctx.save();
    ctx.fillStyle = '#ffffaa';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffaa';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.restore();
  }
};

Gyruss.EnemyBullet = class EnemyBullet {
  constructor(x, y, targetX, targetY) {
    this.x = x; this.y = y;
    const dx = targetX - x;
    const dy = targetY - y;
    const mag = Math.sqrt(dx*dx + dy*dy);
    this.vx = (dx / mag) * 350;
    this.vy = (dy / mag) * 350;
    this.life = 2.5;
  }
  
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }
  
  draw(ctx) {
    ctx.fillStyle = '#ff8080';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Gyruss.C.TWO_PI);
    ctx.fill();
  }
};

Gyruss.Enemy = class Enemy {
  constructor(config) {
    this.angle = config.angle;
    this.angularSpeed = config.angularSpeed;
    this.radius = config.radius;
    this.targetRadius = config.targetRadius;
    this.loopAmplitude = Gyruss.Utils.rand(38, 120);
    this.loopFrequency = Gyruss.Utils.rand(0.9, 1.6);
    this.loopPhase = Math.random() * Gyruss.C.TWO_PI;
    this.time = 0;
    this.entering = true;
    this.enterSpeed = Gyruss.Utils.rand(120, 180);
    this.type = config.type;
    this.color = Gyruss.C.ENEMY_COLORS[Math.floor(Math.random() * Gyruss.C.ENEMY_COLORS.length)];
    this.health = this.type === 'saucer' ? 2 : 1;
    this.points = this.type === 'saucer' ? 150 : 100;
    this.fireTimer = Gyruss.Utils.rand(1.5, 4.0);
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.angle = Gyruss.Utils.wrapAngle(this.angle + this.angularSpeed * dt);
    if (this.entering) {
      this.radius += this.enterSpeed * dt;
      if (this.radius >= this.targetRadius) {
        this.entering = false;
        this.radius = this.targetRadius;
      }
    } else {
      this.radius = this.targetRadius + Math.sin(this.time * this.loopFrequency + this.loopPhase) * this.loopAmplitude;
    }
    
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && Gyruss.Game.state === 'playing') {
      const pos = this.getPos();
      Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(pos.x, pos.y, playerPos.x, playerPos.y));
      this.fireTimer = Gyruss.Utils.rand(3.0, 5.0);
    }
    return this.radius < Gyruss.C.WIDTH * 0.55;
  }
  
  getPos() { return Gyruss.Utils.polarToCartesian(this.angle, this.radius); }
  
  takeDamage() { this.health--; return this.health <= 0; }
  
  draw(ctx) {
    const pos = this.getPos();
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.health > 1 ? '#fff' : '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.type === 'saucer') {
      ctx.scale(1.2, 0.7);
      ctx.arc(0, 0, 15, 0, Gyruss.C.TWO_PI);
    } else { // fighter
      ctx.moveTo(0, -18); ctx.lineTo(14, 6);
      ctx.lineTo(0, 12); ctx.lineTo(-14, 6);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
};

Gyruss.Satellite = class Satellite {
  constructor(angle, isPowerUp) {
    this.angle = angle;
    this.radius = Gyruss.C.WIDTH * 0.55;
    this.speed = -150;
    this.isPowerUp = isPowerUp;
    this.points = 50;
    this.life = 6;

    if (isPowerUp) {
      // Random upgrade type
      const types = ['SHIELD', 'RAPID_FIRE', 'TRIPLE_SHOT'];
      const weaponTypes = ['PLASMA', 'WAVE'];
      this.powerUpType = Math.random() < 0.6 ? 
        types[Math.floor(Math.random() * types.length)] :
        weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      
      // Set color based on type
      const upgrade = this.powerUpType in Gyruss.C.WEAPONS ? 
        Gyruss.C.WEAPONS[this.powerUpType] : 
        Gyruss.C.UPGRADES[this.powerUpType];
      this.color = upgrade.color || '#ffff00';
    }
  }
  
  update(dt) {
    this.radius += this.speed * dt;
    this.life -= dt;
    return this.life > 0 && this.radius > -20;
  }
  
  getPos() { return Gyruss.Utils.polarToCartesian(this.angle, this.radius); }
  
  draw(ctx) {
    const pos = this.getPos();
    ctx.save();
    ctx.fillStyle = this.isPowerUp ? '#ffff00' : '#cccccc';
    ctx.shadowBlur = this.isPowerUp ? 15 : 5;
    ctx.shadowColor = this.isPowerUp ? '#ffff00' : '#cccccc';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.restore();
  }
};

Gyruss.Particle = class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y; this.color = color;
    this.vx = Gyruss.Utils.rand(-150, 150);
    this.vy = Gyruss.Utils.rand(-150, 150);
    this.life = Gyruss.Utils.rand(0.4, 0.8);
    this.age = 0;
  }
  
  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98; this.vy *= 0.98;
    return this.age < this.life;
  }
  
  draw(ctx) {
    const lifeRatio = 1 - this.age / this.life;
    ctx.globalAlpha = lifeRatio;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2 + lifeRatio * 4, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
};