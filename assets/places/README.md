# Place images

Waypoint photographs and exact-place SVG placeholders live here, grouped by destination folder.

Canonical Jordan governorates (12): Amman, Zarqa, Irbid, Mafraq, Balqa, Madaba, Jerash, Ajloun, Karak, Tafilah, Ma'an, Aqaba.

Dead Sea is an experience grouping, not a governorate. Do not treat `dead-sea/` as a 13th governorate.
Aqaba is the canonical governorate. `al-aqaba/` is a legacy folder; do not delete it while files are referenced.

Photograph files are WebP data named `.webp` — they arrived that way, and Firebase Hosting
serves Content-Type from the extension, so the name has to match the bytes.

SVG files are **illustrations**, not photographs. Data marks them with `imageStatus: "placeholder"`
and the media layer captions them as illustrations rather than photographs.
Files that share identical bytes under different names are not assigned as unique place photos.

A thread cover comes from that thread's first stop, so it is a place the route reaches.
`_incoming/REAL-PHOTOS-TODO.csv` lists the stops still waiting on a real photograph.
