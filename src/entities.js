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

    // Update timers
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.missileCooldown > 0) this.missileCooldown -= dt;

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
    const weapon = this.currentWeapon;
    
    // Play weapon-specific sound effects
    if (weapon === Gyruss.C.WEAPONS.PLASMA) {
      Gyruss.Audio.sfx.play('plasma');
    } else if (weapon === Gyruss.C.WEAPONS.WAVE) {
      Gyruss.Audio.sfx.play('wave');
    } else {
      Gyruss.Audio.sfx.play('laser');
    }
    
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
    
    // Only reset weapons if NOT invulnerable (T-key test mode should preserve weapons)
    if (!this.invulnerable) {
      this.currentWeapon = Gyruss.C.WEAPONS.LASER;
      this.activeUpgrades.clear();
      this.rapidFireMultiplier = 1;
      this.shieldActive = false;
    }
    
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
  }

  draw(ctx) {
    const isVisible = this.invulnerable ? true : (this.hitTimer > 0 ? Math.sin(this.blinkTimer) > 0 : true);
    if (!isVisible) return;

    const pos = Gyruss.Utils.polarToCartesian(this.angle, Gyruss.C.PLAYER_ORBIT_RADIUS);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(this.angle + Math.PI / 2);

    const size = Gyruss.C.PLAYER_SIZE;
    const time = Gyruss.Game.worldTime || 0;

    // Main thruster flames (animated)
    const thrusterIntensity = 0.8 + Math.sin(time * 20) * 0.2;
    const thrusterSize = size * (0.9 + Math.random() * 0.3) * thrusterIntensity;
    
    // Primary thruster
    const thrustGrad1 = ctx.createLinearGradient(0, size * 0.4, 0, size * 0.4 + thrusterSize);
    thrustGrad1.addColorStop(0, '#ffffff');
    thrustGrad1.addColorStop(0.3, '#00d4ff');
    thrustGrad1.addColorStop(0.7, '#0066ff');
    thrustGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = thrustGrad1;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.4);
    ctx.lineTo(-size * 0.25, size * 0.4 + thrusterSize);
    ctx.lineTo(size * 0.25, size * 0.4 + thrusterSize);
    ctx.closePath();
    ctx.fill();

    // Secondary thruster flames
    ctx.fillStyle = '#4dffff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, size * 0.4);
    ctx.lineTo(-size * 0.12, size * 0.4 + thrusterSize * 0.7);
    ctx.lineTo(-size * 0.08, size * 0.4 + thrusterSize * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.4);
    ctx.lineTo(size * 0.12, size * 0.4 + thrusterSize * 0.7);
    ctx.lineTo(size * 0.08, size * 0.4 + thrusterSize * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wing structures with detailed shading
    const wingGrad = ctx.createLinearGradient(-size, 0, size, 0);
    wingGrad.addColorStop(0, '#003366');
    wingGrad.addColorStop(0.3, '#0066cc');
    wingGrad.addColorStop(0.5, '#4daaff');
    wingGrad.addColorStop(0.7, '#0066cc');
    wingGrad.addColorStop(1, '#003366');
    ctx.fillStyle = wingGrad;
    
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.8);
    ctx.lineTo(-size * 0.9, size * 0.1);
    ctx.lineTo(-size * 0.8, size * 0.4);
    ctx.lineTo(-size * 0.4, size * 0.2);
    ctx.closePath();
    ctx.fill();
    
    // Right wing
    ctx.beginPath();
    ctx.moveTo(size * 0.3, -size * 0.8);
    ctx.lineTo(size * 0.9, size * 0.1);
    ctx.lineTo(size * 0.8, size * 0.4);
    ctx.lineTo(size * 0.4, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Wing highlights
    ctx.strokeStyle = '#80ccff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, -size * 0.7);
    ctx.lineTo(-size * 0.75, size * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.35, -size * 0.7);
    ctx.lineTo(size * 0.75, size * 0.05);
    ctx.stroke();

    // Main hull with enhanced gradient
    const hullGrad = ctx.createRadialGradient(0, -size * 0.2, 0, 0, -size * 0.2, size);
    hullGrad.addColorStop(0, '#ffffff');
    hullGrad.addColorStop(0.2, '#80ffcc');
    hullGrad.addColorStop(0.5, '#00cc80');
    hullGrad.addColorStop(0.8, '#006640');
    hullGrad.addColorStop(1, '#003320');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, size * 0.2);
    ctx.lineTo(size * 0.3, size * 0.4);
    ctx.lineTo(0, size * 0.3);
    ctx.lineTo(-size * 0.3, size * 0.4);
    ctx.lineTo(-size * 0.6, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Hull outline and details
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Center line detail
    ctx.strokeStyle = '#80ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.9);
    ctx.lineTo(0, size * 0.2);
    ctx.stroke();

    // Cockpit with glass effect
    const cockpitGrad = ctx.createRadialGradient(-size * 0.1, -size * 0.3, 0, 0, 0, size * 0.3);
    cockpitGrad.addColorStop(0, '#ffffff');
    cockpitGrad.addColorStop(0.3, '#80d4ff');
    cockpitGrad.addColorStop(0.7, '#0080cc');
    cockpitGrad.addColorStop(1, '#004080');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.25, 0, Gyruss.C.TWO_PI);
    ctx.fill();

    // Cockpit highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(-size * 0.08, -size * 0.18, size * 0.08, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Weapon hardpoints
    ctx.fillStyle = this.currentWeapon.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.currentWeapon.color;
    ctx.beginPath();
    ctx.arc(-size * 0.4, size * 0.1, 3, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.4, size * 0.1, 3, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shield and upgrade effects
    if (this.invulnerable || this.shieldActive) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.3, 0, Gyruss.C.TWO_PI);
      ctx.strokeStyle = this.shieldActive ? Gyruss.C.UPGRADES.SHIELD.color : '#6bf3ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.stroke();
      ctx.shadowBlur = 0;
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
    const time = Gyruss.Game.worldTime || 0;
    
    if (this.weapon.id === 'plasma') {
      // Enhanced plasma ball with energy core
      const coreGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 4);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(1, this.weapon.color);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.weapon.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Outer glow
      const glowGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
      glowGrad.addColorStop(0, this.weapon.color);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
    } else if (this.weapon.id === 'wave') {
      // Enhanced wave beam with oscillation
      const tailLength = 30;
      const tail = Gyruss.Utils.polarToCartesian(this.angle, this.radius + tailLength);
      
      // Main beam
      const gradient = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, this.weapon.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.weapon.color;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Side oscillations
      const perpAngle = this.angle + Math.PI / 2;
      const oscillation = Math.sin(time * 10 + this.radius * 0.1) * 3;
      const sideX = Math.cos(perpAngle) * oscillation;
      const sideY = Math.sin(perpAngle) * oscillation;
      
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(pos.x + sideX, pos.y + sideY);
      ctx.lineTo(tail.x + sideX, tail.y + sideY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
    } else {
      // Enhanced default laser with glow and trail
      const tailLength = 22;
      const tail = Gyruss.Utils.polarToCartesian(this.angle, this.radius + tailLength);
      
      // Outer glow
      ctx.strokeStyle = this.weapon.color;
      ctx.lineWidth = this.weapon.size + 4;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.weapon.color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Core beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.weapon.size;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Inner core
      ctx.strokeStyle = this.weapon.color;
      ctx.lineWidth = this.weapon.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
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

    const time = Gyruss.Game.worldTime || 0;
    const pulse = 0.8 + 0.2 * Math.sin(time * 4 + this.angle * 5);

    if (this.type === 'saucer') {
      const size = 15;
      
      // Main saucer body with metallic gradient
      const saucerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
      saucerGrad.addColorStop(0, '#ffffff');
      saucerGrad.addColorStop(0.2, this.color);
      saucerGrad.addColorStop(0.6, this.color);
      saucerGrad.addColorStop(1, '#000000');
      
      ctx.fillStyle = saucerGrad;
      ctx.beginPath();
      ctx.scale(1.2, 0.7);
      ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.scale(1/1.2, 1/0.7);

      // Dome highlight
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.scale(1.2, 0.7);
      ctx.arc(-size * 0.3, -size * 0.2, size * 0.4, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.scale(1/1.2, 1/0.7);
      ctx.globalAlpha = 1;

      // Bottom section
      const bottomGrad = ctx.createLinearGradient(0, 0, 0, size * 0.8);
      bottomGrad.addColorStop(0, this.color);
      bottomGrad.addColorStop(1, '#333333');
      ctx.fillStyle = bottomGrad;
      ctx.beginPath();
      ctx.scale(1.2, 0.7);
      ctx.arc(0, size * 0.3, size * 0.7, 0, Math.PI);
      ctx.fill();
      ctx.scale(1/1.2, 1/0.7);

      // Pulsing lights around edge
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Gyruss.C.TWO_PI;
        const lightX = Math.cos(angle) * size * 1.1;
        const lightY = Math.sin(angle) * size * 0.8;
        
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = this.color;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(lightX, lightY, 2, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Health indicator
      if (this.health > 1) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.scale(1.2, 0.7);
        ctx.arc(0, 0, size + 2, 0, Gyruss.C.TWO_PI);
        ctx.stroke();
        ctx.scale(1/1.2, 1/0.7);
      }

    } else { // fighter
      const size = 18;
      
      // Wing gradient
      const wingGrad = ctx.createLinearGradient(-size, 0, size, 0);
      wingGrad.addColorStop(0, '#333333');
      wingGrad.addColorStop(0.5, this.color);
      wingGrad.addColorStop(1, '#333333');
      
      // Main body
      const bodyGrad = ctx.createLinearGradient(0, -size, 0, size);
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.3, this.color);
      bodyGrad.addColorStop(1, '#333333');
      
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, size * 0.2);
      ctx.lineTo(size * 0.3, size * 0.6);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(-size * 0.3, size * 0.6);
      ctx.lineTo(-size * 0.6, size * 0.2);
      ctx.closePath();
      ctx.fill();

      // Wing details
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.5);
      ctx.lineTo(-size * 0.8, size * 0.3);
      ctx.lineTo(-size * 0.6, size * 0.5);
      ctx.lineTo(-size * 0.3, size * 0.1);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(size * 0.2, -size * 0.5);
      ctx.lineTo(size * 0.8, size * 0.3);
      ctx.lineTo(size * 0.6, size * 0.5);
      ctx.lineTo(size * 0.3, size * 0.1);
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#80d4ff';
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#80d4ff';
      ctx.globalAlpha = pulse * 0.8;
      ctx.beginPath();
      ctx.arc(0, -size * 0.3, size * 0.15, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Engine glow
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, size * 0.4, 3, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Wing tip lights
      ctx.fillStyle = '#ffff80';
      ctx.shadowBlur = 2;
      ctx.shadowColor = '#ffff80';
      ctx.globalAlpha = pulse * 0.6;
      ctx.beginPath();
      ctx.arc(-size * 0.7, size * 0.3, 1.5, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.7, size * 0.3, 1.5, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Hull outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, size * 0.2);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(-size * 0.6, size * 0.2);
      ctx.closePath();
      ctx.stroke();
    }

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
    const time = Gyruss.Game.worldTime || 0;
    const rotation = time * 2;
    const pulse = 0.8 + 0.2 * Math.sin(time * 4);
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotation);
    
    if (this.isPowerUp) {
      // Power-up satellite with detailed design
      const size = 12;
      
      // Core with gradient
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, this.color || '#ffff00');
      coreGrad.addColorStop(1, '#cc8800');
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color || '#ffff00';
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Solar panels
      ctx.fillStyle = '#336699';
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      
      // Left panel
      ctx.beginPath();
      ctx.rect(-size * 2, -size * 0.5, size * 0.8, size);
      ctx.fill();
      ctx.stroke();
      
      // Right panel
      ctx.beginPath();
      ctx.rect(size * 1.2, -size * 0.5, size * 0.8, size);
      ctx.fill();
      ctx.stroke();
      
      // Panel details
      ctx.strokeStyle = '#aaddff';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        const y = -size * 0.3 + i * size * 0.3;
        ctx.beginPath();
        ctx.moveTo(-size * 2, y);
        ctx.lineTo(-size * 1.2, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 1.2, y);
        ctx.lineTo(size * 2, y);
        ctx.stroke();
      }
      
      // Antenna
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(0, -size * 1.5);
      ctx.stroke();
      
      // Antenna tip
      ctx.fillStyle = '#ff4444';
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#ff4444';
      ctx.beginPath();
      ctx.arc(0, -size * 1.5, 2, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
    } else {
      // Regular satellite
      const size = 8;
      
      // Main body
      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.6, '#cccccc');
      bodyGrad.addColorStop(1, '#666666');
      ctx.fillStyle = bodyGrad;
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#cccccc';
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Simple solar panels
      ctx.fillStyle = '#444488';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.rect(-size * 1.5, -size * 0.3, size * 0.5, size * 0.6);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(size, -size * 0.3, size * 0.5, size * 0.6);
      ctx.fill();
    }
    
    ctx.restore();
  }
};

Gyruss.Particle = class Particle {
  constructor(x, y, color, type = 'normal') {
    this.x = x; this.y = y; this.color = color;
    this.type = type;
    this.vx = Gyruss.Utils.rand(-150, 150);
    this.vy = Gyruss.Utils.rand(-150, 150);
    this.life = Gyruss.Utils.rand(0.4, 0.8);
    this.age = 0;
    this.rotation = Gyruss.Utils.rand(0, Gyruss.C.TWO_PI);
    this.rotSpeed = Gyruss.Utils.rand(-5, 5);
    this.size = Gyruss.Utils.rand(2, 6);
    
    if (type === 'spark') {
      this.vx *= 2;
      this.vy *= 2;
      this.life *= 0.5;
      this.size *= 0.5;
    } else if (type === 'smoke') {
      this.vx *= 0.3;
      this.vy *= 0.3;
      this.life *= 2;
      this.size *= 1.5;
    }
  }
  
  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
    
    if (this.type === 'normal') {
      this.vx *= 0.98; 
      this.vy *= 0.98;
    } else if (this.type === 'spark') {
      this.vx *= 0.95;
      this.vy *= 0.95;
    } else if (this.type === 'smoke') {
      this.vy -= 20 * dt; // Rise upward
      this.vx *= 0.99;
    }
    
    return this.age < this.life;
  }
  
  draw(ctx) {
    const lifeRatio = 1 - this.age / this.life;
    const currentSize = this.size * (this.type === 'smoke' ? (0.5 + lifeRatio * 1.5) : lifeRatio);
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = lifeRatio * (this.type === 'smoke' ? 0.4 : 1);
    
    if (this.type === 'spark') {
      // Draw elongated spark
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 4;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, currentSize * 2, currentSize * 0.5, 0, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.type === 'smoke') {
      // Draw wispy smoke
      const smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize);
      smokeGrad.addColorStop(0, this.color);
      smokeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    } else {
      // Normal glowing particle
      const particleGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize);
      particleGrad.addColorStop(0, '#ffffff');
      particleGrad.addColorStop(0.3, this.color);
      particleGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = particleGrad;
      ctx.shadowBlur = 3;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};