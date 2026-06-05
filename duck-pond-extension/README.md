# 🦆 Duck Pond — Browser Extension

Replaces the Facebook News Feed with a relaxing interactive duck pond mini-game.

## How to Load in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `duck-pond-extension` folder
5. Navigate to Facebook — your News Feed is now a duck pond!

## How to Load in Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file inside `duck-pond-extension`

## How to Play

- **Click anywhere on the pond** to toss 3–5 breadcrumbs
- The duck will swim toward the nearest crumb and eat it
- Watch for water ripples, splash particles, and the little eating animation
- Use the **Hide / Show** button in the title bar to temporarily reveal the original feed

## Popup — Asset Manager

Click the Duck Pond icon in your browser toolbar to open the Asset Manager:

### Graphics Tab
Upload your own images for:
- **Duck** — any image (PNG recommended for transparency)
- **Pond** — replaces the water oval
- **Breadcrumbs** — the food the duck eats
- **Background** — the grass/ground area
- **Title / Logo** — the "Duck Pond" heading above the game

All images are stored locally in your browser via `chrome.storage.local`.
Click **Reset** on any slot to go back to the procedurally drawn default.

### Audio Tab
Upload your own audio files (MP3/WAV/OGG) for:
- **Background Music** — looping ambient track
- **Ambient SFX** — looping nature sounds
- **Duck Quack** — plays when the duck eats a crumb (has a built-in synthesized default)
- **Breadcrumb Splash** — plays when crumbs hit the water (has a built-in synthesized default)
- **Button Click SFX** — UI feedback

Use per-track volume sliders and the **Master Mute** toggle to control audio.

## Default Assets

All graphics and two sound effects (quack and splash) are generated procedurally in JavaScript — no image files needed. The extension works completely out of the box with zero uploads.

## File Structure

```
duck-pond-extension/
├── manifest.json
├── content.js              # Injects canvas, runs game loop
├── game/
│   ├── assetLoader.js      # Loads defaults or custom base64 assets
│   ├── particles.js        # Splash/ripple particle system
│   ├── pond.js             # Pond rendering, idle ripples
│   ├── duck.js             # Duck entity, steering, animation
│   └── breadcrumb.js       # Crumb spawning and lifecycle
├── popup/
│   ├── popup.html
│   ├── popup.js            # Tab switching, file upload to storage
│   └── popup.css
└── assets/                 # Drop custom default assets here (optional)
    └── audio/
```
