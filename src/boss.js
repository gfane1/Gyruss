// --- BOSS CLASS ---
window.Gyruss = window.Gyruss || {};

Gyruss.CosmicSerpent = class CosmicSerpent {
  constructor(length = 10) {
    this.segments = [];
    this.centerX = Gyruss.C.CX;
    this.centerY = Gyruss.C.CY;
    this.orbitRadius = 140;
    this.speed = 1.8;
    this.time = 0;
    this.health = length * 3;
    this.maxHealth = this.health;
    this.fireTimer = 1.0;
    this.damageFlashTimer = 0;
    this.pulseTimer = 0;
    this.aggressionLevel = 1;
    this.spiralPhase = 0;
    this.deathTimer = 0;
    this.isDestroying = false;
    
    // Create segments with varying properties
    for (let i = 0; i < length; i++) {
      this.segments.push({ 
        offsetAngle: (i / length) * Math.PI * 0.4,
        x: 0,
        y: 0,
        isHead: i === 0,
        isTail: i === length - 1,
        health: i === 0 ? 5 : 3, // Head has more health
        pulsePhase: i * 0.3,
        trailEffect: []
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    this.pulseTimer += dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    // Handle death sequence
    if (this.isDestroying) {
      this.deathTimer += dt;
      
      // Spectacular destruction over 4 seconds
      if (this.deathTimer < 4.0) {
        // Random segment explosions
        if (Math.random() < 0.3) {
          const seg = this.segments[Math.floor(Math.random() * this.segments.length)];
          if (seg) {
            Gyruss.Game.spawnExplosion(seg.x, seg.y, seg.isHead ? '#ff3333' : '#ffaa00', 40);
          }
        }
        return;
      } else {
        // Final massive explosion
        Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, '#ff6600', 120);
        Gyruss.Audio.sfx.play('bigExplosion');
        Gyruss.Game.score += 10000;
        Gyruss.Game.state = 'victory';
        return;
      }
    }
    
    // Dynamic aggression based on health
    this.aggressionLevel = 1 + (1 - (this.health / this.maxHealth)) * 2;
    this.spiralPhase += dt * this.aggressionLevel;
    
    // Enhanced serpentine movement with spiral and figure-8 patterns
    const baseAngle = this.time * this.speed * this.aggressionLevel;
    const spiralRadius = 60 + Math.sin(this.spiralPhase * 0.5) * 40;
    const figure8 = Math.sin(this.time * 1.5) * 80;
    
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const segmentDelay = i * 0.1;
      const delayedTime = this.time - segmentDelay;
      
      // Complex movement combining multiple patterns
      const primaryAngle = baseAngle + seg.offsetAngle;
      const spiralOffset = Math.sin(delayedTime * 3 + i * 0.8) * spiralRadius;
      const verticalWave = Math.sin(delayedTime * 2.5 + i * 0.3) * 60;
      
      // Store previous position for trail effect
      if (seg.trailEffect.length > 8) seg.trailEffect.shift();
      seg.trailEffect.push({x: seg.x, y: seg.y, alpha: 1.0});
      
      seg.x = this.centerX + Math.cos(primaryAngle) * (this.orbitRadius + spiralOffset) + figure8;
      seg.y = this.centerY + Math.sin(primaryAngle) * (this.orbitRadius + spiralOffset * 0.7) + verticalWave;
      
      // More aggressive firing pattern
      if (this.fireTimer <= 0 && (i % 2 === 0) && Gyruss.EnemyBullet) {
        Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(seg.x, seg.y, playerPos.x, playerPos.y));
        
        // Head fires multiple bullets when damaged
        if (seg.isHead && this.health < this.maxHealth * 0.5) {
          const spreadAngle = 0.3;
          Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
            seg.x, seg.y, 
            playerPos.x + Math.cos(Math.atan2(playerPos.y - seg.y, playerPos.x - seg.x) + spreadAngle) * 50,
            playerPos.y + Math.sin(Math.atan2(playerPos.y - seg.y, playerPos.x - seg.x) + spreadAngle) * 50
          ));
          Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
            seg.x, seg.y, 
            playerPos.x + Math.cos(Math.atan2(playerPos.y - seg.y, playerPos.x - seg.x) - spreadAngle) * 50,
            playerPos.y + Math.sin(Math.atan2(playerPos.y - seg.y, playerPos.x - seg.x) - spreadAngle) * 50
          ));
        }
      }
      
      // Update trail alpha
      seg.trailEffect.forEach((trail, idx) => {
        trail.alpha = (idx + 1) / seg.trailEffect.length * 0.6;
      });
    }
    
    if (this.fireTimer <= 0) this.fireTimer = Math.max(0.8, 2.0 - this.aggressionLevel * 0.4);
    
    this.segments = this.segments.filter(seg => seg.health > 0);
    
    // Trigger destruction sequence instead of instant victory
    if (this.segments.length === 0 && !this.isDestroying) {
      this.isDestroying = true;
      this.deathTimer = 0;
    }
  }
  
  takeDamage(segmentIndex, damage = 1) {
    const segment = this.segments[segmentIndex];
    if (!segment) return;
    
    segment.health -= damage;
    this.health = Math.max(0, this.health - damage);
    this.damageFlashTimer = 0.1;
    
    if (segment.health <= 0) {
      Gyruss.Game.spawnExplosion(segment.x, segment.y, segment.isHead ? '#ff5555' : '#55ff55', 30);
      Gyruss.Game.score += segment.isHead ? 2000 : 500;
    }
  }
  
  checkBulletCollision(bulletX, bulletY) {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      
      const hitRadius = seg.isHead ? 25 : 15;
      if (Gyruss.Utils.distSq(bulletX, bulletY, seg.x, seg.y) < hitRadius * hitRadius) {
        return { hit: true, segmentIndex: i };
      }
    }
    return { hit: false };
  }
  
  draw(ctx) {
    if (this.segments.length === 0 && !this.isDestroying) return;

    // During destruction, add screen shake and color effects
    if (this.isDestroying) {
      const shake = Math.sin(this.deathTimer * 30) * 3;
      ctx.save();
      ctx.translate(shake, shake * 0.7);
      
      // Red overlay effect during destruction
      ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.sin(this.deathTimer * 10) * 0.1})`;
      ctx.fillRect(-10, -10, Gyruss.C.WIDTH + 20, Gyruss.C.HEIGHT + 20);
      
      ctx.restore();
    }

    // Draw trail effects first
    this.segments.forEach((seg) => {
      seg.trailEffect.forEach((trail) => {
        const trailSize = seg.isHead ? 12 : 8;
        ctx.fillStyle = `rgba(255, 100, 0, ${trail.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff6400';
        ctx.globalAlpha = trail.alpha;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trailSize * trail.alpha, 0, Gyruss.C.TWO_PI);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });
    });

    // Draw enhanced segments
    this.segments.forEach((seg, index) => {
      const size = seg.isHead ? 25 : (seg.isTail ? 18 : 20);
      const healthRatio = seg.health / (seg.isHead ? 5 : 3);
      const pulse = 0.8 + Math.sin(this.pulseTimer * 4 + seg.pulsePhase) * 0.2;
      
      // Enhanced gradient with more colors
      const segGrad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, size * 1.2);
      if (seg.isHead) {
        segGrad.addColorStop(0, '#ffffff');
        segGrad.addColorStop(0.3, '#ffff00');
        segGrad.addColorStop(0.6, '#ff4444');
        segGrad.addColorStop(1, '#cc0000');
      } else if (seg.isTail) {
        segGrad.addColorStop(0, '#ffffff');
        segGrad.addColorStop(0.4, '#00ffff');
        segGrad.addColorStop(1, '#0066cc');
      } else {
        segGrad.addColorStop(0, '#ffffff');
        segGrad.addColorStop(0.4, '#44ff44');
        segGrad.addColorStop(1, '#00cc00');
      }
      
      ctx.fillStyle = segGrad;
      ctx.shadowBlur = 15;
      ctx.shadowColor = seg.isHead ? '#ff4444' : (seg.isTail ? '#00ffff' : '#44ff44');
      ctx.globalAlpha = (0.7 + 0.3 * healthRatio) * pulse;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Add energy core
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, size * 0.4, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Enhanced connecting energy beams
      if (index > 0) {
        const prevSeg = this.segments[index - 1];
        const beamGrad = ctx.createLinearGradient(prevSeg.x, prevSeg.y, seg.x, seg.y);
        beamGrad.addColorStop(0, '#ffaa00');
        beamGrad.addColorStop(0.5, '#ff6600');
        beamGrad.addColorStop(1, '#ffaa00');
        
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 4 + Math.sin(this.pulseTimer * 3) * 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff6600';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(prevSeg.x, prevSeg.y);
        ctx.lineTo(seg.x, seg.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      
      // Special effects for head when damaged
      if (seg.isHead && healthRatio < 0.5) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffff00';
        ctx.globalAlpha = 0.6 + Math.sin(this.pulseTimer * 8) * 0.4;
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, size * 1.5, 0, Gyruss.C.TWO_PI);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });

    // Enhanced damage flash
    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlashTimer / 0.1 * 0.4})`;
      ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    }

    // Health bar (hide during destruction)
    if (!this.isDestroying) {
      this.drawHealthBar(ctx, 'COSMIC SERPENT');
    }
  }

  drawHealthBar(ctx, name) {
    const barWidth = 400;
    const barHeight = 20;
    const barX = Gyruss.C.CX - barWidth / 2;
    const barY = 20;
    
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Health calculation
    let healthRatio = this.health / this.maxHealth;
    
    // Health gradient
    const healthGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    if (healthRatio > 0.6) {
      healthGrad.addColorStop(0, '#00ff00');
      healthGrad.addColorStop(1, '#ffff00');
    } else if (healthRatio > 0.3) {
      healthGrad.addColorStop(0, '#ffff00');
      healthGrad.addColorStop(1, '#ff8800');
    } else {
      healthGrad.addColorStop(0, '#ff8800');
      healthGrad.addColorStop(1, '#ff0000');
    }
    
    ctx.fillStyle = healthGrad;
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    
    // Boss name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name, Gyruss.C.CX, barY - 10);
  }
};

// --- STAR DESTROYER BOSS ---
Gyruss.StarDestroyer = class StarDestroyer {
  constructor() {
    this.centerX = Gyruss.C.CX;
    this.centerY = Gyruss.C.CY;
    this.time = 0;
    this.fireTimer = 1.5;
    this.damageFlashTimer = 0;
    this.turrets = [];
    this.orbitRadius = 200;
    this.rotationSpeed = 1.2;
    this.formationMode = 'orbit';
    this.modeTimer = 0;
    this.pulseTimer = 0;
    this.deathTimer = 0;
    this.isDestroying = false;
    
    // Create 8 enhanced turrets
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Gyruss.C.TWO_PI;
      this.turrets.push({
        baseAngle: angle,
        currentAngle: angle,
        x: 0,
        y: 0,
        health: 15,
        maxHealth: 15,
        fireTimer: Math.random() * 2,
        chargeTimer: 0,
        isCharging: false,
        shieldPhase: i * 0.3
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    this.modeTimer += dt;
    this.pulseTimer += dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    // Handle death sequence
    if (this.isDestroying) {
      this.deathTimer += dt;
      
      if (this.deathTimer < 5.0) {
        // Sequential turret explosions
        const explosionInterval = 0.4;
        const explosionIndex = Math.floor(this.deathTimer / explosionInterval);
        
        if (explosionIndex < this.turrets.length && this.deathTimer % explosionInterval < 0.1) {
          const turret = this.turrets[explosionIndex];
          Gyruss.Game.spawnExplosion(turret.x, turret.y, '#ff8800', 60);
          Gyruss.Audio.sfx.play('explosion');
        }
        
        // Screen shake intensifies
        if (this.deathTimer > 3.0) {
          const shake = Math.sin(this.deathTimer * 20) * 5;
          this.centerX = Gyruss.C.CX + shake;
          this.centerY = Gyruss.C.CY + shake * 0.5;
        }
        return;
      } else {
        // Final core explosion
        Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, '#ff6600', 150);
        Gyruss.Audio.sfx.play('bigExplosion');
        Gyruss.Game.score += 15000;
        Gyruss.Game.state = 'victory';
        return;
      }
    }
    
    // Dynamic formation changes
    if (this.modeTimer > 8.0) {
      this.formationMode = this.formationMode === 'orbit' ? 'spread' : 'orbit';
      this.modeTimer = 0;
    }
    
    const aliveTurrets = this.turrets.filter(t => t.health > 0);
    const healthRatio = aliveTurrets.length / this.turrets.length;
    
    // Position turrets in dynamic formations
    this.turrets.forEach((turret, index) => {
      if (turret.health <= 0) return;
      
      turret.fireTimer -= dt;
      turret.chargeTimer -= dt;
      
      let targetAngle = turret.baseAngle + this.time * this.rotationSpeed * (2 - healthRatio);
      let targetRadius = this.orbitRadius;
      
      if (this.formationMode === 'spread') {
        targetRadius += Math.sin(this.time + index) * 60;
        targetAngle += Math.cos(this.time * 0.7 + index) * 0.5;
      }
      
      // Smooth angle interpolation
      turret.currentAngle += (targetAngle - turret.currentAngle) * dt * 3;
      
      turret.x = this.centerX + Math.cos(turret.currentAngle) * targetRadius;
      turret.y = this.centerY + Math.sin(turret.currentAngle) * targetRadius;
      
      // Enhanced firing pattern with charge attacks
      if (turret.fireTimer <= 0 && Gyruss.EnemyBullet) {
        if (turret.chargeTimer <= 0 && Math.random() < 0.3) {
          // Start charging for spread attack
          turret.isCharging = true;
          turret.chargeTimer = 1.5;
        } else if (turret.isCharging && turret.chargeTimer <= 0) {
          // Execute spread attack
          turret.isCharging = false;
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = Math.atan2(playerPos.y - turret.y, playerPos.x - turret.x) + i * 0.2;
            Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
              turret.x, turret.y,
              turret.x + Math.cos(spreadAngle) * 300,
              turret.y + Math.sin(spreadAngle) * 300
            ));
          }
          turret.fireTimer = 3.0;
        } else if (!turret.isCharging) {
          // Normal single shot
          Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
            turret.x, turret.y, playerPos.x, playerPos.y
          ));
          turret.fireTimer = Math.max(1.0, 2.5 - (1 - healthRatio) * 1.5);
        }
      }
    });
    
    // Trigger destruction sequence
    if (this.turrets.every(t => t.health <= 0) && !this.isDestroying) {
      this.isDestroying = true;
      this.deathTimer = 0;
    }
  }
  
  takeDamage(turretIndex, damage = 1) {
    if (turretIndex >= 0 && turretIndex < this.turrets.length) {
      const turret = this.turrets[turretIndex];
      turret.health = Math.max(0, turret.health - damage);
      this.damageFlashTimer = 0.1;
      if (turret.health <= 0) {
        Gyruss.Game.spawnExplosion(turret.x, turret.y, '#ff8800', 50);
        Gyruss.Game.score += 1000;
      }
    }
  }
  
  checkBulletCollision(bulletX, bulletY) {
    // Check turrets only
    for (let i = 0; i < this.turrets.length; i++) {
      const turret = this.turrets[i];
      if (turret.health <= 0) continue;
      
      if (Gyruss.Utils.distSq(bulletX, bulletY, turret.x, turret.y) < 25 * 25) {
        return { hit: true, segmentIndex: i };
      }
    }
    
    return { hit: false };
  }
  
  draw(ctx) {
    // Draw central core structure
    if (!this.isDestroying) {
      const coreGrad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, 40);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, '#ffaa00');
      coreGrad.addColorStop(1, '#cc3300');
      
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffaa00';
      ctx.globalAlpha = 0.8 + Math.sin(this.pulseTimer * 2) * 0.2;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, 30, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      
      // Core energy rings
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffff00';
      ctx.globalAlpha = 0.6;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 30 + i * 15, 0, Gyruss.C.TWO_PI);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    
    // Draw enhanced turrets
    this.turrets.forEach((turret, index) => {
      if (turret.health <= 0) return;
      
      const healthRatio = turret.health / turret.maxHealth;
      const pulse = 0.8 + Math.sin(this.pulseTimer * 3 + turret.shieldPhase) * 0.2;
      const size = turret.isCharging ? 25 : 22;
      
      // Turret body with enhanced gradient
      const turretGrad = ctx.createRadialGradient(turret.x, turret.y, 0, turret.x, turret.y, size);
      turretGrad.addColorStop(0, '#ffffff');
      turretGrad.addColorStop(0.3, turret.isCharging ? '#ffff00' : '#ffaa00');
      turretGrad.addColorStop(0.7, turret.isCharging ? '#ff8800' : '#cc6600');
      turretGrad.addColorStop(1, '#663300');
      
      ctx.fillStyle = turretGrad;
      ctx.shadowBlur = turret.isCharging ? 20 : 12;
      ctx.shadowColor = turret.isCharging ? '#ffff00' : '#ffaa00';
      ctx.globalAlpha = (0.7 + 0.3 * healthRatio) * pulse;
      ctx.beginPath();
      ctx.arc(turret.x, turret.y, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Turret armor plating
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = healthRatio;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Gyruss.C.TWO_PI;
        const x1 = turret.x + Math.cos(angle) * size * 0.7;
        const y1 = turret.y + Math.sin(angle) * size * 0.7;
        const x2 = turret.x + Math.cos(angle) * size * 0.9;
        const y2 = turret.y + Math.sin(angle) * size * 0.9;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      
      // Enhanced turret barrel
      if (Gyruss.Game.player) {
        const playerPos = Gyruss.Utils.polarToCartesian(Gyruss.Game.player.angle, Gyruss.C.PLAYER_ORBIT_RADIUS);
        const barrelAngle = Math.atan2(playerPos.y - turret.y, playerPos.x - turret.x);
        
        // Main barrel
        ctx.strokeStyle = turret.isCharging ? '#ffff00' : '#ffffff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 8;
        ctx.shadowColor = turret.isCharging ? '#ffff00' : '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(turret.x, turret.y);
        ctx.lineTo(turret.x + Math.cos(barrelAngle) * 35, turret.y + Math.sin(barrelAngle) * 35);
        ctx.stroke();
        
        // Barrel tip glow
        ctx.fillStyle = turret.isCharging ? '#ffff00' : '#00ffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = turret.isCharging ? '#ffff00' : '#00ffff';
        ctx.beginPath();
        ctx.arc(
          turret.x + Math.cos(barrelAngle) * 35,
          turret.y + Math.sin(barrelAngle) * 35,
          turret.isCharging ? 6 : 3, 0, Gyruss.C.TWO_PI
        );
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      
      // Charging effect
      if (turret.isCharging) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        ctx.globalAlpha = 0.7 + Math.sin(this.pulseTimer * 10) * 0.3;
        ctx.beginPath();
        ctx.arc(turret.x, turret.y, size * 1.4, 0, Gyruss.C.TWO_PI);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });
    
    // Damage flash
    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlashTimer / 0.1 * 0.3})`;
      ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    }
    
    // Health bar (hide during destruction)
    if (!this.isDestroying) {
      this.drawHealthBar(ctx, 'STAR DESTROYER');
    }
  }
  
  drawHealthBar(ctx, name) {
    const barWidth = 400;
    const barHeight = 20;
    const barX = Gyruss.C.CX - barWidth / 2;
    const barY = 20;
    
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Health calculation based on turrets
    const aliveCount = this.turrets.filter(t => t.health > 0).length;
    const healthRatio = aliveCount / this.turrets.length;
    
    // Health gradient
    const healthGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    if (healthRatio > 0.6) {
      healthGrad.addColorStop(0, '#00ff00');
      healthGrad.addColorStop(1, '#ffff00');
    } else if (healthRatio > 0.3) {
      healthGrad.addColorStop(0, '#ffff00');
      healthGrad.addColorStop(1, '#ff8800');
    } else {
      healthGrad.addColorStop(0, '#ff8800');
      healthGrad.addColorStop(1, '#ff0000');
    }
    
    ctx.fillStyle = healthGrad;
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    
    // Boss name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name, Gyruss.C.CX, barY - 10);
  }
};

// --- GALACTIC CORE BOSS ---
Gyruss.GalacticCore = class GalacticCore {
  constructor() {
    this.centerX = Gyruss.C.CX;
    this.centerY = Gyruss.C.CY;
    this.time = 0;
    this.fireTimer = 1.0;
    this.damageFlashTimer = 0;
    this.orbitals = [];
    this.orbitRadius = 220;
    this.rotationSpeed = 2.0;
    this.coreEnergy = 1.0;
    this.pulseTimer = 0;
    this.waveTimer = 0;
    this.deathTimer = 0;
    this.isDestroying = false;
    
    // Create 6 heavily armed orbital platforms
    for (let i = 0; i < 6; i++) {
      this.orbitals.push({
        baseAngle: (i / 6) * Gyruss.C.TWO_PI,
        currentAngle: (i / 6) * Gyruss.C.TWO_PI,
        x: 0,
        y: 0,
        health: 20,
        maxHealth: 20,
        energyLevel: 1.0,
        wavePhase: i * Math.PI / 3,
        lastShotTime: 0
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    this.pulseTimer += dt;
    this.waveTimer += dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    // Handle death sequence
    if (this.isDestroying) {
      this.deathTimer += dt;
      
      if (this.deathTimer < 6.0) {
        // Spectacular core meltdown sequence
        this.coreEnergy = 1.0 + (this.deathTimer / 2.0);
        
        // Orbital explosions
        if (this.deathTimer > 1.0) {
          const explosionRate = 0.3 - (this.deathTimer - 1.0) * 0.05;
          if (Math.random() < explosionRate) {
            const orbital = this.orbitals[Math.floor(Math.random() * this.orbitals.length)];
            Gyruss.Game.spawnExplosion(
              orbital.x + (Math.random() - 0.5) * 100,
              orbital.y + (Math.random() - 0.5) * 100,
              '#ff00ff', 50
            );
          }
        }
        
        // Core destabilization effects
        if (this.deathTimer > 3.0) {
          const shake = Math.sin(this.deathTimer * 25) * 8;
          this.centerX = Gyruss.C.CX + shake;
          this.centerY = Gyruss.C.CY + shake * 0.6;
          
          // Energy discharge
          if (Math.random() < 0.4) {
            Gyruss.Game.spawnExplosion(
              this.centerX + (Math.random() - 0.5) * 150,
              this.centerY + (Math.random() - 0.5) * 150,
              '#ffffff', 30
            );
          }
        }
        return;
      } else {
        // Final universe-shaking explosion
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, '#ff00ff', 150);
            if (i === 4) {
              Gyruss.Audio.sfx.play('bigExplosion');
              Gyruss.Game.score += 25000;
              Gyruss.Game.state = 'victory';
            }
          }, i * 200);
        }
        return;
      }
    }
    
    const aliveOrbitals = this.orbitals.filter(o => o.health > 0);
    this.coreEnergy = aliveOrbitals.length / this.orbitals.length;
    
    // Dynamic orbital movement with wave formations
    this.orbitals.forEach((orbital, index) => {
      if (orbital.health <= 0) return;
      
      orbital.lastShotTime += dt;
      orbital.energyLevel = Math.max(0, orbital.health / orbital.maxHealth);
      
      // Complex orbital patterns
      const baseRotation = this.time * this.rotationSpeed * (1 + (1 - this.coreEnergy));
      const waveOffset = Math.sin(this.waveTimer + orbital.wavePhase) * 60;
      const spiralEffect = Math.cos(this.time * 0.8 + index) * 30;
      
      orbital.currentAngle = orbital.baseAngle + baseRotation;
      const dynamicRadius = this.orbitRadius + waveOffset + spiralEffect;
      
      orbital.x = this.centerX + Math.cos(orbital.currentAngle) * dynamicRadius;
      orbital.y = this.centerY + Math.sin(orbital.currentAngle) * dynamicRadius;
    });
    
    // Enhanced firing patterns
    if (this.fireTimer <= 0) {
      aliveOrbitals.forEach((orbital, index) => {
        if (orbital.lastShotTime > 0.3 && Gyruss.EnemyBullet) {
          // Wave attack pattern
          if (this.coreEnergy < 0.5) {
            // Desperate rapid fire when heavily damaged
            for (let i = 0; i < 3; i++) {
              const spreadAngle = (i - 1) * 0.4;
              const targetAngle = Math.atan2(playerPos.y - orbital.y, playerPos.x - orbital.x) + spreadAngle;
              Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
                orbital.x, orbital.y,
                orbital.x + Math.cos(targetAngle) * 400,
                orbital.y + Math.sin(targetAngle) * 400
              ));
            }
          } else {
            // Normal tracking shot
            Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
              orbital.x, orbital.y, playerPos.x, playerPos.y
            ));
          }
          orbital.lastShotTime = 0;
        }
      });
      
      this.fireTimer = Math.max(1.0, 2.0 - (1 - this.coreEnergy) * 0.8);
    }
    
    // Trigger destruction sequence
    if (this.orbitals.every(o => o.health <= 0) && !this.isDestroying) {
      this.isDestroying = true;
      this.deathTimer = 0;
    }
  }
  
  takeDamage(orbitalIndex, damage = 1) {
    if (orbitalIndex >= 0 && orbitalIndex < this.orbitals.length) {
      const orbital = this.orbitals[orbitalIndex];
      orbital.health = Math.max(0, orbital.health - damage);
      this.damageFlashTimer = 0.1;
      if (orbital.health <= 0) {
        Gyruss.Game.spawnExplosion(orbital.x, orbital.y, '#ff00ff', 60);
        Gyruss.Game.score += 1500;
      }
    }
  }
  
  checkBulletCollision(bulletX, bulletY) {
    // Check orbitals only
    for (let i = 0; i < this.orbitals.length; i++) {
      const orbital = this.orbitals[i];
      if (orbital.health <= 0) continue;
      
      if (Gyruss.Utils.distSq(bulletX, bulletY, orbital.x, orbital.y) < 30 * 30) {
        return { hit: true, segmentIndex: i };
      }
    }
    
    return { hit: false };
  }
  
  draw(ctx) {
    // Draw the magnificent galactic core
    const coreSize = 50 * this.coreEnergy;
    const coreGrad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, coreSize * 1.5);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.2, '#ff00ff');
    coreGrad.addColorStop(0.6, '#8800ff');
    coreGrad.addColorStop(1, '#440088');
    
    ctx.fillStyle = coreGrad;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff00ff';
    ctx.globalAlpha = 0.9 + Math.sin(this.pulseTimer * 3) * 0.1;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, coreSize, 0, Gyruss.C.TWO_PI);
    ctx.fill();
    
    // Core energy rings
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffff00';
    ctx.globalAlpha = 0.7;
    for (let i = 1; i <= 4; i++) {
      const ringRadius = coreSize + i * 20;
      const ringAlpha = 1 - (i * 0.2);
      ctx.globalAlpha = ringAlpha * (0.5 + Math.sin(this.pulseTimer * 2 + i) * 0.3);
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, ringRadius, 0, Gyruss.C.TWO_PI);
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    // Energy beams connecting orbitals to core
    this.orbitals.forEach(orbital => {
      if (orbital.health <= 0) return;
      
      const beamGrad = ctx.createLinearGradient(this.centerX, this.centerY, orbital.x, orbital.y);
      beamGrad.addColorStop(0, '#ff00ff');
      beamGrad.addColorStop(0.5, '#8800ff');
      beamGrad.addColorStop(1, '#ff00ff');
      
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 3 + Math.sin(this.pulseTimer * 4) * 1;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff00ff';
      ctx.globalAlpha = 0.6 + orbital.energyLevel * 0.3;
      ctx.beginPath();
      ctx.moveTo(this.centerX, this.centerY);
      ctx.lineTo(orbital.x, orbital.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
    
    // Draw enhanced orbital platforms
    this.orbitals.forEach((orbital, index) => {
      if (orbital.health <= 0) return;
      
      const healthRatio = orbital.energyLevel;
      const size = 28;
      const pulse = 0.8 + Math.sin(this.pulseTimer * 4 + orbital.wavePhase) * 0.2;
      
      // Main orbital platform
      const orbitalGrad = ctx.createRadialGradient(orbital.x, orbital.y, 0, orbital.x, orbital.y, size * 1.2);
      orbitalGrad.addColorStop(0, '#ffffff');
      orbitalGrad.addColorStop(0.3, '#ff00ff');
      orbitalGrad.addColorStop(0.7, '#8800ff');
      orbitalGrad.addColorStop(1, '#440022');
      
      ctx.fillStyle = orbitalGrad;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff00ff';
      ctx.globalAlpha = (0.8 + 0.2 * healthRatio) * pulse;
      ctx.beginPath();
      ctx.arc(orbital.x, orbital.y, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Orbital structure details
      ctx.strokeStyle = '#ccccff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ccccff';
      ctx.globalAlpha = healthRatio;
      
      // Structural spokes
      for (let i = 0; i < 8; i++) {
        const spokeAngle = (i / 8) * Gyruss.C.TWO_PI + this.time;
        const innerR = size * 0.4;
        const outerR = size * 0.9;
        ctx.beginPath();
        ctx.moveTo(
          orbital.x + Math.cos(spokeAngle) * innerR,
          orbital.y + Math.sin(spokeAngle) * innerR
        );
        ctx.lineTo(
          orbital.x + Math.cos(spokeAngle) * outerR,
          orbital.y + Math.sin(spokeAngle) * outerR
        );
        ctx.stroke();
      }
      
      // Central energy core
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffffff';
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(orbital.x, orbital.y, size * 0.3, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      
      // Weapon charge indicator
      if (orbital.lastShotTime < 0.2) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(orbital.x, orbital.y, size * 1.3, 0, Gyruss.C.TWO_PI);
        ctx.stroke();
      }
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
    
    // Damage flash
    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 0, 255, ${this.damageFlashTimer / 0.1 * 0.3})`;
      ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    }
    
    // Health bar (hide during destruction)
    if (!this.isDestroying) {
      this.drawHealthBar(ctx, 'GALACTIC CORE');
    }
  }
  
  drawHealthBar(ctx, name) {
    const barWidth = 400;
    const barHeight = 20;
    const barX = Gyruss.C.CX - barWidth / 2;
    const barY = 20;
    
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Health calculation based on orbitals
    const aliveCount = this.orbitals.filter(o => o.health > 0).length;
    const healthRatio = aliveCount / this.orbitals.length;
    
    // Health gradient
    const healthGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    if (healthRatio > 0.6) {
      healthGrad.addColorStop(0, '#00ff00');
      healthGrad.addColorStop(1, '#ffff00');
    } else if (healthRatio > 0.3) {
      healthGrad.addColorStop(0, '#ffff00');
      healthGrad.addColorStop(1, '#ff8800');
    } else {
      healthGrad.addColorStop(0, '#ff8800');
      healthGrad.addColorStop(1, '#ff0000');
    }
    
    ctx.fillStyle = healthGrad;
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    
    // Boss name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name, Gyruss.C.CX, barY - 10);
  }
};