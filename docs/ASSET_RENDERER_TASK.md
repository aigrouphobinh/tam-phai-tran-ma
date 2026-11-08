# Asset renderer technical task — Tam Phai Tran Ma

Issue: https://github.com/aigrouphobinh/tam-phai-tran-ma/issues/5

## P0 — shipped on main

- Four RGBA WebP sprites (kiem, huyen, linh, boss) derived from the original concept artwork; files live in public/assets/characters.
- Versioned manifest with art provenance, render height and ground anchor.
- public/skin-renderer.js: validates manifests and local paths, preloads/caches images, supports flat texture and cutout layers with pivot/bone transforms.
- /obs: prefers the real texture renderer, retaining existing gameplay/VFX/SFX and using vector only if sprite loading fails.
- /models: shows the same four textures and a checkbox to compare to the vector fallback.
- Server-authoritative timestamps continue to control root motion, scale, fade, impact and death; no gameplay logic in the renderer.
- npm test checks real WebP files, manifest security, bitmap rendering and failure fallback.

**Sprite V2 update (2026-11-09):** the four base cutouts are now fallbacks. Each actor has a 32-pose shared atlas with eight distinct state rows. Boss windup/impact/stun/phase use dedicated clip timing; live, lab and studio share the atlas sampler. Source briefs and import metadata are documented in `SPRITE_ART_V2.md`. This is frame animation, not a layered bone rig; P1 bone work and Windows OBS acceptance remain open.

## P1 — layered art and atlas

For each class, deliver clean separated parts: torso, pelvis, head, hair front/back, upper/lower arms L/R, hands L/R, thighs, shins, boots, front/back robe, sleeves, cape/ribbons, weapon and separate VFX. Boss additionally requires 4-6 red silk ribbons, scythe blade/shaft, crown and red lotus.

Export a source PSD or layered PNG set, texture atlas (PNG/WebP) and rig JSON. All coordinates are relative to a normalized character canvas; each part needs a local pivot, parent bone, z-order, trim bounds and filename. Pack assets with reproducible tooling; preserve provenance and avoid third-party paid models.

## P2 — animation timeline and combat

- Idle: breathing, blinking, secondary cloth motion.
- Run: alternating legs, shoulder counter-rotation, real foot plant.
- Attack: anticipation, slash, server hit at 240ms, recover, trailing sword smear.
- Huyen: seal hands, independent talismans, cast and release.
- Linh: independent lotus and sleeves, healing wave, revive.
- Boss: idle, telegraph, cast, shield, hit, stun, phase transition, rage and death.
- Each action is keyed by actionSeq/actionAt/actionDuration. Never restart because a new SSE snapshot arrived.
- Asset motion and contact damage must stay decoupled; no client-side damage calculation.

## P3 — QA and performance

- 4/4 textures load without browser errors; check matte on light/dark backgrounds.
- /models allows visual comparison and repeats all 8 states.
- /obs renders 40 players, leader/guardian badges, correctly layered VFX and readable usernames.
- Profile 540x960 OBS Browser Source and meet 30 FPS on intended Windows host.
- Provide real Chrome/OBS captures before closing issue #5.

## Local commands

    git pull origin main
    npm test
    npm start

Preview at http://127.0.0.1:8788/models and live scene at http://127.0.0.1:8788/obs.

No paid APIs, trial packages or paid rig editor are required by this milestone.
