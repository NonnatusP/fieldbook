# Survey Field Kit

Offline-capable web app for the field. Two tools in one:

- **Two-face checker**: log face-left / face-right readings and check index error, 2C collimation, SD/HD face differences against your EDM spec, correlations, and triangle closure.
- **Traverse computation**: closed loop or closed link. Angular misclosure, bearings, Bowditch adjustment, precision, adjusted coordinates, and a **sketch** (adjusted distances, bearings and angles; unadjusted line overlaid) you can save as PNG or SVG.

It can fill the traverse angles and distances straight from your two-face readings.

Everything runs in the browser. No server, no uploads. Data is stored in the phone's browser storage.

## Host on GitHub Pages

1. Create a new repository on GitHub (for example `survey-field-kit`).
2. Upload all files in this folder to the repository root (keep the `icons` and `examples` folders), or push with git.
3. In the repository go to **Settings > Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose branch `main` and folder `/ (root)`, and save.
4. After a minute the app is at `https://<your-username>.github.io/survey-field-kit/`.

## Use offline on your phone

1. Open the Pages address in Chrome on the phone **while you have signal**.
2. Wait until the header chip says **Works offline**.
3. Chrome menu > **Add to Home screen** (or **Install app**). It now opens like an app and works with no signal.

When you publish a change, edit `VERSION` in `sw.js` (for example `sfk-v6`) so phones pick up the new files. The update arrives the next time the app is opened online, after closing and reopening it once.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | the interface |
| `core.js` | all calculations (no screen code, testable in Node) |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline caching and installability |
| `examples/` | sample two-face CSVs: one clean, one with planted faults |

## Notes and limits

- Angles use `DD.MMSS` (90.0030 = 90°00'30") by default. Switch to decimal degrees in Settings.
- Tolerances in Settings are approximate 2σ figures built from the spec you enter, not a standard. The index limit, 2C limit and traverse angle limit (k·√n) are placeholders. Use your project specification.
- Distances use the optional scale factor in Settings. There is no convergence, geoid or curvature correction.
- Bowditch (compass rule) is used for the position adjustment. It is not a least-squares network adjustment.
- Browser storage can be cleared by the phone. Use **Backup (JSON)** regularly.
