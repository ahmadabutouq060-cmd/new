# naseej

A static, framework-free website: **HTML + CSS + Vanilla JavaScript**. No React, no
TypeScript, no Vite, no Tailwind, no bundler, no build step for the site itself. The
repository root **is** the site.

## Project Structure

- `index.html` - The only HTML page. Contains the `#app` mount point and loads the
  five scripts below in order.
- `css/styles.css` - The entire stylesheet: hand-ported preflight, design tokens
  (`:root`), global styles, keyframes, and a hand-written utility layer.
- `js/data.js` - All content. Runs first; publishes `NASEEJ.data` (threads, waypoints,
  cities, rewards, assets) and `NASEEJ.session` (the signed-in weaver: profile, points,
  badges, progress). Touches neither the DOM nor the network.
- `js/navigation.js` - Defines the shell of `window.NASEEJ`: global state, hash routing,
  the nav bar, the mount/paint cycle, the markup helpers, and the two delegated event
  listeners. Runs second.
- `js/firebase.js` - Firebase services, **enabled** (`ENABLED = true`). The only place
  that calls `initializeApp`; loads `firebase-app.js` and `firebase-auth.js` on demand and
  publishes `NASEEJ.services`. Runs third.
- `js/pages.js` - The five page renderers plus `NASEEJ.pages` / `NASEEJ.actions` /
  `NASEEJ.updateLibrary()`. Runs fourth.
- `js/auth.js` - The Sign In dialog, the signed-in nav control, and the auth-state
  subscription that mirrors the Google identity into `NASEEJ.session.profile`. Publishes
  `NASEEJ.auth` and `NASEEJ.authControl` (the latter is what `navigation.js` calls to draw
  the nav button). Runs fifth.
- `js/app.js` - Bootstrap; calls `NASEEJ.route()` on DOM ready. Runs last.
- `assets/` - Images referenced by the data. Paths are document-relative
  (`assets/...`), so keep them relative.
- `scripts/serve.cjs` - Dependency-free static dev server (`npm run dev`).
- `scripts/build.cjs` - Validates the site, then copies the publishable files into
  `dist/`. There is nothing to compile.
- `robots.txt` - Published as-is.
- `firebase.json` - Hosting config; deploys `dist/`.
- `docs/` - The original product spec and content-accuracy brief the site was built
  from. Prose only; nothing reads it at build or run time.

Script order in `index.html` is a hard contract and `scripts/build.cjs` fails the build
if it changes: `data.js` defines what `pages.js` and `navigation.js` read,
`navigation.js` must exist before `auth.js` can hand it `NASEEJ.authControl`, and
`app.js` needs all of them.

The auth dialog renders into `#auth-root`, a **sibling** of `#app`, not into `#app` itself.
`paint()` replaces `#app` wholesale, so a dialog inside it would be destroyed by any
repaint. Sign-in must not tear down the page the visitor is on.

## Commands

- `npm run dev` / `npm run preview` - serve the site locally (`scripts/serve.cjs`)
- `npm run build` - validate, then stage the publishable files into `dist/`
- `npm run format` - oxfmt
- `npx firebase-tools deploy --only hosting` - Firebase Hosting (runs `npm run build`
  automatically via the `predeploy` hook)

`firebase.json`'s `predeploy` hook is `node scripts/build.cjs`, and Hosting publishes
`dist/`. Keep that script name and the `dist/` output contract intact.

## Architecture

- **Everything hangs off one `window.NASEEJ` namespace** and nothing else is exported to
  the global scope. Each file is wrapped in an IIFE: a top-level `const` in a classic
  script is not a property of `window`, so other files would not see it. The build
  fails on a stray top-level declaration.
- **Routing** is hash-based (`#/discover`, `#/thread/3`, `#/place/3/2`) so Back/Forward
  and refresh work. `NASEEJ.route()` parses `location.hash`; `NASEEJ.navigate()` writes
  it. First visit with no hash lands on `home`; an unknown page also falls back to
  `home`, an unknown thread id to thread 7, an unknown waypoint to the thread's active
  waypoint. Keep those fallbacks.
- **Rendering** is full re-render into `#app`. Pages are pure functions returning an
  HTML string, registered on `NASEEJ.pages`. A renderer must not write to `NASEEJ.ui` —
  the only state changes come from the delegated listener.
- **Global state** is `NASEEJ.state` (`page`, `threadId`, `waypointId`).
  **Page-local state** is `NASEEJ.ui`, dropped on a fresh mount to match React's
  unmount semantics. Always read it as `NASEEJ.ui.x`: `mount()` replaces the object.
  `mount()` is private to `navigation.js`; callers use `NASEEJ.paint()` to re-render
  in place (e.g. once auth state has loaded) and `NASEEJ.navigate()` to change route.
- **Content** is read through `NASEEJ.data`, and the signed-in weaver through
  `NASEEJ.session`. Renderers must not reach into either one's internals — the helpers
  there (`getThread`, `getWaypoint`, `getCity`, `filterLibrary`, `getCompletedCount`,
  `getThreadProgress`) are the seam a future auth/Firestore layer replaces.
  `getCompletedCount` / `getThreadProgress` / `getActiveWaypoint` read
  `session.completedWaypointIds` and `session.threadProgress` and fall back to the demo
  threads' own `status` / `progress` fields, so populating those two objects is the
  whole integration. The one exception is `profile()`, whose cards iterate
  `session.activeThreads` and so read that array's `progress` directly — it is already
  session-owned.
- **Events** are delegated from `document` — one `click` and one `input` listener for
  the whole app. Markup carries `data-nav` / `data-act` / `data-v` rather than inline
  handlers. `navigation.js` only dispatches: `data-nav` calls `NASEEJ.navigate()`, and
  `data-act` looks up the matching function in `NASEEJ.actions` (registered in
  `pages.js`). Add an interaction by emitting the attributes and adding the action
  there — never by growing the listener.
- The library page (`discover`) patches only the regions that change via
  `NASEEJ.updateLibrary()` instead of re-rendering, so the search input keeps focus
  and the card panel keeps its scroll position.

## Firebase

Authentication is **on**: `ENABLED = true`, and `js/auth.js` is wired to it. Set
`ENABLED = false` to switch the whole layer off without touching any other file; the Sign
In control then stays in its signed-out state and every page still works.

`js/firebase.js` must stay a **classic script**: a static `import` in a file loaded with
a `<script>` tag throws on every page load, and the build rejects one. The SDK itself is
pulled in with a *dynamic* `import()`, which is valid in a classic script and is what
keeps the SDK off the critical path — only `firebase-app.js` and `firebase-auth.js` are
loaded, and only when something actually asks for them. Do not add Firestore or Analytics
imports; no auth path needs them and they cost hundreds of kilobytes.

The API surface, none of which ever rejects:

- `NASEEJ.services.ready()` — `{ enabled, app, auth, firebaseAuth, provider, ... }` or
  `{ enabled: false, reason }`. On the page a redirect sign-in returns to, this drains the
  redirect result before it resolves, which is what stops a returning visitor being
  stranded on the loading state.
- `signInWithGoogle()` — `{ status }`; popup on desktop, redirect on mobile (a redirect
  promise stays pending, because the browser is navigating away). A blocked popup retries
  once via redirect.
- `signOut()`, `onAuthStateChanged(cb)` (returns an unsubscribe), `describeError(err)`.

`js/auth.js` owns the dialog and owns one `onAuthStateChanged` subscription for the whole
app. It is the only writer of `NASEEJ.session.profile`'s identity fields, and it restores
the demo weaver's values on sign-out — do not add a second subscriber.

**The project's console has no Auth provider enabled yet.** `accounts:signInWithIdp` and
`accounts:signUp` both return HTTP 400 `CONFIGURATION_NOT_FOUND`, so a real Google sign-in
cannot complete until an owner enables it: Authentication → Get started → Sign-in method →
Google, then adds `localhost`, `naseej-89fa4.web.app` and `naseej-89fa4.firebaseapp.com`
under Authorized domains. The UI surfaces that as a readable message; the site is not
broken while it is unconfigured.

## Styling

There is no Tailwind and no CSS framework. `css/styles.css` contains a hand-written
utility layer that reproduces the class names the markup uses (for example `flex`,
`gap-3`, `text-2xl`, `px-10`, `hover:scale-105`, `xl:text-7xl`) as plain CSS rules.

**If you add a class name to the markup you must add a matching rule to
`css/styles.css`.** There is no generator; a class with no rule renders unstyled.

A few classes are deliberately defined but currently unselected (`min-h-screen`,
`node-glow`, `thread-path`); each carries a comment saying why. They are part of the
design, not leftovers — but if you redesign the story-path map, decide their fate
deliberately instead of leaving them unexplained.

Keep the design tokens in `:root` and reuse them rather than hardcoding new colors.
Keep CSS `@import` statements (the Google Fonts import) first in the file.

**Type.** One family for the whole product: **Tajawal**, in `--font-display` and
`--font-body`, from a single `@import` at the top of the file. It replaced an
Outfit/Fraunces pairing, which is worth knowing because the pairing came back
once already: a Fraunces display serif over Outfit body copy cannot cover
Arabic or emoji, so the fallback was whatever the OS shipped and the same page
rendered differently on Windows, macOS and iOS. Tajawal is a humanist sans with
a full Arabic companion, and it carries its personality in its weight range
(200–900) rather than in its letterforms — so `.font-display` and `.font-body`
differ by weight, not by family. Keep `'Noto Color Emoji'` in both stacks: Tajawal
has no emoji glyphs, and dropping it makes the 🧦📷◈ glyphs in the data render
as boxes. Google Fonts serves the subsets under `unicode-range`, so a page with no
Arabic and no emoji downloads no extra font bytes.

Do not restore Outfit or Fraunces. If a comment elsewhere in `css/styles.css`
names them, it is describing the *old* stack as history, not the current one.

**Responsive.** The utility layer is deliberately breakpoint-free, so below 1280px every
page used to get the desktop arrangement. A single `@media` block at the end of
`styles.css` re-points those same utility names at 64rem / 48rem / 30rem; nothing above
that block is touched, which is what keeps the desktop rendering unchanged. Layout hooks
added for this (`nav-links`, `row-wrap`, `tab-row`) are the ones to reuse rather than
adding another breakpoint to the renderers.

The renderers are the deliberate exception: they carry the hex inline, as the JSX
reference did with `style={{...}}`. Do not convert them to `var(--color-*)`. A
misspelled or unregistered variable silently falls back to an inherited color, and
nothing here can diff a computed style — a silent restyle is worse than the
duplication. The compromise is `:root` acting as a **registry**: every hex in
`js/*.js` must match a declared `--color-*` token, and `npm run build` fails otherwise,
so no color can enter the codebase without a name. The tints derived from a token
(`rgba(217,138,108,0.2)`) and the `#app`/`body` rules are exempt by design.

## Dependencies

There are none at runtime and no build dependency. The only `devDependency` is
`oxfmt` for formatting. Do not add a framework, bundler, or CSS preprocessor.

## Verification

There is no test runner, and there should not be one — but with no compiler there is
also no compiler to tell you a change broke something. Two things cover it:

- `npm run build` is the static gate: it parses every script, rejects static
  `import`/`export` and top-level declarations, confirms the `index.html` script order
  and local references, confirms every `assets/...` path in the source exists, and
  confirms every color literal in a script is a registered `:root` token.
- For UI changes, render the routes and diff the output. `jsdom` outside the repo is
  enough to drive `NASEEJ.route()` / `NASEEJ.navigate()` and capture `#app.innerHTML`
  per route; a before/after snapshot is how a refactor here is proven behaviour-preserving
  rather than assumed to be. Setting `window.location.hash` and calling `NASEEJ.route()`
  directly is more reliable than `NASEEJ.navigate()`, which waits on `hashchange`.
- **jsdom has no layout engine and no images.** It can prove behaviour and markup, never
  geometry — `offsetParent` is always `null` and `getBoundingClientRect()` returns zeros.
  That is also a trap in the app code: filtering focusable elements on `offsetParent`
  silently breaks the dialog's focus trap, because it is `null` for `position: fixed`.
  Responsive and layout claims need a real browser (Puppeteer against `npm run dev`, with
  `executablePath` pointed at the installed Chrome) to check `scrollWidth` vs
  `clientWidth` and computed styles. Do not assert layout from jsdom.

## Deployment

`firebase.json` serves `dist/`, runs `node scripts/build.cjs` as a predeploy step, and
sets cache and security headers.

The site is set to `robots.index: false`. An earlier Vite plugin translated that
setting into a `noindex` meta tag and a `robots.txt` at build time; both are now
committed directly (`index.html` and `robots.txt`). Update both together.
