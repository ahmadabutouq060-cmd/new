/* One-shot (and re-runnable) wiring of waypoint.image and library-thread.image
   to assets/places/*.

   Unique, independently hashed photographs are assigned only to the place their
   filename names. Duplicate-byte files are NOT assigned as photographs of
   different places. Every remaining tourism waypoint gets its own SVG
   illustration under assets/places/<folder>/<slug>.svg, marked
   imageStatus: "placeholder" in js/data.js.

   A library thread with image: null is given the image of its own first stop —
   the waypoint named by its `start`, falling back to the thread's first
   waypoint — so a thread cover is a picture of somewhere the route actually
   goes, not a stock view of the governorate. Threads that already carry a
   city photograph keep it. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'js', 'data.js');
const PLACES = path.join(ROOT, 'assets', 'places');

const CANONICAL_GOVERNORATES = [
  'Amman',
  'Zarqa',
  'Irbid',
  'Mafraq',
  'Balqa',
  'Madaba',
  'Jerash',
  'Ajloun',
  'Karak',
  'Tafilah',
  "Ma'an",
  'Aqaba',
];

/* Unique-hash JPGs whose filename is an exact place match. */
const STATIC_EXACT_PHOTO = {
  'Umm Qais (Gadara)': 'assets/places/irbid/umm-qais-gadara.webp',
  'Irbid Archaeological Museum': 'assets/places/irbid/irbid-archaeological-museum.webp',
  'Mar Elias Byzantine Church': 'assets/places/ajloun/mar-elias-byzantine-church.webp',
  "Ajloun Castle (Qal'at ar-Rabad)": 'assets/places/ajloun/ajloun-castle-qalat-ar-rabad.webp',
  "Traditional Oil Press (Mu'sara)": 'assets/places/ajloun/traditional-oil-press-musara.webp',
  "Al-Ayal Women's Cooperative": 'assets/places/ajloun/al-ayal-womens-cooperative.webp',
  "Hadrian's Arch": 'assets/places/jerash/hadrians-arch.webp',
  'Oval Plaza (Forum)': 'assets/places/jerash/oval-plaza-forum.webp',
  'Temple of Artemis': 'assets/places/jerash/temple-of-artemis.webp',
  'Cardo Maximus': 'assets/places/jerash/cardo-maximus.webp',
  'South Theatre': 'assets/places/jerash/south-theatre.webp',
  'Hippodrome': 'assets/places/jerash/hippodrome.webp',
  'Temple of Zeus': 'assets/places/jerash/temple-of-zeus.webp',
  'Church of St. John the Baptist': 'assets/places/jerash/church-of-st-john-the-baptist.webp',
  "Amman Citadel (Jabal al-Qal'a)": 'assets/places/amman/amman-citadel-jabal-al-qala.webp',
  'Temple of Hercules': 'assets/places/amman/temple-of-hercules.webp',
  'Umayyad Palace': 'assets/places/amman/umayyad-palace.webp',
  'Roman Theatre of Philadelphia': 'assets/places/amman/roman-theatre-of-philadelphia.webp',
  'Jordan Museum': 'assets/places/amman/jordan-museum.webp',
  'Al-Balad Old City Market': 'assets/places/amman/al-balad-old-city-market.webp',
  'Hashem Restaurant': 'assets/places/amman/hashem-restaurant.webp',
  'Rainbow Street': 'assets/places/amman/rainbow-street.webp',
  'Dead Sea Shore Float': 'assets/places/dead-sea/dead-sea-shore-float.webp',
  'Salt Crystal Formations': 'assets/places/dead-sea/salt-crystal-formations.webp',
  "St. George's Church — Mosaic Map": 'assets/places/madaba/st-georges-church-mosaic-map.webp',
  'Madaba Archaeological Museum': 'assets/places/madaba/madaba-archaeological-museum.webp',
  'Madaba Arts & Crafts Village': 'assets/places/madaba/madaba-arts-crafts-village.webp',
  'Mosaic Making Workshop': 'assets/places/madaba/mosaic-making-workshop.webp',
  'Memorial Church of Moses': 'assets/places/madaba/memorial-church-of-moses.webp',
  'Serpentine Cross (Brazen Serpent)': 'assets/places/madaba/serpentine-cross-brazen-serpent.webp',
  'The Siq': 'assets/places/maan/the-siq.webp',
  'Ayla — Early Islamic City': 'assets/places/al-aqaba/ayla-early-islamic-city.webp',
};;

function loadExactPhotos() {
  const out = { ...STATIC_EXACT_PHOTO };
  const manifest = path.join(ROOT, "docs", "naseej-place-image-manifest.json");
  if (!fs.existsSync(manifest)) return out;
  try {
    const doc = JSON.parse(fs.readFileSync(manifest, "utf8"));
    for (const item of doc.places || []) {
      if (item.status !== "downloaded" || item.review_required || item.match_level !== "exact_or_strong") continue;
      const rel = typeof item.output === "string" ? item.output.replace(/\\.(?:jpe?g|png)$/i, ".webp") : "";
      const candidates = [
        item.output,
        rel,
        typeof item.output === "string" ? item.output.replace(/\\.webp$/i, ".jpg") : ""
      ].filter(Boolean);
      const existing = candidates.find((candidate) => fs.existsSync(path.join(ROOT, candidate)));
      if (existing) out[item.place] = existing.replace(/\\\\/g, "/");
    }
  } catch (err) {
    console.warn("wire-waypoint-images: could not read photo audit manifest:", err.message);
  }
  return out;
}

const EXACT_PHOTO = loadExactPhotos();

/* Place-specific folders for SVGs. Dead Sea shoreline stays in the existing
   dead-sea/ experience folder (not a 13th governorate). Aqaba uses aqaba/,
   keeping the legacy al-aqaba/ JPGs in place. */
const FOLDER_BY_PLACE = {
  'Dana Biosphere Reserve (North Edge)': 'tafilah',
  'Bethany Beyond the Jordan': 'balqa',
  'John the Baptist Churches': 'balqa',
  'Sunset at Amman Beach': 'balqa',
  'Dead Sea Mud Spa': 'dead-sea',
  'Mineral Water Float': 'dead-sea',
  "Lot's Cave & Sanctuary": 'karak',
  'Deir Ain Abata Monastery': 'karak',
  "Lot's Pillar Viewpoint": 'dead-sea',
  'Wadi Mujib Siq Trail': 'madaba',
  'Dhiban (Dibon) — Moabite Capital': 'madaba',
  "Umm al-Rasas (Kastron Mefa'a)": 'madaba',
  'Little Petra (Siq al-Barid)': 'maan',
};

const FOLDER_BY_CITY = {
  Irbid: 'irbid',
  Ajloun: 'ajloun',
  Jerash: 'jerash',
  Amman: 'amman',
  'Dead Sea': 'dead-sea',
  Madaba: 'madaba',
  Karak: 'karak',
  "Ma'an": 'maan',
  'Al-Aqaba': 'aqaba',
  Aqaba: 'aqaba',
};

function slug(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapName(name, max) {
  const words = String(name).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (next.length > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function placeholderSvg(name, type, seed) {
  const h = crypto.createHash('sha1').update(seed).digest();
  const palettes = [
    { bg: '#F4EFE6', ink: '#12211E', accent: '#013E37', mark: '#D6672B' },
    { bg: '#FDFCFA', ink: '#02302B', accent: '#046852', mark: '#A23B17' },
    { bg: '#E8E0D0', ink: '#12211E', accent: '#013E37', mark: '#8C3211' },
  ];
  const p = palettes[h[0] % palettes.length];
  const cx = 80 + (h[1] % 80);
  const cy = 70 + (h[2] % 50);
  const r = 28 + (h[3] % 22);
  const lines = wrapName(name, 28);
  const titleY = 200;
  let text = '';
  for (let i = 0; i < lines.length; i++) {
    text +=
      '<text x="24" y="' +
      (titleY + i * 22) +
      '" font-family="Tajawal, Segoe UI, sans-serif" font-size="18" font-weight="700" fill="' +
      p.ink +
      '">' +
      escapeXml(lines[i]) +
      '</text>';
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" ' +
    'aria-label="' +
    escapeXml(name) +
    ' — illustration placeholder, not a photograph">\n' +
    '  <rect width="640" height="360" fill="' +
    p.bg +
    '"/>\n' +
    '  <rect x="0" y="0" width="640" height="8" fill="' +
    p.accent +
    '"/>\n' +
    '  <circle cx="' +
    cx +
    '" cy="' +
    cy +
    '" r="' +
    r +
    '" fill="' +
    p.accent +
    '" opacity="0.18"/>\n' +
    '  <circle cx="' +
    (cx + 90) +
    '" cy="' +
    (cy + 20) +
    '" r="' +
    (r * 0.55).toFixed(1) +
    '" fill="' +
    p.mark +
    '" opacity="0.35"/>\n' +
    '  <path d="M40 160 L180 110 L320 155 L460 95 L600 150" fill="none" stroke="' +
    p.accent +
    '" stroke-width="3" opacity="0.35"/>\n' +
    '  <text x="24" y="42" font-family="Tajawal, Segoe UI, sans-serif" font-size="12" font-weight="700" fill="' +
    p.mark +
    '" letter-spacing="1.5">PLACE ILLUSTRATION · NOT A PHOTOGRAPH</text>\n' +
    '  <text x="24" y="168" font-family="Tajawal, Segoe UI, sans-serif" font-size="13" fill="#55635E">' +
    escapeXml(type || 'Waypoint') +
    '</text>\n' +
    '  ' +
    text +
    '\n' +
    '  <text x="24" y="336" font-family="Tajawal, Segoe UI, sans-serif" font-size="11" fill="#4A5C58">NASEEJ placeholder for this exact stop</text>\n' +
    '</svg>\n'
  );
}

function loadWaypoints() {
  const src = fs.readFileSync(DATA, 'utf8');
  const sandbox = { window: { NASEEJ: {} } };
  vm.runInNewContext(src, sandbox, { filename: 'js/data.js' });
  const data = sandbox.window.NASEEJ.data;
  const out = [];
  for (let i = 1; i <= 80; i++) {
    if (!data.hasThread(i)) continue;
    const t = data.getThread(i);
    const wps = t.waypoints || [];
    for (const wp of wps) {
      out.push({ threadId: t.id, thread: t.title, city: t.city, name: wp.name, type: wp.type, id: wp.id });
    }
  }
  /* The library listing, with the image each null cover should take: that of
     the thread's own first stop. */
  const library = (data.libraryThreads || []).map(function (t) {
    const wps = data.hasThread(t.id) ? data.getThread(t.id).waypoints || [] : [];
    const stop = wps.find(function (w) {
      return w.name === t.start;
    }) || wps[0] || null;
    return {
      id: t.id,
      title: t.title,
      city: t.city,
      region: t.region,
      image: t.image || null,
      stop: stop ? stop.name : null,
      stopImage: stop ? stop.image || null : null,
      stopStatus: stop ? stop.imageStatus || null : null,
    };
  });
  return { src, waypoints: out, library: library };
}

function folderFor(wp) {
  return FOLDER_BY_PLACE[wp.name] || FOLDER_BY_CITY[wp.city] || slug(wp.city);
}

function patchData(src, assignments) {
  let next = src;
  /* data.js is CRLF. An inserted fragment has to use its own newline, or a
     re-run leaves a few bare-LF lines in the middle of the file. */
  const eol = src.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  const used = new Set();
  for (const a of assignments) {
    const namePat = a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\?'");
    const re = new RegExp(
      '(\\{\\s*id:\\s*' +
        a.id +
        ',\\s*name:\\s*(["\'])' +
        namePat +
        '\\2[\\s\\S]*?)(\\n\\s*image:\\s*)(null|"[^"]*"|\'[^\']*\')(\\s*,\\s*\\n\\s*imageStatus:\\s*"[^"]*")?',
    );
    if (!re.test(next)) {
      throw new Error('Could not patch waypoint: ' + a.name + ' (thread ' + a.threadId + ' id ' + a.id + ')');
    }
    const status = a.placeholder ? ',' + eol + '          imageStatus: "placeholder"' : '';
    next = next.replace(re, function (_, head, _q, imgKey) {
      used.add(a.name + '#' + a.threadId + '#' + a.id);
      return head + imgKey + JSON.stringify(a.image) + status;
    });
  }
  if (used.size !== assignments.length) {
    throw new Error('Patch count mismatch: ' + used.size + ' vs ' + assignments.length);
  }
  return next;
}

function walkFiles(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

/* Every libraryThreads entry's image fields, rebuilt from data rather than
   patched around whatever a previous run left behind.

   The entry is matched as a whole — its opening brace to the line that closes it
   — because an image field quoted the other way round once made a per-field
   pattern walk past its own entry and rewrite the next thread's cover instead.
   The fields are then replaced from one pattern that accepts either quote style
   and consumes any imageStatus / imageSubject already there, so a re-run
   converges instead of accumulating.

   Everything written is derived from the file that ends up referenced rather than
   from whether this run had to fill a null: a cover under assets/places/ came
   from the thread's first stop and is named by that stop, one outside it is the
   city's photograph and is named by the city, and an SVG is an illustration, so
   it is marked imageStatus: "placeholder" however it got there. */
function patchThreadCovers(src, library) {
  let next = src;
  let patched = 0;
  for (const t of library) {
    const titlePat = t.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\?'");
    const entry = new RegExp('(\\{\\s*id:\\s*' + t.id + ',\\s*title:\\s*(["\'])' + titlePat + '\\2[\\s\\S]*?)(\\n\\s*\\},)');
    const found = next.match(entry);
    if (!found) throw new Error('Could not find library thread ' + t.id + ' (' + t.title + ')');
    if (!/,\s*image:/.test(found[1])) throw new Error('Thread ' + t.id + ' (' + t.title + ') has no image field');

    const image = t.image || t.stopImage;
    if (!image) throw new Error('No image to give thread ' + t.id + ' (' + t.title + ')');
    const illustration = /\.svg$/i.test(image);
    const fromStop = image.indexOf('assets/places/') === 0;
    const fields =
      ', image: ' +
      JSON.stringify(image) +
      (illustration ? ', imageStatus: "placeholder"' : '') +
      ', imageSubject: ' +
      JSON.stringify(fromStop ? t.stop : t.city);

    const block = found[1].replace(
      /,\s*image:\s*(?:null|'[^']*'|"[^"]*")(?:\s*,\s*imageStatus:\s*(?:'[^']*'|"[^"]*"))?(?:\s*,\s*imageSubject:\s*(?:'[^']*'|"[^"]*"))?/,
      fields
    );
    next = next.replace(entry, block + found[3]);
    patched++;
  }
  if (patched !== library.length) throw new Error('patched ' + patched + ' covers of ' + library.length);
  return next;
}

const { src, waypoints, library } = loadWaypoints();
const assignments = [];
const created = [];

for (const wp of waypoints) {
  const photo = EXACT_PHOTO[wp.name];
  if (photo) {
    const abs = path.join(ROOT, photo.replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) throw new Error('Exact photo missing on disk: ' + photo);
    assignments.push({ ...wp, image: photo, placeholder: false });
    continue;
  }
  const folder = folderFor(wp);
  const file = 'assets/places/' + folder + '/' + slug(wp.name) + '.svg';
  const abs = path.join(ROOT, file.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, placeholderSvg(wp.name, wp.type, wp.threadId + ':' + wp.id + ':' + wp.name));
  created.push(file);
  assignments.push({ ...wp, image: file, placeholder: true, destination: folder, file: slug(wp.name) });
}

/* Thread covers: each null one takes the image of its own first stop, so the
   card shows a place the route actually reaches. */
const threadAssignments = library.filter(function (t) {
  return !t.image;
});

fs.writeFileSync(DATA, patchThreadCovers(patchData(src, assignments), library));

const byPath = {};
for (const a of assignments) {
  (byPath[a.image] = byPath[a.image] || []).push(a.name);
}

/* What each cover ended up as, read from the file rather than from whether this
   run had to wire it — a re-run finds every cover already filled, and reporting
   that as "27 city photographs" would be wrong. An SVG illustration is a
   placeholder by definition, which is the same rule data.js states with
   imageStatus; a cover under assets/places/ came from a stop, one outside it is
   the city's photograph. */
const covers = library.map(function (t) {
  const image = t.image || t.stopImage;
  const fromStop = !t.image || t.image.indexOf('assets/places/') === 0;
  return {
    threadId: t.id,
    thread: t.title,
    city: t.city,
    image: image,
    imageStatus: /\.svg$/i.test(image) ? 'placeholder' : 'photo',
    subject: fromStop ? t.stop : t.city,
    source: fromStop ? 'first stop: ' + t.stop : 'city photograph of ' + t.city,
  };
});

const manifest = {
  generated_at: new Date().toISOString(),
  canonical_governorates: CANONICAL_GOVERNORATES,
  note:
    'Dead Sea is a destination experience, not a 13th governorate. Aqaba is the canonical governorate; al-aqaba/ is a legacy asset folder.',
  waypoints: assignments.map(function (a) {
    return {
      threadId: a.threadId,
      thread: a.thread,
      city: a.city,
      place: a.name,
      image: a.image,
      imageStatus: a.placeholder ? 'placeholder' : 'photo',
    };
  }),
  thread_covers: covers,
};

fs.mkdirSync(PLACES, { recursive: true });
fs.writeFileSync(path.join(PLACES, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(
  path.join(PLACES, 'photo-manifest.json'),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      exact_unique_photos: Object.keys(EXACT_PHOTO).length,
      placeholders_created: created.length,
      skipped_duplicate_byte_files: [
        'assets/places/al-aqaba/gulf-of-aqaba-sunset-cruise.webp',
        'assets/places/al-aqaba/south-beach-camping-snorkeling.webp',
        'assets/places/al-aqaba/wadi-rum-desert-departure.webp',
        'assets/places/dead-sea/lots-pillar-viewpoint.webp',
        'assets/places/dead-sea/mineral-water-float.webp',
        'assets/places/dead-sea/wadi-mujib-siq-trail.webp',
        'assets/places/jerash/beit-jerash-heritage-house.webp',
        'assets/places/jerash/birketein-ancient-reservoir.webp',
        'assets/places/jerash/craft-workshops-quarter.webp',
        'assets/places/jerash/old-city-souk.webp',
        'assets/places/maan/little-petra-siq-al-barid.webp',
      ],
      skip_reason:
        'These files share identical bytes with another filename, so they are not unique photographs of distinct places. They are kept on disk and not assigned as the other place.',
      exact_photo: EXACT_PHOTO,
    },
    null,
    2,
  ) + '\n',
);

fs.writeFileSync(
  path.join(PLACES, 'README.md'),
  '# Place images\n\n' +
    'Waypoint photographs and exact-place SVG placeholders live here, grouped by destination folder.\n\n' +
    'Canonical Jordan governorates (12): ' +
    CANONICAL_GOVERNORATES.join(', ') +
    '.\n\n' +
    'Dead Sea is an experience grouping, not a governorate. Do not treat `dead-sea/` as a 13th governorate.\n' +
    'Aqaba is the canonical governorate. `al-aqaba/` is a legacy folder; do not delete it while files are referenced.\n\n' +
    'Photograph files are WebP data named `.webp` — they arrived that way, and Firebase Hosting\n' +
    'serves Content-Type from the extension, so the name has to match the bytes.\n\n' +
    'SVG files are **illustrations**, not photographs. Data marks them with `imageStatus: "placeholder"`\n' +
    'and the media layer captions them as illustrations rather than photographs.\n' +
    'Files that share identical bytes under different names are not assigned as unique place photos.\n\n' +
    'A thread cover comes from that thread\'s first stop, so it is a place the route reaches.\n' +
    '`_incoming/REAL-PHOTOS-TODO.csv` lists the stops still waiting on a real photograph.\n',
);

/* The sourcing checklist, written here so it cannot drift from the placeholders
   that actually exist: one row per illustration, the photograph that will
   replace it, and the SVG it replaces. Paths are relative to the repository
   root, because a machine-specific absolute path is worthless to whoever picks
   the next batch of photos. */
const pending = assignments.filter((a) => a.placeholder);
fs.mkdirSync(path.join(PLACES, '_incoming'), { recursive: true });
fs.writeFileSync(
  path.join(PLACES, '_incoming', 'REAL-PHOTOS-TODO.csv'),
  [
    '"Governorate","FileName","ExpectedImage","ReplacesSVG"',
    ...pending.map(
      (a) =>
        `"${a.destination}",` +
        `"${a.file}",` +
        `"${a.file}.webp",` +
        `"${a.image}"`
    ),
  ].join('\r\n') + '\r\n',
);

console.log('waypoints:', assignments.length);
console.log('photos:', assignments.filter((a) => !a.placeholder).length);
console.log('placeholders:', assignments.filter((a) => a.placeholder).length);
console.log('svgs written:', created.length);
console.log(
  'thread covers:',
  covers.length,
  '(photographs:',
  covers.filter((c) => c.imageStatus === 'photo').length,
  ', illustrations:',
  covers.filter((c) => c.imageStatus === 'placeholder').length,
  ', from a city photograph:',
  covers.filter((c) => c.source.indexOf('city photograph') === 0).length,
  ', from the first stop:',
  covers.filter((c) => c.source.indexOf('first stop') === 0).length,
  ')'
);
const dups = Object.entries(byPath).filter(([, names]) => names.length > 1);
console.log('duplicate waypoint paths:', dups.length ? dups : 'none');
