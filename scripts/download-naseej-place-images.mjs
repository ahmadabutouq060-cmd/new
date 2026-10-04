import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MF = path.join(ROOT, "docs", "naseej-place-image-manifest.json");
const API = "https://api.openverse.org/v1/images/";
const UA = "NASEEJ/3.0 place-photo collector";
const LICENSES = new Set(["cc0","by","by-sa","publicdomain","pdm"]);
const BAD = /(logo|icon|flag|map|locator|diagram|scheme|coat of arms|symbol|illustration|watermark)/i;

const shard = Number(process.env.NASEEJ_SHARD || 0);
const shards = Number(process.env.NASEEJ_SHARDS || 1);
const outRoot = process.env.NASEEJ_OUTPUT_ROOT ? path.join(ROOT, process.env.NASEEJ_OUTPUT_ROOT) : ROOT;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function request(url, attempts = 5) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
      if (res.ok) return res;
      last = new Error("HTTP " + res.status);
      if (![408,429,500,502,503,504].includes(res.status)) throw last;
    } catch (e) {
      last = e;
    }
    await sleep(Math.min(6000, 800 * (i + 1)));
  }
  throw last || new Error("request failed");
}

function clean(s) {
  return String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function words(s) {
  return clean(s).toLowerCase().replace(/\([^)]*\)/g, "").replace(/[—&]/g, " ").split(/\s+/).filter(x => x.length > 2);
}

function score(item, r) {
  const all = [
    clean(r.title),
    clean(r.description),
    clean(r.alt_text),
    (r.tags || []).map(x => typeof x === "string" ? x : x?.name || "").join(" ")
  ].join(" ").toLowerCase();
  let s = 0;
  for (const w of words(item.place)) if (all.includes(w)) s += w.length >= 6 ? 3 : 1;
  if (all.includes(String(item.governorate).toLowerCase().replace("al-", ""))) s += 2;
  if (all.includes("jordan")) s += 1;
  if (BAD.test(all) || r.watermarked === true) s -= 20;
  return s;
}

function queries(item) {
  const p = item.place;
  const g = item.governorate;
  const t = item.thread;
  const stripped = p.replace(/\([^)]*\)/g, "").replace(/\s*[—-]\s*.*$/g, "").replace(/\s*&\s*.*$/g, "").trim();
  return [...new Set([
    p + " " + g + " Jordan",
    stripped + " " + g + " Jordan",
    t + " " + g + " Jordan",
    g + " Jordan " + stripped
  ].filter(x => x.trim().length > 4))];
}

async function search(q) {
  const u = API + "?" + new URLSearchParams({ q, page_size: "30", mature: "false", format: "json", order_by: "relevance" });
  const j = await (await request(u)).json();
  return j?.results ?? [];
}

function licenseOkay(r) {
  return LICENSES.has(String(r.license ?? "").toLowerCase());
}

function candidateUrl(r) {
  return r.thumbnail || r.url || null;
}

async function save(url, out) {
  const res = await request(url);
  const b = Buffer.from(await res.arrayBuffer());
  if (b.length < 8000) throw new Error("image payload too small");
  if (b.length > 4000000) throw new Error("image payload too large");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, b);
  return {
    mime: (res.headers.get("content-type") || "image/jpeg").split(";")[0],
    bytes: b.length
  };
}

async function collectOne(item) {
  const output = path.join(outRoot, item.output);
  const candidates = [];

  for (const q of queries(item)) {
    let results = [];
    try { results = await search(q); } catch {}
    for (const r of results) {
      if (!licenseOkay(r)) continue;
      if ((r.width ?? 0) < 400 || (r.height ?? 0) < 250) continue;
      const u = candidateUrl(r);
      if (!u) continue;
      if (BAD.test((r.title || "") + " " + (r.description || ""))) continue;
      candidates.push({ ...r, _score: score(item, r) });
    }
    if (candidates.some(x => x._score >= 7)) break;
    await sleep(150);
  }

  candidates.sort((a,b) => b._score - a._score);

  for (const r of candidates.slice(0, 15)) {
    try {
      const saved = await save(candidateUrl(r), output);
      const sc = r._score;
      return {
        ...item,
        status: "downloaded",
        match_level: sc >= 7 ? "exact_or_strong" : sc >= 4 ? "representative" : "weak_representative",
        review_required: sc < 7,
        match_score: sc,
        title: r.title || "",
        license: r.license === "publicdomain" ? "Public Domain" : r.license === "pdm" ? "Public Domain Mark" : r.license === "cc0" ? "CC0" : r.license === "by-sa" ? "CC BY-SA" : "CC BY",
        license_url: r.license_url || "",
        license_code: r.license || "",
        license_version: r.license_version || "",
        creator: r.creator || "Unknown",
        source: r.source || r.provider || "Openverse",
        provider: r.provider || "",
        source_url: r.foreign_landing_url || r.source_url || "",
        direct_url: r.url || "",
        thumbnail_url: r.thumbnail || "",
        openverse_url: "https://openverse.org/image/" + r.id,
        mime: saved.mime,
        width: r.width || null,
        height: r.height || null,
        bytes: saved.bytes
      };
    } catch {}
  }

  return { ...item, status: "no_safe_image_found", match_level: "none", review_required: true };
}

const source = JSON.parse(await fs.readFile(MF, "utf8"));
const selected = source.places.filter((_, i) => i % shards === shard);
const results = [];

for (const item of selected) {
  const r = await collectOne(item).catch(e => ({ ...item, status: "error", match_level: "none", review_required: true, error: String(e?.message || e) }));
  results.push(r);
  console.log("[shard " + shard + "/" + shards + "] " + item.governorate + " / " + item.place + " -> " + r.status + " / " + (r.match_level || ""));
  await sleep(250);
}

const manifestDir = path.join(outRoot, "manifests");
await fs.mkdir(manifestDir, { recursive: true });
await fs.writeFile(
  path.join(manifestDir, "shard-" + shard + ".json"),
  JSON.stringify({
    generated_at: new Date().toISOString(),
    shard,
    shards,
    count: results.length,
    downloaded: results.filter(x => x.status === "downloaded").length,
    no_image: results.filter(x => x.status !== "downloaded").length,
    results
  }, null, 2)
);
console.log("SHARD_DONE " + shard + " processed " + results.length + " downloaded " + results.filter(x => x.status === "downloaded").length);
