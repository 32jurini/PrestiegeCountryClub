# PRESTIEGE COUNTRY CLUB — Deadline Update V3

A complete replacement of the previous GitHub Pages project. Upload the **contents** of this folder to the repository root; do not upload the ZIP as a file and do not nest the project in an extra folder. The game depends on Three.js ES modules from a CDN, so an internet connection is required. Deploy under Settings → Pages → main → /(root).

## This build includes
- An automatic first-time tutorial (start from **TEE OFF**), five coach lessons and optional replay from **ACADEMY**. Coach Timmy loads from the bundled `assets/characters/Timmy.fbx`; he attempts to play the uploaded golf, talking, pointing and greeting animations. If asset load fails, instructions remain usable.
- New 3D blue projected shot-path and estimated landing target, club selection, left/right aiming and a hold-and-release swing meter.
- Built-in WebAudio synthesized UI, swing, landing, cup and hazard audio. Click SOUND OFF to enable browser audio after user interaction. **This is sound effects, not background music, commentary or recorded speech.** Timmy's dialogue is shown as captions; there is no voice recording.
- MyGolfer options for name, body frame, shirt color, pants color, hair color, eye color, and skin tone. A 3D model preview appears on the MyGolfer screen. Visible material changes work only where the loaded avatar has separately named meshes/materials. The included fallback Mixamo bots do not provide realistic editable hair, eyes or facial morph controls. **Not a full facial feature editor yet.**
- Three original environments with three holes each, ball flight, wind, bounce, water, bunkers, scoring and round results.
- Your uploaded swing (drive/chip/putt), movement, idle, tee, Timmy point/talk, wave, picking-up, thumbs-up and celebration FBX files. Animation loading uses bone-name matching, so some moves may fail on mismatched skeletons. Some animations are available as assets for follow-up sequences rather than fully linked to an in-game action.
- Local browser settings and round records, **not** a cloud database or multiplayer.

## Controls
- Left/right arrows or A/D: aim
- Number keys 1–4: choose driver, iron, wedge, putter
- Hold and release Space: swing power
- Mouse drag: rotate camera a little

## Known limitations and disclosures
This is a playable school project build with simplified physics and vegetation. It does not yet reproduce the screenshot's AAA graphics, character facial detail, grass, crowd or animation quality. The blue path is a trajectory *estimate* rather than an exact physics predictor. Some Rocketbox avatar models are attempted via a public remote URL; the bundled local bots are used when unavailable. Animation synchronization to golf club and ball is not fully motion-captured or guaranteed. This build passed JavaScript syntax and archive integrity checks; **a live game test was not completed** because the local browser test was blocked by the browser environment.

The project contains user-provided Mixamo FBX assets. Before deploying raw FBX files to a public GitHub Pages repository, check Adobe's distribution rules and the licenses of all models. Hosting model/animation raw files publicly may require a different licensing/deployment approach.

## Files
- `index.html`, `style.css`
- `js/main.js`, `js/game.js`, `js/world.js`, `js/actors.js`, `js/sound.js`
- `assets/characters/` and `assets/animations/`

No server/database is included. Data persistence is localStorage only.