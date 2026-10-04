import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DOC = path.join(ROOT, "docs", "naseej-place-image-manifest.json");
const ART = path.join(ROOT, "collected");
const ART_ASSETS = path.join(ART, "assets", "places");
const ART_MANIFESTS = path.join(ART, "manifests");
const ASSET = path.join(ROOT, "assets", "places");
const MANIFEST = path.join(ASSET, "photo-manifest.json");

async function allJson(dir) {
  const out = [];
  try {
    for (const name of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, name.name);
      if (name.isDirectory()) out.push(...await allJson(p));
      else if (name.isFile() && name.name.endsWith(".json")) out.push(p);
    }
  } catch (err) {
    if (err?.code === "ENOENT") return out;
    throw err;
  }
  return out;
}

async function copyTree(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  try {
    for (const e of await fs.readdir(src, { withFileTypes: true })) {
      const s = path.join(src, e.name);
      const d = path.join(dst, e.name);
      if (e.isDirectory()) await copyTree(s, d);
      else if (e.isFile() && e.name !== "photo-manifest.json") await fs.copyFile(s, d);
    }
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
    // A shard can legitimately contain no downloaded images. Its manifest is
    // still useful, so an absent assets tree must not fail the whole merge.
  }
}

const manifests = (await allJson(ART_MANIFESTS)).sort();
if (!manifests.length) {
  throw new Error("No shard manifests were downloaded; refusing to publish an empty merge.");
}

const results = [];
for (const p of manifests) {
  const j = JSON.parse(await fs.readFile(p, "utf8"));
  results.push(...(j.results || []));
}

await copyTree(ART_ASSETS, ASSET);

results.sort((a, b) =>
  a.governorate.localeCompare(b.governorate) || a.place.localeCompare(b.place)
);

await fs.writeFile(
  MANIFEST,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: "Openverse openly licensed image index",
      policy:
        "Images are downloaded only when Openverse reports CC0/Public Domain/CC BY/CC BY-SA. Exact/strong matches are preferred; representative matches are explicitly marked for human review.",
      count: results.length,
      downloaded: results.filter((x) => x.status === "downloaded").length,
      no_image: results.filter((x) => x.status !== "downloaded").length,
      exact_or_strong: results.filter((x) => x.match_level === "exact_or_strong").length,
      representative: results.filter(
        (x) => x.match_level === "representative" || x.match_level === "weak_representative"
      ).length,
      results,
    },
    null,
    2
  )
);

const doc = JSON.parse(await fs.readFile(DOC, "utf8"));
doc.generated_at = new Date().toISOString();
doc.source = "Current NASEEJ js/data.js audit; images from Openverse";
doc.places = doc.places.map((p) => {
  const r = results.find(
    (x) => x.place === p.place && x.governorate === p.governorate
  );
  return r ? { ...p, ...r } : p;
});
await fs.writeFile(DOC, JSON.stringify(doc, null, 2));

console.log(
  "MERGED",
  results.length,
  "downloaded",
  results.filter((x) => x.status === "downloaded").length,
  "no-image",
  results.filter((x) => x.status !== "downloaded").length
);
