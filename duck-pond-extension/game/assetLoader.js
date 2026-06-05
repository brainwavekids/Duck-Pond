/**
 * assetLoader.js
 * Loads assets from chrome.storage.local (base64 data URLs) or falls back to
 * procedurally-drawn canvas defaults. Exposes window.DuckPondAssets.
 */
(function () {
  'use strict';

  const ASSET_KEYS = {
    duck: 'asset_duck',
    pond: 'asset_pond',
    breadcrumb: 'asset_breadcrumb',
    background: 'asset_background',
    title: 'asset_title',
    musicVolume: 'vol_music',
    ambientVolume: 'vol_ambient',
    quackVolume: 'vol_quack',
    splashVolume: 'vol_splash',
    clickVolume: 'vol_click',
    masterMute: 'master_mute',
    musicAudio: 'audio_music',
    ambientAudio: 'audio_ambient',
    quackAudio: 'audio_quack',
    splashAudio: 'audio_splash',
    clickAudio: 'audio_click',
  };

  function drawDefaultDuck() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#f5c518';
    ctx.beginPath();
    ctx.ellipse(32, 38, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5c518';
    ctx.beginPath();
    ctx.ellipse(32, 24, 13, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(44, 24);
    ctx.lineTo(54, 21);
    ctx.lineTo(44, 27);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(36, 20, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f0a500';
    ctx.beginPath();
    ctx.ellipse(28, 52, 10, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d48800';
    ctx.beginPath();
    ctx.ellipse(36, 52, 10, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();

    return c.toDataURL();
  }

  function drawDefaultPond() {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 260;
    const ctx = c.getContext('2d');

    const grad = ctx.createRadialGradient(200, 130, 20, 200, 130, 180);
    grad.addColorStop(0, '#4fc3f7');
    grad.addColorStop(0.5, '#29b6f6');
    grad.addColorStop(1, '#0288d1');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(200, 130, 190, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(200, 130, 180 - i * 30, 110 - i * 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    return c.toDataURL();
  }

  function drawDefaultBreadcrumb() {
    const c = document.createElement('canvas');
    c.width = 20;
    c.height = 20;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath();
    ctx.ellipse(10, 11, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#A0714F';
    ctx.beginPath();
    ctx.ellipse(10, 10, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    return c.toDataURL();
  }

  function drawDefaultBackground() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#5a9e3d';
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = '#4e8e32';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      ctx.fillRect(x, y, 2, 6);
    }
    ctx.fillStyle = '#6ab84a';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      ctx.fillRect(x, y, 2, 5);
    }

    return c.toDataURL();
  }

  function drawDefaultTitle() {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 48;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, 240, 48);

    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('🦆 Duck Pond', 122, 26);

    ctx.fillStyle = '#1a4a2a';
    ctx.fillText('🦆 Duck Pond', 120, 24);

    return c.toDataURL();
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function loadAssets() {
    const storageKeys = Object.values(ASSET_KEYS);

    return new Promise((resolve) => {
      chrome.storage.local.get(storageKeys, async (data) => {
        const duck = await loadImage(data[ASSET_KEYS.duck] || drawDefaultDuck());
        const pond = await loadImage(data[ASSET_KEYS.pond] || drawDefaultPond());
        const breadcrumb = await loadImage(data[ASSET_KEYS.breadcrumb] || drawDefaultBreadcrumb());
        const backgroundTile = await loadImage(data[ASSET_KEYS.background] || drawDefaultBackground());
        const titleImg = await loadImage(data[ASSET_KEYS.title] || drawDefaultTitle());

        const volumes = {
          music: data[ASSET_KEYS.musicVolume] !== undefined ? data[ASSET_KEYS.musicVolume] / 100 : 0.5,
          ambient: data[ASSET_KEYS.ambientVolume] !== undefined ? data[ASSET_KEYS.ambientVolume] / 100 : 0.4,
          quack: data[ASSET_KEYS.quackVolume] !== undefined ? data[ASSET_KEYS.quackVolume] / 100 : 0.7,
          splash: data[ASSET_KEYS.splashVolume] !== undefined ? data[ASSET_KEYS.splashVolume] / 100 : 0.6,
          click: data[ASSET_KEYS.clickVolume] !== undefined ? data[ASSET_KEYS.clickVolume] / 100 : 0.5,
          masterMute: !!data[ASSET_KEYS.masterMute],
        };

        const audioData = {
          music: data[ASSET_KEYS.musicAudio] || null,
          ambient: data[ASSET_KEYS.ambientAudio] || null,
          quack: data[ASSET_KEYS.quackAudio] || null,
          splash: data[ASSET_KEYS.splashAudio] || null,
          click: data[ASSET_KEYS.clickAudio] || null,
        };

        resolve({ duck, pond, breadcrumb, backgroundTile, titleImg, volumes, audioData });
      });
    });
  }

  window.DuckPondAssets = { loadAssets, ASSET_KEYS, drawDefaultDuck, drawDefaultPond, drawDefaultBreadcrumb, drawDefaultBackground, drawDefaultTitle };
})();
