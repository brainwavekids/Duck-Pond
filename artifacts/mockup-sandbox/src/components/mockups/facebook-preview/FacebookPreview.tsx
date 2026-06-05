import { useEffect, useRef, useState } from "react";

// ── Standalone Duck Pond game (no chrome APIs) ────────────────────────────────

const TWO_PI = Math.PI * 2;

// ── Procedural drawers ────────────────────────────────────────────────────────
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
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(200, 130, 180 - i*30, 110 - i*18, 0, 0, TWO_PI); ctx.stroke(); }
  const img = new Image(); img.src = c.toDataURL(); return img;
}

function drawCrumbImg() {
  const c = document.createElement("canvas"); c.width = 20; c.height = 20;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8B5E3C"; ctx.beginPath(); ctx.ellipse(10, 11, 7, 5, -0.3, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = "#A0714F"; ctx.beginPath(); ctx.ellipse(10, 10, 6, 4, -0.3, 0, TWO_PI); ctx.fill();
  const img = new Image(); img.src = c.toDataURL(); return img;
}

function drawBgTile() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#5a9e3d"; ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#4e8e32" : "#6ab84a";
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 5 + Math.random() * 4);
  }
  const img = new Image(); img.src = c.toDataURL(); return img;
}

// ── Particle ──────────────────────────────────────────────────────────────────
class Particle {
  x: number; y: number; type: string; alpha = 1; life = 1;
  vx = 0; vy = 0; radius = 3; maxRadius = 30; growSpeed = 60; decay = 0.02;
  strokeWidth = 1.5; color = "#4fc3f7"; gravity = 0;

  constructor(x: number, y: number, type: string) {
    this.x = x; this.y = y; this.type = type;
    if (type === "splash") {
      this.vx = (Math.random() - 0.5) * 120; this.vy = -Math.random() * 80 - 40;
      this.radius = Math.random() * 3 + 1.5; this.color = `hsl(${195 + Math.random()*20},80%,${60+Math.random()*20}%)`;
      this.decay = 0.025 + Math.random() * 0.015; this.gravity = 120;
    } else if (type === "ripple") {
      this.radius = 4; this.maxRadius = 40 + Math.random() * 20;
      this.growSpeed = 60 + Math.random() * 30; this.decay = 0.018; this.strokeWidth = 2;
    } else if (type === "crumb_ripple") {
      this.radius = 2; this.maxRadius = 20 + Math.random() * 10;
      this.growSpeed = 40; this.decay = 0.022; this.strokeWidth = 1.5;
    } else if (type === "burst") {
      this.vx = (Math.random() - 0.5) * 60; this.vy = (Math.random() - 0.5) * 60;
      this.radius = Math.random() * 2 + 1; this.color = "#f5c518"; this.decay = 0.035;
    }
  }

  update(dt: number) {
    this.life -= this.decay; this.alpha = Math.max(0, this.life);
    if (this.type === "splash") { this.vy += this.gravity * dt; this.x += this.vx * dt; this.y += this.vy * dt; }
    else if (this.type === "ripple" || this.type === "crumb_ripple") { this.radius += this.growSpeed * dt; }
    else if (this.type === "burst") { this.x += this.vx * dt; this.y += this.vy * dt; }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = this.alpha;
    if (this.type === "splash" || this.type === "burst") {
      ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, TWO_PI); ctx.fill();
    } else {
      ctx.globalAlpha *= 0.6; ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = this.strokeWidth; ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.45, 0, 0, TWO_PI); ctx.stroke();
    }
    ctx.restore();
  }
  dead() { return this.life <= 0; }
}

// ── Game state class ──────────────────────────────────────────────────────────
class PondGame {
  cx: number; cy: number; rx: number; ry: number;
  duckX: number; duckY: number; duckVx = 0; duckVy = 0;
  duckAngle = 0; duckBobTime = 0; eating = false; eatTimer = 0;
  wanderTarget = { x: 0, y: 0 }; wanderTimer = 0; wanderInterval = 3;
  idleRipples: { x: number; y: number; r: number; maxR: number; grow: number; life: number; decay: number }[] = [];
  rippleSpawnTimer = 0; rippleInterval = 2.5;
  crumbs: { x: number; y: number; baseY: number; bobT: number; bobS: number; bobA: number; angle: number; spin: number; size: number; dead: boolean; landT: number; landed: boolean }[] = [];
  particles: Particle[] = [];
  bgPattern: CanvasPattern | null = null;
  time = 0;
  duckImg: HTMLImageElement; pondImg: HTMLImageElement; crumbImg: HTMLImageElement; bgImg: HTMLImageElement;

  constructor(w: number, h: number, duckImg: HTMLImageElement, pondImg: HTMLImageElement, crumbImg: HTMLImageElement, bgImg: HTMLImageElement) {
    this.duckImg = duckImg; this.pondImg = pondImg; this.crumbImg = crumbImg; this.bgImg = bgImg;
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
    const count = 3 + Math.floor(Math.random() * 3);
    let spawned = 0; let attempts = 0;
    while (spawned < count && attempts < count * 8) {
      attempts++;
      const a = Math.random() * TWO_PI; const spread = 24 + Math.random() * 18;
      const x = cx + Math.cos(a) * spread * Math.random();
      const y = cy + Math.sin(a) * spread * 0.55 * Math.random();
      if (this.inPond(x, y)) {
        this.crumbs.push({ x, y, baseY: y, bobT: Math.random() * TWO_PI, bobS: 1.8 + Math.random() * 0.7, bobA: 1.5 + Math.random() * 1.2, angle: Math.random() * TWO_PI, spin: (Math.random() - 0.5) * 0.8, size: 10 + Math.random() * 4, dead: false, landT: 0, landed: false });
        for (let i = 0; i < 2; i++) this.particles.push(new Particle(x, y, "crumb_ripple"));
        spawned++;
      }
    }
    if (spawned === 0 && this.inPond(cx, cy)) {
      this.crumbs.push({ x: cx, y: cy, baseY: cy, bobT: 0, bobS: 2, bobA: 1.5, angle: 0, spin: 0.3, size: 12, dead: false, landT: 0, landed: false });
      this.particles.push(new Particle(cx, cy, "crumb_ripple"));
    }
  }

  generateQuack(audioCtx: AudioContext | null) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.12);
      osc.frequency.setValueAtTime(260, audioCtx.currentTime + 0.13);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } catch (_) {}
  }

  generateSplash(audioCtx: AudioContext | null) {
    if (!audioCtx) return;
    try {
      const bufSize = audioCtx.sampleRate * 0.16;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const g = audioCtx.createGain(); g.gain.setValueAtTime(0.18, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      const filt = audioCtx.createBiquadFilter(); filt.type = "bandpass"; filt.frequency.value = 1200; filt.Q.value = 0.8;
      src.connect(filt); filt.connect(g); g.connect(audioCtx.destination); src.start();
    } catch (_) {}
  }

  update(dt: number, audioCtx: AudioContext | null) {
    this.time += dt;
    this.duckBobTime += 2.2 * dt;

    // Idle ripples
    this.rippleSpawnTimer += dt;
    if (this.rippleSpawnTimer >= this.rippleInterval) {
      this.rippleSpawnTimer = 0; this.rippleInterval = 2 + Math.random() * 1.8;
      const a = Math.random() * TWO_PI; const d = 0.2 + Math.random() * 0.6;
      const x = this.cx + Math.cos(a) * this.rx * d; const y = this.cy + Math.sin(a) * this.ry * d;
      this.idleRipples.push({ x, y, r: 2, maxR: 18 + Math.random() * 10, grow: 18 + Math.random() * 10, life: 1, decay: 0.013 + Math.random() * 0.005 });
    }
    this.idleRipples.forEach(r => { r.r += r.grow * dt; r.life -= r.decay; });
    this.idleRipples = this.idleRipples.filter(r => r.life > 0);

    // Crumbs
    this.crumbs.forEach(c => {
      if (c.dead) return;
      c.bobT += c.bobS * dt; c.y = c.baseY + Math.sin(c.bobT) * c.bobA; c.angle += c.spin * dt;
      if (!c.landed) { c.landT += dt; if (c.landT >= 0.4) c.landed = true; }
    });

    // Find nearest crumb
    let nearest: typeof this.crumbs[0] | null = null; let minD = Infinity;
    this.crumbs.forEach(c => { if (c.dead) return; const d = Math.hypot(c.x - this.duckX, c.y - this.duckY); if (d < minD) { minD = d; nearest = c; } });

    let tx: number, ty: number, targetSpeed: number;
    if (nearest) {
      tx = nearest.x; ty = nearest.y; targetSpeed = 75;
      if (Math.hypot(tx - this.duckX, ty - this.duckY) < 10) {
        nearest.dead = true;
        this.eating = true; this.eatTimer = 0;
        this.generateQuack(audioCtx);
        for (let i = 0; i < 10; i++) this.particles.push(new Particle(nearest.x, nearest.y, "splash"));
        for (let i = 0; i < 6; i++) this.particles.push(new Particle(nearest.x, nearest.y, "burst"));
        this.particles.push(new Particle(nearest.x, nearest.y, "ripple"));
      }
    } else {
      this.wanderTimer += dt;
      if (this.wanderTimer >= this.wanderInterval) { this.wanderTimer = 0; this.wanderInterval = 2.2 + Math.random() * 2.5; this.newWanderTarget(); }
      tx = this.wanderTarget.x; ty = this.wanderTarget.y; targetSpeed = 36;
      if (Math.hypot(tx - this.duckX, ty - this.duckY) < 8) this.wanderTimer = this.wanderInterval;
    }

    const dx = tx - this.duckX; const dy = ty - this.duckY; const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const dvx = (dx / dist) * targetSpeed; const dvy = (dy / dist) * targetSpeed;
      this.duckVx += (dvx - this.duckVx) * 6.5 * dt; this.duckVy += (dvy - this.duckVy) * 6.5 * dt;
    } else { this.duckVx *= 0.88; this.duckVy *= 0.88; }
    const spd = Math.hypot(this.duckVx, this.duckVy);
    if (spd > 75) { this.duckVx = (this.duckVx / spd) * 75; this.duckVy = (this.duckVy / spd) * 75; }

    let nx = this.duckX + this.duckVx * dt; let ny = this.duckY + this.duckVy * dt;
    if (((nx - this.cx) / (this.rx - 16)) ** 2 + ((ny - this.cy) / (this.ry - 16)) ** 2 > 1) { nx = this.duckX; ny = this.duckY; this.duckVx *= -0.4; this.duckVy *= -0.4; this.newWanderTarget(); }
    this.duckX = nx; this.duckY = ny;

    if (spd > 4) { let da = Math.atan2(this.duckVy, this.duckVx) - this.duckAngle; while (da > Math.PI) da -= TWO_PI; while (da < -Math.PI) da += TWO_PI; this.duckAngle += da * Math.min(1, 8 * dt); }

    if (this.eating) { this.eatTimer += dt; if (this.eatTimer >= 0.45) this.eating = false; }
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => !p.dead());
    this.crumbs = this.crumbs.filter(c => !c.dead);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);

    // Background
    if (this.bgPattern) { ctx.save(); ctx.fillStyle = this.bgPattern; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    else { ctx.fillStyle = "#5a9e3d"; ctx.fillRect(0, 0, w, h); }

    // Pond
    ctx.save();
    const grad = ctx.createRadialGradient(this.cx - this.rx * 0.25, this.cy - this.ry * 0.25, this.ry * 0.05, this.cx, this.cy, Math.max(this.rx, this.ry));
    grad.addColorStop(0, "rgba(100,210,255,0.18)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, TWO_PI); ctx.clip();
    ctx.drawImage(this.pondImg, this.cx - this.rx, this.cy - this.ry, this.rx * 2, this.ry * 2);

    // Idle ripples in pond
    this.idleRipples.forEach(r => {
      ctx.save(); ctx.globalAlpha = Math.max(0, r.life) * 0.5; ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, TWO_PI); ctx.stroke(); ctx.restore();
    });
    ctx.restore();

    // Shore vignette
    ctx.save();
    const sv = ctx.createRadialGradient(this.cx, this.cy, Math.max(this.rx, this.ry) * 0.85, this.cx, this.cy, Math.max(this.rx, this.ry) * 1.1);
    sv.addColorStop(0, "rgba(0,0,0,0)"); sv.addColorStop(1, "rgba(60,110,30,0.55)");
    ctx.fillStyle = sv; ctx.beginPath(); ctx.ellipse(this.cx, this.cy, this.rx + 14, this.ry + 14, 0, 0, TWO_PI); ctx.fill(); ctx.restore();

    // Crumbs
    this.crumbs.forEach(c => {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
      let scale = 1;
      if (!c.landed) { const p = c.landT / 0.4; scale = 0.4 + p * 0.7 + Math.sin(p * Math.PI) * 0.15; }
      ctx.scale(scale, scale);
      ctx.drawImage(this.crumbImg, -c.size / 2, -c.size / 2, c.size, c.size);
      ctx.restore();
    });

    // Particles
    this.particles.forEach(p => p.draw(ctx));

    // Duck
    const bob = Math.sin(this.duckBobTime) * 2.5;
    const eatScale = this.eating ? 1 + 0.15 * Math.sin((this.eatTimer / 0.45) * Math.PI) : 1;
    ctx.save(); ctx.translate(this.duckX, this.duckY + bob); ctx.rotate(this.duckAngle);
    const ds = 40 * eatScale;
    ctx.drawImage(this.duckImg, -ds / 2, -ds / 2, ds, ds);
    ctx.restore();

    if (this.eating) {
      const p = this.eatTimer / 0.45;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TWO_PI + this.duckAngle;
        const r1 = 22; const r2 = r1 + 8 + Math.sin(p * Math.PI) * 5;
        ctx.save(); ctx.globalAlpha = (1 - p) * 0.7; ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.duckX + Math.cos(a) * r1, this.duckY + bob + Math.sin(a) * r1); ctx.lineTo(this.duckX + Math.cos(a) * r2, this.duckY + bob + Math.sin(a) * r2); ctx.stroke(); ctx.restore();
      }
    }
  }
}

// ── Fake Feed Posts ────────────────────────────────────────────────────────────
const POSTS = [
  { name: "Sarah Johnson", handle: "sarahj", time: "2h", avatar: "SJ", color: "#e91e63", text: "Just got back from the most amazing hike! The views at sunrise were absolutely breathtaking 🌄 Nature really does heal.", likes: 142, comments: 28, shares: 11 },
  { name: "Tech Daily", handle: "techdaily", time: "4h", avatar: "TD", color: "#1877f2", text: "🚨 BREAKING: New AI model surpasses human performance on 97% of benchmark tasks. The future is here. Read the full report →", likes: 3841, comments: 512, shares: 1203 },
  { name: "Mike Chen", handle: "mikechen", time: "5h", avatar: "MC", color: "#ff9800", text: "Made homemade ramen from scratch for the first time ever. 6 hours later... honestly worth every minute. Recipe in comments! 🍜", likes: 87, comments: 43, shares: 19 },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export function FacebookPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PondGame | null>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [gameVisible, setGameVisible] = useState(true);
  const [crumbHint, setCrumbHint] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const duckImg = drawDuckImg();
    const pondImg = drawPondImg();
    const crumbImg = drawCrumbImg();
    const bgImg = drawBgTile();

    let game: PondGame;

    const initGame = () => {
      const w = canvas.clientWidth; const h = 320;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      game = new PondGame(w, h, duckImg, pondImg, crumbImg, bgImg);
      try {
        const bgC = document.createElement("canvas"); bgC.width = 64; bgC.height = 64;
        const bc = bgC.getContext("2d")!;
        bc.fillStyle = "#5a9e3d"; bc.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 30; i++) { bc.fillStyle = i % 2 === 0 ? "#4e8e32" : "#6ab84a"; bc.fillRect(Math.random() * 64, Math.random() * 64, 2, 5 + Math.random() * 4); }
        game.bgPattern = ctx.createPattern(bgC, "repeat");
      } catch (_) {}
      gameRef.current = game;

      lastTimeRef.current = performance.now();
      const loop = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = now;
        game.update(dt, audioCtxRef.current);
        game.draw(ctx, w, h);
        animRef.current = requestAnimationFrame(loop);
      };
      animRef.current = requestAnimationFrame(loop);
    };

    // Wait for images
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded >= 3) initGame(); };
    duckImg.onload = onLoad; pondImg.onload = onLoad; crumbImg.onload = onLoad;
    bgImg.onload = () => {};

    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!game.inPond(x, y)) return;

    // Init audio on first interaction
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch (_) {}
    }
    game.generateSplash(audioCtxRef.current);
    game.spawnCrumbs(x, y);
    setCrumbHint(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* ── Nav bar ── */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-between px-4">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[#1877f2] font-bold text-3xl leading-none">f</div>
          <div className="flex items-center bg-[#f0f2f5] rounded-full px-3 py-2 gap-2 w-48 hidden sm:flex">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>
            <span className="text-sm text-gray-400">Search Facebook</span>
          </div>
        </div>
        {/* Center: Nav icons */}
        <div className="flex items-center gap-1">
          {["🏠","🎬","👥","🎮","🛍️"].map((icon, i) => (
            <button key={i} className={`px-5 py-3 rounded-lg text-xl ${i === 0 ? "border-b-2 border-[#1877f2] text-[#1877f2]" : "text-gray-500 hover:bg-[#f0f2f5]"}`}>{icon}</button>
          ))}
        </div>
        {/* Right: Profile */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#f0f2f5] flex items-center justify-center text-sm font-bold text-gray-700">JD</div>
        </div>
      </nav>

      {/* ── Main layout ── */}
      <div className="pt-14 flex max-w-[1100px] mx-auto gap-4 px-4">
        {/* Left sidebar */}
        <aside className="w-[280px] flex-shrink-0 py-4 hidden lg:block">
          <div className="sticky top-16">
            {[["👤","John Doe"],["👥","Friends"],["📅","Events"],["📰","Feed"],["📺","Watch"],["🛒","Marketplace"],["📋","Groups"]].map(([icon, label]) => (
              <button key={label as string} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#e4e6ea] text-gray-800 font-medium text-sm">
                <span className="text-xl">{icon}</span>{label}
              </button>
            ))}
            <hr className="my-2 border-gray-200"/>
            <p className="text-xs text-gray-400 px-3 py-1">Shortcuts</p>
            {[["🦆","Duck Fan Club"],["⚽","Weekend FC"],["🎮","Gaming Lounge"]].map(([icon, label]) => (
              <button key={label as string} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#e4e6ea] text-gray-700 text-sm">
                <span className="text-lg">{icon}</span>{label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Feed column ── */}
        <main className="flex-1 py-4 min-w-0">
          {/* Stories row */}
          <div className="bg-white rounded-xl shadow-sm p-3 mb-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{icon:"➕", name:"Create Story", bg:"#f0f2f5", fg:"#1877f2"},{icon:"🌅",name:"Sarah J.",bg:"#e91e63",fg:"white"},{icon:"🎵",name:"Mike C.",bg:"#ff9800",fg:"white"},{icon:"🐶",name:"Tech D.",bg:"#1877f2",fg:"white"}].map(s => (
                <div key={s.name} className="flex-shrink-0 w-24 h-36 rounded-xl overflow-hidden cursor-pointer relative" style={{background:s.bg}}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs font-semibold" style={{color:s.fg}}>{s.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Duck Pond Overlay ── */}
          <div className="bg-[#2d4a22] rounded-xl shadow-md overflow-hidden mb-3">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/20">
              <div className="flex items-center gap-2">
                <span className="text-lg">🦆</span>
                <span className="text-[#d4efb0] font-semibold text-sm">Duck Pond</span>
                <span className="text-xs text-[#a0c878] bg-black/20 px-2 py-0.5 rounded-full">Extension Active</span>
              </div>
              <button
                onClick={() => setGameVisible(v => !v)}
                className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-[#c8e6a0] px-3 py-1 rounded-md transition-colors"
              >
                {gameVisible ? "Hide" : "Show"}
              </button>
            </div>

            {gameVisible && (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  style={{ display: "block", width: "100%", height: 320, cursor: "crosshair" }}
                  onClick={handleCanvasClick}
                />
                {crumbHint && (
                  <div className="absolute bottom-3 right-4 text-white/50 text-xs pointer-events-none">
                    Click the pond to toss breadcrumbs 🍞
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What's on your mind */}
          <div className="bg-white rounded-xl shadow-sm p-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#e4e6ea] flex items-center justify-center text-sm font-bold">JD</div>
              <div className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-2 text-sm text-gray-400 cursor-pointer hover:bg-[#e4e6ea]">
                What's on your mind, John?
              </div>
            </div>
            <hr className="my-2 border-gray-200"/>
            <div className="flex justify-around">
              {[["🎥","Live video"],["📷","Photo/video"],["😊","Feeling"]].map(([icon, label]) => (
                <button key={label as string} className="flex items-center gap-1 text-sm text-gray-600 font-medium px-3 py-1 rounded-lg hover:bg-[#f0f2f5]">
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          {POSTS.map((post, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm mb-3 overflow-hidden">
              <div className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{background: post.color}}>{post.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{post.name}</div>
                    <div className="text-xs text-gray-500">{post.time} ago · 🌐</div>
                  </div>
                </div>
                <p className="text-sm text-gray-800 mb-2">{post.text}</p>
              </div>
              {/* Fake image placeholder for first post */}
              {i === 0 && <div className="h-48 bg-gradient-to-br from-orange-200 via-sky-200 to-purple-200 flex items-center justify-center text-4xl">🏔️</div>}
              <div className="px-3 py-1 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>👍❤️😮 {post.likes.toLocaleString()}</span>
                  <span>{post.comments} comments · {post.shares} shares</span>
                </div>
                <div className="flex justify-around border-t border-gray-100 pt-1">
                  {[["👍","Like"],["💬","Comment"],["↗️","Share"]].map(([icon, label]) => (
                    <button key={label as string} className="flex items-center gap-1 text-sm text-gray-600 font-medium px-4 py-1 rounded-lg hover:bg-[#f0f2f5]">
                      <span>{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </main>

        {/* Right sidebar */}
        <aside className="w-[280px] flex-shrink-0 py-4 hidden xl:block">
          <div className="sticky top-16">
            <div className="mb-4">
              <div className="font-semibold text-gray-600 text-sm mb-2">Sponsored</div>
              <div className="bg-white rounded-xl shadow-sm p-3">
                <div className="h-24 bg-gradient-to-br from-green-200 to-teal-200 rounded-lg mb-2 flex items-center justify-center text-3xl">🦆</div>
                <div className="font-semibold text-sm text-gray-900">Duck Pond Extension</div>
                <div className="text-xs text-gray-500">duckpond.app</div>
                <div className="text-xs text-gray-600 mt-1">Escape the feed. Relax with your duck.</div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-600 text-sm mb-2">Active friends</div>
              {[["SJ","Sarah Johnson","#e91e63"],["MC","Mike Chen","#ff9800"],["AL","Alex Lee","#9c27b0"]].map(([av, name, color]) => (
                <div key={name as string} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f0f2f5] cursor-pointer">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:color as string}}>{av}</div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"/>
                  </div>
                  <span className="text-sm text-gray-800">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
