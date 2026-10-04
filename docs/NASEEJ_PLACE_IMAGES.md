# NASEEJ Place Images

This folder contains the current Place/Waypoint source list and a downloader for Wikimedia Commons images.

Run:

`node scripts/download-place-images.mjs`

The script creates:

- `assets/places/<governorate>/<place>.jpg`
- `assets/places/photo-manifest.json`

**Do not automatically trust a downloaded image.** Review the actual photo and the Commons license/attribution before assigning it to an exact waypoint. Some current NASEEJ items are experience-style stops (for example a family meal, workshop, market, or lodge) and may require original/local photography.

Current source list: 112 places from `js/data.js`.
