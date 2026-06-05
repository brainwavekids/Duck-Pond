/**
 * pond.js
 * Renders the pond, animated water ripples, and grass background.
 * Exposes window.DuckPondPond.
 */
(function () {
  'use strict';

  class Pond {
    constructor(cx, cy, rx, ry) {
      this.cx = cx;
      this.cy = cy;
      this.rx = rx;
      this.ry = ry;
      this.time = 0;

      this.idleRipples = [];
      this.spawnTimer = 0;
      this.spawnInterval = 2.8 + Math.random() * 1.5;

      this.bgPattern = null;
      this.bgCanvas = null;

      this.shoreRipples = [];
      this.shoreTimer = 0;
    }

    containsPoint(x, y) {
      const dx = (x - this.cx) / (this.rx + 4);
      const dy = (y - this.cy) / (this.ry + 4);
      return dx * dx + dy * dy <= 1;
    }

    buildBgPattern(ctx, backgroundTile) {
      if (this.bgPattern) return;
      if (backgroundTile) {
        try {
          this.bgPattern = ctx.createPattern(backgroundTile, 'repeat');
        } catch (_) {}
      }
      if (!this.bgPattern) {
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = 64;
        this.bgCanvas.height = 64;
        const bc = this.bgCanvas.getContext('2d');
        bc.fillStyle = '#5a9e3d';
        bc.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 30; i++) {
          bc.fillStyle = i % 2 === 0 ? '#4e8e32' : '#6ab84a';
          bc.fillRect(Math.random() * 64, Math.random() * 64, 2, 5 + Math.random() * 4);
        }
        this.bgPattern = ctx.createPattern(this.bgCanvas, 'repeat');
      }
    }

    _spawnIdleRipple() {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.2 + Math.random() * 0.6;
      const x = this.cx + Math.cos(angle) * this.rx * dist;
      const y = this.cy + Math.sin(angle) * this.ry * dist;
      this.idleRipples.push({
        x, y,
        radius: 2,
        maxRadius: 18 + Math.random() * 12,
        growSpeed: 18 + Math.random() * 10,
        alpha: 0.55,
        life: 1,
        decay: 0.012 + Math.random() * 0.006,
      });
    }

    update(dt) {
      this.time += dt;

      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnInterval = 2.2 + Math.random() * 1.8;
        this._spawnIdleRipple();
        if (Math.random() < 0.4) this._spawnIdleRipple();
      }

      this.idleRipples.forEach((r) => {
        r.radius += r.growSpeed * dt;
        r.life -= r.decay;
        r.alpha = Math.max(0, r.life * 0.55);
      });
      this.idleRipples = this.idleRipples.filter((r) => r.life > 0);
    }

    drawBackground(ctx, canvasW, canvasH) {
      if (this.bgPattern) {
        ctx.save();
        ctx.fillStyle = this.bgPattern;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();
      } else {
        ctx.fillStyle = '#5a9e3d';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
    }

    drawPond(ctx, pondImg) {
      ctx.save();

      const gradient = ctx.createRadialGradient(
        this.cx - this.rx * 0.25, this.cy - this.ry * 0.25, this.ry * 0.05,
        this.cx, this.cy, Math.max(this.rx, this.ry)
      );
      gradient.addColorStop(0, 'rgba(100,210,255,0.18)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
      ctx.clip();

      if (pondImg) {
        ctx.drawImage(pondImg, this.cx - this.rx, this.cy - this.ry, this.rx * 2, this.ry * 2);
      } else {
        const grad = ctx.createRadialGradient(
          this.cx - this.rx * 0.2, this.cy - this.ry * 0.2, this.ry * 0.08,
          this.cx, this.cy, Math.max(this.rx, this.ry)
        );
        grad.addColorStop(0, '#6dd5fa');
        grad.addColorStop(0.5, '#2980b9');
        grad.addColorStop(1, '#1a5276');
        ctx.fillStyle = grad;
        ctx.fillRect(this.cx - this.rx, this.cy - this.ry, this.rx * 2, this.ry * 2);
      }

      const wavesY = this.cy + Math.sin(this.time * 0.7) * 3;
      ctx.fillStyle = gradient;
      ctx.fillRect(this.cx - this.rx, this.cy - this.ry, this.rx * 2, this.ry * 2);

      this.idleRipples.forEach((r) => {
        ctx.save();
        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      ctx.restore();

      ctx.save();
      const shoreGrad = ctx.createRadialGradient(this.cx, this.cy, Math.max(this.rx, this.ry) * 0.85, this.cx, this.cy, Math.max(this.rx, this.ry) * 1.08);
      shoreGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shoreGrad.addColorStop(1, 'rgba(70,120,40,0.55)');
      ctx.fillStyle = shoreGrad;
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy, this.rx + 12, this.ry + 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(100,180,255,0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  window.DuckPondPond = { Pond };
})();
