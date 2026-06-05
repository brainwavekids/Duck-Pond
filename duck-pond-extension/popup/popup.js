/**
 * popup.js
 * Handles tab switching, asset upload/preview, volume controls,
 * and chrome.storage.local persistence for the Duck Pond popup.
 */
(function () {
  'use strict';

  // ── Storage key map ──────────────────────────────────────────────────────────

  const IMAGE_KEYS = {
    duck: 'asset_duck',
    pond: 'asset_pond',
    breadcrumb: 'asset_breadcrumb',
    background: 'asset_background',
    title: 'asset_title',
  };

  const AUDIO_KEYS = {
    music: 'audio_music',
    ambient: 'audio_ambient',
    quack: 'audio_quack',
    splash: 'audio_splash',
    click: 'audio_click',
  };

  const VOLUME_KEYS = {
    music: 'vol_music',
    ambient: 'vol_ambient',
    quack: 'vol_quack',
    splash: 'vol_splash',
    click: 'vol_click',
  };

  const AUDIO_FILENAME_KEYS = {
    music: 'fname_music',
    ambient: 'fname_ambient',
    quack: 'fname_quack',
    splash: 'fname_splash',
    click: 'fname_click',
  };

  // ── Utility ──────────────────────────────────────────────────────────────────

  function showToast(msg = 'Saved!') {
    const toast = document.getElementById('status-toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function drawDefaultDuck() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f5c518';
    ctx.beginPath(); ctx.ellipse(32, 38, 20, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(32, 24, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath(); ctx.moveTo(44, 24); ctx.lineTo(54, 21); ctx.lineTo(44, 27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(36, 20, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0a500';
    ctx.beginPath(); ctx.ellipse(28, 52, 10, 4, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d48800';
    ctx.beginPath(); ctx.ellipse(36, 52, 10, 4, -0.1, 0, Math.PI * 2); ctx.fill();
    return c.toDataURL();
  }

  function drawDefaultPond() {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 260;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(200, 130, 20, 200, 130, 180);
    grad.addColorStop(0, '#4fc3f7'); grad.addColorStop(0.5, '#29b6f6'); grad.addColorStop(1, '#0288d1');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(200, 130, 190, 120, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(200, 130, 180 - i * 30, 110 - i * 18, 0, 0, Math.PI * 2); ctx.stroke();
    }
    return c.toDataURL();
  }

  function drawDefaultBreadcrumb() {
    const c = document.createElement('canvas');
    c.width = 20; c.height = 20;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath(); ctx.ellipse(10, 11, 7, 5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#A0714F';
    ctx.beginPath(); ctx.ellipse(10, 10, 6, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    return c.toDataURL();
  }

  function drawDefaultBackground() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#5a9e3d'; ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#4e8e32' : '#6ab84a';
      ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 5 + Math.random() * 4);
    }
    return c.toDataURL();
  }

  function drawDefaultTitle() {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 240, 48);
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a4a2a';
    ctx.fillText('🦆 Duck Pond', 120, 24);
    return c.toDataURL();
  }

  const DEFAULT_GENERATORS = {
    duck: drawDefaultDuck,
    pond: drawDefaultPond,
    breadcrumb: drawDefaultBreadcrumb,
    background: drawDefaultBackground,
    title: drawDefaultTitle,
  };

  // ── Tab switching ────────────────────────────────────────────────────────────

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ── Preview loading ──────────────────────────────────────────────────────────

  function loadPreviews() {
    const storageKeys = Object.values(IMAGE_KEYS);
    chrome.storage.local.get(storageKeys, (data) => {
      Object.entries(IMAGE_KEYS).forEach(([name, key]) => {
        const img = document.getElementById('prev-' + name);
        if (img) {
          img.src = data[key] || DEFAULT_GENERATORS[name]();
        }
      });
    });
  }

  function loadVolumeSettings() {
    const volKeys = Object.values(VOLUME_KEYS);
    const fnameKeys = Object.values(AUDIO_FILENAME_KEYS);
    chrome.storage.local.get([...volKeys, ...fnameKeys, 'master_mute'], (data) => {
      Object.entries(VOLUME_KEYS).forEach(([name, key]) => {
        const slider = document.getElementById('vol-' + name);
        if (slider && data[key] !== undefined) {
          slider.value = data[key];
        }
      });

      Object.entries(AUDIO_FILENAME_KEYS).forEach(([name, key]) => {
        const el = document.getElementById('fname-' + name);
        if (el && data[key]) {
          el.textContent = data[key];
        }
      });

      const muteEl = document.getElementById('master-mute');
      if (muteEl) {
        muteEl.checked = !!data['master_mute'];
      }
    });
  }

  // ── Image upload ─────────────────────────────────────────────────────────────

  let pendingImageAsset = null;
  const fileInputImage = document.getElementById('file-input-image');

  document.querySelectorAll('[data-asset]').forEach((btn) => {
    const assetName = btn.dataset.asset;
    if (!(assetName in IMAGE_KEYS)) return;

    btn.addEventListener('click', () => {
      pendingImageAsset = assetName;
      fileInputImage.value = '';
      fileInputImage.click();
    });
  });

  fileInputImage.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingImageAsset) return;

    try {
      const b64 = await fileToBase64(file);
      const key = IMAGE_KEYS[pendingImageAsset];
      chrome.storage.local.set({ [key]: b64 }, () => {
        const img = document.getElementById('prev-' + pendingImageAsset);
        if (img) img.src = b64;
        showToast('Asset saved!');
        pendingImageAsset = null;
      });
    } catch (err) {
      showToast('Upload failed');
    }
  });

  // ── Audio upload ─────────────────────────────────────────────────────────────

  let pendingAudioAsset = null;
  const fileInputAudio = document.getElementById('file-input-audio');

  document.querySelectorAll('[data-asset]').forEach((btn) => {
    const assetName = btn.dataset.asset;
    if (!(assetName in AUDIO_KEYS)) return;

    btn.addEventListener('click', () => {
      pendingAudioAsset = assetName;
      fileInputAudio.value = '';
      fileInputAudio.click();
    });
  });

  fileInputAudio.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingAudioAsset) return;

    try {
      const b64 = await fileToBase64(file);
      const key = AUDIO_KEYS[pendingAudioAsset];
      const fnameKey = AUDIO_FILENAME_KEYS[pendingAudioAsset];
      const shortName = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name;

      chrome.storage.local.set({ [key]: b64, [fnameKey]: shortName }, () => {
        const el = document.getElementById('fname-' + pendingAudioAsset);
        if (el) el.textContent = shortName;
        showToast('Audio saved!');
        pendingAudioAsset = null;
      });
    } catch (err) {
      showToast('Upload failed');
    }
  });

  // ── Reset buttons ────────────────────────────────────────────────────────────

  document.querySelectorAll('[data-reset]').forEach((btn) => {
    const assetName = btn.dataset.reset;

    btn.addEventListener('click', () => {
      if (assetName in IMAGE_KEYS) {
        chrome.storage.local.remove(IMAGE_KEYS[assetName], () => {
          const img = document.getElementById('prev-' + assetName);
          if (img) img.src = DEFAULT_GENERATORS[assetName]();
          showToast('Reset to default');
        });
      } else if (assetName in AUDIO_KEYS) {
        chrome.storage.local.remove(
          [AUDIO_KEYS[assetName], AUDIO_FILENAME_KEYS[assetName]],
          () => {
            const el = document.getElementById('fname-' + assetName);
            if (el) {
              el.textContent = assetName === 'quack' || assetName === 'splash'
                ? 'Procedural default'
                : 'No custom file';
            }
            showToast('Reset to default');
          }
        );
      }
    });
  });

  // ── Volume sliders ───────────────────────────────────────────────────────────

  document.querySelectorAll('.volume-slider').forEach((slider) => {
    slider.addEventListener('input', () => {
      const volName = slider.dataset.vol;
      const key = VOLUME_KEYS[volName];
      if (!key) return;
      chrome.storage.local.set({ [key]: parseInt(slider.value, 10) });
    });
  });

  // ── Master mute ──────────────────────────────────────────────────────────────

  const masterMuteEl = document.getElementById('master-mute');
  masterMuteEl.addEventListener('change', () => {
    chrome.storage.local.set({ master_mute: masterMuteEl.checked }, () => {
      showToast(masterMuteEl.checked ? '🔇 Muted' : '🔊 Unmuted');
    });
  });

  // ── Init ─────────────────────────────────────────────────────────────────────

  loadPreviews();
  loadVolumeSettings();
})();
