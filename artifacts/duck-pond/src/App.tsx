import { useEffect, useRef, useState, useCallback } from "react";

const TWO_PI = Math.PI * 2;
const MAX_DISPLAY_TILT = Math.PI / 2.2;

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS = { pre: "dp-previews", vol: "dp-volumes", aud: (k: string) => "dp-audio-" + k };
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ── Procedural asset drawers ───────────────────────────────────────────────────
function drawDuckImg() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f5c518";
  ctx.beginPath(); ctx.ellipse(32, 38, 20, 14, 0, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(32, 24, 13, 12, 0, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = "#ff8c00";
  ctx.beginPath(); ctx.moveTo(44, 24); ctx.lineTo(54, 21); ctx.lineTo(44, 27); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(36, 20, 2.5, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = "#f0a500";
  ctx.beginPath(); ctx.ellipse(28, 52, 10, 4, 0.1, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = "#d48800";
  ctx.beginPath(); ctx.ellipse(36, 52, 10, 4, -0.1, 0, TWO_PI); ctx.fill();
  const img = new Image(); img.src = c.toDataURL(); return img;
}
function drawPondImg() {
  const c = document.createElement("canvas"); c.width = 400; c.height = 260;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(200, 130, 20, 200, 130, 180);
  grad.addColorStop(0, "#4fc3f7"); grad.addColorStop(0.5, "#29b6f6"); grad.addColorStop(1, "#0288d1");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(200, 130, 190, 120, 0, 0, TWO_PI); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(200, 130, 180 - i * 30, 110 - i * 18, 0, 0, TWO_PI); ctx.stroke(); }
  const img = new Image(); img.src = c.toDataURL(); return img;
}
function drawCrumbImg() {
  const c = document.createElement("canvas"); c.width = 20; c.height = 20;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8B5E3C"; ctx.beginPath(); ctx.ellipse(10, 11, 7, 5, -0.3, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = "#A0714F"; ctx.beginPath(); ctx.ellipse(10, 10, 6, 4, -0.3, 0, TWO_PI); ctx.fill();
  const img = new Image(); img.src = c.toDataURL(); return img;
}

// ── Particle ───────────────────────────────────────────────────────────────────
class Particle {
  x: number; y: number; type: string; alpha = 1; life = 1;
  vx = 0; vy = 0; radius = 3; growSpeed = 60; decay = 0.02;
  strokeWidth = 1.5; color = "#4fc3f7"; gravity = 0;
  constructor(x: number, y: number, type: string) {
    this.x = x; this.y = y; this.type = type;
    if (type === "splash") {
      this.vx = (Math.random() - 0.5) * 100; this.vy = -Math.random() * 70 - 30;
      this.radius = Math.random() * 3 + 1.5;
      this.color = `hsl(${195 + Math.random() * 20},80%,${60 + Math.random() * 20}%)`;
      this.decay = 0.025 + Math.random() * 0.015; this.gravity = 120;
    } else if (type === "ripple") {
      this.radius = 4; this.growSpeed = 55 + Math.random() * 25; this.decay = 0.018; this.strokeWidth = 2;
    } else if (type === "crumb_ripple") {
      this.radius = 2; this.growSpeed = 38; this.decay = 0.022; this.strokeWidth = 1.5;
    } else if (type === "burst") {
      this.vx = (Math.random() - 0.5) * 55; this.vy = (Math.random() - 0.5) * 55;
      this.radius = Math.random() * 2 + 1; this.color = "#f5c518"; this.decay = 0.035;
    } else if (type === "wake") {
      this.radius = 1.5; this.growSpeed = 22; this.decay = 0.03; this.strokeWidth = 1;
    }
  }
  update(dt: number) {
    this.life -= this.decay; this.alpha = Math.max(0, this.life);
    if (this.type === "splash") { this.vy += this.gravity * dt; this.x += this.vx * dt; this.y += this.vy * dt; }
    else if (this.type === "ripple" || this.type === "crumb_ripple" || this.type === "wake") { this.radius += this.growSpeed * dt; }
    else if (this.type === "burst") { this.x += this.vx * dt; this.y += this.vy * dt; }
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = this.alpha;
    if (this.type === "splash" || this.type === "burst") {
      ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, TWO_PI); ctx.fill();
    } else {
      ctx.globalAlpha *= 0.55; ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = this.strokeWidth; ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.45, 0, 0, TWO_PI); ctx.stroke();
    }
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── Game ───────────────────────────────────────────────────────────────────────
class PondGame {
  cx: number; cy: number; rx: number; ry: number;
  duckX: number; duckY: number; duckVx = 0; duckVy = 0;
  duckFacingAngle = 0;
  duckBobTime = 0;
  eating = false; eatTimer = 0;
  wanderTarget = { x: 0, y: 0 }; wanderTimer = 0; wanderInterval = 3;
  propTimer = 0; propInterval = 3.5 + Math.random() * 2;
  propActive = false; propDuration = 0; propMaxDuration = 0.28;
  propDir = { x: 1, y: 0 };
  wakeTimer = 0;
  floatMode = false;
  floatTimer = 0; floatDuration = 0;
  floatModeTimer = 0; floatInterval = 5 + Math.random() * 5;
  floatDriftVx = 0; floatDriftVy = 0;
  floatRippleTimer = 0;
  quackVolume = 0.15; splashVolume = 0.18;
  customQuackBuffer: AudioBuffer | null = null;
  customSplashBuffer: AudioBuffer | null = null;
  idleRipples: { x: number; y: number; r: number; grow: number; life: number; decay: number }[] = [];
  rippleTimer = 0; rippleInterval = 2.5;
  crumbs: { x: number; y: number; baseY: number; bobT: number; bobS: number; bobA: number; angle: number; spin: number; size: number; dead: boolean; landT: number; landed: boolean }[] = [];
  particles: Particle[] = [];
  bgPattern: CanvasPattern | null = null;
  cursorTarget: { x: number; y: number } | null = null;
  time = 0;
  duckImg: HTMLImageElement; pondImg: HTMLImageElement; crumbImg: HTMLImageElement;

  constructor(w: number, h: number, duckImg: HTMLImageElement, pondImg: HTMLImageElement, crumbImg: HTMLImageElement) {
    this.duckImg = duckImg; this.pondImg = pondImg; this.crumbImg = crumbImg;
    this.rx = Math.min(w * 0.42, 240); this.ry = Math.min(h * 0.42, 150);
    this.cx = w / 2; this.cy = h / 2 + 8;
    this.duckX = this.cx; this.duckY = this.cy;
    this.wanderTarget = { x: this.cx, y: this.cy };
  }

  inPond(x: number, y: number) {
    return ((x - this.cx) / (this.rx + 4)) ** 2 + ((y - this.cy) / (this.ry + 4)) ** 2 <= 1;
  }

  newWanderTarget() {
    const a = Math.random() * TWO_PI; const d = 0.15 + Math.random() * 0.55;
    this.wanderTarget = { x: this.cx + Math.cos(a) * this.rx * d, y: this.cy + Math.sin(a) * this.ry * d };
  }

  spawnCrumbs(cx: number, cy: number) {
    const MARGIN = 32;
    const srx = this.rx - MARGIN; const sry = this.ry - MARGIN;
    const inSafe = (x: number, y: number) => ((x - this.cx) / srx) ** 2 + ((y - this.cy) / sry) ** 2 <= 1;
    // Clamp click centre to safe inner ellipse so crumbs never land near the wall
    const dx = cx - this.cx; const dy = cy - this.cy;
    const dist = Math.sqrt((dx / srx) ** 2 + (dy / sry) ** 2);
    if (dist > 1) { const s = 1 / dist; cx = this.cx + dx * s; cy = this.cy + dy * s; }
    const count = 3 + Math.floor(Math.random() * 3);
    let spawned = 0; let attempts = 0;
    while (spawned < count && attempts < count * 8) {
      attempts++;
      const a = Math.random() * TWO_PI; const spread = 22 + Math.random() * 16;
      const x = cx + Math.cos(a) * spread * Math.random();
      const y = cy + Math.sin(a) * spread * 0.55 * Math.random();
      if (inSafe(x, y)) {
        this.crumbs.push({ x, y, baseY: y, bobT: Math.random() * TWO_PI, bobS: 1.8 + Math.random() * 0.7, bobA: 1.5 + Math.random() * 1.2, angle: Math.random() * TWO_PI, spin: (Math.random() - 0.5) * 0.8, size: 10 + Math.random() * 4, dead: false, landT: 0, landed: false });
        for (let i = 0; i < 2; i++) this.particles.push(new Particle(x, y, "crumb_ripple"));
        spawned++;
      }
    }
    if (spawned === 0) {
      this.crumbs.push({ x: cx, y: cy, baseY: cy, bobT: 0, bobS: 2, bobA: 1.5, angle: 0, spin: 0.3, size: 12, dead: false, landT: 0, landed: false });
      this.particles.push(new Particle(cx, cy, "crumb_ripple"));
    }
  }

  generateQuack(audioCtx: AudioContext | null) {
    if (!audioCtx || this.quackVolume <= 0) return;
    try {
      if (this.customQuackBuffer) {
        const src = audioCtx.createBufferSource(); src.buffer = this.customQuackBuffer;
        const g = audioCtx.createGain(); g.gain.value = this.quackVolume;
        src.connect(g); g.connect(audioCtx.destination); src.start(); return;
      }
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.12);
      osc.frequency.setValueAtTime(260, audioCtx.currentTime + 0.13);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.24);
      gain.gain.setValueAtTime(this.quackVolume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } catch (_) {}
  }

  generateSplash(audioCtx: AudioContext | null) {
    if (!audioCtx || this.splashVolume <= 0) return;
    try {
      if (this.customSplashBuffer) {
        const src = audioCtx.createBufferSource(); src.buffer = this.customSplashBuffer;
        const g = audioCtx.createGain(); g.gain.value = this.splashVolume;
        src.connect(g); g.connect(audioCtx.destination); src.start(); return;
      }
      const bufSize = audioCtx.sampleRate * 0.16;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const g = audioCtx.createGain(); g.gain.setValueAtTime(this.splashVolume, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      const filt = audioCtx.createBiquadFilter(); filt.type = "bandpass"; filt.frequency.value = 1200; filt.Q.value = 0.8;
      src.connect(filt); filt.connect(g); g.connect(audioCtx.destination); src.start();
    } catch (_) {}
  }

  update(dt: number, audioCtx: AudioContext | null) {
    this.time += dt;
    const bobSpeed = this.floatMode ? 1.15 : 2.0;
    this.duckBobTime += bobSpeed * dt;

    this.rippleTimer += dt;
    if (this.rippleTimer >= this.rippleInterval) {
      this.rippleTimer = 0; this.rippleInterval = 2 + Math.random() * 2;
      const a = Math.random() * TWO_PI; const d = 0.2 + Math.random() * 0.6;
      this.idleRipples.push({ x: this.cx + Math.cos(a) * this.rx * d, y: this.cy + Math.sin(a) * this.ry * d, r: 2, grow: 16 + Math.random() * 8, life: 1, decay: 0.013 + Math.random() * 0.005 });
    }
    this.idleRipples.forEach(r => { r.r += r.grow * dt; r.life -= r.decay; });
    this.idleRipples = this.idleRipples.filter(r => r.life > 0);

    this.crumbs.forEach(c => {
      if (c.dead) return;
      c.bobT += c.bobS * dt; c.y = c.baseY + Math.sin(c.bobT) * c.bobA; c.angle += c.spin * dt;
      if (!c.landed) { c.landT += dt; if (c.landT >= 0.4) c.landed = true; }
    });

    let nearest: typeof this.crumbs[0] | null = null; let minD = Infinity;
    this.crumbs.forEach(c => { if (c.dead) return; const d = Math.hypot(c.x - this.duckX, c.y - this.duckY); if (d < minD) { minD = d; nearest = c; } });

    let tx: number, ty: number, targetSpeed: number;

    if (nearest) {
      tx = nearest.x; ty = nearest.y;
      targetSpeed = 55;
      if (Math.hypot(tx - this.duckX, ty - this.duckY) < 10) {
        nearest.dead = true;
        this.eating = true; this.eatTimer = 0;
        this.generateQuack(audioCtx);
        for (let i = 0; i < 10; i++) this.particles.push(new Particle(nearest.x, nearest.y, "splash"));
        for (let i = 0; i < 6; i++) this.particles.push(new Particle(nearest.x, nearest.y, "burst"));
        this.particles.push(new Particle(nearest.x, nearest.y, "ripple"));
      }
    } else {
      this.floatModeTimer += dt;
      if (this.floatModeTimer >= this.floatInterval && !this.floatMode && !this.propActive) {
        this.floatModeTimer = 0;
        this.floatInterval = 4 + Math.random() * 5;
        this.floatMode = true;
        this.floatTimer = 0;
        this.floatDuration = 2.5 + Math.random() * 3;
        this.floatDriftVx = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 2.5);
        this.floatDriftVy = 0;
        this.floatRippleTimer = 0;
        for (let i = 0; i < 3; i++) {
          const rp = new Particle(this.duckX, this.duckY, "ripple");
          rp.decay = 0.007 + i * 0.003; rp.growSpeed = 20 + i * 14; rp.strokeWidth = 1.5 - i * 0.3;
          this.particles.push(rp);
        }
      }

      if (this.floatMode) {
        this.floatTimer += dt;
        if (this.floatTimer >= this.floatDuration) {
          this.floatMode = false;
          this.newWanderTarget();
        }
        this.duckVx += (this.floatDriftVx - this.duckVx) * 1.8 * dt;
        this.duckVy += (this.floatDriftVy - this.duckVy) * 1.8 * dt;
        tx = this.duckX; ty = this.duckY;
        targetSpeed = 5;
        this.floatRippleTimer += dt;
        if (this.floatRippleTimer >= 1.3 + Math.random() * 0.6) {
          this.floatRippleTimer = 0;
          const rp = new Particle(this.duckX, this.duckY, "ripple");
          rp.decay = 0.009; rp.growSpeed = 18; rp.strokeWidth = 0.9;
          this.particles.push(rp);
        }
      } else {
        this.wanderTimer += dt;
        if (this.wanderTimer >= this.wanderInterval) {
          this.wanderTimer = 0; this.wanderInterval = 2.5 + Math.random() * 3;
          this.newWanderTarget();
        }
        // Softly blend wander target toward cursor while hovering over panel
        if (this.cursorTarget) {
          this.wanderTarget.x += (this.cursorTarget.x - this.wanderTarget.x) * 0.55 * dt;
          this.wanderTarget.y += (this.cursorTarget.y - this.wanderTarget.y) * 0.55 * dt;
        }
        tx = this.wanderTarget.x; ty = this.wanderTarget.y;
        if (Math.hypot(tx - this.duckX, ty - this.duckY) < 8) this.wanderTimer = this.wanderInterval;

        this.propTimer += dt;
        if (this.propTimer >= this.propInterval && !this.propActive) {
          this.propTimer = 0; this.propInterval = 3 + Math.random() * 3.5;
          this.propActive = true; this.propDuration = 0;
          const pdx = tx - this.duckX; const pdy = ty - this.duckY;
          const pl = Math.hypot(pdx, pdy) || 1;
          this.propDir = { x: pdx / pl, y: pdy / pl };
          this.particles.push(new Particle(this.duckX, this.duckY, "wake"));
        }
        if (this.propActive) {
          this.propDuration += dt;
          if (this.propDuration >= this.propMaxDuration) this.propActive = false;
        }

        const propMult = this.propActive ? (3.8 * (1 - this.propDuration / this.propMaxDuration) + 1) : 1;
        targetSpeed = 16 * propMult;

        if (this.propActive) {
          this.wakeTimer += dt;
          if (this.wakeTimer > 0.06) {
            this.wakeTimer = 0;
            this.particles.push(new Particle(this.duckX - this.propDir.x * 12, this.duckY - this.propDir.y * 12, "wake"));
          }
        }
      }
    }

    const dx = tx - this.duckX; const dy = ty - this.duckY; const dist = Math.hypot(dx, dy);
    const steerFactor = this.propActive ? 4 : 5.5;
    if (dist > 2) {
      const dvx = (dx / dist) * targetSpeed; const dvy = (dy / dist) * targetSpeed;
      this.duckVx += (dvx - this.duckVx) * steerFactor * dt;
      this.duckVy += (dvy - this.duckVy) * steerFactor * dt;
    } else { this.duckVx *= 0.85; this.duckVy *= 0.85; }

    const spd = Math.hypot(this.duckVx, this.duckVy);
    const maxSpd = nearest ? 55 : (this.propActive ? 70 : 22);
    if (spd > maxSpd) { this.duckVx = (this.duckVx / spd) * maxSpd; this.duckVy = (this.duckVy / spd) * maxSpd; }

    let nx = this.duckX + this.duckVx * dt; let ny = this.duckY + this.duckVy * dt;
    const margin = 20;
    const ex = (nx - this.cx) / (this.rx - margin);
    const ey = (ny - this.cy) / (this.ry - margin);
    const d2 = ex * ex + ey * ey;
    if (d2 > 1) {
      const len = Math.sqrt(d2);
      // Clamp back inside the ellipse
      nx = this.cx + (ex / len) * (this.rx - margin - 1);
      ny = this.cy + (ey / len) * (this.ry - margin - 1);
      // Reflect velocity off the outward normal (only if moving outward)
      const normX = ex / len; const normY = ey / len;
      const dot = this.duckVx * normX + this.duckVy * normY;
      if (dot > 0) { this.duckVx -= 1.8 * dot * normX; this.duckVy -= 1.8 * dot * normY; }
      this.newWanderTarget();
    }
    this.duckX = nx; this.duckY = ny;

    if (spd > 1.5) {
      const targetAngle = Math.atan2(this.duckVy, this.duckVx);
      let da = targetAngle - this.duckFacingAngle;
      while (da > Math.PI) da -= TWO_PI;
      while (da < -Math.PI) da += TWO_PI;
      const turnRate = this.floatMode ? 1.0 : 3.5;
      this.duckFacingAngle += da * Math.min(1, turnRate * dt);
      while (this.duckFacingAngle > Math.PI) this.duckFacingAngle -= TWO_PI;
      while (this.duckFacingAngle < -Math.PI) this.duckFacingAngle += TWO_PI;
    }

    if (this.eating) { this.eatTimer += dt; if (this.eatTimer >= 0.45) this.eating = false; }
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => !p.dead());
    this.crumbs = this.crumbs.filter(c => !c.dead);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);

    if (this.bgPattern) { ctx.save(); ctx.fillStyle = this.bgPattern; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    else { ctx.fillStyle = "#5a9e3d"; ctx.fillRect(0, 0, w, h); }

    ctx.save();
    ctx.beginPath(); ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, TWO_PI); ctx.clip();
    ctx.drawImage(this.pondImg, this.cx - this.rx, this.cy - this.ry, this.rx * 2, this.ry * 2);
    this.idleRipples.forEach(r => {
      ctx.save(); ctx.globalAlpha = Math.max(0, r.life) * 0.45; ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, TWO_PI); ctx.stroke(); ctx.restore();
    });
    ctx.restore();


    this.crumbs.forEach(c => {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
      let scale = 1;
      if (!c.landed) { const p = c.landT / 0.4; scale = 0.4 + p * 0.7 + Math.sin(p * Math.PI) * 0.15; }
      ctx.scale(scale, scale);
      ctx.drawImage(this.crumbImg, -c.size / 2, -c.size / 2, c.size, c.size);
      ctx.restore();
    });

    this.particles.forEach(p => p.draw(ctx));

    const bobAmp = this.floatMode ? 4.5 : 2.5;
    const bob = Math.sin(this.duckBobTime) * bobAmp;
    const eatScale = this.eating ? 1 + 0.15 * Math.sin((this.eatTimer / 0.45) * Math.PI) : 1;
    const ds = 40 * eatScale;

    const facingRight = Math.cos(this.duckFacingAngle) >= 0;

    ctx.save();
    ctx.translate(this.duckX, this.duckY + bob);
    if (!facingRight) ctx.scale(-1, 1);
    ctx.drawImage(this.duckImg, -ds / 2, -ds / 2, ds, ds);
    ctx.restore();

    if (this.eating) {
      const p = this.eatTimer / 0.45;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TWO_PI;
        const r1 = 22; const r2 = r1 + 8 + Math.sin(p * Math.PI) * 5;
        ctx.save(); ctx.globalAlpha = (1 - p) * 0.7; ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.duckX + Math.cos(a) * r1, this.duckY + bob + Math.sin(a) * r1);
        ctx.lineTo(this.duckX + Math.cos(a) * r2, this.duckY + bob + Math.sin(a) * r2);
        ctx.stroke(); ctx.restore();
      }
    }
  }
}

// ── Fake Posts ─────────────────────────────────────────────────────────────────
const POSTS = [
  { name: "Sarah Johnson", time: "2h", avatar: "SJ", color: "#e91e63", text: "Just got back from the most amazing hike! The views at sunrise were absolutely breathtaking 🌄 Nature really does heal.", likes: 142, comments: 28, shares: 11 },
  { name: "Tech Daily", time: "4h", avatar: "TD", color: "#1877f2", text: "🚨 BREAKING: New AI model surpasses human performance on 97% of benchmark tasks. The future is here.", likes: 3841, comments: 512, shares: 1203 },
  { name: "Mike Chen", time: "5h", avatar: "MC", color: "#ff9800", text: "Made homemade ramen from scratch for the first time ever. 6 hours later... honestly worth every minute. Recipe in comments! 🍜", likes: 87, comments: 43, shares: 19 },
];

const GRAPHIC_SLOTS = [
  { key: "duck", label: "Duck Sprite", icon: "🦆", defaultColor: "#f5c518" },
  { key: "pond", label: "Pond", icon: "💧", defaultColor: "#29b6f6" },
  { key: "breadcrumb", label: "Breadcrumb", icon: "🍞", defaultColor: "#8B5E3C" },
  { key: "background", label: "Background", icon: "🌿", defaultColor: "#5a9e3d" },
];
const AUDIO_SLOTS = [
  { key: "quack", label: "Quack SFX", icon: "🦆", desc: "plays when duck eats" },
  { key: "splash", label: "Splash SFX", icon: "💦", desc: "plays on click" },
  { key: "music", label: "Background Music", icon: "🎵", desc: "loops continuously" },
  { key: "ambient", label: "Ambient Sound", icon: "🌊", desc: "ambient loop" },
];
const FRIENDS = [
  { name: "Alex Rivera", av: "AR", color: "#9c27b0" },
  { name: "Jordan Lee", av: "JL", color: "#009688" },
  { name: "Sam Torres", av: "ST", color: "#f44336" },
  { name: "Casey Park", av: "CP", color: "#ff5722" },
  { name: "Morgan Wu", av: "MW", color: "#3f51b5" },
];

function fmtNum(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }

// ── Main component ─────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PondGame | null>(null);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const musicSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const musicBufRef = useRef<AudioBuffer | null>(null);
  const ambientBufRef = useRef<AudioBuffer | null>(null);
  const audioRestoredRef = useRef(false);

  const [crumbHint, setCrumbHint] = useState(true);
  const [assetOpen, setAssetOpen] = useState(false);
  const [assetTab, setAssetTab] = useState<"graphics" | "audio">("graphics");
  const [customPreviews, setCustomPreviews] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS.pre) ?? "{}"); } catch { return {}; }
  });
  const [audioUploaded, setAudioUploaded] = useState<Record<string, boolean>>(() => {
    try {
      const out: Record<string, boolean> = {};
      ["quack", "splash", "music", "ambient"].forEach(k => { if (localStorage.getItem(LS.aud(k))) out[k] = true; });
      return out;
    } catch { return {}; }
  });
  const [volumes, setVolumes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS.vol) ?? "null") ?? { quack: 70, splash: 60, music: 50, ambient: 40 }; }
    catch { return { quack: 70, splash: 60, music: 50, ambient: 40 }; }
  });
  const [masterMute, setMasterMute] = useState(false);

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) { try { audioCtxRef.current = new AudioContext(); } catch (_) { return null; } }
    return audioCtxRef.current;
  }, []);

  const startLoop = useCallback((buf: AudioBuffer, gain: GainNode) => {
    const ctx = audioCtxRef.current; if (!ctx) return null;
    gain.connect(ctx.destination);
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.connect(gain); src.start(); return src;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const duckImg = drawDuckImg(); const pondImg = drawPondImg(); const crumbImg = drawCrumbImg();
    const game = new PondGame(canvas.width, canvas.height, duckImg, pondImg, crumbImg);
    // Build bg tile
    const bc = document.createElement("canvas"); bc.width = 64; bc.height = 64;
    const bctx = bc.getContext("2d")!;
    bctx.fillStyle = "#5a9e3d"; bctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) { bctx.fillStyle = i % 2 === 0 ? "#4e8e32" : "#6ab84a"; bctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 5 + Math.random() * 4); }
    try { game.bgPattern = ctx.createPattern(bc, "repeat"); } catch (_) {}
    gameRef.current = game;
    // Restore saved images
    try {
      const saved: Record<string, string> = JSON.parse(localStorage.getItem(LS.pre) ?? "{}");
      Object.entries(saved).forEach(([k, url]) => {
        const img = new Image(); img.src = url;
        img.onload = () => {
          if (k === "duck") game.duckImg = img;
          else if (k === "pond") game.pondImg = img;
          else if (k === "breadcrumb") game.crumbImg = img;
          else if (k === "background") { const p = ctx.createPattern(img, "repeat"); if (p) game.bgPattern = p; }
        };
      });
    } catch (_) {}
    lastTimeRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      game.update(dt, audioCtxRef.current);
      game.draw(ctx, canvas.width, canvas.height);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Sync gain nodes
  useEffect(() => {
    const v = masterMute ? 0 : volumes.music / 100 * 0.8;
    if (musicGainRef.current) musicGainRef.current.gain.value = v;
  }, [volumes.music, masterMute]);
  useEffect(() => {
    const v = masterMute ? 0 : volumes.ambient / 100 * 0.5;
    if (ambientGainRef.current) ambientGainRef.current.gain.value = v;
  }, [volumes.ambient, masterMute]);
  useEffect(() => {
    const game = gameRef.current; if (!game) return;
    game.quackVolume = masterMute ? 0 : volumes.quack / 100 * 0.15;
    game.splashVolume = masterMute ? 0 : volumes.splash / 100 * 0.18;
  }, [volumes.quack, volumes.splash, masterMute]);

  useEffect(() => { try { localStorage.setItem(LS.vol, JSON.stringify(volumes)); } catch (_) {} }, [volumes]);

  const restoreSavedAudio = useCallback(async () => {
    if (audioRestoredRef.current) return;
    audioRestoredRef.current = true;
    const ctx = ensureAudioCtx(); if (!ctx) return;
    const game = gameRef.current;
    for (const k of ["quack", "splash", "music", "ambient"]) {
      try {
        const dataUrl = localStorage.getItem(LS.aud(k));
        if (!dataUrl) continue;
        const decoded = await ctx.decodeAudioData(dataUrlToArrayBuffer(dataUrl));
        if (k === "quack" && game) { game.customQuackBuffer = decoded; }
        else if (k === "splash" && game) { game.customSplashBuffer = decoded; }
        else if (k === "music") {
          musicBufRef.current = decoded;
          if (!musicGainRef.current) { musicGainRef.current = ctx.createGain(); musicGainRef.current.gain.value = volumes.music / 100 * 0.8; }
          musicSrcRef.current = startLoop(decoded, musicGainRef.current);
        } else if (k === "ambient") {
          ambientBufRef.current = decoded;
          if (!ambientGainRef.current) { ambientGainRef.current = ctx.createGain(); ambientGainRef.current.gain.value = volumes.ambient / 100 * 0.5; }
          ambientSrcRef.current = startLoop(decoded, ambientGainRef.current);
        }
      } catch (_) {}
    }
  }, [ensureAudioCtx, startLoop, volumes.music, volumes.ambient]);

  const handlePageMouseMove = useCallback((e: React.MouseEvent) => {
    const game = gameRef.current; const canvas = canvasRef.current;
    if (!game || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX; const cy = (e.clientY - rect.top) * scaleY;
    const MARGIN = 40; const srx = game.rx - MARGIN; const sry = game.ry - MARGIN;
    const ddx = cx - game.cx; const ddy = cy - game.cy;
    const dist = Math.sqrt((ddx / srx) ** 2 + (ddy / sry) ** 2);
    const s = dist > 1 ? 1 / dist : 1;
    game.cursorTarget = { x: game.cx + ddx * s, y: game.cy + ddy * s };
  }, []);

  const handlePageMouseLeave = useCallback(() => {
    if (gameRef.current) gameRef.current.cursorTarget = null;
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; const game = gameRef.current;
    if (!canvas || !game) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleX;
    if (!game.inPond(x, y)) return;
    ensureAudioCtx();
    restoreSavedAudio();
    game.generateSplash(audioCtxRef.current);
    game.spawnCrumbs(x, y);
    setCrumbHint(false);
  };

  const handleImageUpload = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setCustomPreviews(prev => {
        const next = { ...prev, [key]: url };
        try { localStorage.setItem(LS.pre, JSON.stringify(next)); } catch (_) {}
        return next;
      });
      const img = new Image(); img.src = url;
      img.onload = () => {
        const game = gameRef.current; if (!game) return;
        const canvas = canvasRef.current;
        if (key === "duck") game.duckImg = img;
        else if (key === "pond") game.pondImg = img;
        else if (key === "breadcrumb") game.crumbImg = img;
        else if (key === "background" && canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) { const p = ctx.createPattern(img, "repeat"); if (p) game.bgPattern = p; }
        }
      };
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleAudioUpload = useCallback((key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ctx = ensureAudioCtx(); if (!ctx) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dataUrl = ev.target?.result as string;
        try { localStorage.setItem(LS.aud(key), dataUrl); } catch (_) {}
        const decoded = await ctx.decodeAudioData(dataUrlToArrayBuffer(dataUrl));
        const game = gameRef.current;
        if (key === "quack" && game) { game.customQuackBuffer = decoded; }
        else if (key === "splash" && game) { game.customSplashBuffer = decoded; }
        else if (key === "music") {
          try { musicSrcRef.current?.stop(); } catch (_) {}
          musicBufRef.current = decoded;
          if (!musicGainRef.current) { musicGainRef.current = ctx.createGain(); }
          musicGainRef.current.gain.value = masterMute ? 0 : volumes.music / 100 * 0.8;
          musicSrcRef.current = startLoop(decoded, musicGainRef.current);
        } else if (key === "ambient") {
          try { ambientSrcRef.current?.stop(); } catch (_) {}
          ambientBufRef.current = decoded;
          if (!ambientGainRef.current) { ambientGainRef.current = ctx.createGain(); }
          ambientGainRef.current.gain.value = masterMute ? 0 : volumes.ambient / 100 * 0.5;
          ambientSrcRef.current = startLoop(decoded, ambientGainRef.current);
        }
        setAudioUploaded(prev => ({ ...prev, [key]: true }));
      } catch (_) {}
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [ensureAudioCtx, masterMute, startLoop, volumes.music, volumes.ambient]);

  const handleReset = useCallback((key: string) => {
    const game = gameRef.current;
    if (key === "duck") { const i = drawDuckImg(); i.onload = () => { if (game) game.duckImg = i; }; }
    else if (key === "pond") { const i = drawPondImg(); i.onload = () => { if (game) game.pondImg = i; }; }
    else if (key === "breadcrumb") { const i = drawCrumbImg(); i.onload = () => { if (game) game.crumbImg = i; }; }
    else if (key === "background") {
      const canvas = canvasRef.current; if (!canvas || !game) return;
      const bc = document.createElement("canvas"); bc.width = 64; bc.height = 64;
      const bctx = bc.getContext("2d")!;
      bctx.fillStyle = "#5a9e3d"; bctx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 30; i++) { bctx.fillStyle = i % 2 === 0 ? "#4e8e32" : "#6ab84a"; bctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 5 + Math.random() * 4); }
      const ctx = canvas.getContext("2d"); if (ctx) game.bgPattern = ctx.createPattern(bc, "repeat");
    } else if (key === "quack" && game) { game.customQuackBuffer = null; }
    else if (key === "splash" && game) { game.customSplashBuffer = null; }
    else if (key === "music") {
      try { musicSrcRef.current?.stop(); } catch (_) {}
      musicSrcRef.current = null; musicBufRef.current = null;
    } else if (key === "ambient") {
      try { ambientSrcRef.current?.stop(); } catch (_) {}
      ambientSrcRef.current = null; ambientBufRef.current = null;
    }
    if (["duck", "pond", "breadcrumb", "background"].includes(key)) {
      setCustomPreviews(prev => { const n = { ...prev }; delete n[key]; try { localStorage.setItem(LS.pre, JSON.stringify(n)); } catch (_) {} return n; });
    }
    if (["quack", "splash", "music", "ambient"].includes(key)) {
      try { localStorage.removeItem(LS.aud(key)); } catch (_) {}
      setAudioUploaded(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f2f5]" onMouseMove={handlePageMouseMove} onMouseLeave={handlePageMouseLeave}>
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm h-14 flex items-center px-4 gap-2">
        <div className="text-[#1877f2] font-bold text-2xl select-none">🦆pondbook</div>
        <div className="flex-1 max-w-xs mx-2">
          <div className="bg-[#f0f2f5] rounded-full px-4 py-1.5 text-sm text-gray-400">🔍 Search Pondbook</div>
        </div>
        <div className="flex gap-1 ml-auto">
          {["🏠", "📺", "👥", "🎮"].map(ic => (
            <button key={ic} className="w-10 h-10 rounded-xl text-lg hover:bg-[#f0f2f5] flex items-center justify-center transition-colors">{ic}</button>
          ))}
        </div>
        <button onClick={() => setAssetOpen(o => !o)} className="ml-2 px-3 py-1.5 rounded-lg bg-[#1877f2] text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          🎨 Assets
        </button>
      </nav>

      {/* ── Asset Drawer ── */}
      {assetOpen && (
        <div className="fixed top-14 right-0 bottom-0 z-30 w-80 bg-white shadow-2xl overflow-y-auto border-l border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">Asset Manager</h2>
              <button onClick={() => setAssetOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
              {(["graphics", "audio"] as const).map(t => (
                <button key={t} onClick={() => setAssetTab(t)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${assetTab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                  {t === "graphics" ? "🖼️ Graphics" : "🎵 Audio"}
                </button>
              ))}
            </div>

            {assetTab === "graphics" ? (
              <div className="space-y-3">
                {GRAPHIC_SLOTS.map(({ key, label, icon, defaultColor }) => (
                  <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: defaultColor + "22" }}>{icon}</div>
                      <div><div className="font-medium text-sm text-gray-800">{label}</div></div>
                      {customPreviews[key] && (
                        <button onClick={() => handleReset(key)} className="ml-auto text-xs text-red-500 hover:text-red-700">↩ Reset</button>
                      )}
                    </div>
                    {customPreviews[key] ? (
                      <img src={customPreviews[key]} alt="" className="w-full h-16 object-contain rounded-lg bg-gray-100" />
                    ) : (
                      <label className="flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs text-gray-500">
                        <span>📁</span> Upload image
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(key, e)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Master Volume</span>
                  <button onClick={() => setMasterMute(m => !m)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${masterMute ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                    {masterMute ? "🔇 Muted" : "🔊 On"}
                  </button>
                </div>
                {AUDIO_SLOTS.map(({ key, label, icon, desc }) => (
                  <div key={key} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      {audioUploaded[key] && (
                        <button onClick={() => handleReset(key)} className="text-xs text-red-500 hover:text-red-700">↩</button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 w-12">Vol</span>
                      <input type="range" min={0} max={100} value={volumes[key as keyof typeof volumes] ?? 50}
                        onChange={e => setVolumes(v => ({ ...v, [key]: Number(e.target.value) }))}
                        className="flex-1 h-1.5 accent-blue-500" />
                      <span className="text-xs text-gray-500 w-7 text-right">{volumes[key as keyof typeof volumes] ?? 50}%</span>
                    </div>
                    <label className={`flex items-center justify-center gap-1.5 py-1.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-xs ${audioUploaded[key] ? "border-green-400 bg-green-50 text-green-700" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-blue-50"}`}>
                      {audioUploaded[key] ? "✅ Uploaded — replace?" : "📁 Upload audio"}
                      <input type="file" accept="audio/*" className="hidden" onChange={e => handleAudioUpload(key, e)} />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-14 flex max-w-6xl mx-auto gap-4 px-4">
        {/* ── Left sidebar ── */}
        <aside className="hidden lg:block w-64 pt-4 shrink-0">
          <div className="sticky top-16 space-y-1">
            {[["🏠","Home"],["👤","Profile"],["👥","Friends"],["🎮","Gaming"],["🛒","Marketplace"],["📺","Watch"],["📅","Events"],["🔖","Saved"]].map(([ic, lb]) => (
              <button key={lb} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 text-gray-700 font-medium transition-colors text-sm">
                <span className="text-xl">{ic}</span>{lb}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Feed ── */}
        <main className="flex-1 min-w-0 pt-4 space-y-4 pb-8">
          {/* Create post */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-bold text-sm">You</div>
              <div className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-2.5 text-sm text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors">What's on your mind?</div>
            </div>
          </div>

          {/* Duck Pond card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-xl">🦆</div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Duck Pond</div>
                <div className="text-xs text-gray-400">Live · Click to feed the duck!</div>
              </div>
            </div>
            <div className="relative">
              <canvas ref={canvasRef} width={560} height={340} className="w-full block cursor-crosshair" onClick={handleCanvasClick} />
              {crumbHint && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                  🍞 Click on the pond to feed the duck
                </div>
              )}
            </div>
            <div className="px-4 py-2 flex gap-1 border-t border-gray-100">
              {["👍 Like", "💬 Comment", "↗️ Share"].map(a => (
                <button key={a} className="flex-1 py-1.5 rounded-lg hover:bg-[#f0f2f5] text-sm text-gray-500 font-medium transition-colors">{a}</button>
              ))}
            </div>
          </div>

          {/* Social posts */}
          {POSTS.map((post, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: post.color }}>{post.avatar}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{post.name}</div>
                  <div className="text-xs text-gray-400">{post.time} ago</div>
                </div>
                <button className="ml-auto text-gray-400 hover:text-gray-600 text-xl leading-none">⋯</button>
              </div>
              <div className="px-4 pb-3 text-sm text-gray-800 leading-relaxed">{post.text}</div>
              <div className="px-4 py-1.5 flex items-center justify-between text-xs text-gray-400 border-t border-b border-gray-100">
                <span>👍 {fmtNum(post.likes)}</span>
                <span>{fmtNum(post.comments)} comments · {fmtNum(post.shares)} shares</span>
              </div>
              <div className="px-4 py-1 flex gap-1">
                {["👍 Like", "💬 Comment", "↗️ Share"].map(a => (
                  <button key={a} className="flex-1 py-1.5 rounded-lg hover:bg-[#f0f2f5] text-sm text-gray-500 font-medium transition-colors">{a}</button>
                ))}
              </div>
            </div>
          ))}
        </main>

        {/* ── Right sidebar ── */}
        <aside className="hidden xl:block w-64 pt-4 shrink-0">
          <div className="sticky top-16 space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-500 mb-2 px-2">Contacts</div>
              <div className="space-y-1">
                {FRIENDS.map(({ name, av, color }) => (
                  <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: color }}>{av}</div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <span className="text-sm text-gray-800">{name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-1">🦆 Duck Pond Tips</div>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Click the pond to throw breadcrumbs</li>
                <li>• Upload your own duck sprite</li>
                <li>• Add custom quack sounds</li>
                <li>• Your uploads persist across reloads</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
