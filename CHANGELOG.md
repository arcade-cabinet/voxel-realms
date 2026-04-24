# Changelog

## Unreleased

- Added biome discovery milestones and resource pickup event state.
- Added pickup pulses, resource effects, biome silhouettes, survey HUD feedback, and shared cartridge landing identity.

## [0.4.0](https://github.com/arcade-cabinet/voxel-realms/compare/v0.3.0...v0.4.0) (2026-04-24)


### Features

* **hud:** plain-language route guidance detail (P2.8) ([#48](https://github.com/arcade-cabinet/voxel-realms/issues/48)) ([37aa769](https://github.com/arcade-cabinet/voxel-realms/commit/37aa7699570e617c72a79e3b53abc8521dd4bf1b))

## [0.3.0](https://github.com/arcade-cabinet/voxel-realms/compare/v0.2.1...v0.3.0) (2026-04-24)


### Features

* **a11y:** aria-live HUD announcements, noscript banner, safe-area padding (P5.6) ([#41](https://github.com/arcade-cabinet/voxel-realms/issues/41)) ([53f91a2](https://github.com/arcade-cabinet/voxel-realms/commit/53f91a2bfc401f1f3bec27a594ebff433373ab39))
* **android:** lock MainActivity to portrait (P5.2) ([#42](https://github.com/arcade-cabinet/voxel-realms/issues/42)) ([fb78658](https://github.com/arcade-cabinet/voxel-realms/commit/fb78658dd7fe2eb5d6fcbaf2f944970a3f879a86))
* archetype budget tests + opt-in error telemetry (P4.6 + P9.1, clean) ([#35](https://github.com/arcade-cabinet/voxel-realms/issues/35)) ([3174a6b](https://github.com/arcade-cabinet/voxel-realms/commit/3174a6b60f099e8da7bcfc2a0981da2444933abe))
* **audio:** procedural SFX layer (P6.1) ([#26](https://github.com/arcade-cabinet/voxel-realms/issues/26)) ([8f6f5ca](https://github.com/arcade-cabinet/voxel-realms/commit/8f6f5cada20420be961731acfdd3112aa864b88c))
* **ci:** weekly playtest feedback digest workflow (P9.4) ([#43](https://github.com/arcade-cabinet/voxel-realms/issues/43)) ([c17e513](https://github.com/arcade-cabinet/voxel-realms/commit/c17e513148ce39d4368c16152b370a39ddb6656c))
* **game:** expedition score + same-seed retry (P3.1 + P3.2) ([#22](https://github.com/arcade-cabinet/voxel-realms/issues/22)) ([b80c8bd](https://github.com/arcade-cabinet/voxel-realms/commit/b80c8bd43d7e06701bc9615785976cecdc1c21a6))
* **game:** extraction beat + next-realm splash (P2.6 + P2.7) ([#30](https://github.com/arcade-cabinet/voxel-realms/issues/30)) ([f7a9f53](https://github.com/arcade-cabinet/voxel-realms/commit/f7a9f53020c0e4c50bc1aa906ca4dbf41ed5f41f))
* **game:** first-run coach with 3 LORE-anchored steps (P2.3) ([#18](https://github.com/arcade-cabinet/voxel-realms/issues/18)) ([df5a50f](https://github.com/arcade-cabinet/voxel-realms/commit/df5a50fda88f89f59d279e03a589c0f1c6f64753))
* **game:** player journey clarity pass (pillar 2 slice) ([#16](https://github.com/arcade-cabinet/voxel-realms/issues/16)) ([344c568](https://github.com/arcade-cabinet/voxel-realms/commit/344c56883f4a0c670055e45765d875e4909b3f32))
* **haptics:** native + web-fallback haptic cues (P6.3) ([#27](https://github.com/arcade-cabinet/voxel-realms/issues/27)) ([c383b1f](https://github.com/arcade-cabinet/voxel-realms/commit/c383b1f2d6af15e9f3b5ae99d0cc531613db1804))
* in-app feedback link + GitHub issue templates (P9.3) ([#32](https://github.com/arcade-cabinet/voxel-realms/issues/32)) ([1e16066](https://github.com/arcade-cabinet/voxel-realms/commit/1e16066fd9a803ea5ed8dc986a8af381a3b7f8dd))
* **mobile:** pause overlay with hardware-back + keyboard (P5.5, clean) ([#34](https://github.com/arcade-cabinet/voxel-realms/issues/34)) ([e1f9120](https://github.com/arcade-cabinet/voxel-realms/commit/e1f9120bdc1858c57fb7ca8b9f02b851d43c6034))
* **platform:** auto-pause when the game goes to background (P5.3) ([#45](https://github.com/arcade-cabinet/voxel-realms/issues/45)) ([769851a](https://github.com/arcade-cabinet/voxel-realms/commit/769851a8c9ea9742ee8069f287bb5dae60f1baa2))
* **player:** coyote time + jump buffer (P3.7) and tracker update ([#23](https://github.com/arcade-cabinet/voxel-realms/issues/23)) ([5fe0f34](https://github.com/arcade-cabinet/voxel-realms/commit/5fe0f34049db7d1a593ac3e43eecc05e9d13de06))
* **realms:** distinct archetype verbs in HUD + next-realm splash (P3.3) ([#36](https://github.com/arcade-cabinet/voxel-realms/issues/36)) ([028fecd](https://github.com/arcade-cabinet/voxel-realms/commit/028fecd10e8f7cf00c86ac9712761cb9f6a003c4))
* **realms:** hazard vocabulary layer (P3.4) ([#38](https://github.com/arcade-cabinet/voxel-realms/issues/38)) ([01c2b14](https://github.com/arcade-cabinet/voxel-realms/commit/01c2b14df89d7994182502ebd18f639d1710530d))
* **realms:** scan-dwell pulse feedback on focused signal rings (P3.5) ([#39](https://github.com/arcade-cabinet/voxel-realms/issues/39)) ([da26771](https://github.com/arcade-cabinet/voxel-realms/commit/da267711ad12c75e833beb569ccd7d9e612f2d6e))
* **settings:** landing settings screen with persisted toggles (P5.4) ([#24](https://github.com/arcade-cabinet/voxel-realms/issues/24)) ([d123fcd](https://github.com/arcade-cabinet/voxel-realms/commit/d123fcd5f7a47613a49af811e8d5437127a37f9b))
* **splash:** instant boot splash with brand mark + pulse (P6.4) ([#40](https://github.com/arcade-cabinet/voxel-realms/issues/40)) ([3429573](https://github.com/arcade-cabinet/voxel-realms/commit/342957392f07ca0a525b922c26b8a3d837490d3b))


### Documentation

* **ops:** iOS signing + distribution runbook (P8.2) ([#44](https://github.com/arcade-cabinet/voxel-realms/issues/44)) ([17e23f6](https://github.com/arcade-cabinet/voxel-realms/commit/17e23f625e40b3a2c0337ebc32dfaf39aa9698f4))
* **ops:** privacy, support, feedback, and tracker reset (P8.6 + P9.3) ([#31](https://github.com/arcade-cabinet/voxel-realms/issues/31)) ([323a89f](https://github.com/arcade-cabinet/voxel-realms/commit/323a89f9041b285ce2225dffc5eef711a7aa5111))
* **qa:** physical-device QA rubric (P7.2) ([#33](https://github.com/arcade-cabinet/voxel-realms/issues/33)) ([0fef1a7](https://github.com/arcade-cabinet/voxel-realms/commit/0fef1a7159f11f589afa4aeacaa2336c0afd654a))

## [0.2.1](https://github.com/arcade-cabinet/voxel-realms/compare/v0.2.0...v0.2.1) (2026-04-23)


### Bug Fixes

* set pages asset base path ([839a6d1](https://github.com/arcade-cabinet/voxel-realms/commit/839a6d12a9aec66b483a09d913335445fdf0bd70))

## [0.2.0](https://github.com/arcade-cabinet/voxel-realms/compare/v0.1.0...v0.2.0) (2026-04-23)


### Features

* build mobile realm climber foundation ([ab9d294](https://github.com/arcade-cabinet/voxel-realms/commit/ab9d29479378618106041fc35982d464132a1ab9))


### Bug Fixes

* make pages deploy rerunnable ([6bed46a](https://github.com/arcade-cabinet/voxel-realms/commit/6bed46adf17256c5a5f017125bb466f15f283b69))


### Documentation

* align game pillars and remaining work ([e4a9f22](https://github.com/arcade-cabinet/voxel-realms/commit/e4a9f22469c88779755b43e7df5b03455cf4a0c9))
