/* Hero-only geometry probe. Usage: node .hero-probe.mjs */
import puppeteer from "puppeteer-core"

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const BASE = "http://localhost:8443/"

const WIDTHS = [320, 360, 375, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1600]
const HEIGHTS = { 320: 568, 360: 640, 375: 667, 390: 844, 414: 896, 480: 800, 600: 900, 768: 1024, 834: 1112, 1024: 640, 1280: 720, 1440: 900, 1600: 1000 }

const probe = () => {
  const sec = document.querySelector("#app section.h-screen")
  if (!sec) return { err: "no hero" }
  const kids = [...sec.children].map((c) => ({ tag: c.tagName, cls: c.getAttribute("class") || "" }))
  const inner = [...sec.children].find((c) => c.classList.contains("h-full")) || null
  const grid = inner ? inner.firstElementChild : null
  const textCol = grid ? grid.children[0] : null
  const artCol = grid ? grid.children[1] : null
  const eyebrow = textCol ? textCol.querySelector(".uppercase") : null
  const h1 = textCol ? textCol.querySelector("h1") : null
  const band = textCol ? [...textCol.children].find((c) => (c.getAttribute("style") || "").includes("border-top")) : null
  const note = textCol ? textCol.lastElementChild : null
  const cue = [...sec.children].find((c) => (c.getAttribute("style") || "").includes("left: 50%")) || null

  const r = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }
  }

  const sr = sec.getBoundingClientRect()
  const gridKids = grid ? [...grid.children].map((c) => r(c)) : []

  return {
    sec: r(sec),
    secScrollH: sec.scrollHeight,
    secClientH: sec.clientHeight,
    secKids: kids,
    secOverflowY: getComputedStyle(sec).overflowY,
    secHeight: getComputedStyle(sec).height,
    inner: r(inner),
    innerAlign: inner ? getComputedStyle(inner).alignItems : null,
    innerMinH: inner ? getComputedStyle(inner).minHeight : null,
    grid: r(grid),
    gridKids,
    eyebrow: r(eyebrow),
    eyebrowText: eyebrow ? eyebrow.textContent.trim() : null,
    eyebrowCls: eyebrow ? eyebrow.getAttribute("class") : null,
    h1: r(h1),
    band: r(band),
    bandCls: band ? band.getAttribute("class") : null,
    note: r(note),
    cue: r(cue),
    /* content bottom = lowest of text column, art column, cue top */
    contentBottom: Math.max(
      ...gridKids.map((k) => (k ? k.bottom : -1)),
      cue ? cue.getBoundingClientRect().top : -1,
    ),
  }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] })
const page = await browser.newPage()
await page.goto(BASE + "#/", { waitUntil: "networkidle2" })

console.log("w x h | section(h / scrollH) | eyebrow top | contentBottom | cueTop | verdict")
for (const w of WIDTHS) {
  await page.setViewport({ width: w, height: HEIGHTS[w] || 900, deviceScaleFactor: 1 })
  await page.goto(BASE + "#/", { waitUntil: "networkidle2" })
  await new Promise((r) => setTimeout(r, 180))
  const d = await page.evaluate(probe)
  if (d.err) { console.log(w + " " + d.err); continue }
  const secBottom = d.sec.bottom
  const over = d.contentBottom - secBottom
  const ebOver = d.eyebrow ? d.eyebrow.top - d.sec.top : null
  const cueOverBand = d.cue && d.band ? d.cue.top < d.band.bottom : null
  const verdict = []
  if (over > 0) verdict.push(`CLIPPED BOTTOM by ${Math.round(over)}px`)
  if (ebOver != null && ebOver < 0) verdict.push(`CLIPPED TOP eyebrow by ${Math.round(-ebOver)}px`)
  if (cueOverBand) verdict.push("cue overlaps stat band")
  if (d.gridKids.some((k) => k && k.right > d.sec.right + 1)) verdict.push("grid child past section right")
  console.log(
    `${String(w).padEnd(5)}${String(HEIGHTS[w] || 900).padEnd(6)}| h=${String(d.sec.h).padEnd(6)} scrollH=${String(d.secScrollH).padEnd(6)}| ${String(d.eyebrow ? d.eyebrow.top : "-").padEnd(5)} | ${String(Math.round(d.contentBottom)).padEnd(13)} | ${String(d.cue ? Math.round(d.cue.top) : "-").padEnd(7)} | ${verdict.join("; ") || "ok"}`,
  )
  if (w === 390 || w === 1280) console.log("      band=" + JSON.stringify(d.band) + " cls=" + d.bandCls + "\n      cue=" + JSON.stringify(d.cue) + "\n      secBottom=" + secBottom)
}
await browser.close()
