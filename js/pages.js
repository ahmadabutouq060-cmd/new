/* Naseej — page renderers.
   Vanilla port of src/pages/*.tsx. Markup, Tailwind class names and inline
   styles mirror the original JSX one-to-one.

   Reads content from NASEEJ.data and the signed-in weaver from NASEEJ.session
   (data.js), and registers NASEEJ.pages + NASEEJ.actions, which navigation.js
   calls. Renderers are pure: they return an HTML string and never write to
   NASEEJ.ui — the delegated listener owns every state change. */
(function (NASEEJ) {
  'use strict';

  const data = NASEEJ.data;
  const session = NASEEJ.session;
  const st = NASEEJ.state;
  const E = NASEEJ.escapeHtml;
  const N = NASEEJ.navAttrs;

  /* ── Media ─────────────────────────────────────────────────────────────────
     One decision point for every image in the app, because the previous build
     had five independent <img> call sites and they had drifted: some showed
     Unsplash stock presented as the waypoint, some showed the same photo
     through four URL parameters as if it were four shots.

     photo is either { src, subject, scope } from data.photoFor — a genuine
     local file — or null. Null never falls back to stock. It renders the
     placeholder, which states plainly that no verified photograph exists, and
     the caption under a real photo says what the photo is of. Alt text
     describes the subject rather than repeating the heading, and a decorative
     duplicate is marked aria-hidden instead of being given a second identical
     label for a screen reader to announce twice. */
  function placeholder(kind, subject) {
    return '<div class="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6" ' +
      'style="background-color:#F4EFE6;border:1px dashed #C9BDA8" role="img" ' +
      'aria-label="No verified photograph of ' + E(subject || 'this stop') + ' yet">' +
      '<div class="text-3xl" aria-hidden="true">' + (kind === 'map' ? '\u{1F5FA}' : '\u{1F4F7}') + '</div>' +
      '<div class="text-xs font-body font-semibold" style="color:#4A5C58">Photograph pending verification</div>' +
      '<div class="text-xs font-body" style="color:#55635E">' + E(subject || 'This stop') + '</div></div>';
  }

  function photoCaption(photo) {
    if (!photo) return '';
    return photo.scope === 'city'
      ? 'Photograph of ' + E(photo.subject) + ', Jordan'
      : 'Photograph of ' + E(photo.subject);
  }

  /* The hero image of a card or a page. Falls back to the placeholder. */
  function media(photo, subject, extraClass) {
    if (!photo) return placeholder('photo', subject);
    return '<img src="' + E(photo.src) + '" alt="' + photoCaption(photo) + '" ' +
      'class="' + E(extraClass || 'w-full h-full object-cover') + '" loading="lazy" decoding="async">';
  }

  /* ── Transient confirmation ────────────────────────────────────────────────
     An action whose only effect is invisible is indistinguishable from a broken
     one, which is how the old share button survived: it did nothing and said
     nothing. Every non-navigating action reports its outcome here.

     The node is a single reused element rather than a stack of toasts, because
     the delegated listener re-renders #app wholesale and a toast rendered into
     it would be destroyed by the very repaint that follows the action. So it
     lives outside #app, next to the auth dialog root. */
  let flashTimer = null;
  function flash(message) {
    let el = document.getElementById('flash-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash-root';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'flash';
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      el.className = 'flash flash-hidden';
    }, 3200);
  }

  /* Clipboard with a fallback for the browsers that refuse the async API
     outside a secure context, which includes a plain http:// LAN preview. */
  function clipboardCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      /* Off-screen but not display:none, or it cannot be selected. */
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  /* Thread lookup with the original's fallback to thread 7. */
  function getThread() {
    return data.getThread(st.threadId);
  }

  /* The waypoint list a renderer draws from: each entry decorated by the data
     layer with its live status and, for the living-mystery thread, the overlay
     for the branch that was chosen.

     The REAL thread object goes into data.decorateWaypoint — never a
     stand-in like { waypoints }. The mystery helpers are keyed off
     isHeroThread(thread), so anything other than the real object reports
     itself as an ordinary thread and every clue, branch and status goes
     quiet. */
  function threadWaypoints(t) {
    return (t.waypoints || []).map(function (wp) {
      return data.decorateWaypoint(t, wp);
    });
  }

  function isHero(t) {
    return data.isHeroThread(t);
  }

  /* indexOf by id, so a decorated copy still knows where it sits. */
  function waypointIndexById(wps, wp) {
    if (!wp) return -1;
    for (let i = 0; i < wps.length; i++) {
      if (wps[i].id === wp.id) return i;
    }
    return -1;
  }

  /* ═════════════════════ LIVING MYSTERY ═════════════════════
     The four pieces of the hero thread that have no equivalent in the original
     renderers: the KHAYT companion panel (chapter, clue ledger, branch choice),
     the validated question on a waypoint, the reward chips, and the reveal.
     All of it is a read of data.js state plus a delegated data-act, so none of
     it writes state from a renderer. */

  function heroThread() {
    return data.getThread(data.heroThreadId);
  }

  /* Reward chips: "+150 ATHAR". The amounts come from data.atharRewards, so a
     renderer can never name its own. */
  function atharChips(chips) {
    if (!chips || !chips.length) return '';
    return chips.map(function (c) {
      return '<span class="text-xs font-body font-semibold px-2.5 py-1 rounded-full" style="background-color:#013E37;color:white">' +
        E(c.label) + ' +' + c.athar + '</span>';
    }).join('');
  }

  function heroFeature() {
    const t = heroThread();
    if (!t) return '';
    const clues = data.getClueProgress(data.heroThreadId);
    const record = data.heroStats(t);
    const solved = data.isRevealed(data.heroThreadId);
    const progress = data.getThreadProgress(t);
    /* card-host, and the control below is the only one in it. The card used to
       carry data-nav itself, which made it clickable for a mouse and
       unreachable for a keyboard. */
    return '<div class="card-host group rounded-2xl overflow-hidden transition-all hover:-translate-y-1 mb-10" style="background-color:#FDFCFA;border:1px solid #D6672B;box-shadow:0 4px 20px rgba(214,103,43,0.18)">' +
      '<div class="grid grid-cols-12">' +
      '<div class="col-span-5 relative overflow-hidden" style="min-height:220px">' +
      media(data.photoFor(t), t.title, 'absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105') +
      '<div class="absolute inset-0" style="background:linear-gradient(120deg, rgba(18,33,30,0.55), rgba(18,33,30,0.1))"></div>' +
      '<div class="absolute top-4 left-4"><span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full uppercase tracking-widest" style="background-color:#A23B17;color:white">Living Mystery</span></div>' +
      '</div>' +
      '<div class="col-span-7 p-8">' +
      '<h3 class="font-display text-2xl font-semibold mb-1" style="color:#12211E">' + E(t.title) + '</h3>' +
      '<p class="text-sm font-body mb-4" style="color:#55635E">' + E(t.subtitle) + '</p>' +
      '<p class="text-sm font-body leading-relaxed mb-4" style="color:#4A5C58">A living mystery: four hidden clues, a KHAYT companion, and a path you choose yourself. Every clue is earned by a validated observation, never by simply arriving.</p>' +
      /* Label the frame up front, at the point the visitor decides to enter —
         not only at the reveal. */
      fictionNotice(t) +
      '<div class="flex items-center gap-5 text-xs font-body mb-5" style="color:#55635E">' +
      '<span>⊕ ' + (t.waypoints || []).length + ' waypoints</span>' +
      '<span>◇ ' + clues.unlocked + ' / ' + clues.total + ' clues</span>' +
      '<span>⏱ ' + E(t.duration) + '</span>' +
      '<span>✦ ' + record[0].value + ' ATHAR</span></div>' +
      '<div class="mb-5"><div class="h-1.5 rounded-full" style="background-color:#E8E0D0">' +
      '<div class="h-full rounded-full" style="width:' + progress + '%;background-color:#D6672B"></div></div></div>' +
      '<div class="flex items-center gap-3">' +
      '<button ' + N('thread', data.heroThreadId) + ' class="card-link px-6 py-3 rounded-full text-sm font-body font-semibold transition-all hover:scale-105" style="background-color:#013E37;color:white">' +
      (progress > 0 ? 'Continue the Mystery →' : 'Enter the Mystery →') + '</button>' +
      '<span class="text-xs font-body" style="color:#A23B17">' +
      (solved ? 'Thread found · ' + record[3].value : 'Chapter: ' + E(data.currentChapter(t))) + '</span>' +
      '</div></div></div></div>';
  }

  /* ── KHAYT panel on the thread page ──────────────────────────────────────────
     Chapter, the companion's line, the clue ledger (sealed clues show no text,
     so the mystery cannot be read ahead of being earned), and CHOOSE YOUR PATH
     the moment it is available. */
  function heroKhaytPanel(t) {
    const clues = data.getClueProgress(data.heroThreadId);
    const chapter = data.currentChapter(t);
    const branch = data.branchState(t);
    /* Through the adapter, and reacting to what the weaver just did rather than
       repeating the chapter line: after a branch or a wrong answer the panel
       used to reprint the same opening sentence, which read as the companion
       having no memory of the exchange. */
    const kctx = data.khaytContext(t, null);
    const message = (branch.chosen || NASEEJ.ui.heroResult)
      ? data.khaytAI.react(kctx)
      : data.khaytAI.ask(kctx);

    const ledger = (t.clues || []).map(function (c) {
      const open = clues.ids.indexOf(c.id) >= 0;
      /* The sealed state used to be #C9BDA8 on #F9F7F3 — 1.73:1. It is a
         decorative "nothing to read yet", but it is also the only instruction
         the weaver has about what to do next, so it has to be readable. The
         muted ink is #55635E (5.9:1); the hint colour stays a border accent. */
      return '<div class="p-3 rounded-xl" style="background-color:' + (open ? '#013E37' : '#F9F7F3') +
        ';border:1px solid ' + (open ? '#013E37' : '#E8E0D0') + '">' +
        '<div class="text-xs font-body font-semibold mb-1" style="color:' + (open ? '#FDFCFA' : '#55635E') + '">Clue ' + c.id + '</div>' +
        '<div class="text-xs font-body leading-snug" style="color:' + (open ? '#FDFCFA' : '#55635E') + '">' +
        (open ? E(c.text) : '◇ Sealed — solve the interaction that opens it') + '</div></div>';
    }).join('');

    /* The branch result is shown where the branch is chosen. A wrong or refused
       attempt has no message to print; a successful one prints the reaction
       (again, in KHAYT's own voice) and what the choice paid. */
    const branchResult = NASEEJ.ui.heroResult;
    const earned = branchResult && branchResult.branch && atharChips(branchResult.chips)
      ? '<div class="flex flex-wrap gap-2 mt-3">' + atharChips(branchResult.chips) + '</div>' : '';

    let choice = '';
    if (branch.chosen) {
      choice = '<div class="mt-6 p-4 rounded-xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
        '<div class="text-xs font-body font-semibold uppercase tracking-widest mb-2" style="color:#55635E">Your Path</div>' +
        '<div class="font-display text-base font-semibold mb-1" style="color:#12211E">' + E(branch.label) + '</div>' +
        '<p class="text-xs font-body leading-relaxed" style="color:#4A5C58">' + E(branch.reaction || '') + '</p>' +
        earned + '</div>';
    } else if (branch.available) {
      choice = '<div class="mt-6">' +
        '<div class="text-xs font-body font-semibold uppercase tracking-widest mb-1" style="color:#8C3211">Choose Your Path</div>' +
        '<p class="text-xs font-body mb-3" style="color:#55635E">The ibex mark was a sign, not an ending. This is the only branch in the thread — pick one and the story after it is yours.</p>' +
        '<div class="flex flex-wrap gap-3">' + branch.options.map(function (o) {
          return '<button data-act="heroBranch" data-v="' + E(o.id) + '" class="px-5 py-3 rounded-full text-sm font-body font-semibold transition-all hover:scale-105" style="border:2px solid #D6672B;color:#A23B17;background-color:#FDFCFA">' +
            E(o.label) + '</button>';
        }).join('') + '</div></div>';
    }

    return '<div class="col-span-12 rounded-2xl p-8 mb-10" style="background-color:#FDFCFA;border:1px solid #D6672B">' +
      /* The thread page is where the clue ledger and the branch live, so this
         is the last surface before the story prose. It has to carry the label
         too — a visitor who never opens the home page still deserves to know
         the traveller is invented. */
      fictionNotice(t) +
      '<div class="flex items-center justify-between mb-4">' +
      '<div class="flex items-center gap-2">' +
      '<span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full uppercase tracking-widest" style="background-color:#A23B17;color:white">Living Mystery</span>' +
      '<span class="text-xs font-body" style="color:#55635E">Chapter</span>' +
      '<span class="text-sm font-body font-semibold" style="color:#12211E">' + E(chapter) + '</span></div>' +
      '<span class="text-xs font-body" style="color:#55635E">Clues ' + clues.unlocked + ' / ' + clues.total + '</span></div>' +
      '<div class="p-4 rounded-xl mb-5" style="background-color:#12211E">' +
      '<div class="flex items-start gap-3">' +
      '<span class="text-xl flex-shrink-0">🧵</span>' +
      '<div><div class="text-xs font-body uppercase tracking-widest mb-1" style="color:#EDB99E">KHAYT</div>' +
      '<p class="text-sm font-body leading-relaxed" style="color:#F9F7F3">' + E(message) + '</p></div></div></div>' +
      '<div class="grid grid-cols-4 gap-3">' + ledger + '</div>' + choice + '</div>';
  }

  /* ── Final reveal ───────────────────────────────────────────────────────────
     Chapter → clue → choice → chapter → connection → final story, in the order
     the weaver walked it, ending on the text for their branch. */
  function heroRevealPanel(t) {
    const story = data.revealStory(data.heroThreadId);
    if (!story) return '';
    return '<div class="col-span-12 rounded-2xl p-8 mb-10" style="background:linear-gradient(135deg, #12211E, #02302B);border:1px solid #D6672B">' +
      '<div class="flex items-center gap-3 mb-2">' +
      '<span class="text-2xl">' + E(story.badgeIcon) + '</span>' +
      '<span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full uppercase tracking-widest" style="background-color:#013E37;color:white">' +
      E(story.badge) + ' earned</span></div>' +
      '<h2 class="font-display text-3xl font-semibold mb-1" style="color:#EDB99E">' + E(story.headline) + '</h2>' +
      '<p class="text-sm font-body mb-6" style="color:rgba(249,247,243,0.6)">' +
      E(story.branch) + ' · ' + story.clues + ' clues · +' + story.athar + ' ATHAR</p>' +
      '<div class="grid grid-cols-12 gap-6">' +
      '<div class="col-span-7">' + story.steps.map(function (s, i) {
        return '<div class="flex gap-4 mb-4">' +
          '<div class="flex flex-col items-center flex-shrink-0">' +
          '<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style="background-color:' +
          (i === 2 ? '#D6672B' : '#013E37') + ';color:white">' + (i + 1) + '</div>' +
          (i < story.steps.length - 1 ? '<div class="w-px flex-1" style="background-color:rgba(249,247,243,0.2)"></div>' : '') +
          '</div>' +
          '<div class="pb-2"><div class="text-xs font-body uppercase tracking-widest mb-1" style="color:#EDB99E">' + E(s.label) + '</div>' +
          '<p class="text-sm font-body leading-relaxed" style="color:rgba(249,247,243,0.75)">' + E(s.text) + '</p></div></div>';
      }).join('') + '</div>' +
      '<div class="col-span-5">' +
      '<div class="p-5 rounded-2xl mb-4" style="background-color:rgba(249,247,243,0.06);border:1px solid rgba(249,247,243,0.12)">' +
      '<div class="text-xs font-body uppercase tracking-widest mb-2" style="color:#EDB99E">Final Story</div>' +
      fictionNotice(t, true) +
      '<p class="text-sm font-body leading-relaxed" style="color:#F9F7F3">' + E(story.story) + '</p></div>' +
      '<div class="p-5 rounded-2xl" style="background-color:rgba(214,103,43,0.12);border:1px solid rgba(214,103,43,0.35)">' +
      '<div class="text-xs font-body uppercase tracking-widest mb-2" style="color:#EDB99E">KHAYT</div>' +
      '<p class="text-sm font-body leading-relaxed" style="color:#F9F7F3">' + E(story.khayt) + '</p></div></div></div></div>';
  }

  /* ── The validated question on a waypoint ───────────────────────────────────
     Question, options, Validate, feedback, ATHAR chips, then Next chapter.
     Nothing here unlocks anything: the answer is checked in data.js, and the
     button that pays out is not the button that revealed the question. */
  function heroChallengePanel(t, wp) {
    const result = NASEEJ.ui.heroResult;
    const forThis = result && result.waypointId === wp.id;
    const q = data.heroQuestion(t, wp);
    const status = wp.status;

    /* The verdict is built first, because it outlives the state it changed:
       answering correctly completes the waypoint, and a panel that switched to
       "solved" at that moment would swallow the explanation and the ATHAR the
       weaver just earned. */
    const feedback = forThis && result
      ? '<div class="' + (status === 'locked' || status === 'completed' ? 'mb-4 ' : 'mt-4 ') +
        'p-4 rounded-xl" style="background-color:' +
        (result.correct ? 'rgba(1,62,55,0.1)' : 'rgba(139,42,42,0.08)') +
        ';border:1px solid ' + (result.correct ? '#013E37' : '#8B2A2A') + '">' +
        '<div class="text-sm font-body font-semibold mb-1" style="color:' + (result.correct ? '#02302B' : '#8B2A2A') + '">' +
        (result.correct ? (result.reveal ? '✓ The thread is whole' : '✓ Correct') : result.status === 'duplicate' ? '✓ Already solved' : '✕ Not quite') + '</div>' +
        '<p class="text-xs font-body leading-relaxed" style="color:' + (result.correct ? '#046852' : '#8B2A2A') + '">' +
        E(result.message) + '</p>' +
        (atharChips(result.chips) ? '<div class="flex flex-wrap gap-2 mt-3">' + atharChips(result.chips) + '</div>' : '') +
        '</div>'
      : '';

    if (status === 'locked') {
      return '<div class="rounded-xl p-5 mb-4" style="background-color:#F9F7F3;border:1px solid #E8E0D0">' +
        '<p class="text-sm font-body" style="color:#55635E">🔒 This waypoint is still shut. ' +
        (wp.id === 2 ? 'Choose your path on the thread page to open it.' : 'Complete the previous waypoint to open it.') +
        '</p></div>' + feedback;
    }

    if (status === 'completed') {
      return '<div class="rounded-xl p-5 mb-4" style="background-color:rgba(1,62,55,0.08);border:1px solid rgba(1,62,55,0.3)">' +
        '<p class="text-sm font-body font-semibold mb-1" style="color:#02302B">✓ ' +
        (wp.interaction === 'observation' ? 'Observation recorded' : 'Challenge solved') + '</p>' +
        '<p class="text-xs font-body leading-relaxed" style="color:#046852">The ATHAR for this waypoint were paid once. KHAYT will not ask again.</p>' +
        '</div>' + feedback + heroNextChapter(t, wp);
    }

    if (!q) {
      return '<div class="rounded-xl p-5 mb-4" style="background-color:#F9F7F3;border:1px solid #E8E0D0">' +
        '<p class="text-sm font-body" style="color:#55635E">There is nothing to solve here yet.</p></div>' + feedback;
    }

    const picked = NASEEJ.ui.heroPick;

    const options = q.options.map(function (o) {
      const on = picked === o.id;
      /* The selection used to be carried by the border and the tint alone, which
         is invisible to a screen reader — the four options read identically and
         nothing announced that a pick had been made at all. These are toggle
         buttons, so aria-pressed is the honest description: one of the group is
         down. It is announced on the option rather than the group, because that
         is where the state changed. */
      return '<button data-act="heroPick" data-v="' + E(o.id) + '" aria-pressed="' + (on ? 'true' : 'false') +
        '" class="w-full text-left px-4 py-3 rounded-xl text-sm font-body transition-all" style="border:2px solid ' +
        (on ? '#D6672B' : '#E8E0D0') + ';background-color:' + (on ? 'rgba(214,103,43,0.08)' : '#FDFCFA') +
        ';color:' + (on ? '#A23B17' : '#12211E') + '">' + E(o.text) + '</button>';
    }).join('');

    return '<div class="rounded-xl p-5 mb-4" style="background-color:#FDFCFA;border:1px solid #D6672B">' +
      '<div class="flex items-center justify-between mb-2">' +
      '<div class="text-xs font-body font-semibold uppercase tracking-widest" style="color:#8C3211">' +
      (q.kind === 'observation' ? 'Observation' : 'Challenge') + '</div>' +
      '<span class="text-xs font-body" style="color:#55635E">+' + data.atharRewards.challenge + ' ATHAR</span></div>' +
      (q.lookPrompt ? '<p class="text-xs font-body mb-2" style="color:#A23B17">' + E(q.lookPrompt) + '</p>' : '') +
      '<p class="text-sm font-body font-semibold mb-4 leading-relaxed" style="color:#12211E">' + E(q.prompt) + '</p>' +
      '<div class="flex flex-col gap-2">' + options + '</div>' +
      '<button data-act="heroValidate" class="w-full py-3 rounded-full font-body font-semibold text-sm transition-all mt-4" style="background-color:' +
      (picked ? '#013E37;color:white' : '#E8E0D0;color:#55635E') + '">' +
      (picked ? 'Validate Answer' : 'Select an answer to validate') + '</button>' +
      feedback + '</div>' +
      (result && result.correct ? heroNextChapter(t, wp) : '');
  }

  /* "Next chapter" only appears once the interaction is actually solved. */
  function heroNextChapter(t, wp) {
    const wps = threadWaypoints(t);
    const idx = waypointIndexById(wps, wp);
    const next = wps[idx + 1] || null;
    const solved = data.revealStory(data.heroThreadId);
    if (solved) {
      return '<button ' + N('thread', data.heroThreadId) +
        ' class="w-full py-3 rounded-full font-body font-semibold text-sm transition-all hover:scale-[1.02]" style="background-color:#A23B17;color:white">' +
        'Read the final story →</button>';
    }
    if (!next) {
      return '<button ' + N('thread', data.heroThreadId) +
        ' class="w-full py-3 rounded-full font-body font-semibold text-sm" style="border:1px solid #E8E0D0;color:#12211E">Back to the thread →</button>';
    }
    const label = next.status === 'locked' ? 'Keep walking — ' + E(next.name) : 'Next chapter: ' + E(next.name) + ' →';
    return '<button ' + N('place', data.heroThreadId, next.id) +
      ' class="w-full py-3 rounded-full font-body font-semibold text-sm transition-all hover:scale-[1.02]" style="background-color:#013E37;color:white">' +
      label + '</button>';
  }

  /* ── Fiction vs. fact ───────────────────────────────────────────────────────
     The living mystery is built on real places — the Yarmouk, its basalt
     gorge, the migratory corridor, the columnar jointing, the riverside herbs.
     The traveller, the ibex and the herb-wrap are invented to carry them, and
     the reveal text reads as reportage. Nothing in the markup said so, so the
     narrative read as a historical account.

     The notice sits above every block of story prose, is derived from the
     thread's own fiction metadata rather than hard-coded here, and states
     plainly what is real and what is not. */
  function fictionNotice(t, onDark) {
    const f = t && t.fiction;
    if (!f || f.isFiction !== true) return '';
    /* Two surfaces, two palettes. The reveal panel is a dark gradient, and the
       light-surface ink (#4A5C58 on a pale fill) would sit at roughly 1.5:1
       there — the notice has to be legible, which is the whole point of it. */
    const plate = onDark
      ? 'background-color:rgba(249,247,243,0.08);border:1px solid rgba(237,185,158,0.4);border-left:3px solid #EDB99E'
      : 'background-color:rgba(1,62,55,0.06);border:1px solid rgba(1,62,55,0.22);border-left:3px solid #013E37';
    const labelColor = onDark ? '#EDB99E' : '#013E37';
    const bodyColor = onDark ? 'rgba(249,247,243,0.88)' : '#4A5C58';
    return '<div class="rounded-xl p-4 mb-4" style="' + plate + '">' +
      '<div class="text-xs font-body font-semibold uppercase tracking-widest mb-1" style="color:' + labelColor + '">' +
      E(f.label) + '</div>' +
      '<p class="text-xs font-body leading-relaxed" style="color:' + bodyColor + '">' + E(f.note) + '</p></div>';
  }

  /* ═════════════════════ LANDING PAGE ═════════════════════ */
  function home() {    const steps = [
      ['01', 'Choose a Thread', "Pick a curated narrative path across Jordan's regions and cultures."],
      /* Step 02 used to say "scan QR codes to unlock challenges". That was the
         old mechanic, and it is wrong for the living mystery, where arriving is
         not the challenge and the QR is gone entirely. The step now describes
         what every thread actually asks for. */
      ['02', 'Walk the Story', 'Follow the thread to real places. Each stop asks a question only that place can answer.'],
      ['03', 'Answer From the Evidence', 'Look, observe, and answer from what is in front of you — not from the internet.'],
      /* "Redeem points with local community partners" implied live fulfilment.
         The catalogue is a demo with four demo partners, which the rewards panel
         states plainly; the landing step should not quietly claim more. */
      ['04', 'Earn ATHAR and Badges', 'Collect badges and ATHAR as you go, then spend your ATHAR in the rewards catalogue.'],
    ];
    const dots = [[40, 240], [140, 140], [240, 40], [80, 180], [200, 100]].map(function (pt) {
      return '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="5" fill="#EDB99E" opacity="0.8"/>';
    }).join('');

    return '<div>' +
      /* Hero */
      '<section class="relative h-screen min-h-[700px] overflow-hidden">' +
      '<img src="' + data.assets.petraHero + '" alt="Petra Treasury, Jordan" class="absolute inset-0 w-full h-full object-cover">' +
      /* The scrim. It used to fade to 0.2 alpha at the right edge, which left
         the hero copy sitting on bare sandstone: measured against a mid-tone
         Petra, the headline ran 3.1:1 and the stat labels 2.7:1. The photo is
         the one thing here whose pixels we do not control, so the scrim is held
         dark enough that the text does not depend on what is behind it — 0.82
         at the weak end keeps every hero ink above 4.5:1 on the brightest
         plausible stone. */
      '<div class="absolute inset-0" style="background:linear-gradient(120deg, rgba(18,33,30,0.88) 35%, rgba(18,33,30,0.82) 100%)"></div>' +
      '<div class="relative h-full flex items-center"><div class="max-w-7xl mx-auto px-10 w-full grid grid-cols-12 gap-6">' +
      '<div class="col-span-7 flex flex-col justify-center pt-20">' +
      NASEEJ.eyebrow({ color: '#EDB99E', width: 'w-6', margin: 'mb-6', text: 'Jordan Gamified' }) +
      '<h1 class="font-display text-6xl xl:text-7xl font-semibold leading-tight mb-6" style="color:#F9F7F3">Weave Your<br>' +
      '<em class="not-italic" style="color:#EDB99E">Jordanian</em><br>Story</h1>' +
      "<p class=\"font-body text-lg mb-10 max-w-lg leading-relaxed\" style=\"color:rgba(249,247,243,0.9)\">Follow curated narrative paths through Jordan's landscapes, histories, and living cultures. Collect waypoints, earn rewards, and leave your thread in the national tapestry.</p>" +
      '<div class="flex items-center gap-4">' +
      '<button ' + N('discover') + ' class="px-8 py-4 rounded-full font-body font-semibold text-base transition-all hover:scale-105" style="background-color:#013E37;color:white;box-shadow:0 8px 24px rgba(1,62,55,0.35)">Start Your Journey</button>' +
      '<button ' + N('thread') + ' class="px-8 py-4 rounded-full font-body font-medium text-base transition-all" style="color:#F9F7F3;border:1px solid rgba(249,247,243,0.6)">View Threads →</button>' +
      '</div>' +
      '<div class="flex items-center gap-10 mt-16 pt-8" style="border-top:1px solid rgba(249,247,243,0.15)">' + data.landingStats.map(function (s) {
        return '<div><div class="font-display text-2xl font-semibold" style="color:#EDB99E">' + s.value + '</div>' +
          '<div class="text-xs font-body" style="color:rgba(249,247,243,0.8)">' + s.label + '</div></div>';
      }).join('') + '</div></div>' +
      '<div class="col-span-5 flex items-center justify-end pt-20"><div class="relative w-72 h-72 opacity-60">' +
      '<svg viewBox="0 0 280 280" class="w-full h-full">' +
      '<path d="M40 240 Q80 180 140 140 Q200 100 240 40" stroke="#EDB99E" stroke-width="1.5" fill="none" stroke-dasharray="6 3" opacity="0.6"/>' +
      '<path d="M20 160 Q80 140 140 100 Q200 60 260 80" stroke="#EDB99E" stroke-width="1" fill="none" stroke-dasharray="4 4" opacity="0.4"/>' +
      dots + '</svg></div></div>' +
      '</div></div>' +
      '<div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style="color:rgba(249,247,243,0.8)">' +
      '<span class="text-xs tracking-widest uppercase font-body">Scroll</span>' +
      '<div class="w-px h-8" style="background:linear-gradient(to bottom, rgba(249,247,243,0.4), transparent)"></div></div>' +
      '</section>' +

      /* Featured threads. The living mystery is drawn from its own thread
         object rather than from the static featured list, so the card can show
         live clue progress and always lands on the real thread id. */
      '<section class="py-24 px-10 max-w-7xl mx-auto"><div class="grid grid-cols-12 gap-6 mb-14">' +
      '<div class="col-span-6">' +
      NASEEJ.eyebrow({ color: '#8C3211', width: 'w-5', text: 'Popular Threads' }) +
      '<h2 class="font-display text-4xl font-semibold" style="color:#12211E">Begin with a Thread</h2></div>' +
      '<div class="col-span-6 flex items-end justify-end">' +
      '<button ' + N('discover') + ' class="text-sm font-body font-medium underline underline-offset-4" style="color:#8C3211">View all ' + data.libraryStats.threads + ' threads →</button></div>' +
      '</div>' + heroFeature() +
      '<div class="grid grid-cols-3 gap-6">' + data.featuredThreads.map(function (t, i) {
        /* Three identical tiles read as one tile repeated, and the repetition
           hid the most useful thing on the card: whether this weaver has
           already started it. The progress is real (getThreadProgress reads the
           session), so the card now shows state — a bar, a distinct label, and
           the region — instead of three copies of the same CTA. */
        const prog = data.getThreadProgress(t);
        const started = prog > 0;
        return '<div class="card-host group rounded-2xl overflow-hidden transition-all hover:-translate-y-1" style="background-color:#FDFCFA;border:1px solid #E8E0D0;box-shadow:0 2px 12px rgba(18,33,30,0.06)">' +
          '<div class="relative overflow-hidden ' + (i === 0 ? 'h-56' : 'h-48') + '">' +
      media(data.photoFor(t), t.title, 'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105') +
          '<div class="absolute top-3 left-3 flex gap-1.5">' +
          '<span class="text-xs font-body font-medium px-2.5 py-1 rounded-full" style="background-color:rgba(249,247,243,0.92);color:#8C3211">' + E(t.category) + '</span>' +
          (started
            ? '<span class="text-xs font-body font-semibold px-2.5 py-1 rounded-full" style="background-color:#013E37;color:white">In progress</span>'
            : '') + '</div>' +
          '<div class="absolute bottom-0 left-0 right-0 h-16" style="background:linear-gradient(to top, rgba(18,33,30,0.5), transparent)"></div></div>' +
          '<div class="p-5">' +
          '<div class="text-xs font-body mb-1" style="color:#8C3211">' + E(t.region) + '</div>' +
          '<h3 class="font-display text-lg font-semibold mb-1" style="color:#12211E">' + E(t.title) + '</h3>' +
          '<p class="text-sm font-body mb-4" style="color:#55635E">' + E(t.hook) + '</p>' +
          '<div class="flex items-center justify-between text-xs font-body mb-4" style="color:#55635E">' +
          '<span>⊕ ' + t.waypoints + ' waypoints</span><span>⏱ ' + E(t.duration) + '</span>' +
          '<span>◈ ' + (t.travelers || 0).toLocaleString('en-US') + ' weavers</span></div>' +
          (started
            ? '<div class="mb-4"><div class="flex justify-between text-xs font-body mb-1" style="color:#55635E">' +
              '<span>Your progress</span><span>' + prog + '%</span></div>' +
              '<div class="h-1.5 rounded-full" style="background-color:#E8E0D0">' +
              '<div class="h-full rounded-full" style="width:' + prog + '%;background-color:#013E37"></div></div></div>'
            : '') +
          '<button ' + N('thread', t.id) + ' class="card-link w-full py-2.5 rounded-full text-sm font-body font-medium transition-all" style="' +
          (started ? 'background-color:#013E37;color:white' : 'background-color:#F9F7F3;color:#12211E;border:1px solid #E8E0D0') + '">' +
          (started ? 'Continue Thread →' : 'Begin Thread →') + '</button>' +
          '</div></div>';
      }).join('') + '</div></section>' +

      /* How it works */
      '<section class="py-20 px-10" style="background-color:#12211E"><div class="max-w-7xl mx-auto">' +
      '<div class="text-center mb-16">' +
      NASEEJ.eyebrow({ color: '#EDB99E', width: 'w-5', text: 'The Process', trailingRule: true }) +
      '<h2 class="font-display text-4xl font-semibold" style="color:#F9F7F3">How the Loom Works</h2></div>' +
      '<div class="grid grid-cols-4 gap-8">' + steps.map(function (s) {
        return '<div class="text-center"><div class="font-display text-5xl font-semibold mb-4" style="color:#D6672B;opacity:0.5">' + s[0] + '</div>' +
          '<h3 class="font-display text-xl font-semibold mb-3" style="color:#F9F7F3">' + s[1] + '</h3>' +
          '<p class="text-sm font-body leading-relaxed" style="color:rgba(249,247,243,0.8)">' + s[2] + '</p></div>';
      }).join('') + '</div></div></section>' +

      /* CTA */
      '<section class="py-24 px-10 max-w-7xl mx-auto text-center">' +
      "<h2 class=\"font-display text-5xl font-semibold mb-4\" style=\"color:#12211E\">Ready to add your thread<br>to Jordan's tapestry?</h2>" +
      /* This used to read "Join 12,000+ weavers". Nothing in the catalogue backs
         that number, and the obvious repair — summing the per-thread `travelers`
         field — is a different lie, because one weaver can walk several threads
         and the sum would count them repeatedly (26,190). So the aggregate is
         gone and the claim is replaced with the structural counts, which are
         derived from the catalogue by `libraryStats` and cannot drift from it. */
      '<p class="font-body text-lg mb-8 max-w-lg mx-auto" style="color:#55635E">This build carries ' +
      data.libraryStats.threads + ' story threads and ' + data.libraryStats.waypoints + ' hidden waypoints across ' +
      data.libraryStats.regions + ' regions. Start with one thread and see how far you get.</p>' +
      '<button ' + N('discover') + ' class="px-10 py-4 rounded-full font-body font-semibold text-base transition-all hover:scale-105" style="background-color:#013E37;color:white;box-shadow:0 8px 24px rgba(1,62,55,0.3)">Start Weaving — It\'s Free</button>' +
      '</section>' +

      /* Footer */
      '<footer class="py-10 px-10" style="border-top:1px solid #E8E0D0"><div class="max-w-7xl mx-auto flex items-center justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<img src="' + data.assets.logoIcon + '" alt="Naseej emblem" style="width:32px;height:28px;object-fit:contain">' +
      '<img src="' + data.assets.logoText + '" alt="Naseej" style="width:60px;height:28px;object-fit:contain"></div>' +
      '<p class="text-xs font-body" style="color:#55635E">© 2026 Naseej — Weaving Jordan\'s Stories Together</p></div></footer>' +
      '</div>';
  }

  /* ═════════════════════ ACTIVE THREAD ═════════════════════ */
  const nodePaths = {
    3: [[100, 130], [320, 130], [540, 130]],
    4: [[80, 130], [227, 80], [373, 180], [520, 130]],
    5: [[60, 80], [175, 80], [290, 150], [405, 80], [560, 80]],
    6: [[40, 80], [150, 130], [260, 180], [370, 180], [480, 130], [590, 80]],
  };
  const svgPaths = {
    3: {
      full: 'M100 130 L320 130 L540 130',
      done: function (n) { return n === 0 ? '' : n === 1 ? 'M100 130 L320 130' : n === 2 ? 'M100 130 L320 130 L540 130' : ''; },
    },
    4: {
      full: 'M80 130 Q154 80 227 80 Q300 80 373 180 Q446 180 520 130',
      done: function (n) {
        return n === 0 ? ''
          : n === 1 ? 'M80 130 Q154 80 227 80'
            : n === 2 ? 'M80 130 Q154 80 227 80 Q300 80 373 180'
              : 'M80 130 Q154 80 227 80 Q300 80 373 180 Q446 180 520 130';
      },
    },
    5: {
      full: 'M60 80 Q117 80 175 80 Q233 115 290 150 Q348 115 405 80 Q483 80 560 80',
      done: function (n) {
        return n <= 0 ? ''
          : n === 1 ? 'M60 80 Q117 80 175 80'
            : n === 2 ? 'M60 80 Q117 80 175 80 Q233 115 290 150'
              : 'M60 80 Q117 80 175 80 Q233 115 290 150 Q348 115 405 80';
      },
    },
    6: {
      full: 'M40 80 Q95 105 150 130 Q205 155 260 180 Q315 180 370 180 Q425 155 480 130 Q535 105 590 80',
      done: function (n) {
        return n <= 0 ? ''
          : n === 1 ? 'M40 80 Q95 105 150 130'
            : n === 2 ? 'M40 80 Q95 105 150 130 Q205 155 260 180'
              : n === 3 ? 'M40 80 Q95 105 150 130 Q205 155 260 180 Q315 180 370 180'
                : 'M40 80 Q95 105 150 130 Q205 155 260 180 Q315 180 370 180 Q425 155 480 130';
      },
    },
  };

  function nodeStyle(wp) {
    if (wp.status === 'completed') return ['#013E37', '#02302B'];
    if (wp.status === 'active') return ['#F9F7F3', '#D6672B'];
    return ['#E8E0D0', '#C9BDA8'];
  }

  /* The real thread goes in, not a { waypoints } stand-in — see
     threadWaypoints() above.

     The button is only rendered when there is somewhere to go. Previously it was
     emitted unconditionally and simply carried no data-nav when the thread had
     no active waypoint, so a finished thread still showed a solid teal
     "Go to Active Node →" that did nothing when pressed. A completed thread now
     says so and offers the progress view instead, which is actionable. */
  function activeNodeButton(t) {
    const a = data.getActiveWaypoint(t);
    if (a) {
      return '<button ' + N('place', st.threadId, a.id) +
        ' class="px-5 py-2 rounded-full text-sm font-body font-semibold" style="background-color:#013E37;color:white">Go to Active Node →</button>';
    }
    const done = data.getCompletedCount(t);
    const total = (t.waypoints || []).length;
    return '<button ' + N('profile') +
      ' class="px-5 py-2 rounded-full text-sm font-body font-semibold" style="border:1px solid #013E37;color:#013E37">' +
      (total > 0 && done >= total ? 'View Completed Thread' : 'View Your Progress') + '</button>';
  }

  function thread() {
    const t = getThread();
    const raw = t.waypoints || [];

    if (raw.length === 0) {
      return '<div class="pt-20 px-10" style="border-bottom:1px solid #E8E0D0"><div class="max-w-7xl mx-auto py-6">' +
        '<h1 class="font-display text-3xl font-semibold" style="color:#12211E">' + E(t.title) + '</h1>' +
        '<p class="font-body text-sm mt-1" style="color:#55635E">This thread has no waypoints yet.</p>' +
        '</div></div>';
    }

    /* Decorated copies: live status and, for the mystery, the branch overlay.
       Node colours, the selected-node card and the counts all read these, so
       the map cannot disagree with the progress model. */
    const wps = threadWaypoints(t);

    /* Selection is read, not seeded: until a node is clicked the active
       waypoint is shown, which is what the original's first-render write did. */
    const activeWp = data.getActiveWaypoint(t);
    const chosenIdx = NASEEJ.ui.activeNode != null ? waypointIndexById(wps, { id: NASEEJ.ui.activeNode }) : -1;
    const sel = (chosenIdx >= 0 ? wps[chosenIdx] : null) || activeWp || wps[0];
    const done = data.getCompletedCount(t);
    const progress = data.getThreadProgress(t);
    const hero = isHero(t);
    const n = wps.length;
    const pos = nodePaths[n] || nodePaths[5];
    const ps = svgPaths[n] || svgPaths[5];
    /* The mystery's stat row is live; every other thread keeps its static one. */
    const stats = hero ? data.heroStats(t) : (t.stats || []);

    const nodes = wps.map(function (wp, i) {
      const p = pos[i] || [60 + i * 100, 130];
      const x = p[0], y = p[1], s = nodeStyle(wp);
      const isActive = wp.status === 'active';
      const isSelected = wp.id === NASEEJ.ui.activeNode;
      /* tabindex/role make each node reachable by Tab and operable with Enter or
         Space. The delegated listener dispatches on click, so a keyboard
         activation has to synthesise one — see NASEEJ.actions.node, which is
         called directly rather than faking a mouse event. */
      return '<g data-act="node" data-v="' + wp.id + '" class="map-node" tabindex="0" role="button" ' +
        'aria-label="' + E(wp.name + ', ' + (isActive ? 'active challenge' : wp.status)) + '" ' +
        'aria-pressed="' + (isSelected ? 'true' : 'false') + '" style="cursor:pointer">' +
        (isActive ? '<circle cx="' + x + '" cy="' + y + '" r="30" fill="rgba(214,103,43,0.15)"/>' : '') +
        '<circle cx="' + x + '" cy="' + y + '" r="22" fill="' + s[0] + '" stroke="' + s[1] +
        '" stroke-width="' + (isActive ? 3 : isSelected ? 2.5 : 2) + '"' +
        (isActive ? ' style="filter:drop-shadow(0 0 8px rgba(214,103,43,0.6))"' : '') + '/>' +
        '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14">' +
        (wp.status === 'locked' ? '🔒' : E(wp.icon)) + '</text>' +
        '<text x="' + x + '" y="' + (y + 38) + '" text-anchor="middle" font-size="9" font-family="Tajawal, sans-serif" fill="' +
        (wp.status === 'locked' ? '#55635E' : '#12211E') + '" font-weight="500">' +
        E(wp.name.split(' ').slice(0, 2).join(' ')) + '</text>' +
        (wp.status === 'completed'
          ? '<text x="' + x + '" y="' + (y + 50) + '" text-anchor="middle" font-size="8" font-family="Tajawal, sans-serif" fill="#013E37" font-weight="600">✓ ' + wp.points + 'pts</text>'
          : '') +
        '</g>';
    }).join('');

    const action =
      sel.status === 'active'
        ? '<button ' + N('place', st.threadId, sel.id) + ' class="w-full py-3 rounded-full font-body font-semibold text-sm transition-all hover:scale-[1.02]" style="background-color:#013E37;color:white;box-shadow:0 4px 12px rgba(1,62,55,0.3)">Go to Challenge →</button>'
        : sel.status === 'completed'
          ? '<div class="text-center py-2"><span class="text-sm font-body font-medium" style="color:#013E37">✓ Challenge Completed</span></div>'
          : '<div class="text-center py-2"><span class="text-sm font-body" style="color:#55635E">🔒 Complete previous waypoints first</span></div>';

    const legend = [['#013E37', 'Completed'], ['#D6672B', 'Active (Current)'], ['#C9BDA8', 'Locked']]
      .map(function (l) {
        return '<div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full" style="background-color:' + l[0] + '"></div>' +
          '<span class="text-xs font-body" style="color:#55635E">' + l[1] + '</span></div>';
      }).join('');

    return '<div>' +
      '<div class="pt-20 px-10" style="border-bottom:1px solid #E8E0D0"><div class="max-w-7xl mx-auto py-6">' +
      '<div class="flex items-center gap-3 mb-1"><button ' + N('discover') + ' class="text-sm font-body flex items-center gap-1" style="color:#55635E">← Discover</button>' +
      '<span style="color:#55635E">/</span><span class="text-sm font-body" style="color:#8C3211">' + E(t.title) + '</span></div>' +
      '<div class="flex items-end justify-between"><div>' +
      '<h1 class="font-display text-3xl font-semibold" style="color:#12211E">' + E(t.title) + '</h1>' +
      '<p class="font-body text-sm mt-1" style="color:#55635E">' + E(t.subtitle) + '</p></div>' +
      '<div class="flex gap-3"><button data-act="share" data-v="' + t.id + '" class="px-4 py-2 rounded-full text-sm font-body font-medium" style="border:1px solid #E8E0D0;color:#12211E">Share Thread</button>' +
      activeNodeButton(t) + '</div></div></div></div>' +

      '<div class="max-w-7xl mx-auto px-10 py-10">' +
      '<div class="grid grid-cols-4 gap-4 mb-10">' + stats.map(function (a) {
        return '<div class="flex items-center gap-3 px-5 py-4 rounded-xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
          '<span class="text-2xl">' + a.icon + '</span><div>' +
          '<div class="font-display text-xl font-semibold" style="color:#12211E">' + E(a.value) + '</div>' +
          '<div class="text-xs font-body" style="color:#55635E">' + E(a.label) + '</div></div></div>';
      }).join('') + '</div>' +

      '<div class="mb-10"><div class="flex justify-between text-xs font-body mb-2" style="color:#55635E"><span>Thread Progress</span>' +
      '<span>' + progress + '% complete</span></div>' +
      '<div class="h-2 rounded-full" style="background-color:#E8E0D0"><div class="h-full rounded-full" style="width:' + progress + '%;background-color:#013E37"></div></div></div>' +

      '<div class="grid grid-cols-12 gap-8">' +
      (hero ? (data.isRevealed(data.heroThreadId) ? heroRevealPanel(t) : heroKhaytPanel(t)) : '') +
      '<div class="col-span-8"><div class="rounded-2xl p-8" style="background-color:#FDFCFA;border:1px solid #E8E0D0;min-height:420px">' +
      '<h2 class="font-body font-semibold text-sm uppercase tracking-wide mb-8" style="color:#55635E">Story Path</h2>' +
      '<div class="relative"><svg viewBox="0 0 640 260" class="w-full" style="overflow:visible">' +
      '<path d="' + ps.full + '" stroke="#E8E0D0" stroke-width="3" fill="none" stroke-dasharray="8 4"/>' +
      (done > 0 ? '<path d="' + ps.done(done) + '" stroke="#013E37" stroke-width="3" fill="none" stroke-linecap="round"/>' : '') +
      nodes + '</svg>' +
      '<div class="flex items-center gap-5 mt-2">' + legend + '</div></div></div></div>' +

      '<div class="col-span-4"><div class="rounded-2xl overflow-hidden" style="border:1px solid #E8E0D0">' +
      /* Same validated path as the place page: a waypoint has no photo of its
         own, so this is either a real local city file or the honest
         placeholder. It used to hand-build {src: sel.image}, and since
         waypoints carry no image field that rendered <img src="null"> — a torn
         image icon on the thread page. photoCaption() labels the fallback as a
         photograph of the city, not of the stop. */
      '<div class="relative h-44">' + media(data.waypointPhoto(sel) || data.photoFor(t), sel.name) +
      '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(18,33,30,0.65), transparent)"></div>' +
      '<div class="absolute bottom-3 left-3"><span class="text-xs font-body px-2 py-0.5 rounded-full font-medium" style="background-color:rgba(249,247,243,0.9);color:#8C3211">' + E(sel.type) + '</span></div>' +
      (sel.status === 'active'
        ? '<div class="absolute top-3 right-3"><span class="text-xs font-body px-2 py-0.5 rounded-full font-semibold animate-pulse" style="background-color:#A23B17;color:white">● Active</span></div>'
        : '') + '</div>' +

      '<div class="p-5" style="background-color:#FDFCFA">' +
      '<h3 class="font-display text-base font-semibold mb-1" style="color:#12211E">' + E(sel.name) + '</h3>' +
      '<p class="text-xs font-body mb-3 leading-relaxed" style="color:#55635E">' + E(sel.desc) + '</p>' +
      '<div class="mb-4 p-3 rounded-xl" style="background-color:rgba(1,62,55,0.07);border:1px solid rgba(1,62,55,0.2)">' +
      '<p class="text-xs font-body font-semibold mb-1" style="color:#02302B">🎯 Challenge</p>' +
      '<p class="text-xs font-body leading-relaxed" style="color:#046852">' + E(sel.challenge) + '</p></div>' +
      '<div class="flex items-center justify-between mb-4 pb-4" style="border-bottom:1px solid #E8E0D0">' +
      '<div class="text-center"><div class="font-display text-lg font-semibold" style="color:#013E37">+' + sel.points + '</div>' +
      '<div class="text-xs font-body" style="color:#55635E">Points</div></div>' +
      '<div class="text-center"><div class="font-display text-lg font-semibold" style="color:#12211E">' + sel.id + '/' + wps.length + '</div>' +
      '<div class="text-xs font-body" style="color:#55635E">Waypoint</div></div>' +
      '<div class="text-center"><div class="text-2xl">' + sel.icon + '</div>' +
      '<div class="text-xs font-body capitalize" style="color:#55635E">' + sel.status + '</div></div></div>' +
      action + '</div></div>' +

      '<div class="mt-4 p-4 rounded-xl" style="background-color:rgba(214,103,43,0.08);border:1px solid rgba(214,103,43,0.2)">' +
      '<p class="text-xs font-body leading-relaxed" style="color:#A23B17"><strong>Local Tip:</strong> ' + E(t.tip) + '</p></div>' +
      '</div></div></div></div>';
  }

  /* ═════════════════════ PLACE DETAILS ═════════════════════ */
  /* Randomised stand-in for the marker QR: three finder squares plus noise. */
  function buildChallengeMatrix() {
    const matrix = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        matrix.push(
          (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3) || Math.random() > 0.45
        );
      }
    }
    return matrix;
  }

  function place() {
    const t = getThread();
    const wps = threadWaypoints(t);
    /* data.getWaypoint takes the REAL thread and returns the decorated
       waypoint: live status, branch overlay, and the original fallback to the
       active waypoint when the route names one this thread does not have. */
    const wp = data.getWaypoint(t, st.waypointId);
    if (!wp) {
      return '<div class="pt-20 px-10"><p class="font-body text-sm" style="color:#55635E">This thread has no waypoints yet.</p></div>';
    }

    const idx = waypointIndexById(wps, wp);
    const total = wps.length;
    const next = wps[idx + 1] || null;
    const hero = isHero(t);

    /* One photograph, not four URL variants.
       The gallery was four crops, saturations and brightness tweaks of the same
       file: same subject, same composition, four slots in the strip. It read as
       four views of the place and let the visitor step between them finding no
       difference. With no verified waypoint photograph there is nothing to
       page through, so the strip is gone and the single image carries the
       caption. If a real set is ever added, the strip comes back — as distinct
       photographs, which is the only version of it that was ever worth having. */
    const photo = data.waypointPhoto(wp) || data.photoFor(t);
    const photoNote = data.waypointPhoto(wp)
      ? ''
      : '<div class="absolute bottom-4 left-4 right-4"><span class="text-xs font-body px-2.5 py-1 rounded-full" ' +
        'style="background-color:rgba(18,33,30,0.82);color:#EDB99E">' +
        (photo ? 'Photograph of ' + E(photo.subject) + ' — no verified photo of this stop yet' : 'No verified photograph of this stop yet') +
        '</span></div>';
    /* Real coordinates or no map button. Never a guessed pin. */
    const coords = data.waypointCoords(wp);
    const mapsBtn = coords
      ? '<a href="' + E(data.mapsUrl(wp)) + '" target="_blank" rel="noopener noreferrer" ' +
        'class="text-xs font-body font-medium px-3 py-1.5 rounded-full flex-shrink-0 no-underline" ' +
        'style="background-color:rgba(1,62,55,0.1);color:#013E37">Open in Maps</a>'
      : '';

    /* Explicit thread fields win. The subtitle scrape is the fallback for the
       threads that still carry difficulty and duration inside that string —
       the mystery's subtitle is prose and no longer has to fake them. */
    const dm = (t.subtitle || '').match(/Easy|Moderate|Strenuous/i);
    const diff = t.difficulty || (dm ? dm[0] : 'Moderate');
    const du = (t.subtitle || '').match(/\d[\d–]* days?|\d+ hrs?|\d day/i);
    const duration = t.duration || (du ? du[0] : '2 hrs');

    const tags = [
      ['Duration', duration, '⏱'],
      ['Reward', hero ? '+' + data.atharRewards.challenge + ' ATHAR' : wp.points + ' pts', '⭐'],
      ['Difficulty', diff, '⚡'],
      ['Category', wp.type, wp.icon],
      ['City', t.city, '📍'],
      ['Waypoint', (idx + 1) + ' of ' + total, '⊕'],
    ];

    let qrCta;
    if (hero) {
      /* The mystery replaces the QR step: arriving is not the challenge, the
         validated answer is. KHAYT, the question, the answer, the verdict. The
         verdict and its chips belong to heroChallengePanel, which prints both
         states, so they are not repeated here.

         Every line of KHAYT now comes from the provider-agnostic adapter rather
         than the bare khaytMessage() helper, and the panel says which provider
         is speaking. A visitor should not have to guess whether the companion
         is a language model or a script. */
      const kctx = data.khaytContext(t, wp);
      const kHint = NASEEJ.ui.heroHint;
      qrCta = '<div class="p-4 rounded-2xl mb-4" style="background-color:#12211E">' +
        '<div class="flex items-start gap-3">' +
        '<span class="text-xl flex-shrink-0">🧵</span>' +
        '<div class="flex-1 min-w-0"><div class="text-xs font-body uppercase tracking-widest mb-1" style="color:#EDB99E">KHAYT · ' +
        E(data.currentChapter(t)) + '</div>' +
        '<p class="text-sm font-body leading-relaxed" style="color:#F9F7F3">' + E(data.khaytAI.ask(kctx)) + '</p>' +
        /* A hint is a nudge, never the answer, and it is on request — the
           challenge has to be answerable without it. */
        '<div class="mt-3 flex items-center gap-3 flex-wrap">' +
        '<button data-act="khaytHint" class="text-xs font-body font-medium px-3 py-1.5 rounded-full" ' +
        'style="border:1px solid rgba(237,185,158,0.5);color:#EDB99E">Need a nudge?</button>' +
        (kHint ? '<span class="text-xs font-body" style="color:rgba(249,247,243,0.85)">' + E(kHint) + '</span>' : '') +
        '<span class="text-xs font-body ml-auto" style="color:rgba(249,247,243,0.55)">' +
        (data.khaytAI.isLive ? 'KHAYT · ' + E(data.khaytAI.provider) : 'KHAYT · scripted companion') + '</span>' +
        '</div></div></div></div>' + heroChallengePanel(t, wp);
    } else if (NASEEJ.ui.challengeOpen) {
      let cells = '';
      const matrix = NASEEJ.ui.qr || [];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (matrix[r * 7 + c]) {
            cells += '<rect x="' + (8 + c * 15) + '" y="' + (8 + r * 15) + '" width="12" height="12" fill="#12211E" rx="1"/>';
          }
        }
      }
      qrCta = '<div class="text-center py-6 rounded-2xl" style="background-color:rgba(1,62,55,0.06);border:1px solid rgba(1,62,55,0.3)">' +
        '<div class="inline-block p-4 rounded-xl mb-3" style="background-color:white;box-shadow:0 4px 16px rgba(18,33,30,0.1)">' +
        '<svg width="120" height="120" viewBox="0 0 120 120">' +
        '<rect width="120" height="120" fill="white"/>' + cells +
        '<rect x="8" y="8" width="42" height="42" fill="none" stroke="#12211E" stroke-width="3"/>' +
        '<rect x="70" y="8" width="42" height="42" fill="none" stroke="#12211E" stroke-width="3"/>' +
        '<rect x="8" y="70" width="42" height="42" fill="none" stroke="#12211E" stroke-width="3"/>' +
        '</svg></div>' +
        /* Truthful labelling. This SVG is buildChallengeMatrix() — a random
           stand-in drawn by the page, not a code for anything. The old copy
           told the visitor to point a camera at a physical marker, which does
           not exist and never was going to: nothing here scans, decodes, or
           verifies a position. A badge-shaped graphic is decoration, so it is
           named as decoration and the real action is stated instead. */
        '<p class="text-sm font-body font-semibold mb-1" style="color:#12211E">Challenge at ' + E(wp.name) + '</p>' +
        '<p class="text-xs font-body mb-1" style="color:#55635E">Prototype QR — a visual placeholder, not a scannable code.</p>' +
        '<p class="text-xs font-body mb-3" style="color:#55635E">Open the challenge here in Naseej. This demo does not scan codes or verify your location.</p>' +
        /* This used to read "Mark as completed manually" and navigate to the
           profile, which neither scanned anything nor marked anything — the
           visitor pressed it and landed on a stats page. The only honest
           in-page action is the progress view. */
        '<button ' + N('profile') + ' class="text-xs font-body font-medium underline underline-offset-2" style="color:#013E37">View your progress →</button>' +
        '</div>';
    } else {
      /* The button opens the panel above and nothing else — no camera, no
         decode. So it says what it does. */
      qrCta = '<button data-act="qr" class="w-full py-4 rounded-full font-body font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.99]" style="background-color:#013E37;color:white;box-shadow:0 8px 24px rgba(1,62,55,0.35)">Open Challenge</button>';
    }

    const circleBtn = 'w-8 h-8 rounded-full flex items-center justify-center" style="background-color:rgba(249,247,243,0.9);color:#12211E';

    return '<div>' +
      '<div class="pt-20 px-10 py-4 max-w-7xl mx-auto"><div class="flex items-center gap-2 text-sm font-body flex-wrap" style="color:#55635E">' +
      '<button ' + N('discover') + ' class="hover:underline">Discover</button><span>/</span>' +
      '<button ' + N('thread', st.threadId) + ' class="hover:underline">' + E(t.title) + '</button><span>/</span>' +
      '<span style="color:#8C3211">' + E(wp.name) + '</span></div></div>' +

      '<div class="max-w-7xl mx-auto px-10 pb-20"><div class="grid grid-cols-12 gap-10 min-h-[calc(100vh-140px)]">' +

      /* LEFT — the single photograph */
      '<div class="col-span-6 flex flex-col gap-3">' +
      '<div class="relative rounded-2xl overflow-hidden flex-1 min-h-[400px]">' +
      media(photo, wp.name) +
      '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(18,33,30,0.3) 0%, transparent 50%);pointer-events:none"></div>' +
      '<div class="absolute top-4 left-4 flex gap-2">' +
      '<span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full" style="background-color:#A23B17;color:white">Waypoint ' + (idx + 1) + ' of ' + total + '</span>' +
      (wp.status === 'active'
        ? '<span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full" style="background-color:#013E37;color:white">● Active Challenge</span>'
        : '') + '</div>' +
      photoNote +
      '</div>' +

      '<div class="rounded-xl p-4 flex items-center gap-4" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
      '<div class="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style="background-color:rgba(214,103,43,0.1)">📍</div>' +
      '<div class="flex-1 min-w-0"><div class="text-sm font-body font-semibold truncate" style="color:#12211E">' +
      E(wp.location != null ? wp.location : t.city + ', Jordan') + '</div>' +
      '<div class="text-xs font-body" style="color:#55635E">' + E(wp.type) + '</div></div>' +
      mapsBtn +
      '</div></div>' +

      /* RIGHT — details & CTA */
      '<div class="col-span-6 flex flex-col"><div class="flex-1">' +
      '<div class="flex items-center gap-2 mb-4"><div class="w-2 h-2 rounded-full" style="background-color:#D6672B"></div>' +
      '<span class="text-xs font-body uppercase tracking-widest" style="color:#8C3211">' + E(t.title) + ' Thread</span></div>' +
      '<h1 class="font-display text-4xl font-semibold mb-2" style="color:#12211E">' + E(wp.name) + '</h1>' +
      /* font-light at 18px is not large text by the WCAG definition (that needs
         24px, or 18.66px bold), so the warm accent had to give way to the ink
         at 4.5:1. The dot above it stays accent-coloured: it is not text. */
      '<p class="font-display text-lg font-light mb-6" style="color:#8C3211">' + E(wp.type) + ' · ' + E(t.city) + '</p>' +

      '<div class="flex flex-wrap gap-2 mb-6">' + tags.map(function (g) {
        return '<span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium" style="background-color:rgba(214,103,43,0.08);color:#12211E;border:1px solid rgba(214,103,43,0.2)">' +
          '<span>' + g[2] + '</span><span style="color:#55635E">' + g[0] + ':</span><strong>' + E(g[1]) + '</strong></span>';
      }).join('') + '</div>' +

      '<div class="mb-6 pb-6" style="border-bottom:1px solid #E8E0D0">' +
      '<h3 class="font-body font-semibold text-sm uppercase tracking-wide mb-3" style="color:#55635E">The Story</h3>' +
      /* The notice is per-thread, so an ordinary thread renders nothing here and
         the living mystery is labelled as the frame it is. */
      (hero ? fictionNotice(t) : '') +
      '<p class="font-body text-sm leading-relaxed" style="color:#12211E">' + E(wp.desc) + '</p></div>' +

      '<div class="rounded-xl p-5 mb-6" style="background-color:rgba(1,62,55,0.06);border:1px solid rgba(1,62,55,0.2)">' +
      '<div class="flex items-center gap-2 mb-3"><span class="text-base">🎯</span>' +
      '<h3 class="font-body font-semibold text-sm" style="color:#12211E">Your Challenge</h3>' +
      '<span class="ml-auto text-xs font-body font-semibold px-2 py-0.5 rounded-full" style="background-color:#013E37;color:white">+' +
      (hero ? data.atharRewards.challenge + ' ATHAR' : wp.points + ' pts') + '</span></div>' +
      '<p class="text-sm font-body leading-relaxed" style="color:#12211E">' + E(wp.challenge) + '</p>' +
      '<div class="mt-3 flex gap-4 text-xs font-body" style="color:#55635E">' +
      '<span>🗺 Evidence required: Photo + Description</span><span>⏱ Estimated: 45 min</span></div></div>' +

      '<div class="rounded-xl p-4 mb-6" style="background-color:rgba(214,103,43,0.06);border:1px solid rgba(214,103,43,0.15)">' +
      '<p class="text-xs font-body leading-relaxed" style="color:#A23B17"><strong>Local Tip:</strong> ' + E(t.tip) + '</p></div>' +

      (next
        ? '<div class="flex items-center gap-3 mb-6 p-3 rounded-xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
          '<div class="text-lg">' + next.icon + '</div><div><p class="text-xs font-body" style="color:#55635E">Up next</p>' +
          '<p class="text-sm font-body font-semibold" style="color:#12211E">' + E(next.name) + '</p></div>' +
          '<div class="ml-auto text-xs font-body font-semibold" style="color:#013E37">' +
          (hero ? E(data.waypointStatus(t, next) === 'locked' ? 'sealed' : 'open') : '+' + next.points + ' pts') + '</div></div>'
        : '') +
      '</div>' +

      '<div class="sticky bottom-0 pt-4" style="border-top:1px solid #E8E0D0;background-color:#F9F7F3">' + qrCta +
      '<div class="flex items-center gap-2 mt-3">' +
      '<button ' + N('thread', st.threadId) + ' class="flex-1 py-2.5 rounded-full font-body font-medium text-sm" style="border:1px solid #E8E0D0;color:#12211E">← Back to Thread</button>' +
      /* Wishlist is a real local list, so this reflects and flips state. It is
         labelled as a thread, not a stop, because that is the granularity
         session.wishlist stores. */
      '<button data-act="wishlist" data-v="' + t.id + '" aria-pressed="' + (data.isWishlisted(t.id) ? 'true' : 'false') +
      '" class="flex-1 py-2.5 rounded-full font-body font-medium text-sm" style="border:1px solid #013E37;color:#013E37;background-color:' +
      (data.isWishlisted(t.id) ? 'rgba(1,62,55,0.08)' : 'transparent') + '">' +
      (data.isWishlisted(t.id) ? '✓ Saved to Wishlist' : 'Save to Wishlist') + '</button>' +
      '</div></div></div>' +

      '</div></div></div>';
  }

  /* ═════════════════════ THREADS LIBRARY ═════════════════════ */
  function discover() {
    return '<div style="background-color:#F9F7F3;min-height:100vh">' +
      '<div class="pt-24 pb-8 px-10 max-w-7xl mx-auto">' +
      NASEEJ.eyebrow({ color: '#8C3211', width: 'w-5', margin: 'mb-2', text: 'Thread Library' }) +
      '<div class="flex items-end justify-between"><h1 class="font-display text-4xl font-semibold" style="color:#12211E">Discover Threads</h1>' +
      '<p id="lib-count" class="font-body text-sm" style="color:#55635E"></p></div></div>' +

      '<div class="px-10 max-w-7xl mx-auto pb-20"><div class="grid grid-cols-12 gap-8">' +
      '<aside class="col-span-3"><div class="mb-6"><div class="relative">' +
      '<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style="color:#55635E" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>' +
      '<input id="lib-search" type="text" placeholder="Search threads..." class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-body outline-none" style="background-color:#FDFCFA;border:1px solid #E8E0D0;color:#12211E"></div></div>' +
      '<div class="p-5 rounded-2xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
      '<h3 class="font-body font-semibold text-sm mb-4 uppercase tracking-wide" style="color:#12211E">Category</h3>' +
      '<div id="lib-cats" class="flex flex-col gap-1.5"></div></div></aside>' +

      '<main class="col-span-9"><div id="lib-flex" class="flex gap-6 items-start">' +
      '<div id="lib-map" class="relative rounded-3xl overflow-hidden flex-shrink-0 transition-all duration-500" style="width:100%;background:#F4EFE6;border:1px solid #D8CDB8;box-shadow:0 6px 32px rgba(18,33,30,0.10)">' +
      '<img src="' + data.assets.jordanMap + '" alt="Jordan map" style="width:100%;display:block;opacity:0.92" draggable="false">' +
      '<svg id="lib-svg" viewBox="0 0 628 512" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%"></svg>' +
      '</div>' +
      '</div></main></div></div></div>';
  }

  function libCard(t) {
    const progress = data.getThreadProgress(t);
    const started = progress > 0;
    return '<div class="card-host group rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5" style="background-color:#FDFCFA;border:1px solid #E8E0D0;box-shadow:0 2px 12px rgba(18,33,30,0.05)">' +
      '<div class="relative overflow-hidden h-36">' +
      media(data.photoFor(t), t.title, 'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105') +
      '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(18,33,30,0.5) 0%, transparent 60%)"></div>' +
      '<div class="absolute top-3 left-3 flex gap-1.5">' +
      '<span class="text-xs font-body px-2 py-0.5 rounded-full font-medium" style="background-color:rgba(249,247,243,0.92);color:#8C3211">' + E(t.category) + '</span>' +
      '<span class="text-xs font-body px-2 py-0.5 rounded-full font-medium" style="background-color:rgba(18,33,30,0.72);color:rgba(255,255,255,0.9)">' +
      data.moodEmoji[t.mood] + ' ' + t.mood + '</span></div>' +
      '<div class="absolute top-3 right-3"><span class="text-xs font-body px-2 py-0.5 rounded-full font-semibold" style="background-color:rgba(249,247,243,0.92);color:' +
      (data.difficultyColor[t.difficulty] || '#013E37') + '">' + t.difficulty + '</span></div>' +
      (started ? '<div class="absolute bottom-0 left-0 right-0 h-0.5" style="background-color:rgba(1,62,55,0.3)">' +
        '<div class="h-full" style="width:' + progress + '%;background-color:#013E37"></div></div>' : '') +
      '</div>' +
      '<div class="p-4"><h3 class="font-display text-sm font-semibold mb-1" style="color:#12211E">' + E(t.title) + '</h3>' +
      '<p class="text-xs font-body mb-3 leading-relaxed" style="color:#4A5C58">' + E(t.hook) + '</p>' +
      '<div class="flex items-center gap-3 text-xs font-body mb-3" style="color:#55635E">' +
      '<span>⊕ ' + t.waypoints + ' stops</span><span>⏱ ' + t.duration + '</span>' +
      '<span class="ml-auto font-semibold" style="color:#013E37">+' + t.points + ' pts</span></div>' +
      '<div class="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style="background-color:#F4EFE6;border:1px solid #E0D5C2">' +
      '<div class="flex-1 min-w-0"><p class="text-xs font-body" style="color:#55635E">Start</p>' +
      '<p class="text-xs font-body font-medium truncate" style="color:#12211E">' + E(t.start) + '</p></div>' +
      '<div class="text-xs flex-shrink-0 px-1" style="color:#C9BDA8">→</div>' +
      '<div class="flex-1 min-w-0 text-right"><p class="text-xs font-body" style="color:#55635E">End</p>' +
      '<p class="text-xs font-body font-medium truncate" style="color:#12211E">' + E(t.end) + '</p></div></div>' +
      (started ? '<div class="mb-3"><div class="flex justify-between text-xs font-body mb-1" style="color:#55635E">' +
        '<span>Progress</span><span>' + progress + '%</span></div>' +
        '<div class="h-1.5 rounded-full" style="background-color:#E8E0D0">' +
        '<div class="h-full rounded-full" style="width:' + progress + '%;background-color:#013E37"></div></div></div>' : '') +
      '<button ' + N('thread', t.id) + ' class="card-link w-full py-2 rounded-full text-xs font-body font-semibold" style="' +
      (started ? 'background-color:#013E37;color:white' : 'background-color:transparent;color:#12211E;border:1px solid #E8E0D0') + '">' +
      (started ? 'Continue Thread →' : 'View Thread →') + '</button></div></div>';
  }

  /* Patches the regions of the library that depend on the filters, so the
     search input keeps focus and the card panel keeps its scroll position. */
  function updateLibrary() {
    const elCount = document.getElementById('lib-count');
    const elCats = document.getElementById('lib-cats');
    const map = document.getElementById('lib-map');
    const svg = document.getElementById('lib-svg');
    const flex = document.getElementById('lib-flex');
    if (!elCount || !elCats || !map || !svg || !flex) return;

    const ui = NASEEJ.ui;
    const sc = ui.city;
    /* One filter pass feeds the result count, every map pin and the panel. */
    const matching = data.filterLibrary({ search: ui.search, category: ui.category });
    const inCity = function (t) { return t.city === sc; };
    const countIn = function (cityId) {
      let total = 0;
      for (let i = 0; i < matching.length; i++) {
        if (matching[i].city === cityId) total++;
      }
      return total;
    };

    elCount.textContent = matching.length + ' threads found';

    elCats.innerHTML = data.categories.map(function (cat) {
      const on = ui.category === cat;
      const n = cat === 'All' ? data.totalLibraryThreads : (data.categoryCounts[cat] || 0);
      return '<button data-act="cat" data-v="' + E(cat) + '" class="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-body font-medium transition-all text-left" style="' +
        (on ? 'background-color:#A23B17;color:white' : 'color:#12211E') + '"><span>' + cat + '</span>' +
        '<span class="text-xs" style="color:' + (on ? 'rgba(255,255,255,0.9)' : '#55635E') + '">' + n + '</span></button>';
    }).join('');

    map.style.width = sc ? '52%' : '100%';

    const pins = data.cities.map(function (c) {
      const isSel = sc === c.id;
      const w = c.label.length * 6.2 + 10;
      const lx = c.x + 14; /* original maps every label to the right */
      const ly = c.y - 11 + c.labelDy;
      const cnt = countIn(c.id);
      /* role + tabindex because a <g> is not a button: without them a keyboard
         visitor tabs straight past the whole region map. aria-pressed carries
         the filter state, which the fill colour is otherwise the only signal
         for. The keydown listener in navigation.js turns Enter/Space into the
         click. */
      return '<g data-act="city" data-v="' + E(c.id) + '" tabindex="0" role="button" ' +
        'aria-label="' + E(c.label) + ', ' + countIn(c.id) + ' threads" ' +
        'aria-pressed="' + (isSel ? 'true' : 'false') + '" style="cursor:pointer">' +
        (isSel
          ? '<circle cx="' + c.x + '" cy="' + c.y + '" r="16" fill="#D6672B" opacity="0.15">' +
            '<animate attributeName="r" values="12;20;12" dur="1.8s" repeatCount="indefinite"/>' +
            '<animate attributeName="opacity" values="0.18;0.04;0.18" dur="1.8s" repeatCount="indefinite"/></circle>'
          : '') +
        '<rect x="' + lx + '" y="' + ly + '" width="' + w + '" height="15" rx="4" fill="rgba(253,252,250,0.94)" stroke="' +
        (isSel ? '#D6672B' : '#9C8F7A') + '" stroke-width="0.8"/>' +
        '<text x="' + (lx + w / 2) + '" y="' + (ly + 10) + '" text-anchor="middle" font-size="8" font-family="Tajawal, sans-serif" font-weight="' +
        (isSel ? '700' : '600') + '" fill="' + (isSel ? '#D6672B' : '#12211E') + '" letter-spacing="0.02em">' + E(c.label) + '</text>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="8" fill="' + (isSel ? '#D6672B' : '#013E37') + '"/>' +
        '<text x="' + c.x + '" y="' + (c.y + 3.5) + '" text-anchor="middle" font-size="7" font-family="Tajawal, sans-serif" font-weight="700" fill="white">' +
        cnt + '</text></g>';
    }).join('');

    svg.innerHTML =
      '<text x="22" y="32" font-size="14" font-family="Tajawal, sans-serif" font-weight="700" fill="#12211E" opacity="0.85">Jordan</text>' +
      '<text x="22" y="46" font-size="7.5" font-family="Tajawal, sans-serif" fill="#55635E" letter-spacing="0.1em">TAP A CITY TO EXPLORE</text>' +
      pins +
      '<g transform="translate(600,490)"><circle cx="0" cy="0" r="13" fill="rgba(253,252,250,0.92)" stroke="#9C8F7A" stroke-width="0.8"/>' +
      '<path d="M0,-10 L2.5,0 L0,3.5 L-2.5,0 Z" fill="#D6672B"/>' +
      '<path d="M0,10 L2.5,0 L0,3.5 L-2.5,0 Z" fill="#7C8A85"/>' +
      '<text x="0" y="-12" text-anchor="middle" font-size="6" font-family="Tajawal, sans-serif" font-weight="700" fill="#12211E">N</text></g>';

    /* "← All cities" is a conditional sibling of the map image, so it is
       (re)created as the map's last child rather than a wrapper element. */
    const stale = map.querySelector('[data-act="city"][data-v=""]');
    if (stale) map.removeChild(stale);
    if (sc) {
      const all = document.createElement('button');
      all.setAttribute('data-act', 'city');
      all.setAttribute('data-v', '');
      all.className = 'absolute top-4 right-4 text-xs font-body font-medium px-3 py-1.5 rounded-full';
      all.style.cssText = 'background-color:rgba(253,252,250,0.94);border:1px solid #D8CDB8;color:#8C3211';
      all.textContent = '\u2190 All cities';
      map.appendChild(all);
    }

    let panel = document.getElementById('lib-panel');
    if (!sc) {
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      return;
    }
    const fresh = !panel;
    if (fresh) {
      panel = document.createElement('div');
      panel.id = 'lib-panel';
      panel.className = 'flex-1 overflow-y-auto';
      panel.style.maxHeight = '660px';
      flex.appendChild(panel);
    }
    /* React keeps this scroll container mounted across filter changes, so the
       reading position survives; only a freshly mounted panel starts at top. */
    const keepScroll = fresh ? 0 : panel.scrollTop;
    const list = matching.filter(inCity);
    const city = data.getCity(sc);
    panel.innerHTML =
      '<div class="mb-5"><p class="text-xs font-body font-medium uppercase tracking-widest mb-1" style="color:#8C3211">' +
      E(city ? city.label : sc) + '</p>' +
      '<h2 class="font-display text-xl font-semibold" style="color:#12211E">' + list.length +
      ' Thread' + (list.length !== 1 ? 's' : '') + ' Available</h2></div>' +
      (list.length === 0
        ? '<div class="text-center py-12 rounded-2xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
          '<p class="font-body text-sm" style="color:#55635E">No threads match your current filters.</p>' +
          '<button data-act="clear" class="mt-3 text-xs font-body font-medium" style="color:#8C3211">Clear filters</button></div>'
        : '<div class="flex flex-col gap-4">' + list.map(libCard).join('') + '</div>');
    if (keepScroll) panel.scrollTop = keepScroll;
  }

  /* ═════════════════════ USER PROFILE ═════════════════════ */
  function profile() {
    const tab = NASEEJ.ui.tab || 'loom';
    const TP = session.points;
    const me = session.profile;
    const earned = session.badgesEarned;
    /* The one place a level is read. Every level figure on this page — the chip,
       the bar, the "to next level" line and the rewards panel — comes from
       here, so they cannot disagree with each other or with the balance. */
    const level = data.levelForWeaver();
    const tabs = [
      ['loom', 'The Loom (Badges)'],
      ['threads', 'My Threads'],
      ['rewards', 'Rewards & Discounts'],
    ];

    let body;
    if (tab === 'loom') {
      body = '<div class="py-10"><div class="flex items-center justify-between mb-6"><div>' +
        '<h2 class="font-display text-2xl font-semibold" style="color:#12211E">The Loom</h2>' +
        '<p class="text-sm font-body mt-1" style="color:#55635E">' + earned + ' of ' + session.badges.length +
        ' badges earned · ' + (session.badges.length - earned) + ' remaining to complete your tapestry</p></div></div>' +
        '<div class="grid grid-cols-4 gap-5">' + session.badges.map(function (b) {
          let rarity = '';
          if (b.earned && b.rarity === 'Epic') {
            rarity = '<div class="absolute top-2 right-2"><span class="text-xs font-body px-1.5 py-0.5 rounded-full font-semibold" style="background-color:rgba(1,62,55,0.12);color:#013E37">' + E(b.rarity) + '</span></div>';
          } else if (b.earned && b.rarity === 'Legendary') {
            rarity = '<div class="absolute top-2 right-2"><span class="text-xs font-body px-1.5 py-0.5 rounded-full font-semibold" style="background-color:rgba(214,103,43,0.14);color:#8C3211">' + E(b.rarity) + '</span></div>';
          }
          /* Every badge field goes through E(). The values are local constants
             today, but they are content, and the panel that will eventually
             write them to Firestore must not be the thing that introduces the
             injection. Escaping at the point of interpolation is the only place
             that stays correct as the source changes. */
          return '<div class="relative rounded-2xl p-5 text-center transition-all ' + (b.earned ? 'hover:-translate-y-1' : '') +
            '" style="background-color:' + (b.earned ? '#FDFCFA' : 'rgba(249,247,243,0.5)') + ';border:' +
            (b.earned ? '1px solid #E8E0D0' : '1px dashed #C9BDA8') + ';filter:' + (b.earned ? 'none' : 'grayscale(0.3)') +
            ';opacity:' + (b.earned ? 1 : 0.85) + '">' + rarity +
            '<div class="mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center text-3xl ' + (b.earned ? 'badge-glow' : '') +
            '" style="background-color:' + (b.earned ? 'rgba(1,62,55,0.1)' : 'rgba(200,190,175,0.3)') + ';border:' +
            (b.earned ? '2px solid rgba(1,62,55,0.3)' : '2px dashed #C9BDA8') + '">' + (b.earned ? E(b.icon) : '🔒') + '</div>' +
            '<h3 class="font-display text-sm font-semibold mb-1" style="color:' + (b.earned ? '#12211E' : '#4A5C58') + '">' + E(b.name) + '</h3>' +
            '<p class="text-xs font-body leading-snug" style="color:#55635E">' + E(b.desc) + '</p>' +
            (b.earned && b.date ? '<div class="mt-3 text-xs font-body" style="color:#013E37">Earned ' + E(b.date) + '</div>' : '') +
            (!b.earned ? '<div class="mt-3 text-xs font-body" style="color:#4A5C58">Not yet earned</div>' : '') +
            '</div>';
        }).join('') + '</div></div>';
    } else if (tab === 'threads') {
      body = '<div class="py-10">' +
        '<h2 class="font-display text-xl font-semibold mb-4" style="color:#12211E">In Progress</h2>' +
        '<div class="grid grid-cols-3 gap-5 mb-10">' + session.activeThreads.map(function (t) {
          return '<div class="card-host rounded-2xl overflow-hidden hover:-translate-y-1 transition-all" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
      '<div class="relative h-36 overflow-hidden">' + media(data.photoFor(t), t.title) +
            '<div class="absolute bottom-0 left-0 right-0 h-1" style="background-color:rgba(249,247,243,0.3)">' +
            '<div class="h-full progress-bar" style="width:' + t.progress + '%"></div></div>' +
            '<span class="absolute top-2 left-2 text-xs font-body px-2 py-0.5 rounded-full font-semibold animate-pulse" style="background-color:#A23B17;color:white">● Active</span></div>' +
            '<div class="p-4"><h3 class="font-display text-sm font-semibold mb-1" style="color:#12211E">' + E(t.title) + '</h3>' +
            '<p class="text-xs font-body mb-3" style="color:#55635E">Next: ' + E(t.nextWaypoint) + '</p>' +
            (t.branch
              ? '<div class="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg" style="background-color:rgba(214,103,43,0.1);border:1px solid rgba(214,103,43,0.25)">' +
                '<span class="text-xs">🧭</span><span class="text-xs font-body font-medium" style="color:#A23B17">Path: ' + E(t.branch) + '</span></div>'
              : '') +
            '<div class="flex justify-between text-xs font-body mb-2" style="color:#55635E"><span>Progress</span><span>' + t.progress + '%</span></div>' +
            '<div class="h-1.5 rounded-full" style="background-color:#E8E0D0">' +
            '<div class="h-full rounded-full progress-bar" style="width:' + t.progress + '%"></div></div></div>' +
            /* The card's one control: "Next: <place>" above says where they are,
               this is what they press to get there. Without it the whole card
               was a div a mouse could click and a keyboard could not reach. */
            '<button ' + N('thread', t.id) + ' class="card-link w-full mt-3 py-2 rounded-full text-xs font-body font-semibold" style="background-color:#013E37;color:white">Continue →</button></div></div>';
        }).join('') +
        '<div class="card-host rounded-2xl flex flex-col items-center justify-center transition-all hover:-translate-y-1" style="border:2px dashed #C9BDA8;min-height:200px">' +
        '<div class="text-3xl mb-2">🧵</div><span class="text-sm font-body font-medium" style="color:#55635E">Start New Thread</span>' +
        '<button ' + N('discover') + ' class="card-link absolute inset-0" aria-label="Start a new thread"><span class="sr-only">Start a new thread</span></button></div></div>' +

        '<h2 class="font-display text-xl font-semibold mb-4" style="color:#12211E">Completed</h2>' +
        '<div class="grid grid-cols-3 gap-5">' + session.completedThreads.map(function (t) {
          return '<div class="card-host rounded-2xl overflow-hidden hover:-translate-y-1 transition-all" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
      '<div class="relative h-36 overflow-hidden">' + media(data.photoFor(t), t.title) +
            '<div class="absolute inset-0 flex items-center justify-center" style="background-color:rgba(1,62,55,0.2)">' +
            '<div class="w-12 h-12 rounded-full flex items-center justify-center text-xl" style="background-color:#013E37">✓</div></div></div>' +
            '<div class="p-4"><h3 class="font-display text-sm font-semibold mb-1" style="color:#12211E">' + E(t.title) + '</h3>' +
            /* The path a weaver chose is part of what they finished, so it stays
               on the card after the thread leaves "In Progress". */
            (t.branch
              ? '<div class="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg" style="background-color:rgba(214,103,43,0.1);border:1px solid rgba(214,103,43,0.25)">' +
                '<span class="text-xs">🧭</span><span class="text-xs font-body font-medium" style="color:#A23B17">Path: ' + E(t.branch) + '</span></div>'
              : '') +
            '<div class="flex items-center justify-between text-xs font-body" style="color:#55635E">' +
            '<span>⊕ ' + t.waypoints + ' waypoints</span>' +
            '<span class="font-semibold" style="color:#013E37">' +
            (t.branch ? '+' + t.pointsEarned + ' ATHAR' : '+' + t.pointsEarned + ' pts') + '</span></div>' +
            '<div class="text-xs font-body mt-2" style="color:#C9BDA8">Completed ' + t.completedDate + '</div>' +
            '<button ' + N('thread', t.id) + ' class="card-link w-full mt-3 py-2 rounded-full text-xs font-body font-semibold" style="background-color:#F9F7F3;color:#12211E;border:1px solid #E8E0D0">View Thread →</button></div></div>';
        }).join('') + '</div></div>';
    } else {
      /* ── Rewards ──────────────────────────────────────────────────────────
         This tab used to print a "Redeem" button that did nothing at all, and
         the whole panel implied live partner offers. It now says what it is: a
         demo catalogue. Redeeming really does spend ATHAR out of the one
         balance and really is recorded, so it cannot be claimed twice — but
         nothing is sent to a partner, and the panel says so above the list
         rather than only in a disclaimer nobody reads. */
      const claimed = session.redemptions || {};
      body = '<div class="py-10">' +
        '<div class="flex items-center justify-between mb-2 flex-wrap gap-4"><div>' +
        '<h2 class="font-display text-2xl font-semibold" style="color:#12211E">Demo Rewards Catalogue</h2>' +
        '<p class="text-sm font-body mt-1" style="color:#4A5C58">Spend your ' + TP + ' ATHAR with local Jordan partners</p></div>' +
        '<div class="flex items-center gap-2 px-4 py-2 rounded-full" style="background-color:rgba(1,62,55,0.08);border:1px solid rgba(1,62,55,0.2)">' +
        '<span class="font-display text-lg font-semibold" style="color:#013E37">' + TP + '</span>' +
        '<span class="text-sm font-body" style="color:#046852">ATHAR available</span></div></div>' +

        '<div class="flex items-start gap-2 mb-6 px-4 py-3 rounded-xl" style="background-color:rgba(164,59,23,0.06);border:1px solid rgba(164,59,23,0.2)">' +
        '<span aria-hidden="true">⚠️</span><p class="text-xs font-body leading-relaxed" style="color:#8C3211">' +
        '<strong>Demo catalogue.</strong> These partners are not connected yet. Redeeming spends your ATHAR on this device only — ' +
        'no code, voucher or partner confirmation is issued, and no one is contacted.' +
        '</p></div>' +

        '<div class="grid grid-cols-2 gap-5">' + session.rewards.map(function (r) {
          const isClaimed = !!claimed[r.id];
          const affordable = TP >= r.points;
          const missing = r.points - TP;
          const state = isClaimed ? 'claimed' : affordable ? 'ready' : 'short';
          const label = isClaimed ? 'Redeemed' : affordable ? 'Redeem ' + r.points : 'Need ' + missing + ' more';
          /* One honest state per card: claimable, already claimed, or short of
             the cost. There is no button that looks live and does nothing. */
          const style = state === 'ready'
            ? 'background-color:#013E37;color:white'
            : state === 'claimed'
              ? 'background-color:rgba(1,62,55,0.08);color:#013E37;border:1px solid rgba(1,62,55,0.25)'
              : 'background-color:#F1EDE4;color:#4A5C58;border:1px solid #E0D5C2;cursor:not-allowed';
          const attr = state === 'ready' ? 'data-act="redeem" data-v="' + E(r.id) + '"' : 'disabled aria-disabled="true"';
          return '<div class="flex gap-4 p-5 rounded-2xl transition-all hover:-translate-y-0.5" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
            '<div class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style="background-color:rgba(214,103,43,0.08)">' + r.logo + '</div>' +
            '<div class="flex-1"><div class="flex items-start justify-between mb-1 gap-2">' +
            '<h3 class="font-body font-semibold text-sm" style="color:#12211E">' + E(r.name) + '</h3>' +
            '<span class="text-xs font-body px-2 py-0.5 rounded-full flex-shrink-0" style="background-color:rgba(214,103,43,0.1);color:#A23B17">' + E(r.type) + '</span></div>' +
            '<p class="font-display text-base font-semibold mb-2" style="color:#046852">' + E(r.discount) + '</p>' +
            '<div class="flex items-center justify-between gap-2">' +
            '<span class="text-xs font-body" style="color:#4A5C58">' + r.points + ' ATHAR' + (state === 'short' ? ' · ' + missing + ' to go' : '') + '</span>' +
            '<button ' + attr + ' class="text-xs font-body font-semibold px-3 py-1.5 rounded-full transition-all" style="' + style + '">' +
            label + '</button></div></div></div>';
        }).join('') + '</div>' +

        '<div class="mt-8 p-6 rounded-2xl" style="background:linear-gradient(135deg, #013E37, #046852);border:1px solid rgba(214,103,43,0.2)">' +
        '<div class="flex items-center justify-between flex-wrap gap-4"><div>' +
        '<h3 class="font-display text-lg font-semibold mb-1" style="color:#F9F7F3">Become a ' + E(level.nextName || 'Master Weaver') + '</h3>' +
        '<p class="text-sm font-body" style="color:rgba(249,247,243,0.82)">' +
        (level.isMax
          ? 'You have reached the highest level in this build.'
          : 'Earn ' + level.pointsToNext + ' more ATHAR to reach ' + E(level.nextName) + '.') +
        '</p></div>' +
        '<button ' + N('discover') + ' class="px-5 py-2.5 rounded-full text-sm font-body font-semibold whitespace-nowrap" style="background-color:#A23B17;color:white">Earn More ATHAR →</button>' +
        '</div></div></div>';
    }

    /* The stat labels were rgba(249,247,243,0.5) on the teal gradient — 2.78:1.
       0.5 alpha is a common way to make a dark panel look quieter and it costs
       more than it looks like it does. */
    const stat = function (v, l) {
      return '<div class="text-center"><div class="font-display text-xl font-semibold" style="color:#EDB99E">' + v + '</div>' +
        '<div class="text-xs font-body" style="color:rgba(249,247,243,0.8)">' + l + '</div></div>';
    };
    const sep = '<div class="w-px h-8" style="background-color:rgba(249,247,243,0.15)"></div>';

    return '<div><div class="pt-20">' +
      '<div class="px-10 py-10" style="background:linear-gradient(135deg, #013E37 0%, #046852 100%)"><div class="max-w-7xl mx-auto">' +
      '<div class="grid grid-cols-12 gap-6 items-center">' +
      '<div class="col-span-8 flex items-center gap-6"><div class="relative flex-shrink-0">' +
      /* No photo means the monogram, not a broken image: a signed-out demo
         weaver has no avatar, and an <img src=""> would render as a torn page. */
      (me.avatarUrl
        ? '<div class="w-20 h-20 rounded-full overflow-hidden" style="border:3px solid #D6672B">' +
          '<img src="' + E(me.avatarUrl) + '" alt="" class="w-full h-full object-cover"></div>'
        : '<div class="w-20 h-20 rounded-full flex items-center justify-center font-display text-2xl font-semibold" ' +
          'style="border:3px solid #D6672B;background-color:rgba(249,247,243,0.1);color:#EDB99E" aria-hidden="true">' +
          E(String(me.displayName || 'D').charAt(0).toUpperCase()) + '</div>') +
      (me.verified
        ? '<div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs" style="background-color:#046852;border:2px solid #013E37" title="Google account verified">✓</div>'
        : '') + '</div>' +
      '<div><div class="row-wrap flex items-center gap-2 mb-1">' +
      '<h1 class="font-display text-2xl font-semibold" style="color:#F9F7F3">' + E(me.displayName) + '</h1>' +
      /* Level is computed from the balance, so it is always the level the
         weaver is actually on. The old chip printed a hard-coded string that
         did not move when the mystery paid out. */
      '<span class="text-xs font-body px-2 py-0.5 rounded-full font-semibold" style="background-color:#A23B17;color:white">' + E(level.name) + '</span></div>' +
      /* A demo weaver has no join date and no home city. Printing invented ones
         is what made this look like a registered account, so the line is only
         rendered when there is something true to put in it. */
      (me.memberSince || me.city
        ? '<p class="text-sm font-body" style="color:rgba(249,247,243,0.82)">' +
          (me.memberSince ? 'Weaving since ' + E(me.memberSince) : '') +
          (me.memberSince && me.city ? ' · ' : '') + (me.city ? E(me.city) : '') + '</p>'
        : '<p class="text-sm font-body" style="color:rgba(249,247,243,0.82)">Demo weaver — sign in to keep your progress on your account</p>') +
      '<div class="row-wrap flex items-center gap-4 mt-3">' +
      stat(TP, 'ATHAR') + sep + stat(session.threadsCompleted, 'Threads Done') + sep +
      stat(earned, 'Badges Earned') + sep + stat(session.waypointsVisited, 'Waypoints') +
      '</div></div></div>' +

      '<div class="col-span-4"><div class="p-5 rounded-2xl" style="background-color:rgba(249,247,243,0.08);border:1px solid rgba(249,247,243,0.16)">' +
      '<div class="text-xs font-body uppercase tracking-widest mb-2" style="color:rgba(249,247,243,0.9)">ATHAR Balance</div>' +
      '<div class="font-display text-4xl font-semibold mb-2" style="color:#EDB99E">' + TP + '</div>' +
      '<div class="h-2 rounded-full mb-3" style="background-color:rgba(249,247,243,0.14)" role="progressbar" ' +
      'aria-valuenow="' + level.percent + '" aria-valuemin="0" aria-valuemax="100" ' +
      'aria-label="Progress to ' + E(level.nextName || 'the highest level') + '">' +
      '<div class="h-full rounded-full" style="width:' + level.percent + '%;background:linear-gradient(90deg, #D6672B, #EDB99E)"></div></div>' +
      '<p class="text-xs font-body mb-3" style="color:rgba(249,247,243,0.9)">' +
      (level.isMax
        ? 'Highest level reached'
        /* The level name took cream rather than the warm tint: #EDB99E is 3.87:1
           on this panel and this is 12px. The number above it stays warm, where
           it is 20px bold and clears the 3:1 bar comfortably. */
        : level.pointsToNext + ' ATHAR to <strong style="color:#F9F7F3">' + E(level.nextName) + '</strong>') + '</p>' +
      '<button data-act="tab" data-v="rewards" class="w-full py-2 rounded-full text-xs font-body font-semibold" style="background-color:#A23B17;color:white">Spend ATHAR →</button>' +
      '</div></div></div></div></div>' +

      '<div class="px-10 max-w-7xl mx-auto">' +
      '<div class="tab-row flex gap-0 mt-0" style="border-bottom:1px solid #E8E0D0">' + tabs.map(function (t) {
        /* tab-row: a three-tab strip that is wider than a 320px screen at
           px-6 each. It scrolls horizontally rather than wrapping, which is
           the standard pattern for a tab strip and keeps the underline
           indicator attached to the active tab. */
        return '<button data-act="tab" data-v="' + t[0] + '" class="tab-row-item px-6 py-4 text-sm font-body font-medium transition-all" style="' +
          /* The underline stays the warm accent — it is a 2px rule, not text —
             while the label itself takes the ink, because 14px terracotta on
             cream is 3.5:1 and a tab label is not large text. */
          (tab === t[0] ? 'color:#8C3211;border-bottom:2px solid #D6672B;margin-bottom:-1px' : 'color:#55635E') + '">' + t[1] + '</button>';
      }).join('') + '</div>' + body + '</div></div></div>';
  }

  NASEEJ.pages = {
    home: home,
    discover: discover,
    thread: thread,
    place: place,
    profile: profile,
  };
  NASEEJ.updateLibrary = updateLibrary;

  /* ── Actions (was the switch in navigation.js) ───────────────────────────────
     Registered by data-act value; the delegated click listener in
     navigation.js only dispatches. Each one owns the state it changes. */
  NASEEJ.actions = {
    node: function (value) {
      NASEEJ.ui.activeNode = +value;
      NASEEJ.paint();
    },
    qr: function () {
      NASEEJ.ui.challengeOpen = true;
      NASEEJ.ui.qr = buildChallengeMatrix();
      NASEEJ.paint();
    },
    tab: function (value) {
      NASEEJ.ui.tab = value;
      NASEEJ.paint();
    },
    cat: function (value) {
      NASEEJ.ui.category = value;
      updateLibrary();
    },
    clear: function () {
      NASEEJ.ui.category = 'All';
      updateLibrary();
    },
    city: function (value) {
      /* Clicking the selected city (or "← All cities") clears the filter. */
      NASEEJ.ui.city = value === '' || NASEEJ.ui.city === value ? null : value;
      updateLibrary();
    },

    /* ── Share ────────────────────────────────────────────────────────────────
       Real on a phone, real on a desktop, and never a silent no-op. The old
       button had no handler at all. The URL is assembled here rather than in
       data.js so the data layer stays free of `location`, which is what lets it
       be exercised in Node. */
    share: function (value) {
      const payload = data.sharePayload(data.getThread(+value));
      if (!payload) return;
      const url = new URL(payload.hash, window.location.href).href;
      const done = function () { flash('Link copied'); };
      const fail = function () { flash('Copy failed — the link is in the address bar'); };

      if (navigator.share) {
        navigator.share({ title: payload.title, text: payload.text, url: url })
          .then(done)
          .catch(function (err) {
            /* A dismissed share sheet is not an error worth reporting. */
            if (err && err.name === 'AbortError') return;
            clipboardCopy(url).then(done, fail);
          });
        return;
      }
      clipboardCopy(url).then(done, fail);
    },

    /* Wishlist. The list is a real local store, so the button flips. */
    wishlist: function (value) {
      const on = data.toggleWishlist(+value);
      flash(on ? 'Saved to wishlist' : 'Removed from wishlist');
      NASEEJ.paint();
    },

    /* KHAYT's nudge. Page-local, like the pick and the verdict: it is a nudge
       for the current moment, not durable state, and the challenge stays
       answerable without it. */
    khaytHint: function () {
      const t = data.getThread(data.heroThreadId);
      const wp = data.getWaypoint(t, NASEEJ.state.waypointId);
      NASEEJ.ui.heroHint = data.khaytAI.getHint(data.khaytContext(t, wp));
      NASEEJ.paint();
    },

    /* Demo redemption. There is no partner backend in this build, so this
       spends a real local balance and records a real local claim — it does not
       pretend a partner confirmed anything. The rewards card says so.

       The id is passed through uncoerced: reward ids are slugs like
       'ajloun-soap', and +value turned them into NaN, so the lookup missed and
       the button did nothing at all. */
    redeem: function (value) {
      const result = data.redeemReward(value);
      flash(
        result.ok
          ? 'Redeemed ' + result.reward.name + ' — demo only, no partner contacted'
          : result.reason
      );
      NASEEJ.paint();
    },

    /* ── Living mystery ───────────────────────────────────────────────────────
       Page-local only: which option is ticked, and what the last validated
       answer came back as. Nothing durable lives here — the waypoint, the
       clue, the branch, the reveal and the ATHAR are all in data.js, which is
       what makes a refresh mid-thread safe. */

    heroPick: function (value) {
      NASEEJ.ui.heroPick = value;
      /* A new pick invalidates the previous verdict; keeping a "wrong" banner
         over a different selection would be a lie about the current answer. */
      NASEEJ.ui.heroResult = null;
      NASEEJ.paint();
    },

    heroValidate: function () {
      const t = getThread();
      if (!isHero(t) || NASEEJ.ui.heroPick == null) return;
      const wp = data.getWaypoint(t, st.waypointId);
      if (!wp) return;
      /* data.js owns the question, the answer key, the reward table and the
         dedup ledger. This action only forwards the choice and repaints. */
      const result = wp.interaction === 'observation'
        ? data.observeHeroWaypoint(data.heroThreadId, wp.id, NASEEJ.ui.heroPick)
        : data.answerHeroChallenge(data.heroThreadId, wp.id, NASEEJ.ui.heroPick);
      NASEEJ.ui.heroResult = result;
      if (result.status === 'invalid' || result.status === 'locked') return;
      if (result.correct) NASEEJ.ui.heroPick = null;
      NASEEJ.paint();
    },

    heroBranch: function (value) {
      const t = getThread();
      if (!isHero(t)) return;
      const result = data.setHeroBranch(data.heroThreadId, value);
      if (result.status === 'ok') {
        /* The choice pays a clue and a chapter, so its result is kept: the panel
           prints the reaction and the chips rather than the weaver watching the
           balance move with no explanation. */
        NASEEJ.ui.heroResult = result;
        NASEEJ.ui.activeNode = null;
      }
      NASEEJ.paint();
    },
  };
})(window.NASEEJ || (window.NASEEJ = {}));
