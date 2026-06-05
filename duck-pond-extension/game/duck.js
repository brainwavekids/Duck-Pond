/**
 * duck.js
 * Duck entity with steering, bobbing, and eating animation.
 * Exposes window.DuckPondDuck.
 */
(function () {
  'use strict';

  const TWO_PI = Math.PI * 2;

  class Duck {
    constructor(x, y, pond) {
      this.x = x;
      this.y = y;
      this.pond = pond;

      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.targetAngle = 0;

      this.speed = 38;
      this.maxSpeed = 75;
      this.wanderTimer = 0;
      this.wanderInterval = 2.5 + Math.random() * 2;
      this.wanderTarget = { x, y };

      this.bobTime = Math.random() * TWO_PI;
      this.bobSpeed = 2.2 + Math.random() * 0.6;
      this.bobAmp = 2.5;

      this.eatAnimTimer = 0;
      this.eatAnimDuration = 0.45;
      this.eating = false;

      this.size = 40;

      this.wanderToNewTarget();
    }

    wanderToNewTarget() {
      const angle = Math.random() * TWO_PI;
      const dist = 0.15 + Math.random() * 0.6;
      this.wanderTarget = {
        x: this.pond.cx + Math.cos(angle) * this.pond.rx * dist,
        y: this.pond.cy + Math.sin(angle) * this.pond.ry * dist,
      };
    }

    update(dt, breadcrumbs) {
      this.bobTime += this.bobSpeed * dt;

      let tx, ty, targetSpeed;

      const nearest = this._findNearest(breadcrumbs);
      if (nearest) {
        tx = nearest.x;
        ty = nearest.y;
        targetSpeed = this.maxSpeed;

        const dist = Math.hypot(tx - this.x, ty - this.y);
        if (dist < 10) {
          nearest.onEaten();
        }
      } else {
        this.wanderTimer += dt;
        if (this.wanderTimer >= this.wanderInterval) {
          this.wanderTimer = 0;
          this.wanderInterval = 2.2 + Math.random() * 2.5;
          this.wanderToNewTarget();
        }
        tx = this.wanderTarget.x;
        ty = this.wanderTarget.y;
        targetSpeed = this.speed;

        const dist = Math.hypot(tx - this.x, ty - this.y);
        if (dist < 8) {
          this.wanderTimer = this.wanderInterval;
        }
      }

      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const desiredVx = (dx / dist) * targetSpeed;
        const desiredVy = (dy / dist) * targetSpeed;

        const steer = 6.5;
        this.vx += (desiredVx - this.vx) * steer * dt;
        this.vy += (desiredVy - this.vy) * steer * dt;
      } else {
        this.vx *= 0.88;
        this.vy *= 0.88;
      }

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > this.maxSpeed) {
        this.vx = (this.vx / speed) * this.maxSpeed;
        this.vy = (this.vy / speed) * this.maxSpeed;
      }

      let nx = this.x + this.vx * dt;
      let ny = this.y + this.vy * dt;

      const pdx = (nx - this.pond.cx) / (this.pond.rx - this.size * 0.4);
      const pdy = (ny - this.pond.cy) / (this.pond.ry - this.size * 0.4);
      const pDist = Math.hypot(pdx, pdy);
      if (pDist > 1) {
        nx = this.x;
        ny = this.y;
        this.vx *= -0.4;
        this.vy *= -0.4;
        this.wanderToNewTarget();
      }

      this.x = nx;
      this.y = ny;

      if (speed > 4) {
        this.targetAngle = Math.atan2(this.vy, this.vx);
      }

      let da = this.targetAngle - this.angle;
      while (da > Math.PI) da -= TWO_PI;
      while (da < -Math.PI) da += TWO_PI;
      this.angle += da * Math.min(1, 8 * dt);

      if (this.eating) {
        this.eatAnimTimer += dt;
        if (this.eatAnimTimer >= this.eatAnimDuration) {
          this.eating = false;
          this.eatAnimTimer = 0;
        }
      }
    }

    triggerEat() {
      this.eating = true;
      this.eatAnimTimer = 0;
    }

    _findNearest(breadcrumbs) {
      let nearest = null;
      let minDist = Infinity;
      breadcrumbs.forEach((b) => {
        if (b.dead) return;
        const d = Math.hypot(b.x - this.x, b.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = b;
        }
      });
      return nearest;
    }

    draw(ctx, duckImg) {
      const bob = Math.sin(this.bobTime) * this.bobAmp;

      const eatScale = this.eating
        ? 1 + 0.15 * Math.sin((this.eatAnimTimer / this.eatAnimDuration) * Math.PI)
        : 1;

      ctx.save();
      ctx.translate(this.x, this.y + bob);
      ctx.rotate(this.angle);

      const w = this.size * eatScale;
      const h = this.size * eatScale;

      if (duckImg) {
        ctx.drawImage(duckImg, -w / 2, -h / 2, w, h);
      } else {
        ctx.fillStyle = '#f5c518';
        ctx.beginPath();
        ctx.ellipse(0, 4, w * 0.45, h * 0.32, 0, 0, TWO_PI);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(w * 0.08, -h * 0.15, w * 0.28, h * 0.26, 0, 0, TWO_PI);
        ctx.fill();

        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.moveTo(w * 0.36, -h * 0.14);
        ctx.lineTo(w * 0.55, -h * 0.2);
        ctx.lineTo(w * 0.36, -h * 0.08);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(w * 0.18, -h * 0.2, 2.5, 0, TWO_PI);
        ctx.fill();
      }

      ctx.restore();

      if (this.eating) {
        const p = this.eatAnimTimer / this.eatAnimDuration;
        const numLines = 5;
        for (let i = 0; i < numLines; i++) {
          const a = (i / numLines) * TWO_PI + this.angle;
          const r1 = this.size * 0.6;
          const r2 = r1 + 8 + Math.sin(p * Math.PI) * 6;
          ctx.save();
          ctx.globalAlpha = (1 - p) * 0.7;
          ctx.strokeStyle = '#ffe066';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(a) * r1, this.y + bob + Math.sin(a) * r1);
          ctx.lineTo(this.x + Math.cos(a) * r2, this.y + bob + Math.sin(a) * r2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  window.DuckPondDuck = { Duck };
})();
