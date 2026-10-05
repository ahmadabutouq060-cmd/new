import puppeteer from "puppeteer-core"
const b = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: "new", args: ["--no-sandbox"] })
const p = await b.newPage()
await p.setViewport({ width: 1280, height: 720 })
await p.goto("http://localhost:8443/#/", { waitUntil: "networkidle2" })
await new Promise((r) => setTimeout(r, 300))
console.log(JSON.stringify(await p.evaluate(() => {
  const sec = document.querySelector("#app section.h-screen")
  const kids = [...sec.children]
  const inner = kids.find((c) => c.classList.contains("h-full"))
  const grid = inner ? inner.firstElementChild : null
  return {
    kidCount: kids.length,
    kidClasses: kids.map((c) => c.getAttribute("class")),
    innerFound: !!inner,
    gridFound: !!grid,
    gridCls: grid ? grid.getAttribute("class") : null,
    innerKids: inner ? [...inner.children].map((c) => c.getAttribute("class")) : null,
  }
}), null, 2))
await b.close()
