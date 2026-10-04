import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MF = path.join(ROOT, "docs", "naseej-place-image-manifest.json");
const OUT = path.join(ROOT, "assets", "places", "photo-manifest.json");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "NASEEJ/1.0 place-photo collector";
const BAD = /(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration)/i;
const RASTER = new Set(["image/jpeg", "image/png", "image/webp"]);

const clean = (v) => String(v ?? "").replace(/<[^>]+>/g, "").trim();
const terms = (s) =>
  s.toLowerCase()
   .replace(/\([^)]*\)/g, "")
   .replace(/[—&]/g, " ")
   .split(/\s+/)
   .filter((x) => x.length > 2);

async function api(params) {
  const q = new URLSearchParams({ ...params, format: "json", origin: "*" });
  const r = await fetch(API + "?" + q.toString(), {
    headers: { "User-Agent": UA }
  });
  if (!r.ok) throw new Error("Commons API HTTP " + r.status);
  return r.json();
}

function score(item, page) {
  const info = page?.imageinfo?.[0];
  const desc = clean(info?.extmetadata?.ImageDescription?.value);
  const all = ((page?.title ?? "") + " " + desc).toLowerCase();
  let s = 0;
  for (const t of terms(item.place)) {
    if (all.includes(t)) s += t.length >= 6 ? 3 : 1;
  }
  if (all.includes(item.governorate.toLowerCase().replace("al-", ""))) s += 1;
  if (BAD.test(page?.title ?? "")) s -= 20;
  return s;
}

function meta(page) {
  const i = page.imageinfo[0];
  const e = i.extmetadata || {};
  const get = (k) => clean(e[k]?.value);
  return {
    commons_title: page.title,
    source_url:
      "https://commons.wikimedia.org/wiki/" +
      encodeURIComponent(page.title.replaceAll(" ", "_")),
    direct_url: i.url,
    mime: i.mime,
    width: i.width,
    height: i.height,
    license: get("LicenseShortName") || get("UsageTerms") || "Unknown",
    artist: get("Artist") || get("Credit") || "Unknown",
    credit: get("Credit") || get("Artist") || ""
  };
}

async function search(query) {
  const j = await api({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: query,
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1800"
  });
  return Object.values(j?.query?.pages ?? {});
}

async function collectOne(item) {
  const out = path.join(ROOT, item.output);
  await fs.mkdir(path.dirname(out), { recursive: true });

  const queries = [
    item.search_query,
    item.place + " Jordan",
    item.place + " " + item.governorate
  ];

  for (const q of queries) {
    const pages = (await search(q))
      .filter((p) => {
        const i = p?.imageinfo?.[0];
        return (
          i &&
          RASTER.has(i.mime) &&
          !BAD.test(p.title ?? "") &&
          (i.width ?? 0) >= 1000 &&
          (i.height ?? 0) >= 600
        );
      })
      .sort((a, b) => score(item, b) - score(item, a));

    if (!pages.length) continue;

    const best = pages[0];
    const sc = score(item, best);
    const mi = meta(best);

    const r = await fetch(mi.direct_url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("image HTTP " + r.status);

    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length < 50000) throw new Error("image payload too small");

    await fs.writeFile(out, bytes);

    return {
      ...item,
      status: "downloaded",
      match_level:
        sc >= 7 ? "exact_or_strong" : sc >= 4 ? "representative" : "weak_representative",
      score: sc,
      review_required: sc < 7,
      ...mi
    };
  }

  return {
    ...item,
    status: "no_image_found",
    match_level: "none",
    review_required: true
  };
}

const source = JSON.parse(await fs.readFile(MF, "utf8"));
const results = [];

for (const item of source.places) {
  try {
    results.push(await collectOne(item));
  } catch (e) {
    results.push({
      ...item,
      status: "error",
      match_level: "none",
      review_required: true,
      error: String(e?.message ?? e)
    });
  }
  await new Promise((r) => setTimeout(r, 300));
  console.log(item.governorate + " / " + item.place);
}

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(
  OUT,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: "Wikimedia Commons",
      policy:
        "Exact/strong preferred; representative images are explicitly marked for human review.",
      count: results.length,
      downloaded: results.filter((x) => x.status === "downloaded").length,
      no_image: results.filter((x) => x.status !== "downloaded").length,
      results
    },
    null,
    2
  )
);

source.places = source.places.map((p) => {
  const r = results.find(
    (x) => x.place === p.place && x.governorate === p.governorate
  );
  return r ? { ...p, ...r } : p;
});
await fs.writeFile(MF, JSON.stringify(source, null, 2));

console.log(
  "DONE",
  "processed=" + results.length,
  "downloaded=" + results.filter((x) => x.status === "downloaded").length,
  "review/no-image=" + results.filter((x) => x.status !== "downloaded").length
);