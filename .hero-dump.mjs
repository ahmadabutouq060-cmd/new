import puppeteer from "puppeteer-core"
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: "new", args: ["--no-sandbox"] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
await page.goto("http://localhost:8443/#/", { waitUntil: "networkidle2" })
await new Promise((r) => setTimeout(r, 200))
const html = await page.evaluate(() => {
  const nav = document.querySelector(".nav-root") || document.querySelector("nav")
  const nb = nav ? nav.getBoundingClientRect() : null
  const navInfo = nav ? { tag: nav.tagName, cls: nav.className, rect: [Math.round(nb.top), Math.round(nb.bottom), Math.round(nb.height)], pos: getComputedStyle(nav).position, bg: getComputedStyle(nav).backgroundColor } : null
  const sec = document.querySelector("#app section.h-screen")
  if (!sec) return "NO HERO"
  const walk = (el, depth) => {
    if (depth > 4) return ""
    const b = el.getBoundingClientRect()
    let s = "  ".repeat(depth) + el.tagName.toLowerCase() + ' class="' + el.getAttribute("class") + '"' + ' style="' + (el.getAttribute("style") || "").slice(0, 60) + '"' + ` [${Math.round(b.top)}..${Math.round(b.bottom)} h${Math.round(b.height)}]\n`
    for (const c of el.children) s += walk(c, depth + 1)
    return s
  }
  return "NAV " + JSON.stringify(navInfo) + "\n" + walk(sec, 0)
})
console.log(html)
await browser.close()
