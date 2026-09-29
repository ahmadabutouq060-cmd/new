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

  /* Place pages show one photo with four Unsplash transformations of it. */
  const GALLERY_SIZE = 4;

  /* Thread lookup with the original's fallback to thread 7. */
  function getThread() {
    return data.getThread(st.threadId);
  }

  function selectWaypoint(waypoints, waypointId) {
    if (waypointId != null) {
      for (let i = 0; i < waypoints.length; i++) {
        if (waypoints[i].id === waypointId) return waypoints[i];
      }
    }
    return data.getActiveWaypoint({ waypoints: waypoints }) || waypoints[0];
  }

  /* ═════════════════════ LANDING PAGE ═════════════════════ */
  function home() {
    const steps = [
      ['01', 'Choose a Thread', "Pick a curated narrative path across Jordan's regions and cultures."],
      ['02', 'Visit Waypoints', 'Follow the story to physical locations and scan QR codes to unlock challenges.'],
      ['03', 'Complete Challenges', 'Engage with local history, nature, or culture at each stop.'],
      ['04', 'Earn Your Badge', 'Collect achievement badges and redeem points with local community partners.'],
    ];
    const dots = [[40, 240], [140, 140], [240, 40], [80, 180], [200, 100]].map(function (pt) {
      return '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="5" fill="#EDB99E" opacity="0.8"/>';
    }).join('');

    return '<div>' +
      /* Hero */
      '<section class="relative h-screen min-h-[700px] overflow-hidden">' +
      '<img src="' + data.assets.petraHero + '" alt="Petra Treasury, Jordan" class="absolute inset-0 w-full h-full object-cover">' +
      '<div class="absolute inset-0" style="background:linear-gradient(120deg, rgba(44,36,23,0.75) 40%, rgba(44,36,23,0.2) 100%)"></div>' +
      '<div class="relative h-full flex items-center"><div class="max-w-7xl mx-auto px-10 w-full grid grid-cols-12 gap-6">' +
      '<div class="col-span-7 flex flex-col justify-center pt-20">' +
      NASEEJ.eyebrow({ color: '#EDB99E', width: 'w-6', margin: 'mb-6', text: 'Jordan Gamified' }) +
      '<h1 class="font-display text-6xl xl:text-7xl font-semibold leading-tight mb-6" style="color:#F9F7F3">Weave Your<br>' +
      '<em class="not-italic" style="color:#EDB99E">Jordanian</em><br>Story</h1>' +
      "<p class=\"font-body text-lg mb-10 max-w-lg leading-relaxed\" style=\"color:rgba(249,247,243,0.75)\">Follow curated narrative paths through Jordan's landscapes, histories, and living cultures. Collect waypoints, earn rewards, and leave your thread in the national tapestry.</p>" +
      '<div class="flex items-center gap-4">' +
      '<button ' + N('discover') + ' class="px-8 py-4 rounded-full font-body font-semibold text-base transition-all hover:scale-105" style="background-color:#6B8E23;color:white;box-shadow:0 8px 24px rgba(107,142,35,0.35)">Start Your Journey</button>' +
      '<button ' + N('thread') + ' class="px-8 py-4 rounded-full font-body font-medium text-base transition-all" style="color:#F9F7F3;border:1px solid rgba(249,247,243,0.4)">View Threads →</button>' +
      '</div>' +
      '<div class="flex items-center gap-10 mt-16 pt-8" style="border-top:1px solid rgba(249,247,243,0.15)">' + data.landingStats.map(function (s) {
        return '<div><div class="font-display text-2xl font-semibold" style="color:#EDB99E">' + s.value + '</div>' +
          '<div class="text-xs font-body" style="color:rgba(249,247,243,0.55)">' + s.label + '</div></div>';
      }).join('') + '</div></div>' +
      '<div class="col-span-5 flex items-center justify-end pt-20"><div class="relative w-72 h-72 opacity-60">' +
      '<svg viewBox="0 0 280 280" class="w-full h-full">' +
      '<path d="M40 240 Q80 180 140 140 Q200 100 240 40" stroke="#EDB99E" stroke-width="1.5" fill="none" stroke-dasharray="6 3" opacity="0.6"/>' +
      '<path d="M20 160 Q80 140 140 100 Q200 60 260 80" stroke="#EDB99E" stroke-width="1" fill="none" stroke-dasharray="4 4" opacity="0.4"/>' +
      dots + '</svg></div></div>' +
      '</div></div>' +
      '<div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style="color:rgba(249,247,243,0.4)">' +
      '<span class="text-xs tracking-widest uppercase font-body">Scroll</span>' +
      '<div class="w-px h-8" style="background:linear-gradient(to bottom, rgba(249,247,243,0.4), transparent)"></div></div>' +
      '</section>' +

      /* Featured threads */
      '<section class="py-24 px-10 max-w-7xl mx-auto"><div class="grid grid-cols-12 gap-6 mb-14">' +
      '<div class="col-span-6">' +
      NASEEJ.eyebrow({ color: '#D98A6C', width: 'w-5', text: 'Popular Threads' }) +
      '<h2 class="font-display text-4xl font-semibold" style="color:#2C2417">Begin with a Thread</h2></div>' +
      '<div class="col-span-6 flex items-end justify-end">' +
      '<button ' + N('discover') + ' class="text-sm font-body font-medium underline underline-offset-4" style="color:#D98A6C">View all 47 threads →</button></div>' +
      '</div><div class="grid grid-cols-3 gap-6">' + data.featuredThreads.map(function (t) {
        return '<div ' + N('thread') + ' class="group rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1" style="background-color:#FDFCFA;border:1px solid #E8E0D0;box-shadow:0 2px 12px rgba(44,36,23,0.06)">' +
          '<div class="relative overflow-hidden h-48">' +
          '<img src="' + t.image + '" alt="' + E(t.title) + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">' +
          '<div class="absolute top-3 left-3"><span class="text-xs font-body font-medium px-2.5 py-1 rounded-full" style="background-color:rgba(249,247,243,0.92);color:#D98A6C">' + t.category + '</span></div>' +
          '<div class="absolute bottom-0 left-0 right-0 h-16" style="background:linear-gradient(to top, rgba(44,36,23,0.5), transparent)"></div></div>' +
          '<div class="p-5"><h3 class="font-display text-lg font-semibold mb-1" style="color:#2C2417">' + E(t.title) + '</h3>' +
          '<p class="text-sm font-body mb-4" style="color:#8A7B6B">' + E(t.subtitle) + '</p>' +
          '<div class="flex items-center justify-between text-xs font-body mb-4" style="color:#8A7B6B">' +
          '<span>⊕ ' + t.waypoints + ' waypoints</span><span>⏱ ' + t.duration + '</span><span>◈ ' + t.travelers + ' weavers</span></div>' +
          '<button class="w-full py-2.5 rounded-full text-sm font-body font-medium transition-all" style="background-color:#F9F7F3;color:#2C2417;border:1px solid #E8E0D0">Begin Thread →</button>' +
          '</div></div>';
      }).join('') + '</div></section>' +

      /* How it works */
      '<section class="py-20 px-10" style="background-color:#2C2417"><div class="max-w-7xl mx-auto">' +
      '<div class="text-center mb-16">' +
      NASEEJ.eyebrow({ color: '#EDB99E', width: 'w-5', text: 'The Process', trailingRule: true }) +
      '<h2 class="font-display text-4xl font-semibold" style="color:#F9F7F3">How the Loom Works</h2></div>' +
      '<div class="grid grid-cols-4 gap-8">' + steps.map(function (s) {
        return '<div class="text-center"><div class="font-display text-5xl font-semibold mb-4" style="color:#D98A6C;opacity:0.5">' + s[0] + '</div>' +
          '<h3 class="font-display text-xl font-semibold mb-3" style="color:#F9F7F3">' + s[1] + '</h3>' +
          '<p class="text-sm font-body leading-relaxed" style="color:rgba(249,247,243,0.55)">' + s[2] + '</p></div>';
      }).join('') + '</div></div></section>' +

      /* CTA */
      '<section class="py-24 px-10 max-w-7xl mx-auto text-center">' +
      "<h2 class=\"font-display text-5xl font-semibold mb-4\" style=\"color:#2C2417\">Ready to add your thread<br>to Jordan's tapestry?</h2>" +
      '<p class="font-body text-lg mb-8 max-w-lg mx-auto" style="color:#8A7B6B">Join 12,000+ weavers exploring Jordan\'s hidden stories, one waypoint at a time.</p>' +
      '<button ' + N('discover') + ' class="px-10 py-4 rounded-full font-body font-semibold text-base transition-all hover:scale-105" style="background-color:#6B8E23;color:white;box-shadow:0 8px 24px rgba(107,142,35,0.3)">Start Weaving — It\'s Free</button>' +
      '</section>' +

      /* Footer */
      '<footer class="py-10 px-10" style="border-top:1px solid #E8E0D0"><div class="max-w-7xl mx-auto flex items-center justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<img src="' + data.assets.logoIcon + '" alt="Naseej emblem" style="width:32px;height:28px;object-fit:contain">' +
      '<img src="' + data.assets.logoText + '" alt="Naseej" style="width:60px;height:28px;object-fit:contain"></div>' +
      '<p class="text-xs font-body" style="color:#8A7B6B">© 2026 Naseej — Weaving Jordan\'s Stories Together</p></div></footer>' +
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
    if (wp.status === 'completed') return ['#6B8E23', '#4A6318'];
    if (wp.status === 'active') return ['#F9F7F3', '#D98A6C'];
    return ['#E8E0D0', '#C9BDA8'];
  }

  function activeNodeButton(wps) {
    const a = data.getActiveWaypoint({ waypoints: wps });
    /* original: the button always renders, it only navigates when an
       active waypoint exists */
    return '<button ' + (a ? N('place', st.threadId, a.id) : '') +
      ' class="px-5 py-2 rounded-full text-sm font-body font-semibold" style="background-color:#6B8E23;color:white">Go to Active Node →</button>';
  }

  function thread() {
    const t = getThread();
    const wps = t.waypoints || [];

    if (wps.length === 0) {
      return '<div class="pt-20 px-10" style="border-bottom:1px solid #E8E0D0"><div class="max-w-7xl mx-auto py-6">' +
        '<h1 class="font-display text-3xl font-semibold" style="color:#2C2417">' + E(t.title) + '</h1>' +
        '<p class="font-body text-sm mt-1" style="color:#8A7B6B">This thread has no waypoints yet.</p>' +
        '</div></div>';
    }

    /* Selection is read, not seeded: until a node is clicked the active
       waypoint is shown, which is what the original's first-render write did. */
    const activeWp = data.getActiveWaypoint(t);
    const sel = selectWaypoint(wps, NASEEJ.ui.activeNode) || activeWp;
    const done = data.getCompletedCount(t);
    const progress = data.getThreadProgress(t);
    const n = wps.length;
    const pos = nodePaths[n] || nodePaths[5];
    const ps = svgPaths[n] || svgPaths[5];

    const nodes = wps.map(function (wp, i) {
      const p = pos[i] || [60 + i * 100, 130];
      const x = p[0], y = p[1], s = nodeStyle(wp);
      const isActive = wp.status === 'active';
      const isSelected = wp.id === NASEEJ.ui.activeNode;
      return '<g data-act="node" data-v="' + wp.id + '" style="cursor:pointer">' +
        (isActive ? '<circle cx="' + x + '" cy="' + y + '" r="30" fill="rgba(217,138,108,0.15)"/>' : '') +
        '<circle cx="' + x + '" cy="' + y + '" r="22" fill="' + s[0] + '" stroke="' + s[1] +
        '" stroke-width="' + (isActive ? 3 : isSelected ? 2.5 : 2) + '"' +
        (isActive ? ' style="filter:drop-shadow(0 0 8px rgba(217,138,108,0.6))"' : '') + '/>' +
        '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14">' +
        (wp.status === 'locked' ? '🔒' : E(wp.icon)) + '</text>' +
        '<text x="' + x + '" y="' + (y + 38) + '" text-anchor="middle" font-size="9" font-family="Outfit, sans-serif" fill="' +
        (wp.status === 'locked' ? '#8A7B6B' : '#2C2417') + '" font-weight="500">' +
        E(wp.name.split(' ').slice(0, 2).join(' ')) + '</text>' +
        (wp.status === 'completed'
          ? '<text x="' + x + '" y="' + (y + 50) + '" text-anchor="middle" font-size="8" font-family="Outfit, sans-serif" fill="#6B8E23" font-weight="600">✓ ' + wp.points + 'pts</text>'
          : '') +
        '</g>';
    }).join('');

    const action =
      sel.status === 'active'
        ? '<button ' + N('place', st.threadId, sel.id) + ' class="w-full py-3 rounded-full font-body font-semibold text-sm transition-all hover:scale-[1.02]" style="background-color:#6B8E23;color:white;box-shadow:0 4px 12px rgba(107,142,35,0.3)">Go to Challenge →</button>'
        : sel.status === 'completed'
          ? '<div class="text-center py-2"><span class="text-sm font-body font-medium" style="color:#6B8E23">✓ Challenge Completed</span></div>'
          : '<div class="text-center py-2"><span class="text-sm font-body" style="color:#8A7B6B">🔒 Complete previous waypoints first</span></div>';

    const legend = [['#6B8E23', 'Completed'], ['#D98A6C', 'Active (Current)'], ['#C9BDA8', 'Locked']]
      .map(function (l) {
        return '<div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full" style="background-color:' + l[0] + '"></div>' +
          '<span class="text-xs font-body" style="color:#8A7B6B">' + l[1] + '</span></div>';
      }).join('');

    return '<div>' +
      '<div class="pt-20 px-10" style="border-bottom:1px solid #E8E0D0"><div class="max-w-7xl mx-auto py-6">' +
      '<div class="flex items-center gap-3 mb-1"><button ' + N('discover') + ' class="text-sm font-body flex items-center gap-1" style="color:#8A7B6B">← Discover</button>' +
      '<span style="color:#C9BDA8">/</span><span class="text-sm font-body" style="color:#D98A6C">' + E(t.title) + '</span></div>' +
      '<div class="flex items-end justify-between"><div>' +
      '<h1 class="font-display text-3xl font-semibold" style="color:#2C2417">' + E(t.title) + '</h1>' +
      '<p class="font-body text-sm mt-1" style="color:#8A7B6B">' + E(t.subtitle) + '</p></div>' +
      '<div class="flex gap-3"><button class="px-4 py-2 rounded-full text-sm font-body font-medium" style="border:1px solid #E8E0D0;color:#2C2417">Share Thread</button>' +
      activeNodeButton(wps) + '</div></div></div></div>' +

      '<div class="max-w-7xl mx-auto px-10 py-10">' +
      '<div class="grid grid-cols-4 gap-4 mb-10">' + (t.stats || []).map(function (a) {
        return '<div class="flex items-center gap-3 px-5 py-4 rounded-xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
          '<span class="text-2xl">' + a.icon + '</span><div>' +
          '<div class="font-display text-xl font-semibold" style="color:#2C2417">' + a.value + '</div>' +
          '<div class="text-xs font-body" style="color:#8A7B6B">' + a.label + '</div></div></div>';
      }).join('') + '</div>' +

      '<div class="mb-10"><div class="flex justify-between text-xs font-body mb-2" style="color:#8A7B6B"><span>Thread Progress</span>' +
      '<span>' + progress + '% complete</span></div>' +
      '<div class="h-2 rounded-full" style="background-color:#E8E0D0"><div class="h-full rounded-full" style="width:' + progress + '%;background-color:#6B8E23"></div></div></div>' +

      '<div class="grid grid-cols-12 gap-8">' +
      '<div class="col-span-8"><div class="rounded-2xl p-8" style="background-color:#FDFCFA;border:1px solid #E8E0D0;min-height:420px">' +
      '<h2 class="font-body font-semibold text-sm uppercase tracking-wide mb-8" style="color:#8A7B6B">Story Path</h2>' +
      '<div class="relative"><svg viewBox="0 0 640 260" class="w-full" style="overflow:visible">' +
      '<path d="' + ps.full + '" stroke="#E8E0D0" stroke-width="3" fill="none" stroke-dasharray="8 4"/>' +
      (done > 0 ? '<path d="' + ps.done(done) + '" stroke="#6B8E23" stroke-width="3" fill="none" stroke-linecap="round"/>' : '') +
      nodes + '</svg>' +
      '<div class="flex items-center gap-5 mt-2">' + legend + '</div></div></div></div>' +

      '<div class="col-span-4"><div class="rounded-2xl overflow-hidden" style="border:1px solid #E8E0D0">' +
      '<div class="relative h-44"><img src="' + sel.image + '" alt="' + E(sel.name) + '" class="w-full h-full object-cover">' +
      '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(44,36,23,0.65), transparent)"></div>' +
      '<div class="absolute bottom-3 left-3"><span class="text-xs font-body px-2 py-0.5 rounded-full font-medium" style="background-color:rgba(249,247,243,0.9);color:#D98A6C">' + E(sel.type) + '</span></div>' +
      (sel.status === 'active'
        ? '<div class="absolute top-3 right-3"><span class="text-xs font-body px-2 py-0.5 rounded-full font-semibold animate-pulse" style="background-color:#D98A6C;color:white">● Active</span></div>'
        : '') + '</div>' +

      '<div class="p-5" style="background-color:#FDFCFA">' +
      '<h3 class="font-display text-base font-semibold mb-1" style="color:#2C2417">' + E(sel.name) + '</h3>' +
      '<p class="text-xs font-body mb-3 leading-relaxed" style="color:#8A7B6B">' + E(sel.desc) + '</p>' +
      '<div class="mb-4 p-3 rounded-xl" style="background-color:rgba(107,142,35,0.07);border:1px solid rgba(107,142,35,0.2)">' +
      '<p class="text-xs font-body font-semibold mb-1" style="color:#4A6318">🎯 Challenge</p>' +
      '<p class="text-xs font-body leading-relaxed" style="color:#5A7A1A">' + E(sel.challenge) + '</p></div>' +
      '<div class="flex items-center justify-between mb-4 pb-4" style="border-bottom:1px solid #E8E0D0">' +
      '<div class="text-center"><div class="font-display text-lg font-semibold" style="color:#6B8E23">+' + sel.points + '</div>' +
      '<div class="text-xs font-body" style="color:#8A7B6B">Points</div></div>' +
      '<div class="text-center"><div class="font-display text-lg font-semibold" style="color:#2C2417">' + sel.id + '/' + wps.length + '</div>' +
      '<div class="text-xs font-body" style="color:#8A7B6B">Waypoint</div></div>' +
      '<div class="text-center"><div class="text-2xl">' + sel.icon + '</div>' +
      '<div class="text-xs font-body capitalize" style="color:#8A7B6B">' + sel.status + '</div></div></div>' +
      action + '</div></div>' +

      '<div class="mt-4 p-4 rounded-xl" style="background-color:rgba(217,138,108,0.08);border:1px solid rgba(217,138,108,0.2)">' +
      '<p class="text-xs font-body leading-relaxed" style="color:#B8633E"><strong>Local Tip:</strong> ' + E(t.tip) + '</p></div>' +
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
    const wps = t.waypoints || [];
    const wp = selectWaypoint(wps, st.waypointId);
    if (!wp) {
      return '<div class="pt-20 px-10"><p class="font-body text-sm" style="color:#8A7B6B">This thread has no waypoints yet.</p></div>';
    }

    const idx = wps.indexOf(wp);
    const total = wps.length;
    const next = wps[idx + 1] || null;

    /* Same image, four URL variations, so the gallery strip is usable. */
    const images = [
      wp.image,
      wp.image.replace('w=600&h=300', 'w=600&h=300&crop=entropy'),
      wp.image.replace('fit=crop', 'fit=crop&sat=-20'),
      wp.image.replace('fit=crop', 'fit=crop&bri=10'),
    ];
    const ai = Math.min(NASEEJ.ui.activeImage || 0, GALLERY_SIZE - 1);

    const dm = (t.subtitle || '').match(/Easy|Moderate|Strenuous/i);
    const diff = dm ? dm[0] : 'Moderate';
    const du = (t.subtitle || '').match(/\d[\d–]* days?|\d+ hrs?|\d day/i);
    const duration = du ? du[0] : '2 hrs';

    const tags = [
      ['Duration', duration, '⏱'],
      ['Reward', wp.points + ' pts', '⭐'],
      ['Difficulty', diff, '⚡'],
      ['Category', wp.type, wp.icon],
      ['City', t.city, '📍'],
      ['Waypoint', (idx + 1) + ' of ' + total, '⊕'],
    ];

    let qrCta;
    if (NASEEJ.ui.challengeOpen) {
      let cells = '';
      const matrix = NASEEJ.ui.qr || [];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (matrix[r * 7 + c]) {
            cells += '<rect x="' + (8 + c * 15) + '" y="' + (8 + r * 15) + '" width="12" height="12" fill="#2C2417" rx="1"/>';
          }
        }
      }
      qrCta = '<div class="text-center py-6 rounded-2xl" style="background-color:rgba(107,142,35,0.06);border:1px solid rgba(107,142,35,0.3)">' +
        '<div class="inline-block p-4 rounded-xl mb-3" style="background-color:white;box-shadow:0 4px 16px rgba(44,36,23,0.1)">' +
        '<svg width="120" height="120" viewBox="0 0 120 120">' +
        '<rect width="120" height="120" fill="white"/>' + cells +
        '<rect x="8" y="8" width="42" height="42" fill="none" stroke="#2C2417" stroke-width="3"/>' +
        '<rect x="70" y="8" width="42" height="42" fill="none" stroke="#2C2417" stroke-width="3"/>' +
        '<rect x="8" y="70" width="42" height="42" fill="none" stroke="#2C2417" stroke-width="3"/>' +
        '</svg></div>' +
        '<p class="text-sm font-body font-semibold mb-1" style="color:#2C2417">Scan at ' + E(wp.name) + '</p>' +
        '<p class="text-xs font-body" style="color:#8A7B6B">Point your camera at the physical QR marker at this location</p>' +
        '<button ' + N('profile') + ' class="mt-4 text-xs font-body font-medium underline underline-offset-2" style="color:#6B8E23">Mark as completed manually →</button>' +
        '</div>';
    } else {
      qrCta = '<button data-act="qr" class="w-full py-4 rounded-full font-body font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.99]" style="background-color:#6B8E23;color:white;box-shadow:0 8px 24px rgba(107,142,35,0.35)">📷 Scan QR to Complete Challenge</button>';
    }

    const circleBtn = 'w-8 h-8 rounded-full flex items-center justify-center" style="background-color:rgba(249,247,243,0.9);color:#2C2417';

    return '<div>' +
      '<div class="pt-20 px-10 py-4 max-w-7xl mx-auto"><div class="flex items-center gap-2 text-sm font-body flex-wrap" style="color:#8A7B6B">' +
      '<button ' + N('discover') + ' class="hover:underline">Discover</button><span>/</span>' +
      '<button ' + N('thread', st.threadId) + ' class="hover:underline">' + E(t.title) + '</button><span>/</span>' +
      '<span style="color:#D98A6C">' + E(wp.name) + '</span></div></div>' +

      '<div class="max-w-7xl mx-auto px-10 pb-20"><div class="grid grid-cols-12 gap-10 min-h-[calc(100vh-140px)]">' +

      /* LEFT — gallery */
      '<div class="col-span-6 flex flex-col gap-3">' +
      '<div class="relative rounded-2xl overflow-hidden flex-1 min-h-[400px]">' +
      '<img src="' + images[ai] + '" alt="' + E(wp.name) + '" class="w-full h-full object-cover transition-all duration-500">' +
      '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(44,36,23,0.3) 0%, transparent 50%)"></div>' +
      '<div class="absolute top-4 left-4 flex gap-2">' +
      '<span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full" style="background-color:#D98A6C;color:white">Waypoint ' + (idx + 1) + ' of ' + total + '</span>' +
      (wp.status === 'active'
        ? '<span class="text-xs font-body font-semibold px-3 py-1.5 rounded-full animate-pulse" style="background-color:#6B8E23;color:white">● Active Challenge</span>'
        : '') + '</div>' +
      '<div class="absolute bottom-4 right-4 flex gap-2">' +
      '<button data-act="prev" class="' + circleBtn + '">←</button>' +
      '<button data-act="next" class="' + circleBtn + '">→</button>' +
      '</div></div>' +

      '<div class="grid grid-cols-4 gap-2">' + images.map(function (img, i) {
        return '<button data-act="img" data-v="' + i + '" class="rounded-xl overflow-hidden h-20" style="border:' +
          (ai === i ? '2px solid #D98A6C' : '2px solid transparent') + ';opacity:' + (ai === i ? 1 : 0.65) + '">' +
          '<img src="' + img + '" alt="" class="w-full h-full object-cover"></button>';
      }).join('') + '</div>' +

      '<div class="rounded-xl p-4 flex items-center gap-4" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
      '<div class="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style="background-color:rgba(217,138,108,0.1)">📍</div>' +
      '<div class="flex-1 min-w-0"><div class="text-sm font-body font-semibold truncate" style="color:#2C2417">' +
      E(wp.location != null ? wp.location : t.city + ', Jordan') + '</div>' +
      '<div class="text-xs font-body" style="color:#8A7B6B">' + E(wp.type) + '</div></div>' +
      '<button class="text-xs font-body font-medium px-3 py-1.5 rounded-full flex-shrink-0" style="background-color:rgba(107,142,35,0.1);color:#6B8E23">Open in Maps</button>' +
      '</div></div>' +

      /* RIGHT — details & CTA */
      '<div class="col-span-6 flex flex-col"><div class="flex-1">' +
      '<div class="flex items-center gap-2 mb-4"><div class="w-2 h-2 rounded-full" style="background-color:#D98A6C"></div>' +
      '<span class="text-xs font-body uppercase tracking-widest" style="color:#D98A6C">' + E(t.title) + ' Thread</span></div>' +
      '<h1 class="font-display text-4xl font-semibold mb-2" style="color:#2C2417">' + E(wp.name) + '</h1>' +
      '<p class="font-display italic text-lg font-light mb-6" style="color:#D98A6C">' + E(wp.type) + ' · ' + E(t.city) + '</p>' +

      '<div class="flex flex-wrap gap-2 mb-6">' + tags.map(function (g) {
        return '<span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium" style="background-color:rgba(217,138,108,0.08);color:#2C2417;border:1px solid rgba(217,138,108,0.2)">' +
          '<span>' + g[2] + '</span><span style="color:#8A7B6B">' + g[0] + ':</span><strong>' + E(g[1]) + '</strong></span>';
      }).join('') + '</div>' +

      '<div class="mb-6 pb-6" style="border-bottom:1px solid #E8E0D0">' +
      '<h3 class="font-body font-semibold text-sm uppercase tracking-wide mb-3" style="color:#8A7B6B">The Story</h3>' +
      '<p class="font-body text-sm leading-relaxed" style="color:#2C2417">' + E(wp.desc) + '</p></div>' +

      '<div class="rounded-xl p-5 mb-6" style="background-color:rgba(107,142,35,0.06);border:1px solid rgba(107,142,35,0.2)">' +
      '<div class="flex items-center gap-2 mb-3"><span class="text-base">🎯</span>' +
      '<h3 class="font-body font-semibold text-sm" style="color:#2C2417">Your Challenge</h3>' +
      '<span class="ml-auto text-xs font-body font-semibold px-2 py-0.5 rounded-full" style="background-color:#6B8E23;color:white">+' + wp.points + ' pts</span></div>' +
      '<p class="text-sm font-body leading-relaxed" style="color:#2C2417">' + E(wp.challenge) + '</p>' +
      '<div class="mt-3 flex gap-4 text-xs font-body" style="color:#8A7B6B">' +
      '<span>🗺 Evidence required: Photo + Description</span><span>⏱ Estimated: 45 min</span></div></div>' +

      '<div class="rounded-xl p-4 mb-6" style="background-color:rgba(217,138,108,0.06);border:1px solid rgba(217,138,108,0.15)">' +
      '<p class="text-xs font-body leading-relaxed" style="color:#B8633E"><strong>Local Tip:</strong> ' + E(t.tip) + '</p></div>' +

      (next
        ? '<div class="flex items-center gap-3 mb-6 p-3 rounded-xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
          '<div class="text-lg">' + next.icon + '</div><div><p class="text-xs font-body" style="color:#8A7B6B">Up next</p>' +
          '<p class="text-sm font-body font-semibold" style="color:#2C2417">' + E(next.name) + '</p></div>' +
          '<div class="ml-auto text-xs font-body font-semibold" style="color:#6B8E23">+' + next.points + ' pts</div></div>'
        : '') +
      '</div>' +

      '<div class="sticky bottom-0 pt-4" style="border-top:1px solid #E8E0D0;background-color:#F9F7F3">' + qrCta +
      '<div class="flex items-center gap-2 mt-3">' +
      '<button ' + N('thread', st.threadId) + ' class="flex-1 py-2.5 rounded-full font-body font-medium text-sm" style="border:1px solid #E8E0D0;color:#2C2417">← Back to Thread</button>' +
      '<button class="flex-1 py-2.5 rounded-full font-body font-medium text-sm" style="border:1px solid #E8E0D0;color:#2C2417">Save to Wishlist</button>' +
      '</div></div></div>' +

      '</div></div></div>';
  }

  /* ═════════════════════ THREADS LIBRARY ═════════════════════ */
  function discover() {
    return '<div style="background-color:#F9F7F3;min-height:100vh">' +
      '<div class="pt-24 pb-8 px-10 max-w-7xl mx-auto">' +
      NASEEJ.eyebrow({ color: '#D98A6C', width: 'w-5', margin: 'mb-2', text: 'Thread Library' }) +
      '<div class="flex items-end justify-between"><h1 class="font-display text-4xl font-semibold" style="color:#2C2417">Discover Threads</h1>' +
      '<p id="lib-count" class="font-body text-sm" style="color:#8A7B6B"></p></div></div>' +

      '<div class="px-10 max-w-7xl mx-auto pb-20"><div class="grid grid-cols-12 gap-8">' +
      '<aside class="col-span-3"><div class="mb-6"><div class="relative">' +
      '<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style="color:#8A7B6B" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>' +
      '<input id="lib-search" type="text" placeholder="Search threads..." class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-body outline-none" style="background-color:#FDFCFA;border:1px solid #E8E0D0;color:#2C2417"></div></div>' +
      '<div class="p-5 rounded-2xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
      '<h3 class="font-body font-semibold text-sm mb-4 uppercase tracking-wide" style="color:#2C2417">Category</h3>' +
      '<div id="lib-cats" class="flex flex-col gap-1.5"></div></div></aside>' +

      '<main class="col-span-9"><div id="lib-flex" class="flex gap-6 items-start">' +
      '<div id="lib-map" class="relative rounded-3xl overflow-hidden flex-shrink-0 transition-all duration-500" style="width:100%;background:#F4EFE6;border:1px solid #D8CDB8;box-shadow:0 6px 32px rgba(44,36,23,0.10)">' +
      '<img src="' + data.assets.jordanMap + '" alt="Jordan map" style="width:100%;display:block;opacity:0.92" draggable="false">' +
      '<svg id="lib-svg" viewBox="0 0 628 512" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%"></svg>' +
      '</div>' +
      '</div></main></div></div></div>';
  }

  function libCard(t) {
    const progress = data.getThreadProgress(t);
    const started = progress > 0;
    return '<div ' + N('thread', t.id) + ' class="group rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5" style="background-color:#FDFCFA;border:1px solid #E8E0D0;box-shadow:0 2px 12px rgba(44,36,23,0.05)">' +
      '<div class="relative overflow-hidden h-36">' +
      '<img src="' + t.image + '" alt="' + E(t.title) + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">' +
      '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(44,36,23,0.5) 0%, transparent 60%)"></div>' +
      '<div class="absolute top-3 left-3 flex gap-1.5">' +
      '<span class="text-xs font-body px-2 py-0.5 rounded-full font-medium" style="background-color:rgba(249,247,243,0.92);color:#D98A6C">' + E(t.category) + '</span>' +
      '<span class="text-xs font-body px-2 py-0.5 rounded-full font-medium" style="background-color:rgba(44,36,23,0.72);color:rgba(255,255,255,0.9)">' +
      data.moodEmoji[t.mood] + ' ' + t.mood + '</span></div>' +
      '<div class="absolute top-3 right-3"><span class="text-xs font-body px-2 py-0.5 rounded-full font-semibold" style="background-color:rgba(249,247,243,0.92);color:' +
      (data.difficultyColor[t.difficulty] || '#6B8E23') + '">' + t.difficulty + '</span></div>' +
      (started ? '<div class="absolute bottom-0 left-0 right-0 h-0.5" style="background-color:rgba(107,142,35,0.3)">' +
        '<div class="h-full" style="width:' + progress + '%;background-color:#6B8E23"></div></div>' : '') +
      '</div>' +
      '<div class="p-4"><h3 class="font-display text-sm font-semibold mb-1" style="color:#2C2417">' + E(t.title) + '</h3>' +
      '<p class="text-xs font-body mb-3 leading-relaxed" style="color:#6B5E50">' + E(t.hook) + '</p>' +
      '<div class="flex items-center gap-3 text-xs font-body mb-3" style="color:#8A7B6B">' +
      '<span>⊕ ' + t.waypoints + ' stops</span><span>⏱ ' + t.duration + '</span>' +
      '<span class="ml-auto font-semibold" style="color:#6B8E23">+' + t.points + ' pts</span></div>' +
      '<div class="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style="background-color:#F4EFE6;border:1px solid #E0D5C2">' +
      '<div class="flex-1 min-w-0"><p class="text-xs font-body" style="color:#8A7B6B">Start</p>' +
      '<p class="text-xs font-body font-medium truncate" style="color:#2C2417">' + E(t.start) + '</p></div>' +
      '<div class="text-xs flex-shrink-0 px-1" style="color:#C9BDA8">→</div>' +
      '<div class="flex-1 min-w-0 text-right"><p class="text-xs font-body" style="color:#8A7B6B">End</p>' +
      '<p class="text-xs font-body font-medium truncate" style="color:#2C2417">' + E(t.end) + '</p></div></div>' +
      (started ? '<div class="mb-3"><div class="flex justify-between text-xs font-body mb-1" style="color:#8A7B6B">' +
        '<span>Progress</span><span>' + progress + '%</span></div>' +
        '<div class="h-1.5 rounded-full" style="background-color:#E8E0D0">' +
        '<div class="h-full rounded-full" style="width:' + progress + '%;background-color:#6B8E23"></div></div></div>' : '') +
      '<button ' + N('thread', t.id) + ' class="w-full py-2 rounded-full text-xs font-body font-semibold" style="' +
      (started ? 'background-color:#6B8E23;color:white' : 'background-color:transparent;color:#2C2417;border:1px solid #E8E0D0') + '">' +
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
        (on ? 'background-color:#D98A6C;color:white' : 'color:#2C2417') + '"><span>' + cat + '</span>' +
        '<span class="text-xs" style="color:' + (on ? 'rgba(255,255,255,0.7)' : '#8A7B6B') + '">' + n + '</span></button>';
    }).join('');

    map.style.width = sc ? '52%' : '100%';

    const pins = data.cities.map(function (c) {
      const isSel = sc === c.id;
      const w = c.label.length * 6.2 + 10;
      const lx = c.x + 14; /* original maps every label to the right */
      const ly = c.y - 11 + c.labelDy;
      const cnt = countIn(c.id);
      return '<g data-act="city" data-v="' + E(c.id) + '" style="cursor:pointer">' +
        (isSel
          ? '<circle cx="' + c.x + '" cy="' + c.y + '" r="16" fill="#D98A6C" opacity="0.15">' +
            '<animate attributeName="r" values="12;20;12" dur="1.8s" repeatCount="indefinite"/>' +
            '<animate attributeName="opacity" values="0.18;0.04;0.18" dur="1.8s" repeatCount="indefinite"/></circle>'
          : '') +
        '<rect x="' + lx + '" y="' + ly + '" width="' + w + '" height="15" rx="4" fill="rgba(253,252,250,0.94)" stroke="' +
        (isSel ? '#D98A6C' : '#CCC0A8') + '" stroke-width="0.8"/>' +
        '<text x="' + (lx + w / 2) + '" y="' + (ly + 10) + '" text-anchor="middle" font-size="8" font-family="Outfit,sans-serif" font-weight="' +
        (isSel ? '700' : '600') + '" fill="' + (isSel ? '#D98A6C' : '#3A2810') + '" letter-spacing="0.02em">' + E(c.label) + '</text>' +
        '<circle cx="' + c.x + '" cy="' + c.y + '" r="8" fill="' + (isSel ? '#D98A6C' : '#6B8E23') + '"/>' +
        '<text x="' + c.x + '" y="' + (c.y + 3.5) + '" text-anchor="middle" font-size="7" font-family="Outfit,sans-serif" font-weight="700" fill="white">' +
        cnt + '</text></g>';
    }).join('');

    svg.innerHTML =
      '<text x="22" y="32" font-size="14" font-family="Fraunces,serif" font-weight="700" fill="#2C2417" opacity="0.85">Jordan</text>' +
      '<text x="22" y="46" font-size="7.5" font-family="Outfit,sans-serif" fill="#8A7B6B" letter-spacing="0.1em">TAP A CITY TO EXPLORE</text>' +
      pins +
      '<g transform="translate(600,490)"><circle cx="0" cy="0" r="13" fill="rgba(253,252,250,0.92)" stroke="#CCC0A8" stroke-width="0.8"/>' +
      '<path d="M0,-10 L2.5,0 L0,3.5 L-2.5,0 Z" fill="#D98A6C"/>' +
      '<path d="M0,10 L2.5,0 L0,3.5 L-2.5,0 Z" fill="#B0A090"/>' +
      '<text x="0" y="-12" text-anchor="middle" font-size="6" font-family="Outfit,sans-serif" font-weight="700" fill="#3A2810">N</text></g>';

    /* "← All cities" is a conditional sibling of the map image, so it is
       (re)created as the map's last child rather than a wrapper element. */
    const stale = map.querySelector('[data-act="city"][data-v=""]');
    if (stale) map.removeChild(stale);
    if (sc) {
      const all = document.createElement('button');
      all.setAttribute('data-act', 'city');
      all.setAttribute('data-v', '');
      all.className = 'absolute top-4 right-4 text-xs font-body font-medium px-3 py-1.5 rounded-full';
      all.style.cssText = 'background-color:rgba(253,252,250,0.94);border:1px solid #D8CDB8;color:#D98A6C';
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
      '<div class="mb-5"><p class="text-xs font-body font-medium uppercase tracking-widest mb-1" style="color:#D98A6C">' +
      E(city ? city.label : sc) + '</p>' +
      '<h2 class="font-display text-xl font-semibold" style="color:#2C2417">' + list.length +
      ' Thread' + (list.length !== 1 ? 's' : '') + ' Available</h2></div>' +
      (list.length === 0
        ? '<div class="text-center py-12 rounded-2xl" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
          '<p class="font-body text-sm" style="color:#8A7B6B">No threads match your current filters.</p>' +
          '<button data-act="clear" class="mt-3 text-xs font-body font-medium" style="color:#D98A6C">Clear filters</button></div>'
        : '<div class="flex flex-col gap-4">' + list.map(libCard).join('') + '</div>');
    if (keepScroll) panel.scrollTop = keepScroll;
  }

  /* ═════════════════════ USER PROFILE ═════════════════════ */
  function profile() {
    const tab = NASEEJ.ui.tab || 'loom';
    const TP = session.points;
    const me = session.profile;
    const earned = session.badgesEarned;
    const tabs = [
      ['loom', 'The Loom (Badges)'],
      ['threads', 'My Threads'],
      ['rewards', 'Rewards & Discounts'],
    ];

    let body;
    if (tab === 'loom') {
      body = '<div class="py-10"><div class="flex items-center justify-between mb-6"><div>' +
        '<h2 class="font-display text-2xl font-semibold" style="color:#2C2417">The Loom</h2>' +
        '<p class="text-sm font-body mt-1" style="color:#8A7B6B">' + earned + ' of ' + session.badges.length +
        ' badges earned · ' + (session.badges.length - earned) + ' remaining to complete your tapestry</p></div></div>' +
        '<div class="grid grid-cols-4 gap-5">' + session.badges.map(function (b) {
          let rarity = '';
          if (b.earned && b.rarity === 'Epic') {
            rarity = '<div class="absolute top-2 right-2"><span class="text-xs font-body px-1.5 py-0.5 rounded-full font-semibold" style="background-color:rgba(107,142,35,0.15);color:#6B8E23">' + b.rarity + '</span></div>';
          } else if (b.earned && b.rarity === 'Legendary') {
            rarity = '<div class="absolute top-2 right-2"><span class="text-xs font-body px-1.5 py-0.5 rounded-full font-semibold" style="background-color:rgba(217,138,108,0.15);color:#D98A6C">' + b.rarity + '</span></div>';
          }
          return '<div class="relative rounded-2xl p-5 text-center transition-all ' + (b.earned ? 'hover:-translate-y-1' : '') +
            '" style="background-color:' + (b.earned ? '#FDFCFA' : 'rgba(249,247,243,0.5)') + ';border:' +
            (b.earned ? '1px solid #E8E0D0' : '1px dashed #C9BDA8') + ';filter:' + (b.earned ? 'none' : 'grayscale(0.3)') +
            ';opacity:' + (b.earned ? 1 : 0.65) + '">' + rarity +
            '<div class="mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center text-3xl ' + (b.earned ? 'badge-glow' : '') +
            '" style="background-color:' + (b.earned ? 'rgba(107,142,35,0.1)' : 'rgba(200,190,175,0.3)') + ';border:' +
            (b.earned ? '2px solid rgba(107,142,35,0.3)' : '2px dashed #C9BDA8') + '">' + (b.earned ? b.icon : '🔒') + '</div>' +
            '<h3 class="font-display text-sm font-semibold mb-1" style="color:' + (b.earned ? '#2C2417' : '#8A7B6B') + '">' + b.name + '</h3>' +
            '<p class="text-xs font-body leading-snug" style="color:#8A7B6B">' + b.desc + '</p>' +
            (b.earned && b.date ? '<div class="mt-3 text-xs font-body" style="color:#6B8E23">Earned ' + b.date + '</div>' : '') +
            (!b.earned ? '<div class="mt-3 text-xs font-body" style="color:#C9BDA8">Not yet earned</div>' : '') +
            '</div>';
        }).join('') + '</div></div>';
    } else if (tab === 'threads') {
      body = '<div class="py-10">' +
        '<h2 class="font-display text-xl font-semibold mb-4" style="color:#2C2417">In Progress</h2>' +
        '<div class="grid grid-cols-3 gap-5 mb-10">' + session.activeThreads.map(function (t) {
          return '<div ' + N('thread') + ' class="rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
            '<div class="relative h-36 overflow-hidden"><img src="' + t.image + '" alt="' + E(t.title) + '" class="w-full h-full object-cover">' +
            '<div class="absolute bottom-0 left-0 right-0 h-1" style="background-color:rgba(249,247,243,0.3)">' +
            '<div class="h-full progress-bar" style="width:' + t.progress + '%"></div></div>' +
            '<span class="absolute top-2 left-2 text-xs font-body px-2 py-0.5 rounded-full font-semibold animate-pulse" style="background-color:#D98A6C;color:white">● Active</span></div>' +
            '<div class="p-4"><h3 class="font-display text-sm font-semibold mb-1" style="color:#2C2417">' + E(t.title) + '</h3>' +
            '<p class="text-xs font-body mb-3" style="color:#8A7B6B">Next: ' + E(t.nextWaypoint) + '</p>' +
            '<div class="flex justify-between text-xs font-body mb-2" style="color:#8A7B6B"><span>Progress</span><span>' + t.progress + '%</span></div>' +
            '<div class="h-1.5 rounded-full" style="background-color:#E8E0D0">' +
            '<div class="h-full rounded-full progress-bar" style="width:' + t.progress + '%"></div></div></div></div>';
        }).join('') +
        '<div ' + N('discover') + ' class="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1" style="border:2px dashed #C9BDA8;min-height:200px">' +
        '<div class="text-3xl mb-2">🧵</div><span class="text-sm font-body font-medium" style="color:#8A7B6B">Start New Thread</span></div></div>' +

        '<h2 class="font-display text-xl font-semibold mb-4" style="color:#2C2417">Completed</h2>' +
        '<div class="grid grid-cols-3 gap-5">' + session.completedThreads.map(function (t) {
          return '<div class="rounded-2xl overflow-hidden" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
            '<div class="relative h-36 overflow-hidden"><img src="' + t.image + '" alt="' + E(t.title) + '" class="w-full h-full object-cover" style="filter:saturate(0.85)">' +
            '<div class="absolute inset-0 flex items-center justify-center" style="background-color:rgba(107,142,35,0.2)">' +
            '<div class="w-12 h-12 rounded-full flex items-center justify-center text-xl" style="background-color:#6B8E23">✓</div></div></div>' +
            '<div class="p-4"><h3 class="font-display text-sm font-semibold mb-1" style="color:#2C2417">' + E(t.title) + '</h3>' +
            '<div class="flex items-center justify-between text-xs font-body" style="color:#8A7B6B">' +
            '<span>⊕ ' + t.waypoints + ' waypoints</span>' +
            '<span class="font-semibold" style="color:#6B8E23">+' + t.pointsEarned + ' pts</span></div>' +
            '<div class="text-xs font-body mt-2" style="color:#C9BDA8">Completed ' + t.completedDate + '</div></div></div>';
        }).join('') + '</div></div>';
    } else {
      body = '<div class="py-10"><div class="flex items-center justify-between mb-6"><div>' +
        '<h2 class="font-display text-2xl font-semibold" style="color:#2C2417">Community Rewards</h2>' +
        '<p class="text-sm font-body mt-1" style="color:#8A7B6B">Redeem your ' + TP + ' points with local Jordan partners</p></div>' +
        '<div class="flex items-center gap-2 px-4 py-2 rounded-full" style="background-color:rgba(107,142,35,0.1);border:1px solid rgba(107,142,35,0.2)">' +
        '<span class="font-display text-lg font-semibold" style="color:#6B8E23">' + TP + '</span>' +
        '<span class="text-sm font-body" style="color:#6B8E23">pts available</span></div></div>' +

        '<div class="grid grid-cols-2 gap-5">' + session.rewards.map(function (r) {
          const ok = TP >= r.points;
          return '<div class="flex gap-4 p-5 rounded-2xl transition-all hover:-translate-y-0.5" style="background-color:#FDFCFA;border:1px solid #E8E0D0">' +
            '<div class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style="background-color:rgba(217,138,108,0.08)">' + r.logo + '</div>' +
            '<div class="flex-1"><div class="flex items-start justify-between mb-1">' +
            '<h3 class="font-body font-semibold text-sm" style="color:#2C2417">' + E(r.name) + '</h3>' +
            '<span class="text-xs font-body px-2 py-0.5 rounded-full" style="background-color:rgba(217,138,108,0.1);color:#D98A6C">' + r.type + '</span></div>' +
            '<p class="font-display text-base font-semibold mb-2" style="color:#6B8E23">' + r.discount + '</p>' +
            '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-body" style="color:#8A7B6B">' + r.points + ' pts · ' + r.remaining + ' left</span>' +
            '<button class="text-xs font-body font-semibold px-3 py-1.5 rounded-full transition-all" style="' +
            (ok ? 'background-color:#6B8E23;color:white' : 'background-color:#E8E0D0;color:#8A7B6B;cursor:not-allowed') + '">' +
            (ok ? 'Redeem' : 'Need ' + (r.points - TP) + ' more') + '</button></div></div></div>';
        }).join('') + '</div>' +

        '<div class="mt-8 p-6 rounded-2xl" style="background:linear-gradient(135deg, #2C2417, #3D3020);border:1px solid rgba(217,138,108,0.2)">' +
        '<div class="flex items-center justify-between"><div>' +
        '<h3 class="font-display text-lg font-semibold mb-1" style="color:#F9F7F3">Become a Gold Weaver</h3>' +
        '<p class="text-sm font-body" style="color:rgba(249,247,243,0.6)">Earn ' + session.pointsToNextLevel +
        ' more points to unlock exclusive partner discounts up to 40% off</p></div>' +
        '<button ' + N('discover') + ' class="px-5 py-2.5 rounded-full text-sm font-body font-semibold whitespace-nowrap" style="background-color:#D98A6C;color:white">Earn More Points →</button>' +
        '</div></div></div>';
    }

    const stat = function (v, l) {
      return '<div class="text-center"><div class="font-display text-xl font-semibold" style="color:#EDB99E">' + v + '</div>' +
        '<div class="text-xs font-body" style="color:rgba(249,247,243,0.5)">' + l + '</div></div>';
    };
    const sep = '<div class="w-px h-8" style="background-color:rgba(249,247,243,0.15)"></div>';

    return '<div><div class="pt-20">' +
      '<div class="px-10 py-10" style="background:linear-gradient(135deg, #2C2417 0%, #3D3020 100%)"><div class="max-w-7xl mx-auto">' +
      '<div class="grid grid-cols-12 gap-6 items-center">' +
      '<div class="col-span-8 flex items-center gap-6"><div class="relative">' +
      '<div class="w-20 h-20 rounded-full overflow-hidden" style="border:3px solid #D98A6C">' +
      '<img src="' + me.avatarUrl + '" alt="' + E(me.displayName) + '" class="w-full h-full object-cover"></div>' +
      (me.verified
        ? '<div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs" style="background-color:#6B8E23;border:2px solid #2C2417">✓</div>'
        : '') + '</div>' +
      '<div><div class="row-wrap flex items-center gap-2 mb-1">' +
      '<h1 class="font-display text-2xl font-semibold" style="color:#F9F7F3">' + E(me.displayName) + '</h1>' +
      '<span class="text-xs font-body px-2 py-0.5 rounded-full font-semibold" style="background-color:#D98A6C;color:white">' + E(me.levelName) + '</span></div>' +
      '<p class="text-sm font-body" style="color:rgba(249,247,243,0.6)">Weaving since ' + E(me.memberSince) + ' · ' + E(me.city) + '</p>' +
      '<div class="row-wrap flex items-center gap-4 mt-3">' +
      stat(TP, 'Total Points') + sep + stat(session.threadsCompleted, 'Threads Done') + sep +
      stat(earned, 'Badges Earned') + sep + stat(session.waypointsVisited, 'Waypoints') +
      '</div></div></div>' +

      '<div class="col-span-4"><div class="p-5 rounded-2xl" style="background-color:rgba(249,247,243,0.06);border:1px solid rgba(249,247,243,0.12)">' +
      '<div class="text-xs font-body uppercase tracking-widest mb-2" style="color:rgba(249,247,243,0.5)">Points Available</div>' +
      '<div class="font-display text-4xl font-semibold mb-2" style="color:#EDB99E">' + TP + '</div>' +
      '<div class="h-2 rounded-full mb-3" style="background-color:rgba(249,247,243,0.1)">' +
      '<div class="h-full rounded-full" style="width:' + session.levelProgress + '%;background:linear-gradient(90deg, #6B8E23, #8CB02E)"></div></div>' +
      '<p class="text-xs font-body mb-3" style="color:rgba(249,247,243,0.5)">' + session.pointsToNextLevel +
      ' pts to next level: <strong style="color:#EDB99E">' + E(me.nextLevelName) + '</strong></p>' +
      '<button data-act="tab" data-v="rewards" class="w-full py-2 rounded-full text-xs font-body font-semibold" style="background-color:#6B8E23;color:white">Redeem Points →</button>' +
      '</div></div></div></div></div>' +

      '<div class="px-10 max-w-7xl mx-auto">' +
      '<div class="tab-row flex gap-0 mt-0" style="border-bottom:1px solid #E8E0D0">' + tabs.map(function (t) {
        /* tab-row: a three-tab strip that is wider than a 320px screen at
           px-6 each. It scrolls horizontally rather than wrapping, which is
           the standard pattern for a tab strip and keeps the underline
           indicator attached to the active tab. */
        return '<button data-act="tab" data-v="' + t[0] + '" class="tab-row-item px-6 py-4 text-sm font-body font-medium transition-all" style="' +
          (tab === t[0] ? 'color:#D98A6C;border-bottom:2px solid #D98A6C;margin-bottom:-1px' : 'color:#8A7B6B') + '">' + t[1] + '</button>';
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
    img: function (value) {
      NASEEJ.ui.activeImage = +value;
      NASEEJ.paint();
    },
    prev: function () {
      NASEEJ.ui.activeImage = Math.max(0, (NASEEJ.ui.activeImage || 0) - 1);
      NASEEJ.paint();
    },
    next: function () {
      NASEEJ.ui.activeImage = Math.min(GALLERY_SIZE - 1, (NASEEJ.ui.activeImage || 0) + 1);
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
  };
})(window.NASEEJ || (window.NASEEJ = {}));
