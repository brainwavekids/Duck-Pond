/**
 * content.js
 * Main entry point for Duck Pond injected into facebook.com.
 * Detects the news feed, injects the overlay, and runs the game loop.
 */
(function () {
  'use strict';

  if (window.__duckPondInjected) return;
  window.__duckPondInjected = true;

  // ─── Audio Manager ───────────────────────────────────────────────────────────

  class AudioManager {
    constructor(volumes, audioData) {
      this.volumes = volumes;
      this.audioData = audioData;
      this.ctx = null;
      this.nodes = {};
      this.ready = false;
    }

    async init() {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volumes.masterMute ? 0 : 1;
        this.masterGain.connect(this.ctx.destination);

        if (this.audioData.quack) {
          this.nodes.quack = await this._loadBuffer(this.audioData.quack);
        }
        if (this.audioData.splash) {
          this.nodes.splash = await this._loadBuffer(this.audioData.splash);
        }
        if (this.audioData.music) {
          this.nodes.music = await this._loadBuffer(this.audioData.music);
          this._playLoop('music', this.volumes.music);
        }
        if (this.audioData.ambient) {
          this.nodes.ambient = await this._loadBuffer(this.audioData.ambient);
          this._playLoop('ambient', this.volumes.ambient);
        }
        this.ready = true;
      } catch (e) {
        console.warn('[DuckPond] AudioManager init failed:', e);
      }
    }

    async _loadBuffer(base64) {
      const response = await fetch(base64);
      const arrayBuffer = await response.arrayBuffer();
      return this.ctx.decodeAudioData(arrayBuffer);
    }

    _playLoop(key, vol) {
      if (!this.nodes[key] || !this.ctx) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.nodes[key];
      src.loop = true;
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = this.volumes.masterMute ? 0 : vol;
      src.connect(gainNode);
      gainNode.connect(this.masterGain);
      src.start();
      this[`_${key}Src`] = src;
      this[`_${key}Gain`] = gainNode;
    }

    play(key) {
      if (!this.ready || !this.nodes[key] || !this.ctx) return;
      if (this.volumes.masterMute) return;
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = this.nodes[key];
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = this.volumes[key] !== undefined ? this.volumes[key] : 0.7;
        src.connect(gainNode);
        gainNode.connect(this.masterGain);
        src.start();
      } catch (e) {}
    }

    generateQuack() {
      if (!this.ctx) return;
      if (this.volumes.masterMute) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(260, this.ctx.currentTime + 0.13);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.18 * this.volumes.quack, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.3);
      } catch (e) {}
    }

    generateSplash() {
      if (!this.ctx) return;
      if (this.volumes.masterMute) return;
      try {
        const bufferSize = this.ctx.sampleRate * 0.18;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.22 * this.volumes.splash, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 0.8;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start();
      } catch (e) {}
    }
  }

  // ─── Game ─────────────────────────────────────────────────────────────────────

  class DuckPondGame {
    constructor(canvas, assets) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.assets = assets;
      this.breadcrumbs = [];
      this.animId = null;
      this.lastTime = null;

      const w = canvas.width;
      const h = canvas.height;
      const pondRx = Math.min(w * 0.42, 260);
      const pondRy = Math.min(h * 0.42, 160);
      const pondCx = w / 2;
      const pondCy = h / 2 + 10;

      this.pond = new window.DuckPondPond.Pond(pondCx, pondCy, pondRx, pondRy);
      this.pond.buildBgPattern(this.ctx, assets.backgroundTile);
      this.particles = new window.DuckPondParticles.ParticleSystem();

      this.audioManager = new AudioManager(assets.volumes, assets.audioData);
      this.audioManager.init().then(() => {
        this.duck = new window.DuckPondDuck.Duck(pondCx, pondCy, this.pond);
        this._start();
      });

      this.duck = new window.DuckPondDuck.Duck(pondCx, pondCy, this.pond);

      canvas.addEventListener('click', (e) => this._onClick(e));
    }

    _onClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (!this.pond.containsPoint(x, y)) return;

      this.breadcrumbs = window.DuckPondBreadcrumb.spawnBreadcrumbs(
        x, y,
        this.pond,
        this.particles,
        { splash: () => this.audioManager.generateSplash() },
        this.breadcrumbs
      );
    }

    _start() {
      this.lastTime = performance.now();
      const loop = (now) => {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        this._update(dt);
        this._draw();
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    }

    _update(dt) {
      this.pond.update(dt);

      const eaten = [];
      this.breadcrumbs.forEach((b) => {
        const wasDead = b.dead;
        b.update(dt);
        if (!wasDead && b.dead) eaten.push(b);
      });

      if (eaten.length > 0) {
        if (this.assets.audioData.quack) {
          this.audioManager.play('quack');
        } else {
          this.audioManager.generateQuack();
        }
        this.duck.triggerEat();
        eaten.forEach((b) => this.particles.spawnEatBurst(b.x, b.y, 8));
      }

      this.breadcrumbs = this.breadcrumbs.filter((b) => !b.dead);

      if (this.duck) {
        this.duck.update(dt, this.breadcrumbs.filter((b) => !b.dead));
      }
      this.particles.update(dt);
    }

    _draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);
      this.pond.drawBackground(ctx, w, h);
      this.pond.drawPond(ctx, this.assets.pond);
      this.breadcrumbs.forEach((b) => b.draw(ctx, this.assets.breadcrumb));
      this.particles.draw(ctx);
      if (this.duck) this.duck.draw(ctx, this.assets.duck);
    }

    stop() {
      if (this.animId) cancelAnimationFrame(this.animId);
    }

    resize(w, h) {
      this.canvas.width = w;
      this.canvas.height = h;
      const pondRx = Math.min(w * 0.42, 260);
      const pondRy = Math.min(h * 0.42, 160);
      this.pond.cx = w / 2;
      this.pond.cy = h / 2 + 10;
      this.pond.rx = pondRx;
      this.pond.ry = pondRy;
      this.pond.bgPattern = null;
      this.pond.buildBgPattern(this.ctx, this.assets.backgroundTile);
      if (this.duck) {
        this.duck.x = w / 2;
        this.duck.y = h / 2;
        this.duck.pond = this.pond;
      }
    }
  }

  // ─── Overlay injection ────────────────────────────────────────────────────────

  const OVERLAY_ID = 'duck-pond-overlay';
  let visible = true;
  let game = null;

  function buildOverlay(feedEl) {
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: relative;
      width: 100%;
      background: #2d4a22;
      border-radius: 10px;
      overflow: hidden;
      font-family: Georgia, serif;
      box-shadow: 0 4px 18px rgba(0,0,0,0.35);
      margin-bottom: 12px;
    `;

    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px 6px;
      background: rgba(0,0,0,0.18);
      backdrop-filter: blur(4px);
    `;

    const titleLeft = document.createElement('div');
    titleLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const titleCanvas = document.createElement('canvas');
    titleCanvas.id = 'dp-title-canvas';
    titleCanvas.width = 180;
    titleCanvas.height = 36;
    titleCanvas.style.cssText = 'display:block;';

    const titleLabel = document.createElement('span');
    titleLabel.style.cssText = 'color: #d4efb0; font-size: 15px; font-weight: bold; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);';
    titleLabel.textContent = '🦆 Duck Pond';

    titleLeft.appendChild(titleLabel);

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Hide';
    toggleBtn.style.cssText = `
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      color: #c8e6a0;
      padding: 3px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.15s;
    `;
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = 'rgba(255,255,255,0.22)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = 'rgba(255,255,255,0.12)';
    });

    titleBar.appendChild(titleLeft);
    titleBar.appendChild(toggleBtn);

    const gameContainer = document.createElement('div');
    gameContainer.id = 'dp-game-container';
    gameContainer.style.cssText = 'position: relative; width: 100%;';

    const canvas = document.createElement('canvas');
    canvas.id = 'dp-canvas';
    canvas.style.cssText = 'display: block; width: 100%; cursor: crosshair;';

    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      bottom: 10px;
      right: 14px;
      color: rgba(255,255,255,0.45);
      font-size: 11px;
      pointer-events: none;
    `;
    hint.textContent = 'Click the pond to toss breadcrumbs 🍞';

    gameContainer.appendChild(canvas);
    gameContainer.appendChild(hint);

    overlay.appendChild(titleBar);
    overlay.appendChild(gameContainer);

    toggleBtn.addEventListener('click', () => {
      visible = !visible;
      gameContainer.style.display = visible ? 'block' : 'none';
      toggleBtn.textContent = visible ? 'Hide' : 'Show';
      if (visible && game) {
        fitCanvas(canvas);
      }
    });

    return { overlay, canvas, gameContainer };
  }

  function fitCanvas(canvas) {
    const w = canvas.parentElement.clientWidth;
    const h = Math.max(260, Math.min(w * 0.52, 380));
    canvas.width = w;
    canvas.height = h;
    canvas.style.height = h + 'px';
    return { w, h };
  }

  async function inject(feedEl) {
    if (document.getElementById(OVERLAY_ID)) return;

    const assets = await window.DuckPondAssets.loadAssets();
    const { overlay, canvas, gameContainer } = buildOverlay(feedEl);

    feedEl.style.display = 'none';
    feedEl.parentNode.insertBefore(overlay, feedEl);

    const { w, h } = fitCanvas(canvas);

    game = new DuckPondGame(canvas, assets);

    window.addEventListener('resize', () => {
      if (!visible) return;
      const { w, h } = fitCanvas(canvas);
      if (game) game.resize(w, h);
    });
  }

  function findFeed() {
    const selectors = [
      '[role="feed"]',
      '[data-pagelet="FeedUnit"]',
      '[data-pagelet="Feed"]',
      '[data-pagelet="ProfileTimeline"]',
      '#topnews_main_stream_408239535924329',
      '.x1lliihq[role="main"] [role="feed"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function tryInject() {
    const feed = findFeed();
    if (feed) {
      inject(feed);
      return true;
    }
    return false;
  }

  if (!tryInject()) {
    const observer = new MutationObserver((_, obs) => {
      if (tryInject()) obs.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => observer.disconnect(), 15000);
  }
})();
