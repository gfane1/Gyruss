// --- BOSS CLASS ---
window.Gyruss = window.Gyruss || {};

Gyruss.CosmicSerpent = class CosmicSerpent {
  constructor(length = 12) {
    this.segments = [];
    this.baseRadius = Gyruss.C.CY * 0.6;
    this.amplitude = Gyruss.C.CY * 0.3;
    this.frequency = 0.8;
    this.speed = 1.2;
    this.time = 0;
    this.health = length * 3;
    this.maxHealth = this.health;
    this.fireTimer = 1.0;
    this.damageFlashTimer = 0;
    for (let i = 0; i < length; i++) {
      this.segments.push({ 
        angle: 0, 
        radius: 0, 
        isHead: i === 0,
        health: 3
      });
    }
  }
  
  update(dt, playerPos) {
    this.time += dt;
    this.fireTimer -= dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const phase = this.time * this.speed - i * 0.3;
      seg.angle = phase;
      seg.radius = this.baseRadius + Math.sin(phase * this.frequency) * this.amplitude;
      if (this.fireTimer <= 0 && (i % 3 === 0)) {
        const pos = Gyruss.Utils.polarToCartesian(seg.angle, seg.radius);
        Gyruss.Game.enemyBullets.push(new Gyruss.EnemyBullet(pos.x, pos.y, playerPos.x, playerPos.y));
      }
    }
    if (this.fireTimer <= 0) this.fireTimer = 0.8;
    
    // Remove dead segments
    this.segments = this.segments.filter(seg => seg.health > 0);
    
    // Check if boss is defeated
    if (this.segments.length === 0) {
      Gyruss.Game.spawnExplosion(Gyruss.C.CX, Gyruss.C.CY, Gyruss.C.ENEMY_COLORS[0], 200);
      Gyruss.Game.score += 10000;
      Gyruss.Game.state = 'victory';
    }
  }
  
  takeDamage(segmentIndex) {
    const segment = this.segments[segmentIndex];
    if (!segment) return;
    
    segment.health--;
    this.health = Math.max(0, this.health - 1);
    this.damageFlashTimer = 0.1;
    
    if (segment.health <= 0) {
      const pos = Gyruss.Utils.polarToCartesian(segment.angle, segment.radius);
      Gyruss.Game.spawnExplosion(pos.x, pos.y, segment.isHead ? '#ff5555' : '#55ff55', 30);
      Gyruss.Game.score += segment.isHead ? 2000 : 500;
    }
  }
  
  draw(ctx) {
    this.segments.forEach((seg) => {
      const pos = Gyruss.Utils.polarToCartesian(seg.angle, seg.radius);
      const size = seg.isHead ? 25 : 15;
      ctx.fillStyle = seg.isHead ? '#ff5555' : '#55ff55';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Gyruss.C.TWO_PI);
      ctx.fill();
    });
    
    // Health bar
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(Gyruss.C.CX - 200, 20, 400, 20);
    ctx.fillStyle = '#ff5555';
    ctx.fillRect(Gyruss.C.CX - 200, 20, 400 * (this.health / this.maxHealth), 20);
  }
};