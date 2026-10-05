/* Naseej — navigation, app state and shared shell.
   Vanilla port of App.tsx (useState + navigate) and components/Nav.tsx.

   Responsibilities: global state, hash routing, the nav bar and other chrome
   shared by every page, the mount/paint cycle and the two delegated listeners.
   Page-specific behaviour lives in pages.js (NASEEJ.pages / NASEEJ.actions);
   content lives in data.js (NASEEJ.data / NASEEJ.session). */

;(function (NASEEJ) {
  "use strict"

  /* ── App state (was useState in App.tsx) ─────────────────────────────────────
     page: 'home' | 'discover' | 'thread' | 'place' | 'profile'             */

  /* Per-page local state (was useState inside each page component).
     Dropped when a page unmounts, kept when only its params change.
     Always read through NASEEJ.ui: mount() replaces the object wholesale.   */

  /* Anything a page or the markup can drive: navigation or an action. */

  /* ── Markup helpers ─────────────────────────────────────────────────────── */

  /* The apostrophe is escaped because values are interpolated into
       single-quoted attribute values in several renderers, and a lone
       "it's" would close the attribute. `&` goes first or the entities
       below would be re-escaped. The &#39; form is used rather than &apos;
       because &apos; is not defined in HTML4 and some parsers render it
       literally. */

  /* Attribute bundle used to drive navigation from markup (was onClick). */

  /* Small eyebrow label: hairline + uppercase caption (used across pages). */

  /* ── Routing (state <-> location.hash so Back / refresh work) ─────────────── */

  /* React: setCurrentPage() with an identical value bails out of the
         re-render, so each page's useState survives. Keep NASEEJ.ui, just
         scroll and repaint. */ // hashchange -> route() -> mount()

  /* Which page is currently mounted. React re-renders one page component when
     only its props change, so thread -> thread and place -> place keep their
     local state; leaving the page unmounts it and clears that state.          */

  /* A route is the whole truth about which thread/waypoint is being shown:
     whatever the hash does not mention is cleared, never inherited from the
     previous route. Otherwise `#/thread` after a mystery thread would silently
     reopen that thread, and `#/place/3/2` -> `#/place/4` would show waypoint 2
     of thread 4.
     An id that is not a number, or names no thread, is reported and then
     treated as absent — data.getThread() still applies the documented fallback
     to the default thread. */ // first visit -> home

  /* `#/thread` with no id used to fall through to the default thread (id 7).
       That is the same defect as the nav item: a route that promises a thread
       collection opened one arbitrary story, and a bookmark or a shared bare
       link did the same. It now resolves to the library, which is what the
       segment means without an id. An explicit `#/thread/7` is unaffected. */

  /* ── Nav (components/Nav.tsx) ──────────────────────────────────────────────
     The Sign In control is drawn by js/auth.js (NASEEJ.authControl) so the
     signed-in state can swap it for the account chip without this file knowing
     anything about Firebase. The nav-* classes are layout hooks for the
     responsive layer in css/styles.css, which owns lockup size and link
     type so each breakpoint can scale them independently. */

  /* "Threads" points at the library, not a single thread. It used to link
         to `thread`, which the router resolves to the default thread (id 7), so
         a visitor who chose Threads from the nav was dropped into one arbitrary
         story with no way back to the list. The label promises a collection, so
         the destination has to be a collection — the Discover renderer, whose
         heading is already "Discover Threads".

         There is therefore no separate "Discover" entry: two nav items pointing
         at one page is a duplicate, and after this change they would have been
         the same link twice over. The library is reachable under one name. */

  /* "Community" promised a social layer this product does not have: no
         feed, no other weavers, nothing to read. The route is the profile, so
         the label is the profile — a journey's own record of what it has
         completed, and the honest name for it. */

  /* ── Mount / repaint ──────────────────────────────────────────────────────── */

  /* innerHTML destroys the focused node, so React's reconciliation behaviour
     (focus survives a re-render) is restored by re-focusing the equivalent
     control after the swap. Identity = id, else data-* attrs + position. */

  /* The library keeps a live <input>, so it patches itself instead of
       re-rendering the whole page (would drop focus while typing). */

  /* `fresh` gates only the page-local state reset. App.tsx's navigate() called
       window.scrollTo(0, 0) unconditionally, so scrolling stays unconditional. */

  /* `mount` stays private: it is the reset half of the cycle and callers only
     ever need `paint` to re-render in place (e.g. after auth state loads). */

  /* ── Events (was JSX onClick / onChange) ────────────────────────────────────
     One delegated listener per event type for the whole app: markup carries
     data-nav / data-act / data-v instead of inline handlers. */

  /* Page behaviour is owned by pages.js; an unknown action is a no-op. */

  /* ── Keyboard ───────────────────────────────────────────────────────────────
     The story-path map draws its waypoints as SVG <g> elements. A <g> is not a
     button: it takes focus with tabindex but fires no click on Enter or Space,
     so a keyboard visitor could tab to a node and do nothing with it. This is
     the second listener, not a growth of the first, and it only covers what
     the click path cannot reach.

     The handler is invoked directly rather than by synthesising a click: the
     actions are already plain functions, and a dispatched MouseEvent would
     carry coordinates and a target that do not correspond to anything real. */

  /* A real <button>/<a> already handles these keys natively. Dispatching again
       would double-fire — a nav would navigate twice, a reward would be
       claimed twice. Only non-native elements need this. */

  NASEEJ.state = { page: "home", threadId: null, waypointId: null }

  NASEEJ.ui = {}

  const APP_ID = "app"

  const PAGES = ["home", "discover", "thread", "place", "profile"]

  const INTERACTIVE = "[data-nav],[data-act]"

  function escapeHtml(value) {
    return String(value)

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;")

      .replace(/'/g, "&#39;")
  }

  NASEEJ.escapeHtml = escapeHtml

  function navAttrs(page, threadId, waypointId) {
    return (
      'data-nav="' +
      page +
      '"' +
      (threadId != null ? ' data-thread="' + threadId + '"' : "") +
      (waypointId != null ? ' data-wp="' + waypointId + '"' : "")
    )
  }

  NASEEJ.navAttrs = navAttrs

  NASEEJ.eyebrow = function (opts) {
    const rule =
      '<div class="' +
      opts.width +
      ' h-px" style="background-color:' +
      opts.color +
      '"></div>'

    return (
      '<div class="inline-flex items-center gap-2 ' +
      (opts.margin || "mb-3") +
      '" style="color:' +
      opts.color +
      '">' +
      rule +
      '<span class="text-xs font-body font-medium tracking-widest uppercase">' +
      opts.text +
      "</span>" +
      (opts.trailingRule ? rule : "") +
      "</div>"
    )
  }

  function hashFor(page, threadId, waypointId) {
    let h = "#/" + page

    if ((page === "thread" || page === "place") && threadId != null) {
      h += "/" + threadId

      if (page === "place" && waypointId != null) h += "/" + waypointId
    }

    return h
  }

  function navigate(page, threadId, waypointId) {
    if (threadId !== undefined) NASEEJ.state.threadId = threadId

    if (waypointId !== undefined) NASEEJ.state.waypointId = waypointId

    NASEEJ.state.page = page

    const h = hashFor(page, NASEEJ.state.threadId, NASEEJ.state.waypointId)

    if (location.hash === h) {
      window.scrollTo(0, 0)

      NASEEJ.paint()
    } else location.hash = h
  }

  NASEEJ.navigate = navigate

  let mountedPage = null

  function readId(part, label) {
    if (part == null || part === "") return null

    const n = +part

    if (isNaN(n)) {
      console.warn(
        'Naseej: "' + part + '" is not a valid ' + label + " id — ignoring it.",
      )

      return null
    }

    return n
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/")

    if (PAGES.indexOf(parts[0]) < 0) parts.splice(0, parts.length, "home")

    if (parts[0] === "thread" && (parts[1] == null || parts[1] === "")) {
      parts.splice(0, parts.length, "discover")
    }

    const samePage = mountedPage === parts[0]

    let threadId = readId(parts[1], "thread")

    if (threadId != null && NASEEJ.data && !NASEEJ.data.hasThread(threadId)) {
      console.warn(
        "Naseej: thread " +
          threadId +
          " does not exist — falling back to the default thread.",
      )

      threadId = null
    }

    const waypointId = readId(parts[2], "waypoint")

    NASEEJ.state.page = parts[0]

    NASEEJ.state.threadId = threadId

    NASEEJ.state.waypointId = waypointId

    mountedPage = parts[0]

    mount(!samePage)
  }

  NASEEJ.route = route

  window.addEventListener("hashchange", route)

  NASEEJ.navBar = function () {
    const items = [
      ["Home", "home"],

      ["Threads", "discover"],

      ["My Journey", "profile"],
    ]

    const assets = NASEEJ.data.assets

    return (
      '<nav class="nav-root fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-3"' +
      ' style="background-color:rgba(249,247,243,0.95);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid #E8E0D0">' +
      "<button " +
      navAttrs("home") +
      ' class="nav-logo flex items-center group">' +
      '<img class="nav-logo-mark" src="' +
      assets.logoIcon +
      '" alt="Naseej emblem" width="39" height="34">' +
      '<img class="nav-logo-word" src="' +
      assets.logoText +
      '" alt="Naseej" width="74" height="34"></button>' +
      '<div class="nav-links flex items-center gap-8">' +
      items
        .map(function (item) {
          return (
            "<button " +
            navAttrs(item[1]) +
            ' class="text-sm font-medium transition-colors"' +
            ' style="color:' +
            (NASEEJ.state.page === item[1] ? "#8C3211" : "#12211E") +
            '">' +
            item[0] +
            "</button>"
          )
        })
        .join("") +
      "</div>" +
      '<div class="nav-actions flex items-center gap-3">' +
      (NASEEJ.authControl
        ? NASEEJ.authControl()
        : "<button " +
          navAttrs("profile") +
          ' class="text-sm font-medium px-5 py-2 rounded-full transition-all" style="color:#12211E;border:1px solid #C9BDA8">Sign In</button>') +
      "<button " +
      navAttrs("discover") +
      ' class="nav-cta text-sm font-medium px-5 py-2 rounded-full transition-all" style="background-color:#013E37;color:white">Start Naseej</button>' +
      "</div></nav>"
    )
  }

  function focusKey(el) {
    if (!el || !el.tagName) return ""

    const d = el.dataset || {}

    return [
      el.tagName,
      d.nav || "",
      d.act || "",
      d.v || "",
      d.thread || "",
      d.wp || "",
    ].join("|")
  }

  function paint() {
    const host = document.getElementById(APP_ID)

    const render = NASEEJ.pages && NASEEJ.pages[NASEEJ.state.page]

    if (!host || !render) return

    const active = document.activeElement

    const restore = !!(active && host.contains(active))

    const key = restore ? focusKey(active) : ""

    const byId = restore && active.id ? active.id : ""

    let idx = -1

    if (restore && !byId) {
      idx = Array.prototype.indexOf.call(
        host.querySelectorAll(INTERACTIVE),
        active,
      )
    }

    host.innerHTML = NASEEJ.navBar() + render()

    if (restore) {
      let target = null

      if (byId) {
        target = document.getElementById(byId)
      } else if (idx >= 0) {
        const candidate = host.querySelectorAll(INTERACTIVE)[idx]

        if (candidate && focusKey(candidate) === key) target = candidate
      }

      if (target && target.focus) target.focus()
    }

    if (NASEEJ.state.page === "discover" && NASEEJ.updateLibrary)
      NASEEJ.updateLibrary()
  }

  NASEEJ.paint = paint

  function mount(fresh) {
    if (fresh) {
      NASEEJ.ui =
        NASEEJ.state.page === "discover"
          ? { category: "All", search: "", city: null }
          : {}
    }

    window.scrollTo(0, 0)

    paint()
  }

  document.addEventListener("click", function (ev) {
    const el = ev.target.closest && ev.target.closest(INTERACTIVE)

    if (!el) return

    if (el.dataset.nav) {
      navigate(
        el.dataset.nav,

        el.dataset.thread != null ? +el.dataset.thread : undefined,

        el.dataset.wp != null ? +el.dataset.wp : undefined,
      )

      return
    }

    const handler = NASEEJ.actions && NASEEJ.actions[el.dataset.act]

    if (handler) handler(el.dataset.v)
  })

  document.addEventListener("input", function (ev) {
    if (ev.target.id !== "lib-search") return

    NASEEJ.ui.search = ev.target.value

    if (NASEEJ.updateLibrary) NASEEJ.updateLibrary()
  })

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return

    const el = ev.target.closest && ev.target.closest(INTERACTIVE)

    if (!el) return

    const native =
      el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "INPUT"

    if (native) return

    if (el.dataset.nav) {
      ev.preventDefault()

      navigate(
        el.dataset.nav,

        el.dataset.thread != null ? +el.dataset.thread : undefined,

        el.dataset.wp != null ? +el.dataset.wp : undefined,
      )

      return
    }

    const handler = NASEEJ.actions && NASEEJ.actions[el.dataset.act]

    if (handler) {
      ev.preventDefault()

      handler(el.dataset.v)
    }
  })
})(window.NASEEJ || (window.NASEEJ = {}))
