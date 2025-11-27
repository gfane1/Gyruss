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
    if (this.missileCooldown > 0 || !(Gyruss.Game.state === 'playing' || Gyruss.Game.state === 'bonus' || Gyruss.Game.state === 'boss')) return;
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
    
    // Reset weapons and upgrades on life loss (but not in invulnerable test mode)
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
    // Weapons now persist until life loss or satellite phase reset
  }

  draw(ctx) {
    const isVisible = this.invulnerable ? true : (this.hitTimer > 0 ? Math.sin(this.blinkTimer) > 0 : true);
    if (!isVisible) return;

    // Handle warp animation - ship moves toward center and scales down
    let drawPos, drawScale = 1, drawAngle = this.angle;
    if (Gyruss.Game.state === 'warp') {
      const warpProgress = Math.min(1, Gyruss.Game.worldTime / 2.6);
      const currentRadius = Gyruss.C.PLAYER_ORBIT_RADIUS * (1 - warpProgress * 0.85);
      drawPos = Gyruss.Utils.polarToCartesian(this.angle, currentRadius);
      drawScale = 1 - warpProgress * 0.7; // Ship shrinks to 30% size
      // Ship rotates to point toward center during warp
      drawAngle = this.angle + Math.PI / 2 * (1 - warpProgress) + Math.PI * warpProgress;
    } else {
      drawPos = Gyruss.Utils.polarToCartesian(this.angle, Gyruss.C.PLAYER_ORBIT_RADIUS);
      drawAngle = this.angle + Math.PI / 2;
    }

    ctx.save();
    ctx.translate(drawPos.x, drawPos.y);
    ctx.rotate(drawAngle);
    ctx.scale(drawScale, drawScale);

    const size = Gyruss.C.PLAYER_SIZE;
    const time = Gyruss.Game.worldTime || 0;

    // Enhanced multi-layer thruster system
    const thrusterIntensity = 0.7 + Math.sin(time * 25) * 0.3;
    const thrusterFlicker = 0.8 + Math.random() * 0.4;
    const thrusterSize = size * 1.2 * thrusterIntensity * thrusterFlicker;
    
    // Main thruster core (white-hot center)
    const coreThrust = ctx.createLinearGradient(0, size * 0.4, 0, size * 0.4 + thrusterSize);
    coreThrust.addColorStop(0, '#ffffff');
    coreThrust.addColorStop(0.2, '#ffffff');
    coreThrust.addColorStop(0.4, '#80d4ff');
    coreThrust.addColorStop(0.8, '#0066ff');
    coreThrust.addColorStop(1, 'transparent');
    
    ctx.fillStyle = coreThrust;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#80d4ff';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.35);
    ctx.lineTo(-size * 0.18, size * 0.4 + thrusterSize * 0.9);
    ctx.lineTo(0, size * 0.4 + thrusterSize);
    ctx.lineTo(size * 0.18, size * 0.4 + thrusterSize * 0.9);
    ctx.closePath();
    ctx.fill();
    
    // Outer thruster glow
    const outerThrust = ctx.createLinearGradient(0, size * 0.4, 0, size * 0.4 + thrusterSize * 1.3);
    outerThrust.addColorStop(0, '#4080ff');
    outerThrust.addColorStop(0.3, '#2060cc');
    outerThrust.addColorStop(0.7, '#004099');
    outerThrust.addColorStop(1, 'transparent');
    
    ctx.fillStyle = outerThrust;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#4080ff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.4);
    ctx.lineTo(-size * 0.35, size * 0.4 + thrusterSize * 1.2);
    ctx.lineTo(0, size * 0.4 + thrusterSize * 1.3);
    ctx.lineTo(size * 0.35, size * 0.4 + thrusterSize * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Side thruster nozzles
    const sideFlicker1 = 0.6 + Math.sin(time * 30 + 1) * 0.4;
    const sideFlicker2 = 0.6 + Math.sin(time * 28 + 3) * 0.4;
    
    ctx.fillStyle = '#66ccff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#66ccff';
    ctx.globalAlpha = sideFlicker1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size * 0.3);
    ctx.lineTo(-size * 0.22, size * 0.3 + thrusterSize * 0.5);
    ctx.lineTo(-size * 0.18, size * 0.3 + thrusterSize * 0.4);
    ctx.closePath();
    ctx.fill();
    
    ctx.globalAlpha = sideFlicker2;
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.3);
    ctx.lineTo(size * 0.22, size * 0.3 + thrusterSize * 0.5);
    ctx.lineTo(size * 0.18, size * 0.3 + thrusterSize * 0.4);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Enhanced wing structures with armor plating
    const wingGrad = ctx.createLinearGradient(-size, 0, size, 0);
    wingGrad.addColorStop(0, '#001a40');
    wingGrad.addColorStop(0.2, '#003366');
    wingGrad.addColorStop(0.4, '#0066cc');
    wingGrad.addColorStop(0.6, '#4daaff');
    wingGrad.addColorStop(0.8, '#0066cc');
    wingGrad.addColorStop(1, '#001a40');
    
    // Left wing main structure
    ctx.fillStyle = wingGrad;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#0066cc';
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, -size * 0.85);
    ctx.lineTo(-size * 0.95, size * 0.08);
    ctx.lineTo(-size * 0.85, size * 0.45);
    ctx.lineTo(-size * 0.38, size * 0.22);
    ctx.closePath();
    ctx.fill();
    
    // Right wing main structure
    ctx.beginPath();
    ctx.moveTo(size * 0.28, -size * 0.85);
    ctx.lineTo(size * 0.95, size * 0.08);
    ctx.lineTo(size * 0.85, size * 0.45);
    ctx.lineTo(size * 0.38, size * 0.22);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Wing armor panels
    const panelGrad = ctx.createLinearGradient(0, -size, 0, size * 0.5);
    panelGrad.addColorStop(0, '#80ccff');
    panelGrad.addColorStop(0.5, '#4080cc');
    panelGrad.addColorStop(1, '#002040');
    
    ctx.fillStyle = panelGrad;
    ctx.globalAlpha = 0.8;
    
    // Left wing panels
    for (let i = 0; i < 3; i++) {
      const panelY = -size * 0.6 + i * size * 0.3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.4, panelY);
      ctx.lineTo(-size * 0.7, panelY + size * 0.15);
      ctx.lineTo(-size * 0.65, panelY + size * 0.2);
      ctx.lineTo(-size * 0.38, panelY + size * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    
    // Right wing panels
    for (let i = 0; i < 3; i++) {
      const panelY = -size * 0.6 + i * size * 0.3;
      ctx.beginPath();
      ctx.moveTo(size * 0.4, panelY);
      ctx.lineTo(size * 0.7, panelY + size * 0.15);
      ctx.lineTo(size * 0.65, panelY + size * 0.2);
      ctx.lineTo(size * 0.38, panelY + size * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Wing edge highlights
    ctx.strokeStyle = '#b3daff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#b3daff';
    ctx.beginPath();
    ctx.moveTo(-size * 0.32, -size * 0.75);
    ctx.lineTo(-size * 0.8, size * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.32, -size * 0.75);
    ctx.lineTo(size * 0.8, size * 0.05);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Enhanced main hull with detailed surface
    const hullGrad = ctx.createRadialGradient(0, -size * 0.3, 0, 0, -size * 0.1, size * 1.2);
    hullGrad.addColorStop(0, '#ffffff');
    hullGrad.addColorStop(0.15, '#ccffee');
    hullGrad.addColorStop(0.3, '#80ffcc');
    hullGrad.addColorStop(0.5, '#40cc80');
    hullGrad.addColorStop(0.7, '#00aa60');
    hullGrad.addColorStop(0.85, '#006640');
    hullGrad.addColorStop(1, '#003320');
    
    ctx.fillStyle = hullGrad;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#40cc80';
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.05);
    ctx.lineTo(size * 0.65, size * 0.18);
    ctx.lineTo(size * 0.32, size * 0.42);
    ctx.lineTo(0, size * 0.32);
    ctx.lineTo(-size * 0.32, size * 0.42);
    ctx.lineTo(-size * 0.65, size * 0.18);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;

    // Hull armor plating
    const plateGrad = ctx.createLinearGradient(0, -size, 0, size * 0.3);
    plateGrad.addColorStop(0, '#ffffff');
    plateGrad.addColorStop(0.3, '#ccffdd');
    plateGrad.addColorStop(0.7, '#66cc99');
    plateGrad.addColorStop(1, '#004433');
    
    ctx.fillStyle = plateGrad;
    ctx.globalAlpha = 0.7;
    
    // Front armor sections
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.95);
    ctx.lineTo(size * 0.2, -size * 0.6);
    ctx.lineTo(size * 0.15, -size * 0.45);
    ctx.lineTo(0, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.95);
    ctx.lineTo(-size * 0.2, -size * 0.6);
    ctx.lineTo(-size * 0.15, -size * 0.45);
    ctx.lineTo(0, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Mid-section plates
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, -size * 0.3);
    ctx.lineTo(size * 0.25, -size * 0.3);
    ctx.lineTo(size * 0.35, -size * 0.1);
    ctx.lineTo(-size * 0.35, -size * 0.1);
    ctx.closePath();
    ctx.fill();
    
    ctx.globalAlpha = 1;
    
    // Hull outline with glow
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.05);
    ctx.lineTo(size * 0.65, size * 0.18);
    ctx.lineTo(size * 0.32, size * 0.42);
    ctx.lineTo(0, size * 0.32);
    ctx.lineTo(-size * 0.32, size * 0.42);
    ctx.lineTo(-size * 0.65, size * 0.18);
    ctx.closePath();
    ctx.stroke();
    
    // Enhanced center line with energy conduit
    ctx.strokeStyle = '#ccffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ccffff';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.95);
    ctx.lineTo(0, size * 0.25);
    ctx.stroke();
    
    // Energy conduit nodes
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ccffff';
    for (let i = 0; i < 4; i++) {
      const nodeY = -size * 0.8 + i * size * 0.3;
      ctx.beginPath();
      ctx.arc(0, nodeY, 2, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;

    // Enhanced cockpit with advanced glass effects
    const cockpitGrad = ctx.createRadialGradient(-size * 0.12, -size * 0.35, 0, 0, -size * 0.05, size * 0.35);
    cockpitGrad.addColorStop(0, '#ffffff');
    cockpitGrad.addColorStop(0.2, '#e6f7ff');
    cockpitGrad.addColorStop(0.4, '#80d4ff');
    cockpitGrad.addColorStop(0.7, '#4080cc');
    cockpitGrad.addColorStop(0.9, '#0060aa');
    cockpitGrad.addColorStop(1, '#003366');
    
    ctx.fillStyle = cockpitGrad;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#80d4ff';
    ctx.beginPath();
    ctx.arc(0, -size * 0.15, size * 0.28, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Cockpit frame
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -size * 0.15, size * 0.28, 0, Gyruss.C.TWO_PI);
    ctx.stroke();

    // Primary highlight reflection
    const highlight1 = ctx.createRadialGradient(-size * 0.15, -size * 0.25, 0, -size * 0.1, -size * 0.2, size * 0.12);
    highlight1.addColorStop(0, '#ffffff');
    highlight1.addColorStop(0.6, '#ffffff80');
    highlight1.addColorStop(1, 'transparent');
    
    ctx.fillStyle = highlight1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.22, size * 0.1, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Secondary reflection
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(size * 0.08, -size * 0.08, size * 0.04, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    ctx.globalAlpha = 1;

    // Enhanced weapon hardpoints with dynamic sizing
    const weaponIntensity = 0.7 + Math.sin(time * 6) * 0.3;
    const hardpointSize = this.currentWeapon.id === 'laser' ? 3 : (this.currentWeapon.id === 'plasma' ? 4 : 3.5);
    
    // Left hardpoint
    const leftGrad = ctx.createRadialGradient(-size * 0.42, size * 0.08, 0, -size * 0.42, size * 0.08, hardpointSize * 2);
    leftGrad.addColorStop(0, '#ffffff');
    leftGrad.addColorStop(0.4, this.currentWeapon.color);
    leftGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = leftGrad;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.currentWeapon.color;
    ctx.globalAlpha = weaponIntensity;
    ctx.beginPath();
    ctx.arc(-size * 0.42, size * 0.08, hardpointSize * 2, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Right hardpoint
    const rightGrad = ctx.createRadialGradient(size * 0.42, size * 0.08, 0, size * 0.42, size * 0.08, hardpointSize * 2);
    rightGrad.addColorStop(0, '#ffffff');
    rightGrad.addColorStop(0.4, this.currentWeapon.color);
    rightGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.arc(size * 0.42, size * 0.08, hardpointSize * 2, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Core hardpoint emitters
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.currentWeapon.color;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(-size * 0.42, size * 0.08, hardpointSize, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.42, size * 0.08, hardpointSize, 0, Gyruss.C.TWO_PI);
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
      // Spectacular plasma bolt with multiple energy layers
      const pulse = 0.8 + Math.sin(time * 15 + this.radius * 0.1) * 0.2;
      
      // Outer energy field
      const fieldGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18 * pulse);
      fieldGrad.addColorStop(0, this.weapon.color + '40');
      fieldGrad.addColorStop(0.5, this.weapon.color + '20');
      fieldGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fieldGrad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18 * pulse, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Mid-layer energy ring
      const ringGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 10 * pulse);
      ringGrad.addColorStop(0, this.weapon.color);
      ringGrad.addColorStop(0.7, this.weapon.color + '80');
      ringGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ringGrad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.weapon.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10 * pulse, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Core plasma ball
      const coreGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 5);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#ffffff');
      coreGrad.addColorStop(0.7, this.weapon.color);
      coreGrad.addColorStop(1, this.weapon.color);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.weapon.color;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Energy crackling effects
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      ctx.globalAlpha = 0.6 + Math.sin(time * 20) * 0.4;
      for (let i = 0; i < 4; i++) {
        const crackAngle = (i / 4) * Gyruss.C.TWO_PI + time * 2;
        const crackRadius = 3 + Math.sin(time * 10 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
          pos.x + Math.cos(crackAngle) * crackRadius,
          pos.y + Math.sin(crackAngle) * crackRadius
        );
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
    } else if (this.weapon.id === 'wave') {
      // Spectacular wave beam with advanced oscillation effects
      const tailLength = 35;
      const tail = Gyruss.Utils.polarToCartesian(this.angle, this.radius + tailLength);
      const waveIntensity = 0.7 + Math.sin(time * 8) * 0.3;
      
      // Outer wave envelope
      const perpAngle = this.angle + Math.PI / 2;
      const mainOscillation = Math.sin(time * 12 + this.radius * 0.08) * 4 * waveIntensity;
      const secondaryOsc = Math.sin(time * 18 + this.radius * 0.12) * 2;
      
      // Main beam core
      const coreGradient = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.2, '#ffffff');
      coreGradient.addColorStop(0.5, this.weapon.color);
      coreGradient.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = coreGradient;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.weapon.color;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Wave oscillation beams
      const sideX1 = Math.cos(perpAngle) * mainOscillation;
      const sideY1 = Math.sin(perpAngle) * mainOscillation;
      const sideX2 = Math.cos(perpAngle) * (mainOscillation + secondaryOsc);
      const sideY2 = Math.sin(perpAngle) * (mainOscillation + secondaryOsc);
      
      // Primary oscillation
      ctx.strokeStyle = this.weapon.color;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.weapon.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(pos.x + sideX1, pos.y + sideY1);
      ctx.lineTo(tail.x + sideX1, tail.y + sideY1);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(pos.x - sideX1, pos.y - sideY1);
      ctx.lineTo(tail.x - sideX1, tail.y - sideY1);
      ctx.stroke();
      
      // Secondary oscillation
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(pos.x + sideX2, pos.y + sideY2);
      ctx.lineTo(tail.x + sideX2, tail.y + sideY2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(pos.x - sideX2, pos.y - sideY2);
      ctx.lineTo(tail.x - sideX2, tail.y - sideY2);
      ctx.stroke();
      
      // Wave field effect
      const fieldGrad = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      fieldGrad.addColorStop(0, this.weapon.color + '60');
      fieldGrad.addColorStop(0.5, this.weapon.color + '30');
      fieldGrad.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = fieldGrad;
      ctx.lineWidth = 12;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      
    } else {
      // Enhanced laser with sophisticated layering
      const tailLength = 28;
      const tail = Gyruss.Utils.polarToCartesian(this.angle, this.radius + tailLength);
      const intensity = 0.8 + Math.sin(time * 25 + this.radius * 0.1) * 0.2;
      
      // Outer energy field
      const outerGrad = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      outerGrad.addColorStop(0, this.weapon.color + '80');
      outerGrad.addColorStop(0.3, this.weapon.color + '60');
      outerGrad.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = outerGrad;
      ctx.lineWidth = (this.weapon.size + 6) * intensity;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.weapon.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Mid-layer beam
      const midGrad = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      midGrad.addColorStop(0, this.weapon.color);
      midGrad.addColorStop(0.4, this.weapon.color + 'CC');
      midGrad.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = midGrad;
      ctx.lineWidth = (this.weapon.size + 2) * intensity;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.weapon.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Core beam (white-hot center)
      const coreGrad = ctx.createLinearGradient(pos.x, pos.y, tail.x, tail.y);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#ffffff');
      coreGrad.addColorStop(0.7, this.weapon.color);
      coreGrad.addColorStop(1, 'transparent');
      
      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = this.weapon.size * intensity;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tail.x, tail.y);
      ctx.stroke();
      
      // Inner energy core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.weapon.size * 0.4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffffff';
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
      this.drawSaucerDesign(ctx, time, pulse);
    } else { // fighter
      this.drawFighterDesign(ctx, time, pulse);
    }

    ctx.restore();
  }
  
  drawSaucerDesign(ctx, time, pulse) {
    const size = 18; // Slightly larger for better detail
    
    // Enhanced outer hull with multiple layers
    const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.4);
    outerGrad.addColorStop(0, this.color + '40');
    outerGrad.addColorStop(0.8, this.color + '80');
    outerGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.scale(1.3, 0.6);
    ctx.arc(0, 0, size * 1.2, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.scale(1/1.3, 1/0.6);
    
    // Main saucer body with enhanced metallic gradient
    const saucerGrad = ctx.createRadialGradient(0, -size * 0.2, 0, 0, 0, size * 1.2);
    saucerGrad.addColorStop(0, '#ffffff');
    saucerGrad.addColorStop(0.1, '#cccccc');
    saucerGrad.addColorStop(0.3, this.color);
    saucerGrad.addColorStop(0.7, this.color);
    saucerGrad.addColorStop(1, '#111111');
    
    ctx.fillStyle = saucerGrad;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.scale(1.3, 0.6);
    ctx.arc(0, 0, size, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.stroke();
    ctx.scale(1/1.3, 1/0.6);

    // Central command dome
    const domeGrad = ctx.createRadialGradient(0, -size * 0.1, 0, 0, -size * 0.1, size * 0.4);
    domeGrad.addColorStop(0, '#ffffff');
    domeGrad.addColorStop(0.3, this.color + 'CC');
    domeGrad.addColorStop(1, this.color + '40');
    
    ctx.fillStyle = domeGrad;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.35, 0, Gyruss.C.TWO_PI);
    ctx.fill();

    // Command dome windows
    ctx.fillStyle = '#88ccff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#88ccff';
    ctx.globalAlpha = pulse * 0.8;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Gyruss.C.TWO_PI + time;
      const winX = Math.cos(angle) * size * 0.2;
      const winY = Math.sin(angle) * size * 0.12 - size * 0.1;
      ctx.beginPath();
      ctx.arc(winX, winY, 1.5, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bottom hull section with detail
    const bottomGrad = ctx.createLinearGradient(0, -size * 0.2, 0, size * 0.6);
    bottomGrad.addColorStop(0, this.color);
    bottomGrad.addColorStop(0.5, '#666666');
    bottomGrad.addColorStop(1, '#222222');
    
    ctx.fillStyle = bottomGrad;
    ctx.beginPath();
    ctx.scale(1.3, 0.6);
    ctx.arc(0, size * 0.3, size * 0.8, 0, Math.PI);
    ctx.fill();
    ctx.scale(1/1.3, 1/0.6);

    // Hull armor plating
    ctx.strokeStyle = this.color + '80';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const radius = (size * 0.4) + (i * size * 0.2);
      ctx.beginPath();
      ctx.scale(1.3, 0.6);
      ctx.arc(0, 0, radius, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.scale(1/1.3, 1/0.6);
    }

    // Enhanced edge lighting system
    const lightCount = 12;
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * Gyruss.C.TWO_PI + time * 0.5;
      const lightX = Math.cos(angle) * size * 1.2;
      const lightY = Math.sin(angle) * size * 0.72;
      
      const lightIntensity = 0.6 + Math.sin(time * 8 + i) * 0.4;
      
      // Outer glow
      const lightGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 6);
      lightGrad.addColorStop(0, this.color);
      lightGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = lightGrad;
      ctx.globalAlpha = lightIntensity * 0.4;
      ctx.beginPath();
      ctx.arc(lightX, lightY, 4, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Core light
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 3;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = lightIntensity;
      ctx.beginPath();
      ctx.arc(lightX, lightY, 1.5, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Health indicator with enhanced design
    if (this.health > 1) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffff00';
      ctx.beginPath();
      ctx.scale(1.3, 0.6);
      ctx.arc(0, 0, size + 4, 0, Gyruss.C.TWO_PI);
      ctx.stroke();
      ctx.scale(1/1.3, 1/0.6);
      ctx.shadowBlur = 0;
    }
  }
  
  drawFighterDesign(ctx, time, pulse) {
    const size = 20; // Slightly larger for more detail
    const shipVariant = Math.floor(this.angle * 3) % 3; // Different variants
    
    if (shipVariant === 0) {
      this.drawInterceptorFighter(ctx, time, pulse, size);
    } else if (shipVariant === 1) {
      this.drawHeavyFighter(ctx, time, pulse, size);
    } else {
      this.drawAssaultFighter(ctx, time, pulse, size);
    }
  }
  
  drawInterceptorFighter(ctx, time, pulse, size) {
    // Sleek interceptor design
    const bodyGrad = ctx.createLinearGradient(0, -size, 0, size);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.2, this.color);
    bodyGrad.addColorStop(0.6, '#666666');
    bodyGrad.addColorStop(1, '#222222');
    
    // Main hull - streamlined
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.1);
    ctx.lineTo(-size * 0.3, -size * 0.3);
    ctx.lineTo(-size * 0.4, size * 0.7);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(size * 0.4, size * 0.7);
    ctx.lineTo(size * 0.3, -size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Cockpit canopy
    const canopyGrad = ctx.createRadialGradient(0, -size * 0.3, 0, 0, -size * 0.3, size * 0.3);
    canopyGrad.addColorStop(0, '#88ccff80');
    canopyGrad.addColorStop(0.6, '#4499cc60');
    canopyGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = canopyGrad;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#88ccff';
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.25, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Wing-mounted weapons
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3);
    ctx.fill();
    ctx.stroke();
    
    // Twin engines
    const engineGrad = ctx.createRadialGradient(0, size * 0.6, 0, 0, size * 0.6, size * 0.25);
    engineGrad.addColorStop(0, '#ffffff');
    engineGrad.addColorStop(0.3, '#ff6600');
    engineGrad.addColorStop(0.7, '#ff0000');
    engineGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = engineGrad;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(-size * 0.15, size * 0.6, size * 0.12, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.15, size * 0.6, size * 0.12, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
  
  drawHeavyFighter(ctx, time, pulse, size) {
    // Robust heavy fighter
    const bodyGrad = ctx.createLinearGradient(0, -size, 0, size);
    bodyGrad.addColorStop(0, this.color);
    bodyGrad.addColorStop(0.3, '#555555');
    bodyGrad.addColorStop(0.8, '#333333');
    bodyGrad.addColorStop(1, '#111111');
    
    // Broader hull design
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.9);
    ctx.lineTo(-size * 0.7, 0);
    ctx.lineTo(-size * 0.5, size * 0.8);
    ctx.lineTo(0, size * 0.6);
    ctx.lineTo(size * 0.5, size * 0.8);
    ctx.lineTo(size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Armor plating
    ctx.fillStyle = '#444444';
    ctx.strokeStyle = this.color + '80';
    ctx.lineWidth = 1;
    
    // Central armor plate
    ctx.beginPath();
    ctx.rect(-size * 0.15, -size * 0.4, size * 0.3, size * 0.6);
    ctx.fill();
    ctx.stroke();
    
    // Wing armor
    ctx.beginPath();
    ctx.rect(-size * 0.6, -size * 0.1, size * 0.25, size * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(size * 0.35, -size * 0.1, size * 0.25, size * 0.4);
    ctx.fill();
    ctx.stroke();
    
    // Heavy weapons
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = this.color;
    
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * size * 0.15;
      ctx.beginPath();
      ctx.arc(x, -size * 0.2, size * 0.04, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    }
    
    // Main engine
    const engineGrad = ctx.createRadialGradient(0, size * 0.6, 0, 0, size * 0.6, size * 0.3);
    engineGrad.addColorStop(0, '#ffffff');
    engineGrad.addColorStop(0.4, '#ff4444');
    engineGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = engineGrad;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, size * 0.5, size * 0.2, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
  
  drawAssaultFighter(ctx, time, pulse, size) {
    // Angular assault fighter
    const bodyGrad = ctx.createLinearGradient(0, -size, 0, size);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.15, this.color);
    bodyGrad.addColorStop(0.5, '#666666');
    bodyGrad.addColorStop(1, '#222222');
    
    // Angular hull design
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.4, -size * 0.6);
    ctx.lineTo(-size * 0.8, size * 0.2);
    ctx.lineTo(-size * 0.3, size * 0.8);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(size * 0.3, size * 0.8);
    ctx.lineTo(size * 0.8, size * 0.2);
    ctx.lineTo(size * 0.4, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Geometric details
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.7);
    ctx.lineTo(size * 0.2, -size * 0.7);
    ctx.moveTo(-size * 0.3, 0);
    ctx.lineTo(size * 0.3, 0);
    ctx.stroke();
    
    // Wing-tip weapons
    const weaponGlow = 0.6 + Math.sin(time * 12) * 0.4;
    ctx.fillStyle = '#ff6600';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ff6600';
    ctx.globalAlpha = weaponGlow;
    
    ctx.beginPath();
    ctx.arc(-size * 0.7, size * 0.1, size * 0.06, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.7, size * 0.1, size * 0.06, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Vectored thrust engines
    const engineGrad = ctx.createRadialGradient(0, size * 0.6, 0, 0, size * 0.6, size * 0.2);
    engineGrad.addColorStop(0, '#ffffff');
    engineGrad.addColorStop(0.5, '#0066ff');
    engineGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = engineGrad;
    ctx.globalAlpha = pulse;
    
    // Multiple small engines
    const engines = [
      {x: -size * 0.2, y: size * 0.7},
      {x: 0, y: size * 0.3},
      {x: size * 0.2, y: size * 0.7}
    ];
    
    engines.forEach(engine => {
      ctx.beginPath();
      ctx.arc(engine.x, engine.y, size * 0.08, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
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
    const time = Gyruss.Game.worldTime || 0;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    if (this.type === 'spark') {
      // Enhanced spark with energy trail
      const sparkIntensity = 0.8 + Math.sin(time * 30 + this.x * 0.1) * 0.2;
      const trailLength = currentSize * 3 * (1 + this.vx * this.vx + this.vy * this.vy) * 0.001;
      
      // Energy trail
      const trailGrad = ctx.createLinearGradient(-trailLength, 0, trailLength, 0);
      trailGrad.addColorStop(0, 'transparent');
      trailGrad.addColorStop(0.3, this.color + '80');
      trailGrad.addColorStop(0.7, this.color);
      trailGrad.addColorStop(1, '#ffffff');
      
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = currentSize * 0.8;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = lifeRatio * sparkIntensity;
      
      ctx.beginPath();
      ctx.moveTo(-trailLength, 0);
      ctx.lineTo(trailLength, 0);
      ctx.stroke();
      
      // Core spark
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = lifeRatio;
      
      ctx.save();
      ctx.scale(2.5, 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.restore();
      
      // Inner glow
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 4;
      ctx.save();
      ctx.scale(1.5, 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.restore();
      
    } else if (this.type === 'smoke') {
      // Enhanced wispy smoke with turbulence
      const smokeTurbulence = Math.sin(time * 3 + this.x * 0.05) * 0.3;
      const smokeSize = currentSize * (1 + smokeTurbulence);
      
      // Multiple smoke layers for depth
      for (let layer = 0; layer < 3; layer++) {
        const layerScale = 0.6 + layer * 0.2;
        const layerAlpha = (0.4 - layer * 0.1) * lifeRatio;
        const layerOffset = layer * 2;
        
        const smokeGrad = ctx.createRadialGradient(
          layerOffset, layerOffset, 0,
          layerOffset, layerOffset, smokeSize * layerScale
        );
        
        if (layer === 0) {
          smokeGrad.addColorStop(0, this.color + '60');
          smokeGrad.addColorStop(0.5, this.color + '30');
        } else if (layer === 1) {
          smokeGrad.addColorStop(0, '#666666' + '40');
          smokeGrad.addColorStop(0.6, '#444444' + '20');
        } else {
          smokeGrad.addColorStop(0, '#333333' + '20');
          smokeGrad.addColorStop(0.7, '#222222' + '10');
        }
        smokeGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = smokeGrad;
        ctx.globalAlpha = layerAlpha;
        ctx.beginPath();
        ctx.arc(layerOffset, layerOffset, smokeSize * layerScale, 0, Gyruss.C.TWO_PI);
        ctx.fill();
      }
      
    } else if (this.type === 'explosion') {
      // New explosion particle type
      const explosionScale = 1 + (1 - lifeRatio) * 2;
      const intensity = 0.8 + Math.sin(time * 25) * 0.2;
      
      // Outer blast wave
      const waveGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * explosionScale * 2);
      waveGrad.addColorStop(0, 'transparent');
      waveGrad.addColorStop(0.8, this.color + '40');
      waveGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = waveGrad;
      ctx.globalAlpha = lifeRatio * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize * explosionScale * 2, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Main explosion core
      const explosionGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * explosionScale);
      explosionGrad.addColorStop(0, '#ffffff');
      explosionGrad.addColorStop(0.3, this.color);
      explosionGrad.addColorStop(0.7, this.color + '80');
      explosionGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = explosionGrad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = lifeRatio * intensity;
      
      ctx.beginPath();
      ctx.arc(0, 0, currentSize * explosionScale, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
    } else {
      // Enhanced normal particles with improved glow
      const glowIntensity = 0.9 + Math.sin(time * 20 + this.x * 0.1) * 0.1;
      
      // Outer glow halo
      const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * 2.5);
      haloGrad.addColorStop(0, this.color + '20');
      haloGrad.addColorStop(0.5, this.color + '40');
      haloGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = haloGrad;
      ctx.globalAlpha = lifeRatio * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize * 2.5, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Main particle body
      const particleGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize);
      particleGrad.addColorStop(0, '#ffffff');
      particleGrad.addColorStop(0.2, '#ffffff');
      particleGrad.addColorStop(0.5, this.color);
      particleGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = particleGrad;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = lifeRatio * glowIntensity;
      
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Inner core highlight
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.globalAlpha = lifeRatio * 0.8;
      
      ctx.beginPath();
      ctx.arc(0, 0, currentSize * 0.3, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }
};