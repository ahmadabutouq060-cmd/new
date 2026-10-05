/* Responsive / clipping audit in a real browser (Chrome via puppeteer-core).
   Usage: node C:/Users/LENOVO/AppData/Local/Temp/opencode/responsive.cjs [outfile] */
import puppeteer from "puppeteer-core"

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const BASE = "http://localhost:8443/"
const OUT = process.argv[2] || "C:/Users/LENOVO/AppData/Local/Temp/opencode/responsive.json"

const ROUTES = [
  ["home", "#/"],
  ["discover", "#/discover"],
  ["thread", "#/thread/1"],
  ["waypoint", "#/place/1/1"],
  ["rewards", "#/rewards"],
  ["profile", "#/profile"],
]

const WIDTHS = [320, 360, 375, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1600]
const HEIGHTS = { 320: 568, 360: 640, 375: 667, 390: 844, 414: 896, 480: 800, 600: 900, 768: 1024, 834: 1112, 1024: 768, 1280: 800, 1440: 900, 1600: 1000 }

const probe = () => {
  const de = document.documentElement
  const out = {
    scrollW: de.scrollWidth,
    clientW: de.clientWidth,
    bodyScrollW: document.body.scrollWidth,
    overflow: [],
    clipped: [],
    tiny: [],
    hero: null,
  }

  const vw = de.clientWidth

  /* horizontal overflow: elements whose right edge is past the viewport */
  for (const el of document.querySelectorAll("#app *, #app")) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const right = r.right
    if (right > vw + 1) {
      /* skip nodes inside a legitimately scrollable ancestor */
      let p = el.parentElement
      let scrollable = false
      while (p && p !== document.body) {
        const ov = getComputedStyle(p).overflowX
        if (ov === "auto" || ov === "scroll" || ov === "hidden") { scrollable = true; break }
        p = el.parentElement
      }
      if (!scrollable)
        out.overflow.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 70),
          right: Math.round(right),
          over: Math.round(right - vw),
          text: (el.textContent || "").trim().slice(0, 40),
        })
    }
  }

  /* clipped content: scrollHeight > clientHeight with overflow hidden */
  for (const el of document.querySelectorAll("#app *")) {
    const cs = getComputedStyle(el)
    if (cs.overflow !== "hidden" && cs.overflowY !== "hidden") continue
    const dy = el.scrollHeight - el.clientHeight
    const dx = el.scrollWidth - el.clientWidth
    if (dy > 2 || dx > 2)
      out.clipped.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 70),
        dy,
        dx,
        text: (el.textContent || "").trim().slice(0, 40),
      })
  }

  /* tap targets under 24px (WCAG 2.5.8) on interactive elements */
  for (const el of document.querySelectorAll("button, a[href], [role='button'], input, select")) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    if (r.height < 24 || r.width < 24)
      out.tiny.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 50),
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: (el.textContent || "").trim().slice(0, 24),
      })
  }

  /* hero geometry */
  const hero = document.querySelector("#app section.h-screen")
  if (hero) {
    const hr = hero.getBoundingClientRect()
    const eyebrow = document.querySelector("#app section.h-screen .h-6")
    const h1 = document.querySelector("#app section.h-screen h1")
    const inner = hero.querySelector(":scope > .h-full")
    const stats = hero.querySelector("[data-probe='stats'], .hero-stats")
    const cue = hero.querySelector("[data-probe='cue']")
    const m = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }
    }
    out.hero = {
      hero: { top: Math.round(hr.top), h: Math.round(hr.height) },
      heroScrollH: hero.scrollHeight,
      heroClientH: hero.clientHeight,
      innerH: inner ? Math.round(inner.getBoundingClientRect().height) : null,
      eyebrow: m(eyebrow),
      h1: m(h1),
      stats: m(stats),
      cue: m(cue),
      eyebrowText: eyebrow ? eyebrow.textContent.trim() : null,
      eyebrowClipped: eyebrow ? m(eyebrow).top < 0 || m(eyebrow).bottom > Math.round(hr.height) : null,
      cueOverlapsStats: (() => {
        const s = m(stats)
        const c = m(cue)
        if (!s || !c) return null
        return c.top < s.bottom && c.bottom > s.top
      })(),
    }
  }

  return out
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars=false"],
})

const page = await browser.newPage()
const results = []
const consoleErrors = []
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message))
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push("console: " + m.text().slice(0, 200))
})
page.on("requestfailed", (r) => consoleErrors.push("reqfail: " + r.url() + " " + (r.failure() || {}).errorText))

for (const w of WIDTHS) {
  await page.setViewport({ width: w, height: HEIGHTS[w] || 900, deviceScaleFactor: 1 })
  for (const [name, hash] of ROUTES) {
    await page.goto(BASE + hash, { waitUntil: "networkidle2" })
    await new Promise((r) => setTimeout(r, 220))
    const res = await page.evaluate(probe)
    results.push({ width: w, height: HEIGHTS[w] || 900, route: name, ...res })
  }
}

await browser.close()

import fs from "node:fs"
fs.writeFileSync(OUT, JSON.stringify({ consoleErrors, results }, null, 2))

/* summary */
let issues = 0
for (const r of results) {
  const hOver = r.scrollW - r.clientW
  const lines = []
  if (hOver > 0) lines.push(`h-overflow ${hOver}px (scrollW ${r.scrollW} > clientW ${r.clientW})`)
  if (r.overflow.length) lines.push(`${r.overflow.length} overflow el: ` + r.overflow.slice(0, 4).map((o) => `${o.tag}.${o.cls}+${o.over}px`).join(" | "))
  if (r.clipped.length) lines.push(`${r.clipped.length} clipped: ` + r.clipped.slice(0, 4).map((c) => `${c.tag}.${c.cls} dy${c.dy}/dx${c.dx} "${c.text}"`).join(" | "))
  if (r.tiny.length) lines.push(`${r.tiny.length} tiny targets: ` + r.tiny.slice(0, 4).map((t) => `${t.tag}.${t.cls} ${t.w}x${t.h}`).join(" | "))
  if (r.hero && r.hero.eyebrowClipped) lines.push(`HERO eyebrow clipped: eyebrow=${JSON.stringify(r.hero.eyebrow)} hero=${JSON.stringify(r.hero.hero)}`)
  if (r.hero && r.hero.cueOverlapsStats) lines.push(`HERO cue overlaps stats: cue=${JSON.stringify(r.hero.cue)} stats=${JSON.stringify(r.hero.stats)}`)
  if (lines.length) {
    issues++
    console.log(`\n[${r.width}x${r.height}] ${r.route}`)
    for (const l of lines) console.log("   " + l)
  }
}
console.log(`\nroutes checked: ${results.length} | width/route combos with findings: ${issues}`)
console.log(`page errors: ${consoleErrors.length}`)
for (const e of consoleErrors.slice(0, 15)) console.log("   " + e)
console.log(`\nfull report: ${OUT}`)
