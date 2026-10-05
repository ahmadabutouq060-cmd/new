/* Definitive hero clipping sweep: widths x heights, measuring
   (a) hero content overflowing the overflow:hidden section, and
   (b) the hero eyebrow ("Jordan Gamified") sitting behind the fixed nav. */
import puppeteer from "puppeteer-core"

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const BASE = "http://localhost:8443/"

const CASES = []
for (const w of [320, 360, 375, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1600]) {
  for (const h of [568, 640, 667, 720, 800, 900, 1000, 1200]) CASES.push([w, h])
}

const probe = () => {
  const sec = document.querySelector("#app section.h-screen")
  const nav = document.querySelector("nav.nav-root")
  if (!sec) return { err: "no hero" }
  const inner = [...sec.children].find((c) => !c.matches("img") && c.classList.contains("h-full"))
  const grid = inner ? inner.firstElementChild : null
  const dbg = { childCount: sec.children.length, classes: [...sec.children].map((c) => c.getAttribute("class")), innerFound: !!inner, innerCls: inner ? inner.getAttribute("class") : null }
  const textCol = grid ? grid.children[0] : null
  const eyebrow = textCol ? textCol.querySelector(".inline-flex") : null
  const cue = [...sec.children].find((c) => (c.getAttribute("style") || "").includes("left: 50%"))
  const r = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height) }
  }
  const sr = sec.getBoundingClientRect()
  const nr = nav ? nav.getBoundingClientRect() : null
  const eb = eyebrow ? eyebrow.getBoundingClientRect() : null
  const gb = grid ? grid.getBoundingClientRect() : null

  return {
    dbg,
    secTop: Math.round(sr.top),
    secBottom: Math.round(sr.bottom),
    secH: Math.round(sr.height),
    scrollH: sec.scrollHeight,
    clientH: sec.clientHeight,
    gridTop: gb ? Math.round(gb.top) : null,
    gridBottom: gb ? Math.round(gb.bottom) : null,
    eyebrow: r(eyebrow),
    eyebrowText: eyebrow ? eyebrow.textContent.trim() : null,
    navBottom: nr ? Math.round(nr.bottom) : null,
    cue: r(cue),
    /* the eyebrow is hidden when its box starts above the nav's bottom edge */
    eyebrowUnderNav: eb && nr ? eb.top < nr.bottom - 1 : null,
    hiddenByOverflowPx: eb && nr ? Math.round(nr.bottom - eb.top) : null,
    overflowTopPx: gb ? Math.round(sr.top - gb.top) : null,
    overflowBottomPx: gb ? Math.round(gb.bottom - sr.bottom) : null,
  }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] })
const page = await browser.newPage()

const rows = []
for (const [w, h] of CASES) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.goto(BASE + "#/", { waitUntil: "domcontentloaded" })
  await new Promise((r) => setTimeout(r, 120))
  const d = await page.evaluate(probe)
  if (d.err) { console.log(w + "x" + h + " " + d.err); continue }
  rows.push({ w, h, ...d })
}

await browser.close()

console.log("w x h     | secH  scrollH | gridTop gridBot | eyebrow   navBot | overTop overBot | eyebrowUnderNav")
for (const r of rows) {
  const bad = r.eyebrowUnderNav || r.overflowTopPx > 1 || r.overflowBottomPx > 1
  if (!bad && r.w !== 1280 && r.h !== 720) continue
  console.log(
    `${String(r.w).padEnd(8)}${String(r.h).padEnd(6)}| ${String(r.secH).padEnd(6)}${String(r.scrollH).padEnd(8)}| ${String(r.gridTop).padEnd(8)}${String(r.gridBottom).padEnd(8)}| ${String(r.eyebrow ? r.eyebrow.top : "-").padEnd(8)}${String(r.navBottom).padEnd(7)}| ${String(r.overflowTopPx).padEnd(7)}${String(r.overflowBottomPx).padEnd(8)}| ${r.eyebrowUnderNav ? "YES hidden " + r.hiddenByOverflowPx + "px" : "no"}`,
  )
}

const navHidden = rows.filter((r) => r.eyebrowUnderNav)
const overflowed = rows.filter((r) => r.overflowTopPx > 1 || r.overflowBottomPx > 1)
console.log(`\ncases: ${rows.length}`)
console.log(`eyebrow behind the fixed nav: ${navHidden.length}`)
console.log(`hero content overflowing the overflow:hidden section: ${overflowed.length}`)
console.log("\nviewports where the eyebrow is behind the nav:")
for (const r of navHidden) console.log(`   ${r.w}x${r.h}  eyebrow top ${r.eyebrow.top} vs nav bottom ${r.navBottom}  (${r.hiddenByOverflowPx}px hidden)`)
