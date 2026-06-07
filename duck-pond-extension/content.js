// ─── Overlay injection ────────────────────────────────────────────────────────

const OVERLAY_ID = 'duck-pond-overlay';
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
    padding: 8px 14px 6px;
    background: rgba(0,0,0,0.18);
    backdrop-filter: blur(4px);
  `;

  const titleLabel = document.createElement('span');
  titleLabel.style.cssText = 'color: #d4efb0; font-size: 15px; font-weight: bold; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);';
  titleLabel.textContent = '🦆 Duck Pond';

  titleBar.appendChild(titleLabel);

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

  fitCanvas(canvas);

  game = new DuckPondGame(canvas, assets);

  window.addEventListener('resize', () => {
    const { w, h } = fitCanvas(canvas);
    if (game) game.resize(w, h);
  });
}