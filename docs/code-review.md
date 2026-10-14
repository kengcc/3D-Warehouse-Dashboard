# Engineering review — 14 October 2026

Scope: correctness, rendering performance, resource ownership, unused code, and verification. No new application features or data-file changes were introduced.

## Findings and fixes

| Priority | Category | Finding | Fix |
| --- | --- | --- | --- |
| P1 | Rendering | Repeated shelving, cartons, dock parts, vehicle bodies, wheels, and markings created 1,307 mesh nodes across the campus. The initial view required 454 reported draw calls. | Replaced per-part meshes with static instanced batches, per-instance colours and picking IDs, shared geometry/materials, and a shared dock-label atlas. Matrices upload only when geometry visibility changes. Instance bounds are recomputed after filtering. |
| P1 | Rendering | The continuous render loop redrew static geometry and a 2048-pixel shadow map while idle. | Render on demand. Controls invalidate on interaction; camera flights request their own frames. Cache the shadow map and refresh it when geometry or camera/light position changes. |
| P2 | React performance | Whole-store subscriptions recreated scene props, selection callbacks, layout wrappers, and KPI DOM on every two-second telemetry update. | Use shallow, selective store subscriptions; memoize derived geometry, filtered layouts, and callbacks. Unfiltered telemetry updates do not wake the renderer. Cache date formatters. |
| P2 | GPU resources | Every part allocated geometry/materials, and selection created another per-part outline mesh and shader material. | Own and dispose a small shared resource set at canvas level. Use at most two instanced line batches for selected outlines. Browser tests exercise repeated selection and verify resource counts stay bounded. |
| P2 | Simulation correctness | Idle or maintenance trucks could become scheduled/loading; a maintenance forklift repeatedly changed to inspection despite no release from maintenance. | Preserve idle truck states and maintenance states. Add regression tests across multiple ticks. |
| P2 | State consistency | Clearing a vehicle hidden by a telemetry-driven filter depended on a mounted scene component effect, leaving the store temporarily inconsistent. | Clear invalid selection atomically in the same store update as the new telemetry. The scene no longer performs this business decision. |
| P2 | Object details | Non-null entity lookups could throw with stale registry entries. A completed shipment referenced by an active-assignment field could be displayed as current. | Return no details for missing entities; current shipment lists exclude completed records. Gracefully skip missing-truck movement rows. |
| P2 | Camera behaviour | StrictMode could start a pointless flight and disable controls for an unchanged initial focus. Delta accumulation is unsafe once rendering sleeps, because the first post-idle delta may be large. | Skip unchanged focus. Use a monotonic flight start time, invalidate during motion, and reuse the camera offset vector. Verify movement after idle, interrupted site switches, reduced motion, resizing, and actual wheel/pan limits. |
| P2 | Data-driven labels | An instanced dock atlas could show the wrong number if dock records were reordered. | Supply atlas indices from each dock's number, independently of array order; verify reversed records in a browser. |
| P3 | Startup performance | The production build emitted one approximately 1.16 MB JavaScript bundle and a large-chunk warning. | Split React, Three.js core, renderer, and addons into independently cacheable chunks. The largest final chunk is approximately 376 kB; the build no longer reports that warning. Total library payload remains substantial for a WebGL application. |
| P3 | Browser/UI | The browser requested a missing favicon, producing a 404. The inspector covered the camera-help strip. | Add a local favicon using the existing brand motif; hide the help strip while the inspector is open. Browser checks assert no console or shader errors. |
| P3 | Unused code | The old `objects.tsx` and `Selectable.tsx` render paths, unused box-opacity parameter, `.dock-number` style, unused colour token, and an ineffective ESLint suppression remained. | Remove superseded/dead code and enable TypeScript `noUnusedLocals` and `noUnusedParameters`. |

## Measurements

Environment: installed Chrome in headless mode, native ANGLE/Metal on an Apple M3 Max, 1440 × 1000 viewport, first warehouse view. Samples use 180 animation frames with the first ten discarded. Continuous rendering is explicitly enabled only for the benchmark, so demand-mode idle behaviour cannot inflate the FPS result.

| Metric | Before | After |
| --- | ---: | ---: |
| Continuous-render FPS | 58.96 | Approximately 60.00 |
| 95th-percentile frame interval | 16.7 ms | 16.8 ms |
| Reported draw calls in initial view | 454 | 13 |
| GPU geometries in initial view | 454 | 7 |
| GPU textures in initial view | 7 | 2 |
| Campus mesh nodes | 1,307 | 25 |

The selected-site high-DPI benchmark (device pixel ratio 2, renderer capped at 1.5) also measured approximately 60.00 FPS, a 16.7 ms 95th-percentile interval, and 15 draw calls. A production-build smoke test measured approximately 60 FPS during an actual camera flight and verified that telemetry ticks produce no idle draw calls.

The initial-view figures count only resources uploaded for that view; visiting the other warehouses can upload their label/grid geometry. Repeated selection, filtering and navigation remain within the browser regression resource budget. FPS depends on GPU, browser, display refresh rate, viewport and other system load; these measurements establish the target on the tested machine, not on every device.

## Verification results

- `npm run typecheck`: passed, including unused-declaration checks and browser-test types.
- `npm test`: 14 tests passed.
- `WARETRACK_BROWSER_CHANNEL=chrome npm run test:browser`: 5 tests passed.
- `npm run build`: passed; largest JavaScript chunk approximately 376 kB, no large-chunk warning.
- Production preview: rendering, shader compilation, object inspection, idle draw suppression, animated navigation and filters passed.
- `git diff --check`: passed.
- `src/data/`: checksums unchanged.

Browser regressions cover all selectable entity categories, live panel timestamps, resource cleanup, idle rendering, camera flights, filter combinations, reordered dock labels, wheel/pan boundaries, mobile resizing, reduced motion, and high-DPI selected-site rendering. The frame-timing tests attach JSON results and enforce draw/resource budgets rather than a hardware-dependent FPS assertion.

## Existing limits retained

The on-time card remains an explicitly labelled warehouse-completion proxy because the data model has no actual delivered-at timestamps. Telemetry is simulated and changes operational phases, not shipment assignments or physical positions. These are existing prototype limits, not problems that can be corrected without expanding the requested scope.
