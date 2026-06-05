/**
 * breadcrumb.js
 * Breadcrumb spawning, bobbing, and lifecycle management.
 * Exposes window.DuckPondBreadcrumb.
 */
(function () {
  'use strict';

  class Breadcrumb {
    constructor(x, y, particles, audioManager, pond) {
      this.x = x;
      this.y = y;
      this.pond = pond;
      this.particles = particles;
      this.audioManager = audioManager;

      this.dead = false;
      this.bobTime = Math.random() * Math.PI * 2;
      this.bobSpeed = 1.8 + Math.random() * 0.8;
      this.bobAmp = 1.8 + Math.random() * 1.2;
      this.baseY = y;

      this.size = 10 + Math.random() * 4;
      this.angle = Math.random() * Math.PI * 2;
      this.spinSpeed = (Math.random() - 0.5) * 0.8;

      this.landAnimTimer = 0;
      this.landAnimDuration = 0.4;
      this.landed = false;

      if (particles) {
        particles.spawnCrumbRipple(x, y);
      }
      if (audioManager) {
        audioManager.play('splash');
      }
    }

    onEaten() {
      if (this.dead) return;
      this.dead = true;
      if (this.particles) {
        this.particles.spawnSplash(this.x, this.y, 12);
        this.particles.spawnEatBurst(this.x, this.y, 6);
        this.particles.spawnRipple(this.x, this.y);
      }
    }

    update(dt) {
      if (this.dead) return;
      this.bobTime += this.bobSpeed * dt;
      this.y = this.baseY + Math.sin(this.bobTime) * this.bobAmp;
      this.angle += this.spinSpeed * dt;

      if (!this.landed) {
        this.landAnimTimer += dt;
        if (this.landAnimTimer >= this.landAnimDuration) {
          this.landed = true;
        }
      }
    }

    draw(ctx, breadcrumbImg) {
      if (this.dead) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      let scale = 1;
      if (!this.landed) {
        const p = this.landAnimTimer / this.landAnimDuration;
        scale = 0.4 + p * 0.7 + Math.sin(p * Math.PI) * 0.15;
      }
      ctx.scale(scale, scale);

      const s = this.size;

      if (breadcrumbImg) {
        ctx.drawImage(breadcrumbImg, -s / 2, -s / 2, s, s);
      } else {
        ctx.fillStyle = '#8B5E3C';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.52, s * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#A0714F';
        ctx.beginPath();
        ctx.ellipse(-1, -1, s * 0.38, s * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,220,150,0.3)';
        ctx.beginPath();
        ctx.ellipse(-2, -2, s * 0.18, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function spawnBreadcrumbs(clickX, clickY, pond, particles, audioManager, existingList) {
    const count = 3 + Math.floor(Math.random() * 3);
    const spawned = [];
    const maxAttempts = count * 8;
    let attempts = 0;

    while (spawned.length < count && attempts < maxAttempts) {
      attempts++;
      const spread = 28 + Math.random() * 18;
      const angle = Math.random() * Math.PI * 2;
      const x = clickX + Math.cos(angle) * spread * Math.random();
      const y = clickY + Math.sin(angle) * spread * 0.55 * Math.random();

      if (pond.containsPoint(x, y)) {
        spawned.push(new Breadcrumb(x, y, particles, audioManager, pond));
      }
    }

    if (spawned.length === 0 && pond.containsPoint(clickX, clickY)) {
      spawned.push(new Breadcrumb(clickX, clickY, particles, audioManager, pond));
    }

    return existingList.concat(spawned);
  }

  window.DuckPondBreadcrumb = { Breadcrumb, spawnBreadcrumbs };
})();
