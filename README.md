# PRESTIEGE COUNTRY CLUB — playable school build

**Where Legends Tee Off.** An original browser-based 3D golf vertical slice made with Three.js. Upload all of these files and folders to the root of a public GitHub repository, then enable **Settings → Pages → Deploy from a branch → main / (root)**. The app requires internet access to load Three.js, Google Fonts, and optional licensed Rocketbox avatar models. Don't open `index.html` directly from Finder; use GitHub Pages or a local HTTP server.

## Included
- Home screen with bottom menu tabs
- Three original settings: Royal Classic, Ocean's Edge, Summit Pines
- Three playable holes per course, with tee shots, wind, ball flight, rebounds, putting, water penalties, bunkers, shots and per-round scorecards
- Golfer identity settings and a tutorial screen explaining controls
- Female and male Mixamo bot fallback models, plus uploaded golf animation files. The game **tries to load detailed Rocketbox avatars at runtime from the public Avatar Studio GitHub repository**. Those files are *not* stored in this ZIP. A failed network fetch falls back to X/Y Bot.
- Golf Drive animation for driver; Golf Chip for iron/wedge; Golf Putt for putting; remaining uploaded animation assets for idle, walking, tee setup and reactions. The app checks skeleton track compatibility; unmatched animations are skipped, not guaranteed to work.

## Controls
- Hold Space to build swing power, release to strike.
- Left/right arrows or A/D adjust the aim.
- 1–4 select driver, iron, wedge, putter.
- Drag on the course to slightly orbit the camera.
- Ball must stop before the next stroke. After each hole, click **Next Hole**.

## Important limitations
This is **not** a commercial-grade PGA 2K simulator. Three-hole rounds per course, simplified flight/bounce/terrain physics, procedural trees, simplified club models, and no online multiplayer. Character customization currently saves player name, body choice, and clothing color preferences: individual outfit textures do **not** change on the loaded Rocketbox models. Tutorial loads the uploaded Timmy character alongside the golfer, but currently uses a lesson UI rather than a fully animated conversational coaching system. These limitations are intentional disclosures, not missing dependencies. We could not perform a real end-to-end browser rendering test in this environment; JavaScript syntax and asset inclusion were checked.

## Third-party assets / licensing
- Three.js: MIT, https://threejs.org
- Optional Rocketbox avatars: © Microsoft Corporation, Microsoft Rocketbox Avatar Library (MIT); loaded via `https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@main/models/*.glb` at runtime. Source: https://github.com/memoriesrohit/avatar-studio and https://github.com/microsoft/Microsoft-Rocketbox . Include upstream attribution and review its notices if distributing models.
- The FBX assets provided in this archive are the user's own uploads and appear to come from Adobe Mixamo. Mixamo permits use in games but has restrictions on redistribution of raw character/animation files; **before publishing a public repository containing these FBX files, verify you are licensed to redistribute them**. For a public distribution, ideally bake animation into a distributable game asset in accordance with Adobe's applicable terms, rather than hosting standalone raw downloads. This is not legal advice.
- The golf course geometry, game logic, and UI were authored for this school project.

## File list
- `index.html`, `style.css`, `js/main.js`, `js/world.js`, `js/game.js`, `js/actors.js`, `assets/characters/`, `assets/animations/`.
