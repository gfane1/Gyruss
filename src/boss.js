// --- BOSS CLASS ---
window.Gyruss = window.Gyruss || {};

Gyruss.CosmicSerpent = class CosmicSerpent {
  constructor(length = 8) {
    this.segments = [];
    this.centerX = Gyruss.C.CX;
    this.centerY = Gyruss.C.CY;
    this.orbitRadius = 120;
    this.speed = 1.2;
    this.time = 0;
    this.health = length * 3;
    this.maxHealth = this.health;
    this.fireTimer = 1.0;
    this.damageFlashTimer = 0;
    
    // Create segments in a line formation
    for (let i = 0; i < length; i++) {
      this.segments.push({ 
        offsetAngle: (i / length) * Math.PI * 0.3,
        x: 0,
        y: 0,
        isHead: i === 0,
        health: 3
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    // Serpentine movement pattern
    const baseAngle = this.time * this.speed;
    const waveAmplitude = 80;
    const waveFreq = 2.0;
    
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const segmentAngle = baseAngle + seg.offsetAngle;
      const wave = Math.sin(this.time * waveFreq + i * 0.5) * waveAmplitude;
      
      seg.x = this.centerX + Math.cos(segmentAngle) * (this.orbitRadius + wave * 0.3);
      seg.y = this.centerY + Math.sin(segmentAngle) * (this.orbitRadius + wave * 0.3) + wave;
      
      if (this.fireTimer <= 0 && (i % 3 === 0) && Gyruss.EnemyBullet) {
        Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(seg.x, seg.y, playerPos.x, playerPos.y));
      }
    }
    if (this.fireTimer <= 0) this.fireTimer = 2.0;
    
    this.segments = this.segments.filter(seg => seg.health > 0);
    
    if (this.segments.length === 0) {
      Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, '#ff6600', 200);
      Gyruss.Game.score += 10000;
      Gyruss.Game.state = 'victory';
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
    if (this.segments.length === 0) return;

    // Draw boss segments as clear, shootable targets
    this.segments.forEach((seg, index) => {
      const size = seg.isHead ? 20 : 15;
      const healthRatio = seg.health / 3;
      
      // Draw shootable segment at screen coordinates
      const segGrad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, size);
      if (seg.isHead) {
        segGrad.addColorStop(0, '#ffffff');
        segGrad.addColorStop(0.5, '#ff4444');
        segGrad.addColorStop(1, '#cc0000');
      } else {
        segGrad.addColorStop(0, '#ffffff');
        segGrad.addColorStop(0.5, '#44ff44');
        segGrad.addColorStop(1, '#00cc00');
      }
      
      ctx.fillStyle = segGrad;
      ctx.shadowBlur = 10;
      ctx.shadowColor = seg.isHead ? '#ff4444' : '#44ff44';
      ctx.globalAlpha = 0.8 + 0.2 * healthRatio;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Draw connecting lines between segments
      if (index > 0) {
        const prevSeg = this.segments[index - 1];
        
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(prevSeg.x, prevSeg.y);
        ctx.lineTo(seg.x, seg.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Damage flash effect
    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlashTimer / 0.1 * 0.3})`;
      ctx.fillRect(0, 0, Gyruss.C.WIDTH, Gyruss.C.HEIGHT);
    }

    // Health bar
    this.drawHealthBar(ctx, 'COSMIC SERPENT');
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
    this.orbitRadius = 180;
    this.rotationSpeed = 0.8;
    
    // Create 6 turrets in orbit around center
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Gyruss.C.TWO_PI;
      this.turrets.push({
        baseAngle: angle,
        x: 0,
        y: 0,
        health: 12,
        maxHealth: 12,
        fireTimer: Math.random() * 2
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    // Position turrets in formation
    this.turrets.forEach((turret, index) => {
      turret.fireTimer -= dt;
      const currentAngle = turret.baseAngle + this.time * this.rotationSpeed;
      
      turret.x = this.centerX + Math.cos(currentAngle) * this.orbitRadius;
      turret.y = this.centerY + Math.sin(currentAngle) * this.orbitRadius;
      
      if (turret.fireTimer <= 0 && turret.health > 0 && Gyruss.EnemyBullet) {
        Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
          turret.x, turret.y, playerPos.x, playerPos.y
        ));
        turret.fireTimer = 2.0 + Math.random();
      }
    });
    
    // Check if all turrets destroyed
    if (this.turrets.every(t => t.health <= 0)) {
      Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, '#ff6600', 300);
      Gyruss.Game.score += 15000;
      Gyruss.Game.state = 'victory';
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
    // Draw turrets as clear, shootable targets
    this.turrets.forEach(turret => {
      if (turret.health <= 0) return;
      
      const healthRatio = turret.health / turret.maxHealth;
      
      const turretGrad = ctx.createRadialGradient(turret.x, turret.y, 0, turret.x, turret.y, 18);
      turretGrad.addColorStop(0, '#ffffff');
      turretGrad.addColorStop(0.5, '#ffaa00');
      turretGrad.addColorStop(1, '#cc6600');
      
      ctx.fillStyle = turretGrad;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffaa00';
      ctx.globalAlpha = 0.8 + 0.2 * healthRatio;
      ctx.beginPath();
      ctx.arc(turret.x, turret.y, 18, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      
      // Draw turret barrel pointing toward player
      if (Gyruss.Game.player) {
        const playerPos = Gyruss.Utils.polarToCartesian(Gyruss.Game.player.angle, Gyruss.C.PLAYER_ORBIT_RADIUS);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(turret.x, turret.y);
        const barrelAngle = Math.atan2(playerPos.y - turret.y, playerPos.x - turret.x);
        ctx.lineTo(turret.x + Math.cos(barrelAngle) * 25, turret.y + Math.sin(barrelAngle) * 25);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    
    // Health bar
    this.drawHealthBar(ctx, 'STAR DESTROYER');
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
    this.orbitRadius = 200;
    this.rotationSpeed = 1.5;
    
    // Create 4 orbital satellites that can be shot
    for (let i = 0; i < 4; i++) {
      this.orbitals.push({
        baseAngle: (i / 4) * Gyruss.C.TWO_PI,
        x: 0,
        y: 0,
        health: 15,
        maxHealth: 15
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    // Position orbitals in formation
    this.orbitals.forEach(orbital => {
      if (orbital.health <= 0) return;
      const currentAngle = orbital.baseAngle + this.time * this.rotationSpeed;
      
      orbital.x = this.centerX + Math.cos(currentAngle) * this.orbitRadius;
      orbital.y = this.centerY + Math.sin(currentAngle) * this.orbitRadius;
    });
    
    if (this.fireTimer <= 0) {
      this.orbitals.forEach(orbital => {
        if (orbital.health > 0 && Gyruss.EnemyBullet) {
          Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(
            orbital.x, orbital.y, playerPos.x, playerPos.y
          ));
        }
      });
      this.fireTimer = 2.5;
    }
    
    // Check if all orbitals destroyed
    if (this.orbitals.every(o => o.health <= 0)) {
      Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, '#ff00ff', 400);
      Gyruss.Game.score += 25000;
      Gyruss.Game.state = 'victory';
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
    // Draw orbitals as clear, shootable targets
    this.orbitals.forEach(orbital => {
      if (orbital.health <= 0) return;
      
      const healthRatio = orbital.health / orbital.maxHealth;
      
      const orbitalGrad = ctx.createRadialGradient(orbital.x, orbital.y, 0, orbital.x, orbital.y, 22);
      orbitalGrad.addColorStop(0, '#ffffff');
      orbitalGrad.addColorStop(0.5, '#ff00ff');
      orbitalGrad.addColorStop(1, '#880044');
      
      ctx.fillStyle = orbitalGrad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff00ff';
      ctx.globalAlpha = 0.8 + 0.2 * healthRatio;
      ctx.beginPath();
      ctx.arc(orbital.x, orbital.y, 22, 0, Gyruss.C.TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      
      // Draw energy core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orbital.x, orbital.y, 8, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    });
    
    // Health bar
    this.drawHealthBar(ctx, 'GALACTIC CORE');
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