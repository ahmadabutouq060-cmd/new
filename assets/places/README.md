# Place images

Waypoint photographs and exact-place SVG placeholders live here, grouped by destination folder.

Canonical Jordan governorates (12): Amman, Zarqa, Irbid, Mafraq, Balqa, Madaba, Jerash, Ajloun, Karak, Tafilah, Ma'an, Aqaba.

Dead Sea is an experience grouping, not a governorate. Do not treat `dead-sea/` as a 13th governorate.
Ma'an is `maan/` and Aqaba is `aqaba/`. `ma-an/` and `al-aqaba/` were second spellings of those
two governorates that duplicated the canonical folder file for file; both are gone, and every
path entering the wiring is normalized so neither can come back.

Photograph files are WebP data named `.webp` — they arrived that way, and Firebase Hosting
serves Content-Type from the extension, so the name has to match the bytes.

SVG files are **illustrations**, not photographs. Data marks them with `imageStatus: "placeholder"`
and the media layer captions them as illustrations rather than photographs.
A file whose bytes are shared with a differently-named file is not assigned as a photograph of
either name: two names cannot both be right, and nothing says which is. Those places fall back
to an illustration. `photo-manifest.json` lists them under `skipped_duplicate_byte_files`.

A thread cover comes from that thread's first stop, so it is a place the route reaches, unless
the thread already carries a photograph of its city.
`_incoming/REAL-PHOTOS-TODO.csv` lists the stops still waiting on a real photograph.
