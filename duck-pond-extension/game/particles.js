/**
 * particles.js
 * Splash and ripple particle system for the Duck Pond game.
 * Exposes window.DuckPondParticles.
 */
(function () {
  'use strict';

  class Particle {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type; // 'splash' | 'ripple' | 'crumb_ripple'
      this.alpha = 1;
      this.life = 1;

      if (type === 'splash') {
        this.vx = (Math.random() - 0.5) * 120;
        this.vy = -Math.random() * 80 - 40;
        this.radius = Math.random() * 3 + 1.5;
        this.color = `hsl(${195 + Math.random() * 20}, 80%, ${60 + Math.random() * 20}%)`;
        this.decay = 0.025 + Math.random() * 0.015;
        this.gravity = 120;
      } else if (type === 'ripple') {
        this.radius = 4 + Math.random() * 4;
        this.maxRadius = 40 + Math.random() * 30;
        this.growSpeed = 60 + Math.random() * 40;
        this.decay = 0.018 + Math.random() * 0.01;
        this.strokeWidth = 2;
      } else if (type === 'crumb_ripple') {
        this.radius = 2;
        this.maxRadius = 22 + Math.random() * 12;
        this.growSpeed = 45 + Math.random() * 20;
        this.decay = 0.022 + Math.random() * 0.01;
        this.strokeWidth = 1.5;
      } else if (type === 'eat_burst') {
        this.vx = (Math.random() - 0.5) * 60;
        this.vy = (Math.random() - 0.5) * 60;
        this.radius = Math.random() * 2 + 1;
        this.color = '#f5c518';
        this.decay = 0.03 + Math.random() * 0.02;
        this.gravity = 0;
      }
    }

    update(dt) {
      this.life -= this.decay;
      this.alpha = Math.max(0, this.life);

      if (this.type === 'splash') {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else if (this.type === 'ripple' || this.type === 'crumb_ripple') {
        this.radius += this.growSpeed * dt;
      } else if (this.type === 'eat_burst') {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }

    draw(ctx) {
      if (this.alpha <= 0) return;

      if (this.type === 'splash' || this.type === 'eat_burst') {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (this.type === 'ripple' || this.type === 'crumb_ripple') {
        ctx.save();
        ctx.globalAlpha = this.alpha * 0.6;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = this.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    isDead() {
      return this.life <= 0;
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
    }

    spawnSplash(x, y, count = 10) {
      for (let i = 0; i < count; i++) {
        this.particles.push(new Particle(x, y, 'splash'));
      }
    }

    spawnRipple(x, y) {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const p = new Particle(x, y, 'ripple');
        p.life -= i * 0.12;
        this.particles.push(p);
      }
    }

    spawnCrumbRipple(x, y) {
      this.particles.push(new Particle(x, y, 'crumb_ripple'));
      this.particles.push(new Particle(x, y, 'crumb_ripple'));
    }

    spawnEatBurst(x, y, count = 8) {
      for (let i = 0; i < count; i++) {
        this.particles.push(new Particle(x, y, 'eat_burst'));
      }
    }

    update(dt) {
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.isDead());
    }

    draw(ctx) {
      this.particles.forEach((p) => p.draw(ctx));
    }

    clear() {
      this.particles = [];
    }
  }

  window.DuckPondParticles = { ParticleSystem };
})();
