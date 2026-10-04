/* Naseej — application data.

   Ported from src/data/threadData.ts, src/pages/ThreadsLibrary.tsx and
   src/pages/UserProfile.tsx. Content only: this file never touches the DOM,
   the router or the network.

   Everything is published through two read-only surfaces at the bottom:
     NASEEJ.data    — site content (threads, waypoints, cities, rewards...).
     NASEEJ.session — the signed-in weaver: profile, points, badges, progress.

   Both are plain objects today. When Firebase is switched on they become the
   seam the auth / Firestore layer fills in, so pages keep reading data the
   same way either way. */
(function (NASEEJ) {
  'use strict';


  const threadsById = {

    // ════════════════════════════════════════════════════════
    // IRBID
    // ════════════════════════════════════════════════════════

    7: {
      title: 'Bride of the North',
      subtitle: 'Northern Jordan · 3 days · Moderate · 260 points',
      city: 'Irbid',
      progress: 40,
      tip: 'Arrive at Umm Qais just before sunset — the panorama over the Sea of Galilee and the Golan turns deep gold. Pack a light jacket; the northern hills cool quickly after dark.',
      stats: [
        { label: 'Points Earned', value: '104', icon: '⭐' },
        { label: 'Waypoints Done', value: '2 / 5', icon: '⊕' },
        { label: 'Thread Progress', value: '40%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Umm Qais (Gadara)', type: 'Greco-Roman Ruins', status: 'completed', points: 55, icon: '🏛️', location: 'Irbid Governorate, Northern Jordan · 32.6553° N, 35.6842° E',
          desc: 'Umm Qais is the site of the ancient Greco-Roman city of Gadara, one of the cities of the Decapolis league. It sits on a hilltop overlooking the Sea of Galilee, the Yarmouk River gorge, and the Golan Heights — three countries visible from a single viewpoint. Its black basalt colonnaded street, theatre, and mausoleum are among Jordan\'s most dramatic ruins.',
          challenge: 'Identify and photograph the three countries visible from the Gadara viewpoint. Name the Sea of Galilee by its two other historical names used in Biblical and Roman sources.',
          image: "assets/places/irbid/umm-qais-gadara.webp" },
        { id: 2, name: 'Yarmouk River Gorge', type: 'Nature Trail', status: 'completed', points: 49, icon: '🌿', location: 'Yarmouk River, Northern Jordan · 32.68° N, 35.75° E',
          desc: 'The Yarmouk River is the largest tributary of the Jordan River and forms the border between Jordan and Syria. Its gorge, cut through ancient basalt lava flows, is a critical flyway for migratory birds funnelling between Europe and Africa during spring and autumn. Over 300 bird species have been recorded along this corridor.',
          challenge: 'Identify 4 migratory bird species using the field guide at the trail head. Record each species, the time spotted, and its direction of flight in your thread journal.',
          image: "assets/places/irbid/yarmouk-river-gorge.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Beit Ras (Capitolias)', type: 'Decapolis City', status: 'active', points: 60, icon: '🪨', location: 'Beit Ras, Irbid Governorate · 32.5688° N, 35.8481° E',
          desc: 'Beit Ras is the ancient city of Capitolias, founded around 97–98 CE and one of the smallest cities of the Decapolis. Built almost entirely from black volcanic basalt, its colonnaded street, Roman theatre, and underground cisterns lie half-buried beneath a modern village. Excavations continue to reveal coins, inscriptions, and mosaic floors.',
          challenge: 'Count the surviving column drums along the colonnaded street and sketch the theatre\'s cavea layout. Based on the radius, estimate how many spectators it held at full capacity.',
          image: "assets/places/irbid/beit-ras-capitolias.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Tell Irbid', type: 'Archaeological Mound', status: 'locked', points: 50, icon: '⛏️', location: 'Irbid City Centre, Irbid · 32.5556° N, 35.8500° E',
          desc: 'Rising from the heart of modern Irbid, Tell Irbid is an ancient occupation mound with archaeological layers spanning the Early Bronze Age through the Ottoman period. Pottery sherds surface after every rain. The tell was occupied by Canaanite, Hellenistic, Roman, Byzantine, and Islamic communities in succession over more than 5,000 years.',
          challenge: 'Work with the on-site archaeologist to date three pottery fragments by their clay body, surface treatment, and form. Match each shard to the correct period on the excavation timeline board.',
          image: "assets/places/irbid/tell-irbid.svg",
          imageStatus: "placeholder" },
        { id: 5, name: 'Abila (Quwayliba)', type: 'Hidden Decapolis', status: 'locked', points: 46, icon: '🗺️', location: 'Quwayliba, Irbid Governorate · 32.6033° N, 35.7856° E',
          desc: 'Abila of the Decapolis lies in the rolling hills north of Irbid and is among the least-visited ancient cities in Jordan. Its remains include a Roman temple, a colonnaded street, a Byzantine basilica with mosaic floors, rock-cut tombs, and a Roman bridge. Seasonal springs feed small waterfalls near the site in winter and spring.',
          challenge: 'Navigate to the site using only the Roman road markers described in your thread scroll. Locate and photograph the Byzantine mosaic floor without using GPS.',
          image: "assets/places/irbid/abila-quwayliba.svg",
          imageStatus: "placeholder" },
      ],
    },

    10: {
      id: 10,
      livingMystery: true,
      title: 'Yarmouk Nature Walk',
      /* Clean copy. Difficulty and duration used to be scraped out of this
         string by the place page's regex, so the mystery badge broke both
         parsers; they are explicit fields now (see place() in pages.js). */
      subtitle: 'Yarmouk River Gorge · Living Mystery',
      city: 'Irbid',
      region: 'Yarmouk River Gorge',
      category: 'Nature',
      difficulty: 'Moderate',
      duration: '1 day',
      image: 'assets/irbid-bride-of-the-north.png',
      /* The city photograph the hero card shows. Without this the caption falls
         back to the thread title and claims to be a photograph of the walk. */
      imageSubject: 'Irbid',
      progress: 0,
      tip: 'The gorge is most dramatic in early morning light. Bring binoculars — the Yarmouk corridor is one of the top birdwatching spots in the Middle East during migration season (March–May and Sept–Nov). KHAYT\'s advice: don\'t only read the board. Look around you.',

      /* ── What is fact, and what is story ───────────────────────────────────
         The Yarmouk, its basalt gorge, the migratory corridor, the columnar
         jointing and the riverside herbs are all real. The traveller, the ibex
         cut into the trail stone, the boot prints, the red thread and the herb
         wrap are not: they are invented for this thread.

         Declaring that here is what keeps this an interactive mystery rather
         than a false local history. `reveal` below is a work of fiction and the
         UI must label it as one wherever it is printed — the same reason a novel
         does not footnote its plot. */
      fiction: {
        isFiction: true,
        label: 'Fictional mystery',
        note:
          'The Yarmouk gorge, the basalt, the bird corridor and the riverside herbs are real. ' +
          'The traveller, the ibex cut into the trail stone, the red thread and the herb wrap ' +
          'are an invented story written for this thread — not local history.',
      },

      /* Every clue carries the interaction that earns it, so a clue is never
         "waypoint N unlocked" by position — it is unlocked by the player doing
         something. Clue 3 comes from the branch choice, which is not a waypoint
         at all. `kind` is the interaction: 'challenge' (a validated multiple
         choice answer) or 'branch' (the CHOOSE YOUR PATH decision). */
      clues: [
        { id: 1, text: 'Someone passed through this place before you.', unlock: { kind: 'challenge', waypoint: 1 } },
        { id: 2, text: 'What they carried changed the story.', unlock: { kind: 'observation', waypoint: 2 } },
        { id: 3, text: 'The answer is closer than you think.', unlock: { kind: 'branch' } },
        { id: 4, text: 'Now you can see the connection.', unlock: { kind: 'challenge', waypoint: 4 } },
      ],

      chapters: {
        start: 'The Entrance',
        person: 'Follow the Person',
        object: 'Follow the Object',
        connection: 'The Connection',
        reveal: 'The Thread',
      },

      branchOptions: [
        { id: 'person', label: 'Follow the Person', prompt: 'A figure is still moving along the gorge rim.' },
        { id: 'object', label: 'Follow the Object', prompt: 'Something they carried was left at the basalt wall.' },
      ],

      /* KHAYT reacts to the choice itself, not only to the waypoint state. */
      branchReaction: {
        person: 'Then keep their steps. A person leaves more than footprints.',
        object: 'Then keep what they left. Objects are honest — they cannot revise a story.',
      },

      /* One secret, on this thread only. It is not a fifth waypoint: the four
         story nodes stay the story, and this sits beside them until its
         condition is actually met. */
      secretChallenge: {
        id: 'hidden-crack',
        isSecret: true,
        title: 'Most visitors walk past this.',
        prompt: 'Tucked in a basalt crack beside the viewpoint — too small for the trail board — what did they leave?',
        interaction: 'challenge',
        interactionLabel: 'Secret observation — name what you found',
        evidence: 'One correct answer, chosen by you',
        fieldNote: 'Fiction: the wrap is part of the invented mystery, not a documented find.',
        unlockCondition: { clue: 1, branch: true, waypoint: 2 },
        secretReward: { badgeId: 10, badgeName: 'Hidden Thread' },
        quiz: {
          prompt: 'Most visitors walk past this. What is caught in the crack?',
          correct: 'herb-wrap',
          options: [
            { id: 'coin', text: 'A Roman coin, still bright' },
            { id: 'herb-wrap', text: 'A small herb wrap, tied with red thread' },
            { id: 'feather', text: 'An eagle feather, freshly dropped' },
            { id: 'nail', text: 'A survey nail from the trail crew' },
          ],
        },
      },

      /* Branch-dependent final text. Built into a full narrative by
         data.revealStory(), so the renderer only has to print it. */
      reveal: {
        headline: 'YOU FOUND THE THREAD',
        connection:
          'The ibex mark at the trail head, the pause on the ledge, the token caught in the basalt, the wrap of za\'atar drying at the confluence. Four places, one traveller, and a red thread tying the wrap closed.',
        story: {
          person:
            'You followed the person and never saw their face. They set out before dawn, walked the rim while the gorge was still cold, stopped where the basalt opens onto the river, and came down to the meadow with herbs in their arms. Whatever they were carrying, they left it behind on purpose — the thread is the route, not the parcel. Somebody walked this river before the road, and left the water the only address.',
          object:
            'You followed the object and it led you further than they did. The wrap was travel-stained and tied with red thread; the herbs inside were gathered from this bank, not bought. It moved from hand to hand, gorge to meadow, until it came to rest in a crack of columnar basalt. The thread is not the traveller. The thread is the thing they carried, and where it finally stopped.',
        },
        khayt: 'You found it. Not the answer — the thread. A thread only means something once you hold both ends.',
      },

      waypoints: [
        { id: 1, name: 'Yarmouk Trail Head', type: 'Nature Reserve', status: 'active', points: 50, icon: '🌿', location: 'Yarmouk River, Northern Jordan · 32.68° N, 35.75° E',
          desc: 'The Yarmouk River is the largest tributary of the Jordan River, fed by springs from southern Syria and the Hauran plateau. At the trail head, the basalt-walled gorge drops steeply, and the sound of rushing water replaces the noise of the modern road. The trail follows the ancient path used by seasonal herders for millennia.',
          /* What the player actually does here, in the order they do it. The old
             copy described a field exercise (record two temperatures, calculate
             a gradient) while the screen showed a multiple-choice question, so
             the brief and the interaction disagreed. `challenge` is now the
             real interaction, and the field exercise is kept as the optional
             `fieldNote` it always was. */
          challenge: 'Answer KHAYT. Read the trail stone by the gate and pick the mark you can actually see. One correct answer opens Clue 1 and pays 150 ATHAR.',
          interaction: 'challenge',
          interactionLabel: 'Multiple choice — KHAYT asks a question',
          evidence: 'One correct answer, chosen by you',
          fieldNote: 'On site: read the trail stone and note what is cut into it before you choose an answer.',
          image: "assets/places/irbid/yarmouk-trail-head.svg",
          imageStatus: "placeholder",
          unlocksClue: 1,
          chapterKey: 'entrance',
          quiz: {
            prompt: 'Before you walk in, look at the trail stone by the gate. What mark is cut into it?',
            correct: 'ibex',
            options: [
              { id: 'crown', text: 'A crown — the old Hauran kings marked their road' },
              { id: 'ibex', text: 'A small ibex, horns back, mid-leap' },
              { id: 'anchor', text: 'An anchor, worn smooth by rope' },
              { id: 'sun', text: 'A sun with seven rays, painted' },
            ],
          } },
        { id: 2, name: 'Basalt Canyon Viewpoint', type: 'Geological Site', status: 'locked', points: 45, icon: '🪨', location: 'Yarmouk Gorge, Northern Jordan',
          desc: 'The Yarmouk gorge is carved through layers of ancient basalt lava flows originating from volcanic activity in the Hauran region of Syria. The exposed cliff faces reveal distinct lava episodes stacked over hundreds of thousands of years. Columnar jointing — the geometric cracking of cooling basalt — creates striking natural columns in the canyon walls.',
          challenge: 'Look around the viewpoint, then tell KHAYT what you actually saw on the basalt. Naming it correctly opens Clue 2 and pays 150 ATHAR.',
          interaction: 'observation',
          interactionLabel: 'Observation — name what you saw',
          evidence: 'One observation, chosen by you',
          fieldNote: 'On site: look for the columnar jointing before you answer, and count the separate lava flows you can pick out.',
          image: "assets/places/irbid/basalt-canyon-viewpoint.svg",
          imageStatus: "placeholder",
          unlocksClue: 2,
          chapterKey: 'follow',
          lookPrompt: 'Look around this stretch of the gorge. The next clue is not on the information board.',
          /* The observation is a validated question, not a button: you have to
             name what you actually saw before the clue opens. */
          observation: {
            prompt: 'You are standing at the viewpoint. Which of these did you just see on the basalt?',
            correct: 'boot-prints',
            options: [
              { id: 'boot-prints', text: 'Boot prints cut into the basalt dust, stopping at the ledge' },
              { id: 'column', text: 'A perfect hexagonal column, unbroken' },
              { id: 'nest', text: 'A nest, still warm, in the rock face' },
              { id: 'sign', text: 'A trail marker bolted into the wall' },
            ],
          },
          branches: {
            person: {
              name: 'The Traveler\'s Trace',
              type: 'Person',
              icon: '👣',
              desc: 'You follow the person. Boot prints cut through basalt dust along the rim, then drop toward a ledge where someone paused long enough to watch the river. The gorge still holds the heat of their passing.',
            },
            object: {
              name: 'The Carried Token',
              type: 'Object',
              icon: '🧳',
              desc: 'You follow the object. A cloth wrap is caught in a crack of columnar basalt — travel-stained, tied with a red thread. Whatever they carried from the trail head changed weight here.',
            },
          } },
        { id: 3, name: 'Migratory Bird Watch Station', type: 'Wildlife', status: 'locked', points: 55, icon: '🦅', location: 'Yarmouk Valley Bird Observatory, Northern Jordan',
          desc: 'The Yarmouk valley acts as a natural funnel for migratory birds travelling between their European breeding grounds and their African wintering grounds. Over 300 bird species have been recorded along this corridor, including raptors such as short-toed snake eagles, steppe eagles, and lesser spotted eagles.',
          challenge: 'Watch the flock, then pick the raptor this corridor is famous for in spring. One correct answer pays 150 ATHAR.',
          interaction: 'challenge',
          interactionLabel: 'Multiple choice — KHAYT asks a question',
          evidence: 'One correct answer, chosen by you',
          fieldNote: 'On site: use the identification chart for a 30-minute count and record the species, their behaviour and their direction of flight.',
          image: "assets/places/irbid/migratory-bird-watch-station.svg",
          imageStatus: "placeholder",
          chapterKey: 'follow',
          quiz: {
            prompt: 'The flock wheels and settles. KHAYT asks which raptor this corridor is famous for in spring.',
            correct: 'steppe-eagle',
            options: [
              { id: 'osprey', text: 'The osprey, hunting the shallows' },
              { id: 'steppe-eagle', text: 'The steppe eagle, riding the last thermal of the day' },
              { id: 'kingfisher', text: 'The kingfisher, holding station over the weir' },
              { id: 'vulture', text: 'The griffon vulture, circling the gorge rim' },
            ],
          } },
        { id: 4, name: 'Riverside Picnic Meadow', type: 'Local Culture', status: 'locked', points: 50, icon: '🧺', location: 'Yarmouk Riverside, Irbid Governorate',
          desc: 'At the confluence of a seasonal tributary with the Yarmouk, a flat riverside meadow has been used as a picnic and gathering spot by local Irbid families for generations. Wild herbs including za\'atar, marjoram, and mint grow along the bank. Local families traditionally prepare musakhan for outdoor meals here.',
          challenge: 'KHAYT stops hinting and asks outright what knits this thread together. One correct answer opens Clue 4 and pays 150 ATHAR, and pays 500 more if it is the last one standing.',
          interaction: 'challenge',
          interactionLabel: 'Final answer — KHAYT asks you directly',
          evidence: 'One correct answer, chosen by you',
          fieldNote: 'On site: identify the wild herbs growing along the bank, and try the za\'atar with a local guide if one is with you.',
          image: "assets/places/irbid/riverside-picnic-meadow.svg",
          imageStatus: "placeholder",
          /* The last node: answering it is what earns the reveal, so the UI
             labels it as the final answer rather than as one more question. */
          finalAnswer: true,
          unlocksClue: 4,
          chapterKey: 'connection',
          lookPrompt: 'Stand where the tributary meets the river. This is where the thread knits together.',
          /* The secret one: KHAWT stops hinting and asks the weaver outright. */
          quiz: {
            prompt: 'KHAYT, quietly: what knits this thread together?',
            correct: 'red-thread',
            options: [
              { id: 'water', text: 'The water — it joins every place here' },
              { id: 'basalt', text: 'The basalt — one wall, end to end' },
              { id: 'red-thread', text: 'A red thread, tied round what they carried' },
              { id: 'birds', text: 'The birds — they fly the whole route' },
            ],
          } },
      ],
    },

    11: {
      title: 'City of Scholars & Souk',
      subtitle: 'Irbid City Centre · 1 day · Easy · 180 points',
      city: 'Irbid',
      progress: 0,
      tip: 'Visit the souk on a Thursday morning when vendors from surrounding villages bring fresh produce, handmade baskets, and embroidered textiles. The university campus is most vibrant during term time (Oct–Jan and Feb–May).',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Yarmouk University', type: 'Academic Heritage', status: 'active', points: 40, icon: '🎓', location: 'Yarmouk University, Irbid · 32.5556° N, 35.8500° E',
          desc: 'Yarmouk University, established in 1976, is one of Jordan\'s largest and most respected universities with over 30,000 students. Its campus features significant collections of Jordanian and Levantine archaeology in the university museum, including finds from excavations at Abila, Tell Irbid, and other northern Jordan sites.',
          challenge: 'Visit the university museum and identify three artefacts from the Decapolis period. Write a short description of each, including the site of discovery and estimated date.',
          image: "assets/places/irbid/yarmouk-university.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Irbid Central Souk', type: 'Local Culture', status: 'locked', points: 45, icon: '🏺', location: 'Irbid City Centre Market, Irbid',
          desc: 'The central souk of Irbid has served the city and surrounding villages since the Ottoman period. Today it is a labyrinthine market selling spices, dried herbs, local dairy products (particularly jameed — dried fermented goat or sheep yoghurt used in mansaf), traditional embroidered textiles, copper vessels, and seasonal agricultural produce.',
          challenge: 'Find three vendors selling ingredients used in mansaf. Ask each one to explain the role of their product in preparing the dish. Photograph each ingredient with its vendor.',
          image: "assets/places/irbid/irbid-central-souk.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Irbid Archaeological Museum', type: 'Museum', status: 'locked', points: 50, icon: '🏛️', location: 'Irbid Archaeological Museum, Irbid',
          desc: 'The Irbid Archaeological Museum houses artefacts collected from excavations across northern Jordan, spanning the Chalcolithic, Bronze Age, Iron Age, Hellenistic, Roman, Byzantine, and Islamic periods. Highlights include a well-preserved Roman mosaic floor, Nabataean pottery, and Bronze Age bronze figurines.',
          challenge: 'Arrange the five highlighted artefacts in the museum\'s main hall in chronological order. For each one, note the site of discovery, the material, and the estimated period of manufacture.',
          image: "assets/places/irbid/irbid-archaeological-museum.webp" },
        { id: 4, name: 'Old Irbid Houses', type: 'Heritage Architecture', status: 'locked', points: 45, icon: '🪟', location: 'Old City Quarter, Irbid',
          desc: 'Several Ottoman-era stone houses survive in the older neighbourhoods surrounding Tell Irbid. Built from pale limestone, they feature arched doorways, interior courtyard gardens, and carved stone lintels. Local families maintain some as guesthouses, offering a rare chance to experience domestic life in a historic Levantine home.',
          challenge: 'Sketch the floor plan of one Ottoman courtyard house, identifying the function of each room as explained by the host. Note at least two architectural features that reveal the building\'s age.',
          image: "assets/places/irbid/old-irbid-houses.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // AJLOUN
    // ════════════════════════════════════════════════════════

    6: {
      title: 'Castle Among Pines',
      subtitle: 'Ajloun Forest Reserve · 2 days · Moderate · 540 points',
      city: 'Ajloun',
      progress: 0,
      tip: 'Start at the forest gate early — the pine trees hold morning mist until about 9 am. Bring sturdy shoes; the castle ramparts are uneven basalt.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 5', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '9 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Ajloun Forest Reserve Gate', type: 'Nature Reserve', status: 'active', points: 80, icon: '🌲', location: 'Ajloun Forest Reserve, Ajloun · 32.3339° N, 35.7469° E',
          desc: 'The Ajloun Forest Reserve, managed by the RSCN, covers 13 square kilometres of Mediterranean oak and pine forest in the highlands of north-western Jordan. It is home to roe deer, stone martens, porcupines, and over 100 bird species. The reserve protects one of the last remnants of the ancient forest that once covered much of the Levant.',
          challenge: 'Identify three native tree species at the forest gate using the species board. Record their scientific names, and describe how each tree species contributes to the forest ecosystem.',
          image: "assets/places/ajloun/ajloun-forest-reserve-gate.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Mar Elias Byzantine Church', type: 'Religious Heritage', status: 'locked', points: 100, icon: '⛪', location: 'Listib Village, Ajloun · 32.3400° N, 35.7400° E',
          desc: 'Mar Elias (Saint Elias) is a Byzantine church site traditionally identified as the birthplace of the Prophet Elijah. The 6th-century ruins stand on a hilltop near the village of Listib, surrounded by olive trees. Archaeological excavations have revealed mosaic floors, column bases, and evidence of continuous Christian worship from the Byzantine through the Umayyad period.',
          challenge: 'Locate the fragment of the original mosaic floor still visible in the eastern apse. Describe the geometric pattern and identify the type of tesserae (stone, glass, or terracotta) used.',
          image: "assets/places/ajloun/mar-elias-byzantine-church.webp" },
        { id: 3, name: 'Ajloun Castle (Qal\'at ar-Rabad)', type: 'Islamic Fortress', status: 'locked', points: 120, icon: '🏰', location: 'Ajloun Castle, Ajloun · 32.3285° N, 35.7517° E · 1,250m elevation',
          desc: 'Ajloun Castle was built between 1184 and 1185 CE by Izz al-Din Usama, a nephew of Saladin, on a strategic hilltop overlooking three wadis and the Jordan Valley. Its purpose was to control the iron mines of Ajloun and to serve as a stronghold against Crusader expansion from Belvoir Castle across the Jordan River. The castle was expanded under the Ayyubid and Mamluk sultans and remained in use until the 19th century.',
          challenge: 'From the castle\'s highest tower, identify the three wadis visible below and the direction of the Jordan Valley. Locate the iron-reinforced gate and count the number of arrow slits on the southern curtain wall.',
          image: "assets/places/ajloun/ajloun-castle-qalat-ar-rabad.webp" },
        { id: 4, name: 'Ancient Olive Grove', type: 'Nature & Heritage', status: 'locked', points: 120, icon: '🫒', location: 'Ajloun Highlands Olive Groves, Ajloun',
          desc: 'The olive groves surrounding Ajloun contain trees estimated to be 1,000 to 2,000 years old. The Ajloun highlands have been a centre of olive cultivation since at least the Roman period, and local varieties — particularly the Nabali Baladi — produce a distinctive, robust extra-virgin olive oil prized across the Levant.',
          challenge: 'Measure the circumference of the widest olive trunk in the grove. Using the standard growth rate of 2.5 cm per year, estimate the tree\'s minimum age. Document your method and result.',
          image: "assets/places/ajloun/ancient-olive-grove.svg",
          imageStatus: "placeholder" },
        { id: 5, name: 'Orjan Village & Local Feast', type: 'Local Culture', status: 'locked', points: 120, icon: '🏡', location: 'Orjan Village, Ajloun · 32.3500° N, 35.7300° E',
          desc: 'The village of Orjan sits at the heart of the Ajloun highlands and is the home base of the RSCN\'s community tourism programme. Local families run guesthouses and prepare traditional highland meals featuring dishes unique to the region: freekeh soup, stuffed grape leaves, musakhan, and fresh yoghurt with local olive oil.',
          challenge: 'Participate in preparing one traditional dish with a local family. Ask about the origin of the recipe and at least two local ingredients that cannot easily be found elsewhere in Jordan.',
          image: "assets/places/ajloun/orjan-village-local-feast.svg",
          imageStatus: "placeholder" },
      ],
    },

    12: {
      title: 'The Olive Oil Journey',
      subtitle: 'Ajloun Olive Groves · 1 day · Easy · 310 points',
      city: 'Ajloun',
      progress: 0,
      tip: 'Best experienced in October–November during olive harvest. The oil press and soap house operate year-round by arrangement.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '6 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Olive Grove Harvest', type: 'Culinary Experience', status: 'active', points: 70, icon: '🫒', location: 'Ajloun Highlands Olive Groves, Ajloun',
          desc: 'The olive harvest (al-qitar) in Ajloun runs from October through early December. Families spread large nets under the trees and use long rakes to pull the olives from the branches. The Nabali Baladi variety produces an intensely flavoured green oil when pressed early in the season. Harvesting is a communal activity, and neighbours help each other across the season.',
          challenge: 'Harvest olives from at least three trees using the traditional raking method. Weigh your harvest and estimate how many litres of oil a full season\'s yield from those trees would produce.',
          image: "assets/places/ajloun/olive-grove-harvest.svg",
          imageStatus: "placeholder" },
        { id: 2, name: "Traditional Oil Press (Mu'sara)", type: 'Culinary Heritage', status: 'locked', points: 80, icon: '⚙️', location: 'Ajloun Village Oil Press, Ajloun',
          desc: 'The mu\'sara (traditional stone oil press) has been used in the Levant for at least 8,000 years. In Ajloun, several villages still operate stone mill presses alongside modern centrifuge presses. The freshly harvested olives are first crushed into a paste by a heavy rotating millstone, then pressed to extract the oil.',
          challenge: 'Follow the full pressing process from crushed paste to bottled oil. Record the weight of olives used and the final volume of oil produced. Calculate the oil yield percentage.',
          image: "assets/places/ajloun/traditional-oil-press-musara.webp" },
        { id: 3, name: 'Soap House Workshop', type: 'Craft Workshop', status: 'locked', points: 80, icon: '🧼', location: 'RSCN Ajloun Soap House, Orjan Village, Ajloun',
          desc: 'The Ajloun Soap House, run by the RSCN community programme, produces traditional olive-oil soap using the cold-process method. Olive oil, water, and sodium hydroxide are combined at precise ratios, poured into moulds, and left to cure for four to six weeks. Similar soaps have been produced in the Levant since at least the 7th century CE.',
          challenge: 'Make one bar of olive-oil soap using the cold-process method under the guidance of the workshop artisan. Label your soap with the exact ingredients and ratios used.',
          image: "assets/places/ajloun/soap-house-workshop.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Guesthouse Lunch with Fresh Oil', type: 'Culinary Culture', status: 'locked', points: 80, icon: '🍽️', location: 'Orjan Village Guesthouse, Ajloun',
          desc: 'The highlight of the olive oil journey is a traditional lunch at a local guesthouse using oil pressed that same morning. The meal centres on the classic Levantine spread: labneh drizzled with the fresh green oil, za\'atar and oil for dipping bread, fried eggs in olive oil, olives cured in the family\'s traditional recipe.',
          challenge: 'Taste the fresh-pressed oil next to a commercial olive oil. Describe the differences in colour, aroma, and flavour. Ask the host which quality characteristics define Ajloun olive oil compared to other regions.',
          image: "assets/places/ajloun/guesthouse-lunch-with-fresh-oil.svg",
          imageStatus: "placeholder" },
      ],
    },

    13: {
      title: 'Forest Soul Trail',
      subtitle: 'Ajloun Highland Trails · 2 days · Moderate · 240 points',
      city: 'Ajloun',
      progress: 0,
      tip: 'The Soap Trail (8 km) and Roe Deer Trail (4 km) are the reserve\'s two most popular walking routes. Book woodland lodges in advance through the RSCN.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '7 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Ajloun Forest Main Trail', type: 'Nature Trail', status: 'active', points: 60, icon: '🦌', location: 'Ajloun Forest Reserve, Ajloun · 32.3339° N, 35.7469° E',
          desc: 'The Ajloun Forest Reserve\'s main hiking trail winds through dense stands of Kermes oak, Aleppo pine, strawberry tree, and carob. The reserve is home to the roe deer, whose population here is one of the last viable wild populations in the Arab world, the result of a successful RSCN reintroduction programme begun in 1993.',
          challenge: 'Walk the full Soap Trail (8 km) and document every plant species you can identify using the trail guide. Note the GPS waypoints of any wildlife sightings.',
          image: "assets/places/ajloun/ajloun-forest-main-trail.svg",
          imageStatus: "placeholder" },
        { id: 2, name: "Al-Ayal Women's Cooperative", type: 'Community', status: 'locked', points: 60, icon: '🧵', location: 'Orjan Village, Ajloun',
          desc: 'The Al-Ayal Women\'s Cooperative in Orjan was established through the RSCN\'s community tourism programme to provide sustainable income for local women. The cooperative produces traditional Ajloun embroidery, hand-woven textiles, nature-dyed scarves, and botanical products made from local herbs and beeswax.',
          challenge: 'Learn the primary embroidery stitch used in traditional Ajloun needlework and replicate a simple geometric pattern. Ask about the symbolic meaning of the pattern you chose.',
          image: "assets/places/ajloun/al-ayal-womens-cooperative.webp" },
        { id: 3, name: 'Eagle Viewpoint', type: 'Scenic', status: 'locked', points: 60, icon: '🦅', location: 'Eagle Viewpoint, Ajloun Forest Reserve · 1,250m elevation',
          desc: 'At 1,250 metres above sea level, the Eagle Viewpoint on the western edge of the reserve offers a sweeping panorama over the Jordan Valley, the West Bank, and on clear days as far as the Mediterranean coast. Short-toed snake eagles and long-legged buzzards breed in the reserve and are regularly seen soaring on the thermals.',
          challenge: 'Photograph the same panorama at dawn and at noon. Describe how atmospheric haze, shadow direction, and light quality change between the two shots.',
          image: "assets/places/ajloun/eagle-viewpoint.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Woodland Lodge Night', type: 'Nature Stay', status: 'locked', points: 60, icon: '🌙', location: 'RSCN Woodland Lodges, Ajloun Forest Reserve · 1,200m elevation',
          desc: 'The reserve\'s woodland lodges, built from local stone and timber, sit among the pines at 1,200 metres. The elevation means cool summers and cold winters, with frost possible December–February. The absence of light pollution makes the reserve one of the best stargazing spots in northern Jordan.',
          challenge: 'Using a star chart, identify five constellations visible from the lodge terrace. Photograph the night sky with a long exposure and describe what you hear in the forest after midnight.',
          image: "assets/places/ajloun/woodland-lodge-night.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // JERASH
    // ════════════════════════════════════════════════════════

    2: {
      title: "Hadrian's City",
      subtitle: 'Roman Gerasa · 1 day · Easy · 310 points',
      city: 'Jerash',
      progress: 45,
      tip: 'Visit early — by 10 am the site fills with tour groups. The best light for the Oval Plaza is in the morning when the colonnades cast long parallel shadows.',
      stats: [
        { label: 'Points Earned', value: '139', icon: '⭐' },
        { label: 'Waypoints Done', value: '3 / 6', icon: '⊕' },
        { label: 'Thread Progress', value: '45%', icon: '🧵' },
        { label: 'Est. Remaining', value: '3 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: "Hadrian's Arch", type: 'Roman Monument', status: 'completed', points: 45, icon: '🏛️', location: 'South Gate, Jerash Archaeological Site · 32.2764° N, 35.8903° E',
          desc: "Hadrian's Arch was built in 129–130 CE to commemorate the visit of Emperor Hadrian to Gerasa. Standing 21 metres high, it marked the southern entrance and served as a monumental gateway. The arch was originally intended as the southern gate of a new city expansion — a project never completed — leaving it standing in isolation.",
          challenge: "Measure the arch's approximate shadow length at noon and use the angle of the sun to estimate the arch's actual height. Compare your estimate with the published height of 21 metres.",
          image: "assets/places/jerash/hadrians-arch.webp" },
        { id: 2, name: 'Oval Plaza (Forum)', type: 'Roman Forum', status: 'completed', points: 50, icon: '⭕', location: 'Oval Forum, Jerash Archaeological Site · 32.2809° N, 35.8907° E',
          desc: 'The Oval Plaza of Gerasa is unique in the Roman world — no other known Roman forum has an oval shape. Built in the 1st century CE, it measures 80 by 90 metres and is surrounded by a colonnade of 56 Ionic columns. Its irregular shape is thought to have resolved an angular mismatch between the cardo and the axis of the Temple of Zeus.',
          challenge: "Walk the perimeter of the oval and count the surviving column drums. Calculate what percentage of the original colonnade's columns remain standing or partially reconstructed.",
          image: "assets/places/jerash/oval-plaza-forum.webp" },
        { id: 3, name: 'Temple of Artemis', type: 'Roman Temple', status: 'completed', points: 50, icon: '⚡', location: 'Temple of Artemis, Jerash · 32.2820° N, 35.8910° E',
          desc: 'The Temple of Artemis, patron goddess of Gerasa, was built in the 2nd century CE. Of the original 12 columns of the temple\'s peristyle, 11 survive. One column capital is so finely balanced that it sways perceptibly in a strong wind without falling.',
          challenge: "Locate the column that visibly sways in the wind. Observe and describe the engineering principle that makes a 9-metre-tall column stable while remaining sensitive to wind.",
          image: "assets/places/jerash/temple-of-artemis.webp" },
        { id: 4, name: 'Cardo Maximus', type: 'Roman Street', status: 'active', points: 55, icon: '🛤️', location: 'Cardo Maximus, Jerash Archaeological Site',
          desc: "The Cardo Maximus of Gerasa, stretching 600 metres from the Oval Plaza to the northern gate, is one of the best-preserved colonnaded streets in the ancient world. Approximately 500 column shafts lined the street. The chariot ruts worn into the paving by centuries of wheeled traffic are still visible.",
          challenge: 'Find and photograph at least three chariot ruts worn into the original paving stones. Measure the width of the ruts and compare this to the standard Roman wheel gauge documented in the site guidebook.',
          image: "assets/places/jerash/cardo-maximus.webp" },
        { id: 5, name: 'South Theatre', type: 'Roman Theatre', status: 'locked', points: 55, icon: '🎭', location: 'South Theatre, Jerash Archaeological Site',
          desc: "Gerasa's South Theatre was built in the late 1st century CE. It seats approximately 3,000 spectators in 32 rows of limestone seats. The theatre is still used today for performances during the annual Jerash Festival of Culture and Arts.",
          challenge: 'Stand at the centre of the orchestra and speak at normal volume while a companion stands at the top row. Can they hear you clearly? Describe the acoustic design features that make this possible.',
          image: "assets/places/jerash/south-theatre.webp" },
        { id: 6, name: 'Hippodrome', type: 'Roman Sports Venue', status: 'locked', points: 55, icon: '🏇', location: 'Hippodrome, Jerash Archaeological Site',
          desc: "Jerash's hippodrome measures 244 metres long and 52 metres wide and could accommodate 15,000 spectators. Today, the Roman Army and Chariot Experience (RACE) stages chariot races and gladiatorial displays in the hippodrome using historically accurate equipment.",
          challenge: 'Identify and explain three physical features of the hippodrome (the spina, the carceres, and the turning posts) and their function during a race.',
          image: "assets/places/jerash/hippodrome.webp" },
      ],
    },

    14: {
      title: 'Living Jerash',
      subtitle: 'Old City & Souk · 1 day · Easy · 220 points',
      city: 'Jerash',
      progress: 0,
      tip: 'The Jerash Festival of Culture and Arts takes place every July and fills the ancient theatre and modern city with music, dance, and theatre from across the Arab world.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Old City Souk', type: 'Local Market', status: 'active', points: 50, icon: '🏪', location: 'Jerash City Souk, Jerash',
          desc: 'The Jerash city souk occupies the streets immediately east of the Roman archaeological zone. Vendors sell Roman-era replica pottery, carved olive-wood souvenirs, Jerash textiles, local ceramics, and fresh produce from the surrounding Ajloun and Jarash highlands.',
          challenge: 'Find a vendor selling a product made locally (not imported). Ask them to explain the production process and the locally sourced materials. Photograph both the product and the raw material.',
          image: "assets/places/jerash/old-city-souk.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Birketein Ancient Reservoir', type: 'Heritage Site', status: 'locked', points: 60, icon: '💧', location: 'Birketein, 2 km north of Jerash · 32.2950° N, 35.8900° E',
          desc: 'Birketein ("two pools") is a Roman site 2 kilometres north of Jerash consisting of two large ancient reservoirs and a small theatre. The site was associated with the Festival of Maiuma — a water festival in which theatrical performances were staged on platforms erected over the pools.',
          challenge: 'Compare the dimensions of the Birketein theatre to the South Theatre in the main site. Which is larger, and what does the difference in capacity suggest about its intended audience?',
          image: "assets/places/jerash/birketein-ancient-reservoir.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Beit Jerash Heritage House', type: 'Heritage Architecture', status: 'locked', points: 55, icon: '🪟', location: 'Old City Quarter, Jerash',
          desc: "Beit Jerash is a restored 19th-century stone house converted into a community heritage centre. Its architecture is typical of the late Ottoman highland style: thick limestone walls, arched windows, central courtyard with a fig tree, and a guest reception room (diwan) with a carved stone fireplace.",
          challenge: 'Sketch the floor plan of Beit Jerash from the entrance courtyard to the diwan. Identify three architectural features that distinguish Ottoman-era highland construction from modern building techniques.',
          image: "assets/places/jerash/beit-jerash-heritage-house.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Craft Workshops Quarter', type: 'Craft Heritage', status: 'locked', points: 55, icon: '🏺', location: 'Craft Quarter near North Gate, Jerash',
          desc: 'A cluster of traditional craft workshops near the northern gate produces hand-painted Jerash ceramics, Circassian silver jewellery, and inlaid woodwork. The Circassian community — descendants of refugees from the Caucasus who settled in Jerash in 1878 — maintain distinctive embroidery and metalwork traditions.',
          challenge: 'Identify one craft produced by the Circassian community and one produced by the indigenous Jordanian community. Describe two specific differences in technique, motif, or material between them.',
          image: "assets/places/jerash/craft-workshops-quarter.svg",
          imageStatus: "placeholder" },
      ],
    },

    15: {
      title: 'Temples & Gods of Gerasa',
      subtitle: 'Sacred Jerash · 1 day · Easy · 280 points',
      city: 'Jerash',
      progress: 0,
      tip: 'The Nymphaeum is best photographed in late afternoon when the low sun catches the half-dome. The Byzantine church mosaics are inside — bring a small torch for the floor details.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '4 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Temple of Zeus', type: 'Roman Temple', status: 'active', points: 70, icon: '⚡', location: 'Temple of Zeus, Jerash · 32.2800° N, 35.8895° E',
          desc: 'The Temple of Zeus at Gerasa was built in 162 CE on the city\'s highest point, overlooking the Oval Plaza. It was dedicated to Zeus Olympios and replaced an earlier Hellenistic sanctuary. The massive podium still stands, along with fragments of its Corinthian columns and the Zeus Altar Court.',
          challenge: 'Climb to the temple podium and locate the threshold stone of the cella door. Measure its width and estimate the scale of the original door it supported.',
          image: "assets/places/jerash/temple-of-zeus.webp" },
        { id: 2, name: 'Nymphaeum Fountain', type: 'Roman Fountain', status: 'locked', points: 70, icon: '⛲', location: 'Nymphaeum, Jerash Cardo Maximus',
          desc: "The Nymphaeum of Gerasa, built around 191 CE, was the city's monumental public fountain. Dedicated to the nymphs, it was elaborately decorated with marble veneer, statuary niches, a semi-circular façade, and bronze lion-head spouts from which water cascaded into a large basin.",
          challenge: 'Find the original drain channel at the base of the Nymphaeum. Trace it along the cardo and estimate how far it runs before disappearing under modern fill.',
          image: "assets/places/jerash/nymphaeum-fountain.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Cathedral and Fountain Court', type: 'Byzantine Church', status: 'locked', points: 70, icon: '✝️', location: 'Cathedral Complex, Jerash',
          desc: "Gerasa's Cathedral was built in the 4th century CE over an earlier pagan shrine. The adjacent Fountain Court was the site of an annual water miracle — the turning of water into wine — which drew Christian pilgrims to Jerash from across the Byzantine Empire.",
          challenge: 'Find at least three spolia (reused stones from earlier pagan buildings) incorporated into the Cathedral\'s walls. Describe the stylistic features that give away their earlier origin.',
          image: "assets/places/jerash/cathedral-and-fountain-court.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Church of St. John the Baptist', type: 'Byzantine Mosaics', status: 'locked', points: 70, icon: '🎨', location: 'Church of St. John the Baptist, Jerash',
          desc: 'Jerash contains the remains of 15 Byzantine churches, many with mosaic floors still in place. The Church of St. John the Baptist, built around 531 CE, retains sections of its original geometric mosaic floor in the nave and apse, including figurative panels depicting animals, birds, and personifications of the seasons.',
          challenge: 'Identify and sketch three different geometric mosaic patterns in the church floor. For each pattern, describe whether it creates an optical illusion of three-dimensional depth.',
          image: "assets/places/jerash/church-of-st-john-the-baptist.webp" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // AMMAN
    // ════════════════════════════════════════════════════════

    5: {
      title: "The Capital's Layers",
      subtitle: 'Amman Citadel & Old City · 1 day · Easy · 350 points',
      city: 'Amman',
      progress: 20,
      tip: 'The Citadel is best visited in the afternoon when the Roman Theatre below is lit by the setting sun. The Jordan Museum is closed on Tuesdays.',
      stats: [
        { label: 'Points Earned', value: '70', icon: '⭐' },
        { label: 'Waypoints Done', value: '1 / 5', icon: '⊕' },
        { label: 'Thread Progress', value: '20%', icon: '🧵' },
        { label: 'Est. Remaining', value: '4 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: "Amman Citadel (Jabal al-Qal'a)", type: 'Archaeological Complex', status: 'completed', points: 70, icon: '🏰', location: "Amman Citadel (Jabal al-Qal'a), Amman · 31.9539° N, 35.9348° E",
          desc: "Amman Citadel is a hilltop archaeological site continuously inhabited since the Bronze Age, spanning 7,000 years. It contains remains of a Bronze Age temple, Iron Age city wall, Roman Temple of Hercules, Byzantine basilica, and Umayyad Palace complex. From the hilltop, the entire bowl of Amman spread across its seven hills is visible.",
          challenge: "Walk the citadel from its earliest Bronze Age wall to its latest Umayyad gateway. At each major monument, identify the civilization that built it and the approximate century of construction.",
          image: "assets/places/amman/amman-citadel-jabal-al-qala.webp" },
        { id: 2, name: 'Temple of Hercules', type: 'Roman Temple', status: 'active', points: 70, icon: '🏛️', location: 'Temple of Hercules, Amman Citadel · 31.9543° N, 35.9352° E',
          desc: "The Temple of Hercules at the Amman Citadel was built during the reign of Marcus Aurelius (161–180 CE). Only a few Corinthian columns remain standing, but a giant carved hand — possibly part of a colossal statue of Hercules originally measuring 12–13 metres tall — survives at the site.",
          challenge: "Photograph the giant hand fragment of the Hercules statue. Using the proportional relationship between hand size and total body height (approximately 1:10), estimate the full height the complete statue would have reached.",
          image: "assets/places/amman/temple-of-hercules.webp" },
        { id: 3, name: 'Umayyad Palace', type: 'Islamic Heritage', status: 'locked', points: 70, icon: '🕌', location: 'Umayyad Palace, Amman Citadel',
          desc: "The Umayyad Palace at the Amman Citadel was the residence of the Umayyad governor of Amman in the 8th century CE. Its monumental domed gateway (throne room) is one of the largest and best-preserved Umayyad architectural spaces in Jordan.",
          challenge: "Stand inside the domed throne room and observe how the light enters through the oculus and windows. Describe how the dome design creates a sense of grandeur for visitors arriving for an audience.",
          image: "assets/places/amman/umayyad-palace.webp" },
        { id: 4, name: 'Roman Theatre of Philadelphia', type: 'Roman Theatre', status: 'locked', points: 70, icon: '🎭', location: 'Roman Theatre, Downtown Amman · 31.9505° N, 35.9323° E',
          desc: "Amman's Roman Theatre was built during the reign of Antoninus Pius (138–161 CE) into a north-facing hillside. It seats approximately 6,000 people in 33 rows of limestone seats and is one of the largest Roman theatres in the Middle East. It is still used for concerts and cultural events.",
          challenge: "Stand at the exact centre of the orchestra and count the rows of seating. Calculate the total seating capacity and compare with the published figure of 6,000.",
          image: "assets/places/amman/roman-theatre-of-philadelphia.webp" },
        { id: 5, name: 'Jordan Museum', type: 'National Museum', status: 'locked', points: 70, icon: '🏺', location: 'Jordan Museum, Ras al-Ain, Amman · 31.9557° N, 35.9219° E',
          desc: "The Jordan Museum in Ras al-Ain is Jordan's premier national museum, opened in 2014. Its collection spans 1.5 million years of human history. Highlights include the Ain Ghazal statues (among the oldest large human statues in the world, c. 7250–6500 BCE) and the Dead Sea Scrolls copper scroll.",
          challenge: "Locate the Ain Ghazal statues and describe how these 9,000-year-old plaster figures were made, what material was used, and why their discovery in Amman was significant for understanding early human civilisation.",
          image: "assets/places/amman/jordan-museum.webp" },
      ],
    },

    16: {
      title: 'Downtown Flavors',
      subtitle: 'Al-Balad Old City · 1 day · Easy · 290 points',
      city: 'Amman',
      progress: 0,
      tip: "Hashem Restaurant is most atmospheric for breakfast (7–10 am) and for a late-night snack around midnight.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: "Al-Balad Old City Market", type: 'Local Market', status: 'active', points: 70, icon: '🧅', location: 'Al-Balad Downtown, Amman · 31.9544° N, 35.9296° E',
          desc: "Al-Balad is Amman's historic downtown, a dense grid of streets descending from the Citadel hill to the valley floor. Its market lanes sell dried goods, spices, fresh vegetables, traditional sweets, gold and silver jewellery, fabrics, and household goods.",
          challenge: "Buy the ingredients for a traditional Jordanian breakfast: labneh, za'atar, olive oil, fresh bread, and seasonal fruit. Record the price of each item and calculate the total cost.",
          image: "assets/places/amman/al-balad-old-city-market.webp" },
        { id: 2, name: "Hashem Restaurant", type: 'Culinary Heritage', status: 'locked', points: 75, icon: '🧆', location: 'Hashem Restaurant, Prince Mohammad Street, Downtown Amman',
          desc: "Hashem Restaurant on Prince Mohammad Street has been serving falafel, ful, hummus, and fresh flatbread since 1952. It has no menu, serves the same dishes every day, is open 24 hours, and is beloved by both working-class Ammanites and heads of state.",
          challenge: "Order a full Hashem breakfast (falafel, ful, hummus, and flatbread) and ask the server to explain the preparation of ful — including cooking time, spices used, and how it differs from Egyptian ful medames.",
          image: "assets/places/amman/hashem-restaurant.webp" },
        { id: 3, name: "Abu Jbara — Kanafeh", type: 'Culinary Heritage', status: 'locked', points: 75, icon: '🍮', location: 'Abu Jbara Sweet Shop, Downtown Amman',
          desc: "Kanafeh is Jordan's most beloved sweet: shredded wheat pastry layered with soft white cheese, soaked in rose-water sugar syrup, and finished with crushed pistachios. Abu Jbara in downtown Amman is one of the oldest kanafeh shops in the city, still using a wood-fired oven.",
          challenge: "Taste a full portion of kanafeh and describe the contrast of textures and flavour profile. Ask the vendor what makes Nabulsi cheese different from other soft white cheeses.",
          image: "assets/places/amman/abu-jbara-kanafeh.svg",
          imageStatus: "placeholder" },
        { id: 4, name: "King Faisal Street & Sweet Shops", type: 'Culinary Culture', status: 'locked', points: 70, icon: '🍬', location: 'King Faisal Street, Downtown Amman',
          desc: "King Faisal Street is the main commercial artery of downtown Amman, lined with sweet shops, juice bars, and traditional confectioners. The street is famous for baklawa, mamoul, ghraybeh, and basbousa. Several shops have operated for over 50 years.",
          challenge: "Visit at least three different sweet shops and taste their signature product. Ask each vendor about the origin of their recipe. Report your top choice and justify it.",
          image: "assets/places/amman/king-faisal-street-sweet-shops.svg",
          imageStatus: "placeholder" },
      ],
    },

    17: {
      title: 'Modern Soul of Amman',
      subtitle: "Jabal Weibdeh & Rainbow Street · 1 day · Easy · 240 points",
      city: 'Amman',
      progress: 0,
      tip: "Rainbow Street is quietest on weekday mornings. Thursday evenings it transforms into Amman's most vibrant street.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: "Rainbow Street", type: 'Local Culture', status: 'active', points: 60, icon: '🌈', location: 'Rainbow Street, Jabal Amman, Amman · 31.9573° N, 35.9219° E',
          desc: "Rainbow Street on Jabal Amman is Amman's most cosmopolitan street — a kilometre of independent cafes, bookshops, art galleries, vintage clothing stores, and restaurants occupying historic 1940s and 1950s limestone villas. It hosts the weekly Friday Farmers' Market.",
          challenge: "Walk the full length of Rainbow Street and identify one business in each category: food, art, and books. For each, find out how long it has operated and what makes it distinct.",
          image: "assets/places/amman/rainbow-street.webp" },
        { id: 2, name: "Darat al Funun Art Centre", type: 'Art & Culture', status: 'locked', points: 60, icon: '🎨', location: 'Darat al Funun, Jabal Weibdeh, Amman · 31.9616° N, 35.9244° E',
          desc: "Darat al Funun (\"Houses of the Arts\") is one of the Arab world's most respected contemporary art centres, established in 1993 in a complex of historic 1920s villas on Jabal Weibdeh. It houses exhibition spaces, a research library, artist studios, a Byzantine church site, and gardens.",
          challenge: "Visit the current exhibition and select one work that you find most compelling. Write a 150-word response describing what the work is, what it communicates, and one question you would ask the artist.",
          image: "assets/places/amman/darat-al-funun-art-centre.svg",
          imageStatus: "placeholder" },
        { id: 3, name: "Wild Jordan Center", type: 'Conservation Culture', status: 'locked', points: 60, icon: '🌿', location: 'Wild Jordan Center, Jabal Amman, Amman',
          desc: "Wild Jordan Center is the RSCN's flagship urban visitor centre. Its rooftop terrace overlooks downtown Amman and the Citadel hill. The centre's shop sells products made by community cooperatives in RSCN reserves — honey from Dana, olive oil from Ajloun, handwoven textiles from Azraq.",
          challenge: "Browse the Wild Jordan shop and identify one product from each of three different conservation areas in Jordan. For each, find out which community produced it and how selling it supports conservation.",
          image: "assets/places/amman/wild-jordan-center.svg",
          imageStatus: "placeholder" },
        { id: 4, name: "Jabal Weibdeh Gallery Walk", type: 'Art & Culture', status: 'locked', points: 60, icon: '🖼️', location: 'Jabal Weibdeh Art District, Amman',
          desc: "Jabal Weibdeh is Amman's original arts district, home to a concentration of independent galleries, studios, and cultural spaces. The neighbourhood attracted Jordan's intellectual and artistic community from the 1950s onward and still houses the studios of prominent Jordanian painters, sculptors, and ceramicists.",
          challenge: "Visit two galleries in Jabal Weibdeh and speak with a gallery owner or artist. Find out how the Jordanian art market has changed in the past decade and what themes Jordanian artists most commonly explore.",
          image: "assets/places/amman/jabal-weibdeh-gallery-walk.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // DEAD SEA
    // ════════════════════════════════════════════════════════

    8: {
      title: 'Lowest Place on Earth',
      subtitle: 'Dead Sea Shoreline · 2 days · Easy · 240 points',
      city: 'Dead Sea',
      progress: 0,
      tip: 'Never splash or put your face in the Dead Sea water. Wear water shoes: the shoreline is covered in sharp salt crystals. Rinse off immediately after floating.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '7 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Dead Sea Shore Float', type: 'Nature', status: 'active', points: 60, icon: '💧', location: 'Dead Sea Shoreline, Jordan · 31.5590° N, 35.4732° E · −430m elevation',
          desc: "The Dead Sea, at approximately 430 metres below sea level, is the lowest point on Earth's land surface. Its salinity averages 34.2% — nearly ten times that of the world's oceans — making the water so dense that bathers cannot sink. The Dead Sea has been shrinking by approximately one metre per year due to water diversion from the Jordan River.",
          challenge: "Float on your back in the Dead Sea without any effort to stay afloat. Record how long you can float completely still. Note the taste of the air at the shoreline — the increased atmospheric pressure at −430m affects how much oxygen each breath contains.",
          image: "assets/places/dead-sea/dead-sea-shore-float.webp" },
        { id: 2, name: 'Salt Crystal Formations', type: 'Geology', status: 'locked', points: 60, icon: '🔬', location: 'Dead Sea Shoreline, Jordan',
          desc: "Along the Dead Sea's Jordanian shoreline, white salt formations grow in crystalline structures wherever the lake water evaporates. The primary mineral is halite (sodium chloride), but the brine also contains high concentrations of magnesium chloride, calcium chloride, and potassium chloride.",
          challenge: "Collect a small sample of the white shoreline crust. Describe the crystal structure. Taste a tiny amount (on the tip of a dry finger only) — how does it compare in flavour to ordinary table salt, and why?",
          image: "assets/places/dead-sea/salt-crystal-formations.webp" },
        { id: 3, name: 'Wadi Mujib Siq Trail', type: 'Adventure', status: 'locked', points: 60, icon: '🏞️', location: 'Wadi Mujib Nature Reserve, Dead Sea · 31.4736° N, 35.5690° E',
          desc: "Wadi Mujib is a dramatic canyon nature reserve where the Mujib River cuts through 1,000 metres of sandstone and limestone to reach the Dead Sea shore. The Siq Trail involves wading through the river canyon for 2 kilometres, scrambling over boulders, and swimming through a deep pool. Canyon walls rise up to 100 metres on either side.",
          challenge: "Complete the Wadi Mujib Siq Trail. Photograph the highest point you can reach on the canyon walls and estimate the wall height above you using a proportional reference.",
          image: "assets/places/madaba/wadi-mujib-siq-trail.svg",
          imageStatus: "placeholder" },
        { id: 4, name: "Lot's Pillar Viewpoint", type: 'Religious Heritage', status: 'locked', points: 60, icon: '🧂', location: "Ghor as-Safi (near ancient Zoar), Dead Sea Region",
          desc: "A natural salt pillar formation near Ghor as-Safi has been identified since Byzantine times with Lot's wife, who according to Genesis was turned into a pillar of salt. The site is near the ancient city of Zoar and the Byzantine monastery of Deir Ain Abata.",
          challenge: "Visit the salt pillar and describe the geological process — evaporite deposition — that actually creates salt pillars in this landscape, and explain why this area has generated multiple such formations.",
          image: "assets/places/dead-sea/lots-pillar-viewpoint.svg",
          imageStatus: "placeholder" },
      ],
    },

    18: {
      title: 'Mud & Minerals',
      subtitle: 'Dead Sea Resorts · 1 day · Easy · 190 points',
      city: 'Dead Sea',
      progress: 0,
      tip: 'Apply Dead Sea mud and let it dry for 15 minutes before rinsing. Most resorts provide towels and changing rooms.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 3', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Dead Sea Mud Spa', type: 'Wellness', status: 'active', points: 65, icon: '🛁', location: 'Dead Sea Spa Resort, Dead Sea Shore, Jordan',
          desc: "Dead Sea black mud, drawn from the lake bed, has been used therapeutically since antiquity. Cleopatra reportedly used Dead Sea minerals for skin care. The mud is rich in magnesium, calcium, potassium, and bromide. Clinical studies have shown measurable improvement in psoriasis, rheumatoid arthritis, and eczema following Dead Sea mud treatment.",
          challenge: "Apply Dead Sea mud to both arms, leave it for 15 minutes, then rinse one arm with Dead Sea water and the other with fresh water. Compare the skin texture on each arm after 30 minutes.",
          image: "assets/places/dead-sea/dead-sea-mud-spa.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Mineral Water Float', type: 'Wellness', status: 'locked', points: 60, icon: '🌊', location: 'Dead Sea Resort Pool, Dead Sea Shore',
          desc: "The Dead Sea's mineral-rich water has been prescribed as a therapeutic destination for skin and joint conditions since at least the Roman period. The combination of UV-filtered sunlight, high oxygen levels from elevated atmospheric pressure, and mineral-laden water creates conditions documented as clinically beneficial for multiple chronic conditions.",
          challenge: "Float for 20 minutes while consciously relaxing all muscles. Afterwards, record your heart rate and breathing rate and compare them to your measurements before entering.",
          image: "assets/places/dead-sea/mineral-water-float.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Sunset at Amman Beach', type: 'Scenic', status: 'locked', points: 65, icon: '🌅', location: 'Amman Beach Public Resort, Dead Sea',
          desc: "Amman Beach is the largest public Dead Sea resort on the Jordanian side. At sunset, the Dead Sea light turns the water and salt flats extraordinary shades of gold and pink. The West Bank mountains across the water are silhouetted against the last light, and on clear evenings the lights of Jerusalem can be seen on the ridge.",
          challenge: "Photograph the Dead Sea sunset sequence at 10-minute intervals for an hour before sunset. Note the exact times when the colour of the water shifts from blue to gold to pink to silver.",
          image: "assets/places/balqa/sunset-at-amman-beach.svg",
          imageStatus: "placeholder" },
      ],
    },

    19: {
      title: 'Sacred Valley',
      subtitle: 'Baptism Site & Biblical Landmarks · 2 days · Easy · 250 points',
      city: 'Dead Sea',
      progress: 0,
      tip: "The Baptism Site requires a guided tour — guides are mandatory and informative. Lot's Sanctuary involves a short climb; wear sun protection.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '7 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Bethany Beyond the Jordan', type: 'UNESCO World Heritage', status: 'active', points: 65, icon: '✝️', location: 'Al-Maghtas (Bethany Beyond the Jordan), Jordan · 31.8403° N, 35.5517° E',
          desc: "Bethany Beyond the Jordan (Al-Maghtas) is the site where, according to the Gospel of John, Jesus was baptised by John the Baptist. Identified by the Byzantine pilgrim Egeria in 384 CE, it became a UNESCO World Heritage Site in 2015. Archaeological excavations have revealed 17 Byzantine and early Islamic church structures and pilgrims' pools.",
          challenge: "Visit both the main baptism pool and the higher-ground church complex. Identify at least three physical features at the site that archaeologists use to date its use to the Byzantine period.",
          image: "assets/places/balqa/bethany-beyond-the-jordan.svg",
          imageStatus: "placeholder" },
        { id: 2, name: "John the Baptist Churches", type: 'Byzantine Heritage', status: 'locked', points: 60, icon: '🏛️', location: 'Church Complex Hill, Al-Maghtas, Jordan',
          desc: "The hilltop complex above the baptism site contains the ruins of multiple overlapping Byzantine churches dedicated to John the Baptist, built and rebuilt between the 4th and 8th centuries CE. Below the hilltop, a sequence of pilgrims' baptismal pools fed by natural springs are connected by channels carved into the bedrock.",
          challenge: "Map the spatial relationship between the hilltop churches and the baptism pools below. Explain the theological significance of the hilltop location versus the riverside location.",
          image: "assets/places/balqa/john-the-baptist-churches.svg",
          imageStatus: "placeholder" },
        { id: 3, name: "Lot's Cave & Sanctuary", type: 'Biblical Heritage', status: 'locked', points: 60, icon: '⛰️', location: 'Deir Ain Abata, Ghor as-Safi, Dead Sea Region',
          desc: "Deir Ain Abata is a Byzantine monastery built around the cave where, according to tradition, Lot and his daughters took shelter after the destruction of Sodom (Genesis 19:30–38). Excavations have revealed evidence of continuous use of the cave from the Early Bronze Age through the Byzantine period.",
          challenge: "Read Genesis 19:30–38 before visiting. Inside the cave, find the original spring water channel that fed the monastery. Describe the cave's geological formation and explain what natural water source made this location habitable.",
          image: "assets/places/karak/lots-cave-sanctuary.svg",
          imageStatus: "placeholder" },
        { id: 4, name: "Deir Ain Abata Monastery", type: 'Byzantine Church', status: 'locked', points: 65, icon: '✝️', location: 'Deir Ain Abata Byzantine Monastery, Dead Sea Region',
          desc: "The Byzantine monastery at Deir Ain Abata was built in the 5th–6th century CE over and around the cave of Lot. A mosaic inscription on the floor explicitly identifies the site as connected with the Biblical account of Lot — one of the rare cases where an ancient inscription directly links a physical site to a Biblical text.",
          challenge: "Locate and photograph the mosaic inscription that identifies the site with Lot. Describe what details of the inscription — its letter style, language, or phrasing — help archaeologists date it to the Byzantine period.",
          image: "assets/places/karak/deir-ain-abata-monastery.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // MADABA
    // ════════════════════════════════════════════════════════

    9: {
      title: 'City of Mosaics',
      subtitle: 'Madaba Old Town · 2–3 days · Easy · 320 points',
      city: 'Madaba',
      progress: 0,
      tip: "St. George's Church charges a small entry fee and is sometimes closed for midday services (12–1 pm). The mosaic school offers half-day workshops.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 5', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '8 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: "St. George's Church — Mosaic Map", type: 'Byzantine Heritage', status: 'active', points: 65, icon: '🗺️', location: "St. George's Greek Orthodox Church, Madaba · 31.7164° N, 35.7939° E",
          desc: "The mosaic map on the floor of St. George's Church is a 6th-century Byzantine masterpiece and the oldest surviving cartographic depiction of the Holy Land. Created around 560 CE, it originally measured 15.7 by 6 metres and contained approximately 2 million tesserae, depicting the region from Lebanon to the Nile Delta with Jerusalem at its centre.",
          challenge: "Locate Jerusalem on the mosaic map and identify the Cardo Maximus and the Church of the Holy Sepulchre. Count how many named cities you can identify on the surviving portion of the map.",
          image: "assets/places/madaba/st-georges-church-mosaic-map.webp" },
        { id: 2, name: "Madaba Archaeological Museum", type: 'Museum', status: 'locked', points: 60, icon: '🏛️', location: 'Madaba Archaeological Museum, Madaba',
          desc: "The Madaba Archaeological Museum, housed in restored Ottoman houses, displays an exceptional collection of Byzantine mosaic floors excavated from Madaba's churches and private houses. The collection spans the 5th–8th centuries CE and demonstrates the extraordinary concentration of mosaic art in this town during the Byzantine period.",
          challenge: "Compare three different mosaic floor sections in the museum. For each, describe: the subject matter, the dominant colours used, and the approximate size of the tesserae.",
          image: "assets/places/madaba/madaba-archaeological-museum.webp" },
        { id: 3, name: "Church of the Apostles", type: 'Byzantine Mosaics', status: 'locked', points: 65, icon: '🎨', location: 'Church of the Apostles, Madaba · 31.7148° N, 35.7934° E',
          desc: "The Church of the Apostles contains one of the finest figurative Byzantine mosaic floors in Jordan. The central medallion, dated to 578 CE by an inscription, depicts the sea goddess Thalassa personified as a woman emerging from the ocean surrounded by fish, sea creatures, and boats.",
          challenge: "Find the central Thalassa medallion and describe the sea creatures depicted. Are any identifiable as real animals from the Mediterranean or Red Sea? Name at least two you can identify.",
          image: "assets/places/madaba/church-of-the-apostles.svg",
          imageStatus: "placeholder" },
        { id: 4, name: "Madaba Arts & Crafts Village", type: 'Craft Heritage', status: 'locked', points: 65, icon: '🧩', location: 'Madaba Craft Area, Madaba',
          desc: "Madaba has maintained a living tradition of mosaic-making since the Byzantine period. Today the city has over 30 mosaic workshops. The Madaba Institute for Mosaic Art and Restoration (MIMAR) trains professional conservators and mosaic artists from across Jordan and the region.",
          challenge: "Visit a working mosaic studio and observe a craftsperson cutting tesserae. Ask the artist to demonstrate the difference between the direct and indirect methods of mosaic-setting.",
          image: "assets/places/madaba/madaba-arts-crafts-village.webp" },
        { id: 5, name: "Mosaic Making Workshop", type: 'Craft Experience', status: 'locked', points: 65, icon: '🖼️', location: 'MIMAR / Madaba Mosaic Workshop, Madaba',
          desc: "The mosaic workshops of Madaba offer half-day classes in which visitors cut and lay their own small mosaic panel using marble, limestone, and glass tesserae. The techniques taught are directly descended from the methods used by Byzantine mosaic artists 1,500 years ago.",
          challenge: "Complete the mosaic workshop and produce a small panel (minimum 10x10 cm). Document each step: the paper cartoon, cutting the tesserae, laying in mortar, and grouting. Calculate approximately how many individual tesserae your panel contains.",
          image: "assets/places/madaba/mosaic-making-workshop.webp" },
      ],
    },

    20: {
      title: 'Holy Mountain Trail',
      subtitle: 'Mount Nebo & Beyond · 1 day · Easy · 280 points',
      city: 'Madaba',
      progress: 0,
      tip: "Mount Nebo is best visited on a clear winter or spring morning when the full panorama — Jordan Valley, Dead Sea, Jerusalem ridge — is visible.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '6 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Mount Nebo — Moses Viewpoint', type: 'Biblical Heritage', status: 'active', points: 70, icon: '⛰️', location: 'Mount Nebo (Jebel Neba), Madaba Governorate · 31.7686° N, 35.7250° E · 817m elevation',
          desc: "Mount Nebo (Jebel Neba) is the mountain from which, according to Deuteronomy 34:1–4, Moses was shown the Promised Land before his death. It rises to 817 metres on the edge of the Moabite Plateau overlooking the Jordan Valley, the Dead Sea, and on clear days Jerusalem. It has been a pilgrimage destination since at least the 4th century CE.",
          challenge: "Stand at the viewpoint and use the orientation board to identify: the Dead Sea, the Jordan River valley, Jericho (visible as a green patch), and the ridge where Jerusalem stands. Photograph the panorama and annotate the key landmarks.",
          image: "assets/places/madaba/mount-nebo-moses-viewpoint.svg",
          imageStatus: "placeholder" },
        { id: 2, name: "Memorial Church of Moses", type: 'Byzantine Church', status: 'locked', points: 70, icon: '✝️', location: 'Memorial Church of Moses, Mount Nebo · 31.7686° N, 35.7250° E',
          desc: "The Memorial Church of Moses was first built in the 4th century CE and expanded through the Byzantine period. The church contains an exceptional collection of 6th-century mosaic floors depicting hunting and pastoral scenes, personifications of the seasons, wild animals, and a hunting and herding scene dated to 531 CE.",
          challenge: "Find the mosaic panel dated 531 CE in the north transept. Describe the scene depicted and identify at least five different animal species shown.",
          image: "assets/places/madaba/memorial-church-of-moses.webp" },
        { id: 3, name: "Serpentine Cross (Brazen Serpent)", type: 'Contemporary Heritage', status: 'locked', points: 70, icon: '🐍', location: 'Church Terrace, Mount Nebo',
          desc: "The Brazen Serpent Monument on Mount Nebo, installed in 1984, is a modern bronze sculpture by Italian artist Giovanni Fantoni symbolically combining the serpent raised by Moses in the desert (Numbers 21:9) with the cross of Christ, following the typological interpretation in the Gospel of John (3:14).",
          challenge: "Read both the Numbers passage (21:4–9) and the John passage (3:14–15) before viewing. Describe how Fantoni's design physically integrates both references, and identify at least two specific visual choices the artist made.",
          image: "assets/places/madaba/serpentine-cross-brazen-serpent.webp" },
        { id: 4, name: "Mukawir (Machaerus)", type: 'Herodian Fortress', status: 'locked', points: 70, icon: '🏰', location: 'Mukawir (Machaerus), Madaba Governorate · 31.5872° N, 35.6439° E',
          desc: "Mukawir (ancient Machaerus) is a dramatic hilltop Herodian fortress-palace built by Herod the Great, overlooking the Dead Sea. According to the historian Josephus, it was here that John the Baptist was imprisoned and executed, and the scene of Salome's dance in the Gospel of Mark.",
          challenge: "Climb to the summit of Mukawir and find the location of the original throne room. Describe the defensive layout of the fortress: how many lines of fortification are visible, and what natural features does the fortress use for defence?",
          image: "assets/places/madaba/mukawir-machaerus.svg",
          imageStatus: "placeholder" },
      ],
    },

    21: {
      title: 'Springs & Hot Waters',
      subtitle: "Ma'in Hot Springs · 1 day · Easy · 220 points",
      city: 'Madaba',
      progress: 0,
      tip: "Ma'in Hot Springs are accessible year-round. Weekday visits are much quieter than Jordanian public holidays.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 3', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: "Ma'in Hot Springs Resort", type: 'Wellness', status: 'active', points: 75, icon: '♨️', location: "Hammamat Ma'in (Ma'in Hot Springs), Madaba Governorate · 31.5794° N, 35.6114° E",
          desc: "The Ma'in Hot Springs are fed by thermal springs with temperatures ranging from 40°C to 63°C, rising through faults in basalt rock. The springs have been used for therapeutic bathing since the Hellenistic period; Herod the Great is recorded to have bathed here. The mineral-rich waters are high in sodium, calcium, magnesium, and radon.",
          challenge: "Measure the water temperature in the main pool and in the natural rock channels. Record the temperature gradient from the hottest spring source to the cooled pool and explain why the temperature drops over distance.",
          image: "assets/places/madaba/main-hot-springs-resort.svg",
          imageStatus: "placeholder" },
        { id: 2, name: "Wadi Zarqa Ma'in Waterfall", type: 'Nature', status: 'locked', points: 70, icon: '💦', location: "Wadi Zarqa Ma'in Canyon, Madaba Governorate",
          desc: "Wadi Zarqa Ma'in is a deep canyon carved through the Moabite Plateau east of the Dead Sea. The thermal spring water cascades down the canyon walls as a series of mineral-encrusted waterfalls before reaching the Dead Sea shore. The warm waterfall spray creates a micro-climate supporting unusual vegetation — ferns, reeds, and tropical-looking plants.",
          challenge: "Follow the canyon trail to the main waterfall. Measure or estimate the height of the cascade. Describe the minerals deposited on the rocks at the waterfall's base — their colour, texture, and hardness.",
          image: "assets/places/madaba/wadi-zarqa-main-waterfall.svg",
          imageStatus: "placeholder" },
        { id: 3, name: "Hammamat Ma'in Natural Pools", type: 'Nature', status: 'locked', points: 75, icon: '🏊', location: "Natural Hot Spring Pools, Wadi Zarqa Ma'in",
          desc: "Below the Ma'in resort, natural hot spring pools form in the bedrock of the canyon. The pools vary in temperature from tepid to very hot and are coloured vivid shades of turquoise, orange, and cream by mineral deposits — iron oxides, calcium carbonate, and algae that can survive the extreme temperature and mineral content.",
          challenge: "Visit at least three separate natural pools. Document the temperature, colour, and mineral coating of each. Describe the flavour differences between pools. What minerals do you think are responsible for the different colours?",
          image: "assets/places/madaba/hammamat-main-natural-pools.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // KARAK
    // ════════════════════════════════════════════════════════

    4: {
      title: 'Crusader Stronghold',
      subtitle: 'Karak Castle & Plateau · 1 day · Easy · 190 points',
      city: 'Karak',
      progress: 0,
      tip: "The castle's underground passages are very dark — bring a torch. Arrive by 9 am before tour groups.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Karak Castle (Crac des Moabites)', type: 'Crusader Fortress', status: 'active', points: 50, icon: '🏰', location: 'Karak Castle, Karak · 31.1774° N, 35.7021° E · ~900m elevation',
          desc: "Karak Castle (Crac des Moabites) was built in 1142 CE by Payen le Bouteiller, the Crusader Lord of Oultrejordain. It served as the capital of the Crusader lordship, controlling the road from Syria to Egypt. Saladin besieged it twice before finally capturing it in 1188 CE. The castle was subsequently expanded by the Ayyubid and Mamluk rulers.",
          challenge: "Walk the full outer curtain wall. Count the number of towers and note which appear to be Crusader-built (rough limestone) versus later Ayyubid or Mamluk additions (more refined stonework). Document your findings with photographs.",
          image: "assets/places/karak/karak-castle-crac-des-moabites.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Karak Archaeological Museum', type: 'Museum', status: 'locked', points: 45, icon: '🏛️', location: 'Karak Archaeological Museum, Karak Castle',
          desc: "The Karak Archaeological Museum, housed in the castle's Mamluk-era southern tower, displays objects from excavations across the Karak Governorate spanning the Moabite Iron Age through the Islamic period. Key exhibits include Moabite pottery and inscriptions, Iron Age objects, Roman and Byzantine finds, and Crusader artefacts.",
          challenge: "Find the exhibit relating to the ancient Moabite Kingdom (Iron Age, c. 9th–6th century BCE). Identify one artefact that demonstrates Moabite culture was distinct from neighbouring Israelite or Ammonite cultures.",
          image: "assets/places/karak/karak-archaeological-museum.svg",
          imageStatus: "placeholder" },
        { id: 3, name: "Umm al-Rasas (Kastron Mefa'a)", type: 'UNESCO World Heritage', status: 'locked', points: 50, icon: '🎨', location: "Umm al-Rasas, Madaba/Karak Border · 31.5008° N, 35.9231° E",
          desc: "Umm al-Rasas (UNESCO World Heritage Site since 2004) contains a Roman fort expanded into a Byzantine and early Islamic town. Its most spectacular feature is the floor of the Church of Saint Stephen, a 785 CE depiction of cities of the Holy Land in the Nile Delta, Palestine, and Jordan arranged in a border around a central hunting and pastoral scene.",
          challenge: "On the St. Stephen mosaic, find the row of cities depicted in the border panels. Identify at least five city names from the Greek inscriptions and locate them on a modern map. Which still exist today under similar names?",
          image: "assets/places/madaba/umm-al-rasas-kastron-mefaa.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Karak Plateau Viewpoint', type: 'Scenic', status: 'locked', points: 45, icon: '🌄', location: 'Karak Plateau Edge, Karak · ~900m elevation',
          desc: "The Karak Plateau sits at approximately 900 metres above sea level on the edge of the Moabite highlands, with dramatic views westward over the Dead Sea and the Jordan Rift Valley. The plateau was the heartland of the ancient Moabite Kingdom, and its fertile red basaltic terra rossa produces wheat, olives, and grapes.",
          challenge: "From the plateau viewpoint, estimate the altitude change between the hilltop (c. 900 m) and the Dead Sea shore visible below (c. −430 m). Describe how this elevation difference affects the climate and vegetation.",
          image: "assets/places/karak/karak-plateau-viewpoint.svg",
          imageStatus: "placeholder" },
      ],
    },

    22: {
      title: 'Mansaf & Moab Flavors',
      subtitle: 'Karak City & Villages · 1 day · Easy · 230 points',
      city: 'Karak',
      progress: 0,
      tip: 'Mansaf is traditionally a lunch dish — the best time to arrange a home-cooked meal is midday. Call ahead for honey farm visits.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '6 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Karak Central Market', type: 'Local Market', status: 'active', points: 55, icon: '🧅', location: 'Karak City Centre Market, Karak',
          desc: "The Karak city market serves the Karak Governorate's farming communities. The market is known for jameed — the hard, dried fermented goat-milk or sheep-milk yoghurt that is the essential ingredient in mansaf — as well as locally produced Karak honey, dried herbs, and seasonal produce.",
          challenge: "Find a vendor selling jameed and ask them to explain the traditional production process: the milk source, the fermentation method, the drying technique, and how long the fermented curd must dry before it is properly aged.",
          image: "assets/places/karak/karak-central-market.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Mansaf at a Family Home', type: 'Culinary Heritage', status: 'locked', points: 65, icon: '🍖', location: 'Local Family Home, Karak',
          desc: "Mansaf is Jordan's national dish and the centrepiece of Bedouin and Jordanian hospitality culture. It consists of lamb slow-cooked in a sauce made from reconstituted jameed, served over long-grain rice and flatbread, and garnished with toasted pine nuts and almonds. Traditionally eaten standing and with the right hand only.",
          challenge: "Participate in preparing mansaf with a local family, focusing on the reconstitution of the jameed. Eat the meal in the traditional manner — standing, right hand only, rolled into small portions. Describe the flavour profile of the jameed sauce.",
          image: "assets/places/karak/mansaf-at-a-family-home.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Karak Honey Farm', type: 'Culinary Heritage', status: 'locked', points: 55, icon: '🍯', location: 'Local Honey Farm, Karak Governorate',
          desc: "The wildflower valleys of the Karak Governorate support exceptionally diverse flora, producing honey with a complex, herbal character. Karak honey — particularly varieties from hives kept in the wadis where wild thyme, sage, and Palestinian oak flower — commands premium prices in Amman markets.",
          challenge: "Taste at least three different honey varieties from the farm, including at least one monofloral and one polyfloral honey. Describe the colour, viscosity, aroma, and flavour of each, and ask the beekeeper to identify the primary pollen source.",
          image: "assets/places/karak/karak-honey-farm.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Dhiban (Dibon) — Moabite Capital', type: 'Archaeological Heritage', status: 'locked', points: 55, icon: '⛏️', location: 'Dhiban (ancient Dibon), Madaba Governorate · 31.5008° N, 35.7781° E',
          desc: "Dhiban is the modern village occupying the site of ancient Dibon, the capital of the Kingdom of Moab in the 9th century BCE. It was here that the famous Mesha Stele — the Moabite Stone, now in the Louvre — was discovered in 1868. The inscription describes King Mesha's victories over the Kingdom of Israel.",
          challenge: "Read the translation of the Mesha Stele inscription provided by your guide. Identify three specific events or claims that King Mesha makes. How does this account differ from or complement the Biblical account in 2 Kings 3?",
          image: "assets/places/madaba/dhiban-dibon-moabite-capital.svg",
          imageStatus: "placeholder" },
      ],
    },

    23: {
      title: 'Wadi Canyon Adventure',
      subtitle: 'Wadi Ibn Hammad · 1 day · Moderate · 200 points',
      city: 'Karak',
      progress: 0,
      tip: 'The Wadi Ibn Hammad waterfall flows strongest December–April. Wear water shoes. Do not enter after heavy rain upstream.',
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 3', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Wadi Ibn Hammad Canyon', type: 'Adventure Canyon', status: 'active', points: 70, icon: '🏞️', location: 'Wadi Ibn Hammad, west of Karak · 31.2° N, 35.6° E',
          desc: "Wadi Ibn Hammad is a seasonal canyon west of Karak, cutting through layers of black basalt and red sandstone. In winter and spring, a waterfall of 15–20 metres pours over a basalt lip into a deep plunge pool at the canyon head. The canyon walls show columnar basalt, iron-stained red oxidised rock, and travertine formations.",
          challenge: "Photograph the main waterfall and describe the geological sequence visible in the canyon walls: identify basalt (black), sandstone (red or buff), and any travertine deposits (white or cream). Estimate the height of the main waterfall face.",
          image: "assets/places/karak/wadi-ibn-hammad-canyon.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Lajjun Roman Fort', type: 'Roman Heritage', status: 'locked', points: 65, icon: '🏛️', location: 'Lajjun (ancient Legio), Karak Governorate',
          desc: "Lajjun is the site of the Roman legionary fortress of Legio, established in the 3rd century CE and one of the eastern frontier fortresses of the Roman Province of Arabia. Its name derives from the Latin 'legio', indicating a full Roman legion was stationed here. The site preserves the rectangular outline of the fortress walls.",
          challenge: "Using the site plan, pace out the dimensions of the fortress. Calculate the approximate area in hectares and compare it to the standard Roman legionary fortress size of 20–25 hectares.",
          image: "assets/places/karak/lajjun-roman-fort.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Dana Biosphere Reserve (North Edge)', type: 'Nature Reserve', status: 'locked', points: 65, icon: '🦅', location: "Dana Biosphere Reserve, Tafilah/Karak border · 30.6744° N, 35.6089° E",
          desc: "The Dana Biosphere Reserve, Jordan's largest at 308 square kilometres, spans four bio-geographical zones from Mediterranean highlands to desert. It shelters over 800 plant species, 190 bird species, and 45 mammal species including the Nubian ibex, sand cat, and striped hyena.",
          challenge: "Walk the northern trailhead section and identify at least three plant species using the trail guide. Note the change in vegetation as you descend 100 metres in elevation and explain why it changes.",
          image: "assets/places/tafilah/dana-biosphere-reserve-north-edge.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // MA'AN
    // ════════════════════════════════════════════════════════

    1: {
      title: 'The Seven World Wonder',
      subtitle: "Petra · Rose-Red City · Multiple days · Moderate–Strenuous · 420 points",
      city: "Ma'an",
      progress: 72,
      tip: "Arrive at the Siq entrance before 6:30 am to walk the canyon before the crowds. The Treasury glows warmest in the first morning light. The Monastery requires 850 steps but is far less crowded than the Treasury.",
      stats: [
        { label: 'Points Earned', value: '302', icon: '⭐' },
        { label: 'Waypoints Done', value: '3 / 5', icon: '⊕' },
        { label: 'Thread Progress', value: '72%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'The Siq', type: 'Natural Canyon', status: 'completed', points: 80, icon: '🏜️', location: 'The Siq, Petra Archaeological Park · 30.3185° N, 35.4397° E',
          desc: "The Siq is the main entrance gorge to Petra, a 1.2-kilometre natural crack in the sandstone mountains. Its walls rise from 91 to 182 metres and narrow to as little as 3 metres in width. The Nabataeans installed a water channel along its east wall to bring spring water into the city. Votive niches, inscriptions, and camel reliefs are carved into the walls.",
          challenge: "Walk the full length of the Siq and find: (1) the remains of the Nabataean water channel, (2) at least two votive niches with carved Nabataean deities (baetyli), and (3) the original dam and diversion tunnel the Nabataeans built to protect the Siq from flash floods.",
          image: "assets/places/maan/the-siq.webp" },
        { id: 2, name: 'Al-Khazneh (The Treasury)', type: 'Nabataean Monument', status: 'completed', points: 85, icon: '🏛️', location: 'Al-Khazneh (The Treasury), Petra · 30.3217° N, 35.4503° E',
          desc: "Al-Khazneh was carved in the 1st century BCE as the tomb of Nabataean King Aretas III. Its façade measures 28 metres wide and 39 metres tall. The popular name 'Treasury' derives from a Bedouin legend that a pharaoh hid treasure in the stone urn above — hence the bullet marks visible on the urn.",
          challenge: "Photograph the Treasury façade and identify the following elements: the six columns of the lower storey, the two half-pediments, the central tholos, the two flanking pavilions, and the urn at the apex. Count the total number of carved human and eagle figures visible.",
          image: "assets/places/maan/al-khazneh-the-treasury.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Street of Facades & Royal Tombs', type: 'Nabataean Tombs', status: 'completed', points: 80, icon: '⚰️', location: 'Royal Tombs, Petra · 30.3245° N, 35.4535° E',
          desc: "Beyond the Treasury, the main valley opens to reveal the Street of Facades — a cliff face with over 40 tomb façades. The Royal Tombs cluster on the rose-red cliff: the Urn Tomb, the Silk Tomb, the Corinthian Tomb, and the Palace Tomb. All were carved in the 1st–2nd centuries CE.",
          challenge: "Identify all four Royal Tombs and photograph each. For the Urn Tomb, climb to the vaulted terrace and photograph the view back. Describe the geological process that creates the multi-coloured banding visible in the Silk Tomb's rock face.",
          image: "assets/places/maan/street-of-facades-royal-tombs.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'High Place of Sacrifice', type: 'Nabataean Religious Site', status: 'active', points: 90, icon: '⛰️', location: 'High Place of Sacrifice (Al-Madhbah), Jebel Madbah, Petra · 1,035m elevation',
          desc: "The High Place of Sacrifice on Jebel Madbah is one of Petra's best-preserved Nabataean open-air sanctuaries, accessible via a carved staircase. At the summit (1,035 m), the Nabataeans cut a rectangular altar, a circular offering table, and channels for draining libations or blood offerings. The site provides a panoramic view over the Petra basin.",
          challenge: "Identify the rectangular altar, the round offering basin, and the drainage channels carved into the rock. Describe the probable function of each element based on ancient descriptions of Nabataean ritual practice. Count the number of steps cut into the staircase ascent.",
          image: "assets/places/maan/high-place-of-sacrifice.svg",
          imageStatus: "placeholder" },
        { id: 5, name: 'Ad-Deir (The Monastery)', type: 'Nabataean Monument', status: 'locked', points: 85, icon: '🏛️', location: 'Ad-Deir (The Monastery), Petra · 30.3370° N, 35.4375° E · reached via ~850 steps',
          desc: "Ad-Deir is the largest monument in Petra, carved in the 1st century CE and measuring 47 metres wide and 48 metres tall — substantially larger than the Treasury. It is reached by a 45-minute climb of approximately 850 steps cut into the mountain. The name derives from Christian crosses carved inside the chamber, suggesting later use as a church.",
          challenge: "Climb the 850 steps to Ad-Deir and compare it directly with the Treasury: which is wider, taller, and more ornately decorated? Find the carved crosses inside the inner chamber and describe their size, style, and probable date relative to the monument's original construction.",
          image: "assets/places/maan/ad-deir-the-monastery.svg",
          imageStatus: "placeholder" },
      ],
    },

    24: {
      title: 'Wadi Rum Adventure',
      subtitle: 'Wadi Rum Protected Area · 2 days · Moderate · 380 points',
      city: "Ma'an",
      progress: 0,
      tip: "Book a Bedouin-run camp in the heart of the protected area — the difference in night-sky quality and silence compared to camps near the visitor centre is remarkable.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 5', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '12 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Wadi Rum Visitor Gate', type: 'UNESCO World Heritage', status: 'active', points: 70, icon: '🏜️', location: 'Wadi Rum Visitor Centre, Wadi Rum Protected Area · 29.5731° N, 35.4097° E',
          desc: "Wadi Rum Protected Area is a UNESCO World Heritage Site covering 74,000 hectares of dramatic desert landscape. Its towering sandstone and granite massifs rise up to 1,750 metres from the sandy desert floor. Wadi Rum was the setting for T.E. Lawrence's Arab Revolt campaigns in 1917–18 and has been used as a Mars filming location in multiple Hollywood productions.",
          challenge: "At the visitor gate, study the topographic map. Identify the three highest massifs visible from the gate. Orient the map to the landscape and identify at least two geographic features — a wadi, a jebel, or a rock arch — visible from the entrance.",
          image: "assets/places/maan/wadi-rum-visitor-gate.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Lawrence Spring', type: 'Historical Site', status: 'locked', points: 75, icon: '💧', location: 'Ain Lawrence (Lawrence Spring), Jebel Umm Ulaydiyya, Wadi Rum',
          desc: "Lawrence Spring is a natural spring high on the slopes of Jebel Umm Ulaydiyya, named after T.E. Lawrence who used the area as a base during the Arab Revolt of 1917–18. Lawrence's memoir 'Seven Pillars of Wisdom' describes Wadi Rum as 'Rum the magnificent'. A fig tree still grows near the spring.",
          challenge: "Hike to Lawrence Spring and find the inscription Lawrence carved into the rock. Photograph the view Lawrence would have seen from this vantage point. Read the Wadi Rum passage from 'Seven Pillars of Wisdom' and identify two specific landscape features he describes.",
          image: "assets/places/maan/lawrence-spring.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Khazali Canyon Inscriptions', type: 'Ancient Inscriptions', status: 'locked', points: 75, icon: '✍️', location: 'Siq Khazali (Khazali Canyon), Wadi Rum',
          desc: "Khazali Canyon is a narrow crack in a sandstone massif penetrating about 100 metres into the rock. Its walls are covered in Thamudic, Nabataean, and early Islamic inscriptions and rock carvings spanning more than 2,000 years — including hunting scenes, human figures, camel carvings, ibex, and hands.",
          challenge: "Enter Khazali Canyon and photograph at least three different periods of inscription or carving. For each, describe the subject matter, the carving technique (incised line vs. pecked surface), and any details that help assign it to a specific period.",
          image: "assets/places/maan/khazali-canyon-inscriptions.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Burdah Rock Bridge', type: 'Natural Arch', status: 'locked', points: 80, icon: '🌉', location: 'Burdah Rock Bridge, Wadi Rum · ~1,700m elevation',
          desc: "Burdah Rock Bridge is the highest natural arch in the Middle East, standing approximately 35 metres above the surrounding plateau at about 1,700 metres elevation. Formed by differential erosion of sandstone, it spans approximately 80 metres. Reaching it requires a 3-hour round-trip scramble with an exposed final climb.",
          challenge: "Complete the climb to Burdah Rock Bridge. From the top of the arch, estimate its height above the ground using the visual scale of a person standing below. Describe the geological process that formed the arch.",
          image: "assets/places/maan/burdah-rock-bridge.svg",
          imageStatus: "placeholder" },
        { id: 5, name: 'Bedouin Camp Under Stars', type: 'Cultural Immersion', status: 'locked', points: 80, icon: '⛺', location: 'Deep Desert Bedouin Camp, Wadi Rum Protected Area',
          desc: "Spending a night in a Bedouin camp in the heart of Wadi Rum offers absolute silence and a sky dense with stars. The Rum Protected Area is one of Jordan's designated dark-sky zones. A traditional Bedouin camp includes a goat-hair tent, a communal fire, mint tea brewed on the embers, and a dinner of zarb — meat and vegetables slow-cooked underground.",
          challenge: "After dinner, lie outside the tent away from firelight and observe the night sky for 30 minutes without any screen light. Using a star chart, identify the Milky Way and five named stars. Describe what you hear in the silence.",
          image: "assets/places/maan/bedouin-camp-under-stars.svg",
          imageStatus: "placeholder" },
      ],
    },

    25: {
      title: 'Little Petra & Bedouin Life',
      subtitle: 'Siq al-Barid & Al-Beidha · 1 day · Easy · 270 points',
      city: "Ma'an",
      progress: 0,
      tip: "Little Petra has free entry — one of the best-value sites in Jordan. Al-Beidha is just a short walk away and is often completely empty.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Little Petra (Siq al-Barid)', type: 'Nabataean Site', status: 'active', points: 65, icon: '🏛️', location: 'Siq al-Barid (Little Petra), 8 km north of Petra · 30.3636° N, 35.4294° E',
          desc: "Siq al-Barid (\"the cold canyon\") is a Nabataean site 8 kilometres north of Petra with its own siq, rock-cut façades, triclinia, cisterns, and a painted biclinium. It served as a caravanserai for merchant caravans arriving at Petra. Its painted dining room, with floral and vine-scroll frescoes in Pompeian style, is unique in Petra's archaeological zone. Entry is free.",
          challenge: "Find and enter the painted biclinium in Little Petra. Describe the fresco programme visible on the ceiling and walls — the subject matter, the style, and the condition of preservation. How do the frescoes differ from the exterior carved architecture of Petra?",
          image: "assets/places/maan/little-petra-siq-al-barid.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Al-Beidha Neolithic Village', type: 'Prehistoric Site', status: 'locked', points: 70, icon: '🏚️', location: 'Al-Beidha (Baydha) Neolithic Site, near Little Petra · 30.3636° N, 35.4200° E',
          desc: "Al-Beidha is one of the earliest and best-studied pre-pottery Neolithic villages in the world, occupied from approximately 7250 to 6500 BCE. Excavated by British archaeologist Diana Kirkbride in the 1960s, the site reveals a planned village of circular stone houses from its earliest phase, evolving over 500 years to rectangular multi-room structures.",
          challenge: "Walk through Al-Beidha and identify the difference between the early circular house foundations and the later rectangular ones. Why do archaeologists think this architectural transition happened — what does it suggest about changes in family structure or food storage?",
          image: "assets/places/maan/al-beidha-neolithic-village.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Bedouin Heritage Village', type: 'Cultural Immersion', status: 'locked', points: 65, icon: '🐪', location: 'Umm Sayhoun Bedouin Village, near Petra',
          desc: "The Bdoul Bedouin, who lived inside Petra's archaeological zone until 1985, maintain strong cultural ties to the Petra landscape. Traditional skills demonstrated include weaving on a ground loom, preparing flatbread cooked on a tannour, coffee roasting and preparation, and henna application using traditional Bedouin geometric patterns.",
          challenge: "Participate in making flatbread on the traditional tannour. Ask your Bedouin host to explain the significance of coffee (qahwa) in Bedouin hospitality: how it is prepared, served, and received, and what different numbers of cups traditionally communicate.",
          image: "assets/places/maan/bedouin-heritage-village.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Camel Ride through Wadi Araba', type: 'Adventure', status: 'locked', points: 70, icon: '🐪', location: 'Wadi Araba, southern Jordan',
          desc: "The Wadi Araba, the southern extension of the Jordan Rift Valley, was the main trade route of the Nabataean incense road — the highway along which frankincense and myrrh from Arabia were transported to the Mediterranean world. A camel ride follows sections of the ancient caravan path, passing through acacia desert past Nabataean waystation ruins.",
          challenge: "During your camel ride, ask your Bedouin guide about traditional knowledge used to navigate the wadi without modern technology — star navigation, reading wind direction, identifying water sources from vegetation. Record at least three navigational techniques.",
          image: "assets/places/maan/camel-ride-through-wadi-araba.svg",
          imageStatus: "placeholder" },
      ],
    },

    // ════════════════════════════════════════════════════════
    // AL-AQABA
    // ════════════════════════════════════════════════════════

    3: {
      title: 'Bride of the Red Sea',
      subtitle: 'Aqaba Marine Park · 4 days · Moderate · 280 points',
      city: 'Al-Aqaba',
      progress: 0,
      tip: "Best visibility for diving April–June and September–November. The Cedar Pride wreck is accessible to recreational divers at 25m depth.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '16 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Aqaba Marine Park', type: 'Marine Reserve', status: 'active', points: 70, icon: '🐠', location: 'Aqaba Marine Park, Gulf of Aqaba, Jordan · 29.5236° N, 35.0037° E',
          desc: "The Aqaba Marine Park, established in 1997, protects a 7-kilometre stretch of Jordan's Gulf of Aqaba coastline. The coral reef system is remarkably healthy, containing hard corals, soft corals, sea fans, and an extraordinary diversity of fish species including parrotfish, grouper, moray eels, and octopus. Visibility commonly exceeds 20 metres.",
          challenge: "Snorkel or dive at the Marine Park and identify at least six different species of reef fish using the identification guide. For each, note the depth at which you found it, its approximate size, and any distinctive behaviour observed.",
          image: "assets/places/aqaba/aqaba-marine-park.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Cedar Pride Wreck', type: 'Diving Site', status: 'locked', points: 70, icon: '⚓', location: 'Cedar Pride Wreck Site, Aqaba · 29.5100° N, 35.0000° E · 25m depth',
          desc: "The Cedar Pride is a Lebanese cargo freighter intentionally sunk in 1985 off the Aqaba coast to create an artificial reef. Resting at 25 metres depth, it is now encrusted with hard and soft corals, home to enormous schools of glassfish, lion fish, moray eels, and barracuda. The wheelhouse, cargo holds, and stern deck can all be penetrated by experienced divers.",
          challenge: "Complete a guided dive on the Cedar Pride. Photograph the bow and the stern from outside the wreck. Identify and describe two specific coral species that have colonised the hull.",
          image: "assets/places/aqaba/cedar-pride-wreck.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'Japanese Garden Reef', type: 'Diving Site', status: 'locked', points: 70, icon: '🪸', location: 'Japanese Garden Reef, Aqaba · 5–15m depth',
          desc: "The Japanese Garden is one of Aqaba's most beautiful reef sites, named for its garden-like profusion of branching and table corals at 5–15 metres depth. The site is renowned for its exceptional growth of Acropora table corals and the diversity of associated reef fish, including resident butterflyfish pairs, surgeonfish schools, and reef sharks in deeper water.",
          challenge: "Photograph or sketch the reef profile at Japanese Garden from the shallows to the reef drop-off. Identify the dominant coral species at 5 m, 10 m, and 15 m depth respectively. Describe how the coral community changes with depth and explain what physical factor causes this zonation.",
          image: "assets/places/aqaba/japanese-garden-reef.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Saudi Border Coral Gardens', type: 'Diving Site', status: 'locked', points: 70, icon: '🌊', location: 'Southern Reef, near Saudi border, Aqaba · accessible by boat',
          desc: "At the southern end of Jordan's Gulf of Aqaba coastline, pristine coral gardens extend in almost unbroken cover along the steep reef slope. These reefs receive very little visitor pressure and host some of the densest and most diverse coral cover in the Jordanian section of the Red Sea. Large Napoleon wrasse, schools of barracuda, and turtles are regularly encountered.",
          challenge: "Conduct a 5-minute timed fish count, recording every fish species observed in a 5 m × 5 m section of reef. Compare your species count with the count from your Marine Park dive. Which site had greater species diversity, and why?",
          image: "assets/places/aqaba/saudi-border-coral-gardens.svg",
          imageStatus: "placeholder" },
      ],
    },

    26: {
      title: 'Port of History',
      subtitle: 'Aqaba Historic Quarter · 1 day · Easy · 240 points',
      city: 'Al-Aqaba',
      progress: 0,
      tip: "The fish market is most active at 7–9 am when the night's catch arrives. Friday prayers close the King Hussein Mosque to non-Muslim visitors.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 4', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '5 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Aqaba Fort (Mamluk Castle)', type: 'Islamic Fortress', status: 'active', points: 60, icon: '🏰', location: 'Aqaba Fort (Mamluk Castle), Aqaba · 29.5259° N, 35.0066° E',
          desc: "Aqaba Fort was built by the Mamluk Sultan Qansuh al-Ghawri around 1510 CE on the shore of the Gulf of Aqaba. It was later used as a caravanserai for Mecca pilgrims. In 1917, it was captured by T.E. Lawrence and the Hashemite forces of Sherif Hussein during the Arab Revolt.",
          challenge: "Find the carved marble coat of arms of the Mamluk Sultan above the main gateway. Describe the heraldic elements in the carving. Locate the point where T.E. Lawrence's force entered the castle in 1917.",
          image: "assets/places/aqaba/aqaba-fort-mamluk-castle.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Ayla — Early Islamic City', type: 'Archaeological Site', status: 'locked', points: 60, icon: '🕌', location: 'Ayla Archaeological Site, Aqaba City Centre · 29.5262° N, 35.0065° E',
          desc: "Ayla was one of the earliest planned Islamic cities in the world, founded around 650 CE by Caliph Uthman ibn Affan. Archaeological excavations have revealed the complete street plan: a rectangular grid enclosed by a fortified wall with four gates, a congregational mosque at the centre, a caravanserai, and residential quarters.",
          challenge: "Walk the excavated street grid of Ayla and identify the positions of the four city gates on the cardinal points. Find the foundation of the central mosque. Describe how the rectangular grid plan of Ayla differs from the organic street layout of contemporary Byzantine cities.",
          image: "assets/places/al-aqaba/ayla-early-islamic-city.webp" },
        { id: 3, name: 'Aqaba Museum (Al-Hammamat)', type: 'Museum', status: 'locked', points: 60, icon: '🏛️', location: 'Aqaba Museum (Sharif Hussein Palace), Aqaba · 29.5264° N, 35.0067° E',
          desc: "The Aqaba Museum, housed in the former palace of the Hashemite Sharif Hussein ibn Ali, displays objects recovered from excavations in and around Aqaba. The collection covers the Nabataean, Roman, Byzantine, Islamic, Crusader, and Ottoman periods, with particular strength in Islamic glazed ceramics and coins from the port's long commercial history.",
          challenge: "Identify the oldest object in the museum and the most recent object in the collection. Identify at least three different civilisations represented by objects in the collection and name one object per civilisation.",
          image: "assets/places/aqaba/aqaba-museum-al-hammamat.svg",
          imageStatus: "placeholder" },
        { id: 4, name: 'Aqaba Fish Market & Port', type: 'Local Culture', status: 'locked', points: 60, icon: '🐟', location: 'Aqaba Fish Market, near Industrial Port, Aqaba',
          desc: "The Aqaba fish market is one of the best places in Jordan to observe daily life and the Red Sea's fishery. Local fishermen bring in catches including hammour (grouper), zubaidi (pomfret), sultan Ibrahim (red mullet), and assorted reef fish. Several waterfront restaurants buy directly from the boats and grill the catch over charcoal.",
          challenge: "Visit the fish market in the morning and identify at least three different species on sale using a Red Sea fish guide. Ask a fisherman about their fishing method and the depth and location of the fishing ground where each species was caught.",
          image: "assets/places/aqaba/aqaba-fish-market-port.svg",
          imageStatus: "placeholder" },
      ],
    },

    27: {
      title: 'Desert to Sea',
      subtitle: 'Wadi Rum → Gulf of Aqaba · 2 days · Moderate · 210 points',
      city: 'Al-Aqaba',
      progress: 0,
      tip: "Plan to arrive at Aqaba in time for sunset over the Gulf — the view of Saudi Arabia and the Sinai Peninsula across the water in the last light is extraordinary.",
      stats: [
        { label: 'Points Earned', value: '0', icon: '⭐' },
        { label: 'Waypoints Done', value: '0 / 3', icon: '⊕' },
        { label: 'Thread Progress', value: '0%', icon: '🧵' },
        { label: 'Est. Remaining', value: '8 hrs', icon: '⏱' },
      ],
      waypoints: [
        { id: 1, name: 'Wadi Rum Desert Departure', type: 'Adventure', status: 'active', points: 70, icon: '🏜️', location: 'Wadi Rum Protected Area → Aqaba Highway, Southern Jordan',
          desc: "The journey from Wadi Rum to Aqaba covers approximately 60 kilometres through one of the world's most dramatic landscape transitions: from the sandstone desert of the Rum Protected Area, through the granite mountains of the Hejaz railway corridor (built by the Ottomans in 1908 and famously sabotaged by T.E. Lawrence), and down to the coastal plain of the Gulf of Aqaba.",
          challenge: "As you leave Wadi Rum, photograph the landscape at three points during the journey: the desert, the mountain pass, and the first view of the sea. Describe the geological change visible in the rock type and colour between each stage.",
          image: "assets/places/aqaba/wadi-rum-desert-departure.svg",
          imageStatus: "placeholder" },
        { id: 2, name: 'Gulf of Aqaba Sunset Cruise', type: 'Adventure', status: 'locked', points: 70, icon: '⛵', location: 'Gulf of Aqaba, Aqaba · 29.5100° N, 35.0050° E',
          desc: "The Gulf of Aqaba is a narrow arm of the Red Sea, approximately 170 kilometres long and between 19 and 27 kilometres wide, surrounded by the shores of Jordan, Saudi Arabia, Egypt (Sinai), and Israel. On a sunset cruise, all four countries are visible simultaneously. The gulf waters are famously clear and the sunset colours on the surrounding mountains are extraordinary.",
          challenge: "From the cruise boat, photograph each of the four countries visible from the Gulf of Aqaba and label them. Identify the approximate position of the international maritime boundaries between Jordan and Saudi Arabia, and between Jordan and Israel.",
          image: "assets/places/aqaba/gulf-of-aqaba-sunset-cruise.svg",
          imageStatus: "placeholder" },
        { id: 3, name: 'South Beach Camping & Snorkeling', type: 'Adventure', status: 'locked', points: 70, icon: '🏕️', location: 'South Beach, Aqaba · near Saudi border',
          desc: "Aqaba's south beach, beyond the main resort zone, offers access to pristine reef snorkelling and wild camping on the desert shore. The reef begins just metres from the waterline and extends south toward the Saudi border with very little disturbance. Desert camping here combines the two defining experiences of Jordan: stargazing in clean desert air and waking to the colours of the Red Sea at dawn.",
          challenge: "Set up camp on the south beach and photograph the same reef location at dawn and at dusk. Describe how the light, water colour, and fish activity differ between the two times of day.",
          image: "assets/places/aqaba/south-beach-camping-snorkeling.svg",
          imageStatus: "placeholder" },
      ],
    },
  }

  /* Stamp each thread with the id it is keyed by.

     The map key *is* the id, but the objects never repeated it, so every
     renderer that reached for `thread.id` got undefined. Only the living
     mystery happened to carry an explicit `id`, which is why the bug hid: the
     Hero's share button worked and the other twenty-six threads emitted
     `data-v="undefined"`. The action then coerced that to NaN, and getThread
     quietly answered with the default thread instead — so sharing thread 3
     would have shared thread 7, with no error anywhere to notice it.

     Copying the key onto the object is the fix rather than a workaround, since
     "which thread is this" is a question the object ought to be able to answer
     about itself. An id already present is left alone. */
  for (const key in threadsById) {
    const entry = threadsById[key];
    if (entry && entry.id == null) entry.id = +key;
  }

  const threadCategories = ['All', 'Adventure', 'History', 'Nature', 'Culinary', 'Wellness', 'Local Culture', 'Pilgrimage', 'Art & Craft']

  const libraryThreads = [
    // ── IRBID ─────────────────────────────────────────────────────────────────
    { id: 7,  title: 'Bride of the North',
      hook: 'Walk the black-basalt streets of ancient Decapolis cities where three countries meet.',
      city: 'Irbid', region: 'Roman Decapolis Trail', image: "assets/irbid-bride-of-the-north.png", imageSubject: "Irbid",
      waypoints: 5, duration: '3 days', difficulty: 'Moderate', points: 260, travelers: 520, progress: 40,
      category: 'History', mood: 'Curious', tags: ['Roman', 'Decapolis'],
      start: 'Umm Qais (Gadara)', end: 'Abila (Quwayliba)' },

    { id: 10, title: 'Yarmouk Nature Walk',
      hook: 'A living mystery along the Yarmouk: four hidden clues, a KHAYT companion, and a thread that branches.',
      city: 'Irbid', region: 'Yarmouk River Gorge', image: "assets/irbid-bride-of-the-north.png", imageSubject: "Irbid",
      waypoints: 4, duration: '1 day', difficulty: 'Moderate', points: 200, travelers: 310, progress: 0,
      category: 'Nature', mood: 'Curious', tags: ['Gorge', 'Mystery'],
      start: 'Yarmouk Trail Head', end: 'Riverside Picnic Meadow' },

    { id: 11, title: 'City of Scholars & Souk',
      hook: 'Trace Irbid\'s living history from a Bronze Age mound to a 30,000-student university and its bustling souk.',
      city: 'Irbid', region: 'Irbid City Centre', image: "assets/places/irbid/yarmouk-university.svg", imageStatus: "placeholder", imageSubject: "Yarmouk University",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 180, travelers: 290, progress: 0,
      category: 'Local Culture', mood: 'Cultural', tags: ['University', 'Souk'],
      start: 'Yarmouk University', end: 'Old Irbid Houses' },

    // ── AJLOUN ────────────────────────────────────────────────────────────────
    { id: 6,  title: 'Castle Among Pines',
      hook: 'Descend through mist-wrapped pine forest to a Crusader-era castle built by Saladin\'s own nephew.',
      city: 'Ajloun', region: 'Ajloun Forest Reserve', image: "assets/ajloun-thread.png", imageSubject: "Ajloun",
      waypoints: 5, duration: '2 days', difficulty: 'Moderate', points: 540, travelers: 760, progress: 0,
      category: 'History', mood: 'Adventurous', tags: ['Castle', 'Forest'],
      start: 'Ajloun Forest Reserve Gate', end: 'Orjan Village & Local Feast' },

    { id: 12, title: 'The Olive Oil Journey',
      hook: 'Follow a single olive from the ancient tree to the stone press to a guesthouse table — all in one day.',
      city: 'Ajloun', region: 'Ajloun Olive Groves', image: "assets/places/ajloun/olive-grove-harvest.svg", imageStatus: "placeholder", imageSubject: "Olive Grove Harvest",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 310, travelers: 480, progress: 0,
      category: 'Culinary', mood: 'Hungry', tags: ['Olive', 'Traditional'],
      start: 'Olive Grove Harvest', end: 'Guesthouse Lunch with Fresh Oil' },

    { id: 13, title: 'Forest Soul Trail',
      hook: 'Hike through one of the Levant\'s last pine forests, spot roe deer at dusk, and sleep under the stars.',
      city: 'Ajloun', region: 'Ajloun Highland Trails', image: "assets/places/ajloun/ajloun-forest-main-trail.svg", imageStatus: "placeholder", imageSubject: "Ajloun Forest Main Trail",
      waypoints: 4, duration: '2 days', difficulty: 'Moderate', points: 240, travelers: 400, progress: 0,
      category: 'Nature', mood: 'Peaceful', tags: ['Hiking', 'Pine'],
      start: 'Ajloun Forest Main Trail', end: 'Woodland Lodge Night' },

    // ── JERASH ────────────────────────────────────────────────────────────────
    { id: 2,  title: "Hadrian's City",
      hook: 'Walk a colonnaded street worn smooth by 2,000 years of chariot wheels in the world\'s best-preserved Roman city.',
      city: 'Jerash', region: 'Roman Gerasa', image: "assets/jerash-roman-remains.png", imageSubject: "Jerash",
      waypoints: 6, duration: '1 day', difficulty: 'Easy', points: 310, travelers: 1100, progress: 45,
      category: 'History', mood: 'Curious', tags: ['Roman', 'Columns'],
      start: "Hadrian's Arch", end: 'Hippodrome' },

    { id: 14, title: 'Living Jerash',
      hook: 'Discover the workshops, markets, and reservoir of a city still shaped by 2,000 years of continuous culture.',
      city: 'Jerash', region: 'Old City & Souk', image: "assets/places/jerash/old-city-souk.svg", imageStatus: "placeholder", imageSubject: "Old City Souk",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 220, travelers: 640, progress: 0,
      category: 'Local Culture', mood: 'Cultural', tags: ['Craft', 'Heritage'],
      start: 'Old City Souk', end: 'Craft Workshops Quarter' },

    { id: 15, title: 'Temples & Gods of Gerasa',
      hook: 'Read the city\'s conversion from pagan gods to the Christian faith written in stone, mosaic, and spolia.',
      city: 'Jerash', region: 'Sacred Jerash', image: "assets/places/jerash/temple-of-zeus.webp", imageSubject: "Temple of Zeus",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 280, travelers: 720, progress: 0,
      category: 'History', mood: 'Curious', tags: ['Temple', 'Byzantine'],
      start: 'Temple of Zeus', end: 'Church of St. John the Baptist' },

    // ── AMMAN ─────────────────────────────────────────────────────────────────
    { id: 5,  title: "The Capital's Layers",
      hook: 'Climb a hilltop where Bronze Age walls, Roman temples, and Umayyad palaces share the same stone.',
      city: 'Amman', region: 'Amman Citadel & Old City', image: "assets/amman-the-capital.png", imageSubject: "Amman",
      waypoints: 5, duration: '1 day', difficulty: 'Easy', points: 350, travelers: 1650, progress: 20,
      category: 'History', mood: 'Curious', tags: ['Citadel', 'Roman'],
      start: 'Amman Citadel (Jabal al-Qal\'a)', end: 'Jordan Museum' },

    { id: 16, title: 'Downtown Flavors',
      hook: 'Eat like an Ammanite: falafel at Hashem, kanafeh still warm from the wood oven, and fresh-ground za\'atar.',
      city: 'Amman', region: 'Al-Balad Old City', image: "assets/places/amman/al-balad-old-city-market.webp", imageSubject: "Al-Balad Old City Market",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 290, travelers: 1900, progress: 0,
      category: 'Culinary', mood: 'Hungry', tags: ['Falafel', 'Souk'],
      start: 'Al-Balad Old City Market', end: 'King Faisal Street & Sweet Shops' },

    { id: 17, title: 'Modern Soul of Amman',
      hook: 'Gallery-hop Jabal Weibdeh, browse Rainbow Street\'s bookshops, and find Jordan\'s creative heartbeat.',
      city: 'Amman', region: 'Jabal Weibdeh & Rainbow Street', image: "assets/places/amman/rainbow-street.webp", imageSubject: "Rainbow Street",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 240, travelers: 1100, progress: 0,
      category: 'Art & Craft', mood: 'Cultural', tags: ['Art', 'Galleries'],
      start: 'Rainbow Street', end: 'Jabal Weibdeh Gallery Walk' },

    // ── DEAD SEA ──────────────────────────────────────────────────────────────
    { id: 8,  title: 'Lowest Place on Earth',
      hook: 'Float without effort at 430 metres below sea level — then wade the world\'s saltiest river canyon.',
      city: 'Dead Sea', region: 'Dead Sea Shoreline', image: "assets/dead-sea-lowest-place.png", imageSubject: "Dead Sea",
      waypoints: 4, duration: '2 days', difficulty: 'Easy', points: 240, travelers: 930, progress: 0,
      category: 'Nature', mood: 'Adventurous', tags: ['Salt', 'Float'],
      start: 'Dead Sea Shore Float', end: "Lot's Pillar Viewpoint" },

    { id: 18, title: 'Mud & Minerals',
      hook: 'Let 34% salinity mineral-rich mud do what clinics charge thousands for — right on the ancient shore.',
      city: 'Dead Sea', region: 'Dead Sea Resorts', image: "assets/places/dead-sea/dead-sea-mud-spa.svg", imageStatus: "placeholder", imageSubject: "Dead Sea Mud Spa",
      waypoints: 3, duration: '1 day', difficulty: 'Easy', points: 190, travelers: 1200, progress: 0,
      category: 'Wellness', mood: 'Peaceful', tags: ['Mud', 'Spa'],
      start: 'Dead Sea Mud Spa', end: 'Sunset at Amman Beach' },

    { id: 19, title: 'Sacred Valley',
      hook: "Stand where Jesus was baptised, trace the Lot narrative in a Byzantine mosaic inscription, and follow pilgrims across 1,600 years.",
      city: 'Dead Sea', region: "Baptism Site & Lot's Cave", image: "assets/places/balqa/bethany-beyond-the-jordan.svg", imageStatus: "placeholder", imageSubject: "Bethany Beyond the Jordan",
      waypoints: 4, duration: '2 days', difficulty: 'Easy', points: 250, travelers: 670, progress: 0,
      category: 'Pilgrimage', mood: 'Spiritual', tags: ['Baptism', 'Biblical'],
      start: 'Bethany Beyond the Jordan', end: 'Deir Ain Abata Monastery' },

    // ── MADABA ────────────────────────────────────────────────────────────────
    { id: 9,  title: 'City of Mosaics',
      hook: 'Cut your own tesserae in the city where 6th-century artisans mapped the Holy Land in 2 million stone tiles.',
      city: 'Madaba', region: 'Madaba Old Town', image: "assets/madaba-thread.png", imageSubject: "Madaba",
      waypoints: 5, duration: '2–3 days', difficulty: 'Easy', points: 320, travelers: 680, progress: 0,
      category: 'Art & Craft', mood: 'Cultural', tags: ['Mosaic', 'Heritage'],
      start: "St. George's Church — Mosaic Map", end: 'Mosaic Making Workshop' },

    { id: 20, title: 'Holy Mountain Trail',
      hook: 'From the summit Moses saw the Promised Land — see it yourself, then descend to Herod\'s imprisoned prophet.',
      city: 'Madaba', region: 'Mount Nebo & Beyond', image: "assets/places/madaba/mount-nebo-moses-viewpoint.svg", imageStatus: "placeholder", imageSubject: "Mount Nebo — Moses Viewpoint",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 280, travelers: 890, progress: 0,
      category: 'Pilgrimage', mood: 'Spiritual', tags: ['Moses', 'Biblical'],
      start: 'Mount Nebo — Moses Viewpoint', end: 'Mukawir (Machaerus)' },

    { id: 21, title: 'Springs & Hot Waters',
      hook: 'Immerse in 63°C mineral springs that Herod the Great bathed in — then follow the waterfall to the canyon floor.',
      city: 'Madaba', region: "Ma'in Hot Springs", image: "assets/places/madaba/main-hot-springs-resort.svg", imageStatus: "placeholder", imageSubject: "Ma'in Hot Springs Resort",
      waypoints: 3, duration: '1 day', difficulty: 'Easy', points: 220, travelers: 740, progress: 0,
      category: 'Wellness', mood: 'Peaceful', tags: ['HotSprings', 'Waterfall'],
      start: "Ma'in Hot Springs Resort", end: "Hammamat Ma'in Natural Pools" },

    // ── KARAK ─────────────────────────────────────────────────────────────────
    { id: 4,  title: 'Crusader Stronghold',
      hook: 'Walk the underground vaults of the fortress Saladin besieged twice — and trace Moabite kings beneath the castle.',
      city: 'Karak', region: 'Karak Castle & Plateau', image: "assets/karak-thread.png", imageSubject: "Karak",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 190, travelers: 890, progress: 0,
      category: 'History', mood: 'Curious', tags: ['Crusaders', 'Castle'],
      start: 'Karak Castle (Crac des Moabites)', end: 'Karak Plateau Viewpoint' },

    { id: 22, title: 'Mansaf & Moab Flavors',
      hook: 'Learn to reconstitute jameed from scratch, cook the national dish, and eat it standing — the Bedouin way.',
      city: 'Karak', region: 'Karak City & Villages', image: "assets/karak-mansaf.png", imageSubject: "Karak",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 230, travelers: 560, progress: 0,
      category: 'Culinary', mood: 'Hungry', tags: ['Mansaf', 'Honey'],
      start: 'Karak Central Market', end: 'Dhiban (Dibon) — Moabite Capital' },

    { id: 23, title: 'Wadi Canyon Adventure',
      hook: 'Wade a basalt canyon where a 20-metre thermal waterfall meets mineral-stained cliffs above the Moabite plateau.',
      city: 'Karak', region: 'Wadi Ibn Hammad', image: "assets/places/karak/wadi-ibn-hammad-canyon.svg", imageStatus: "placeholder", imageSubject: "Wadi Ibn Hammad Canyon",
      waypoints: 3, duration: '1 day', difficulty: 'Moderate', points: 200, travelers: 340, progress: 0,
      category: 'Adventure', mood: 'Adventurous', tags: ['Canyon', 'Waterfall'],
      start: 'Wadi Ibn Hammad Canyon', end: 'Dana Biosphere Reserve (North Edge)' },

    // ── MA'AN ─────────────────────────────────────────────────────────────────
    { id: 1,  title: 'The Seven World Wonder',
      hook: 'Step through the Siq at dawn and let 2,000-year-old rose-red stone introduce the Treasury in silence.',
      city: "Ma'an", region: "Petra · Rose-Red City", image: "assets/maan-seven-wonders.png", imageSubject: "Ma'an",
      waypoints: 5, duration: 'Multiple days', difficulty: 'Moderate–Strenuous', points: 420, travelers: 2400, progress: 72,
      category: 'History', mood: 'Curious', tags: ['UNESCO', 'Nabataean'],
      start: 'The Siq', end: 'Ad-Deir (The Monastery)' },

    { id: 24, title: 'Wadi Rum Adventure',
      hook: 'Sleep under the Milky Way in a Bedouin camp after watching the sandstone massifs turn blood-red at sunset.',
      city: "Ma'an", region: 'Wadi Rum Protected Area', image: "assets/places/maan/wadi-rum-visitor-gate.svg", imageStatus: "placeholder", imageSubject: "Wadi Rum Visitor Gate",
      waypoints: 5, duration: '2 days', difficulty: 'Moderate', points: 380, travelers: 1800, progress: 0,
      category: 'Adventure', mood: 'Adventurous', tags: ['Desert', 'Bedouin'],
      start: 'Wadi Rum Visitor Gate', end: 'Bedouin Camp Under Stars' },

    { id: 25, title: 'Little Petra & Bedouin Life',
      hook: 'Find a free Nabataean siq with painted frescoes, a 9,000-year-old village, and Bedouin bread on an open fire.',
      city: "Ma'an", region: 'Siq al-Barid & Al-Beidha', image: "assets/places/maan/little-petra-siq-al-barid.svg", imageStatus: "placeholder", imageSubject: "Little Petra (Siq al-Barid)",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 270, travelers: 820, progress: 0,
      category: 'Local Culture', mood: 'Cultural', tags: ['Neolithic', 'Bedouin'],
      start: 'Little Petra (Siq al-Barid)', end: 'Camel Ride through Wadi Araba' },

    // ── AL-AQABA ──────────────────────────────────────────────────────────────
    { id: 3,  title: 'Bride of the Red Sea',
      hook: 'Drift over the Red Sea\'s healthiest reef system — where 20+ metres of visibility reveals a world unchanged.',
      city: 'Al-Aqaba', region: 'Aqaba Marine Park', image: "assets/aqaba-bride-of-red-sea.png", imageSubject: "Al-Aqaba",
      waypoints: 4, duration: '4 days', difficulty: 'Moderate', points: 280, travelers: 3200, progress: 0,
      category: 'Adventure', mood: 'Adventurous', tags: ['Diving', 'Reef'],
      start: 'Aqaba Marine Park', end: 'Saudi Border Coral Gardens' },

    { id: 26, title: 'Port of History',
      hook: 'Walk from one of Islam\'s first planned cities to the Mamluk fort that T.E. Lawrence captured in an afternoon.',
      city: 'Al-Aqaba', region: 'Aqaba Historic Quarter', image: "assets/places/aqaba/aqaba-fort-mamluk-castle.svg", imageStatus: "placeholder", imageSubject: "Aqaba Fort (Mamluk Castle)",
      waypoints: 4, duration: '1 day', difficulty: 'Easy', points: 240, travelers: 690, progress: 0,
      category: 'History', mood: 'Curious', tags: ['Islamic', 'Port'],
      start: 'Aqaba Fort (Mamluk Castle)', end: 'Aqaba Fish Market & Port' },

    { id: 27, title: 'Desert to Sea',
      hook: 'Journey from the red sands of Wadi Rum to the turquoise Gulf of Aqaba — from starlight to sunrise on water.',
      city: 'Al-Aqaba', region: 'Wadi Rum → Gulf of Aqaba', image: "assets/places/aqaba/wadi-rum-desert-departure.svg", imageStatus: "placeholder", imageSubject: "Wadi Rum Desert Departure",
      waypoints: 3, duration: '2 days', difficulty: 'Moderate', points: 210, travelers: 510, progress: 0,
      category: 'Adventure', mood: 'Adventurous', tags: ['Route', 'Sunset'],
      start: 'Wadi Rum Desert Departure', end: 'South Beach Camping & Snorkeling' },
  ]

  const cities = [
    { id: 'Irbid',    name: 'Irbid',    label: 'Irbid',    image: 'assets/irbid-bride-of-the-north.png', x: 132, y: 118, labelSide: 'right', labelDy: -16 },
    { id: 'Ajloun',   name: 'Ajloun',   label: 'Ajloun',   image: 'assets/ajloun-thread.png', x: 106, y: 162, labelSide: 'right', labelDy: -18 },
    { id: 'Jerash',   name: 'Jerash',   label: 'Jerash',   image: 'assets/jerash-roman-remains.png', x: 162, y: 165, labelSide: 'right', labelDy: 8   },
    { id: 'Amman',    name: 'Amman',    label: 'Amman',    image: 'assets/amman-the-capital.png', x: 182, y: 215, labelSide: 'right', labelDy: -11 },
    { id: 'Dead Sea', name: 'Dead Sea', label: 'Dead Sea', image: 'assets/dead-sea-lowest-place.png', x: 96,  y: 240, labelSide: 'right', labelDy: -18 },
    { id: 'Madaba',   name: 'Madaba',   label: 'Madaba',   image: 'assets/madaba-thread.png', x: 148, y: 265, labelSide: 'right', labelDy: 8   },
    { id: 'Karak',    name: 'Karak',    label: 'Karak',    image: 'assets/karak-thread.png', x: 132, y: 332, labelSide: 'right', labelDy: -16 },
    { id: "Ma'an",    name: "Ma'an",    label: "Ma'an",    image: 'assets/maan-seven-wonders.png', x: 165, y: 418, labelSide: 'right', labelDy: -5  },
    { id: 'Al-Aqaba', name: 'Al-Aqaba', label: 'Al-Aqaba', image: 'assets/aqaba-bride-of-red-sea.png', x: 100, y: 482, labelSide: 'right', labelDy: -18 },
  ]

  const moodEmoji = {
    Adventurous: '⚡',
    Curious: '🏛️',
    Peaceful: '🌿',
    Hungry: '🍽️',
    Cultural: '🎨',
    Spiritual: '✝️',
  }

  const difficultyColor = {
    Easy: '#013E37',
    Moderate: '#D6672B',
    'Easy–Moderate': '#046852',
    'Moderate–Strenuous': '#A23B17',
    Strenuous: '#8B2A2A',
  }

  /* ── Featured / completed / active ─────────────────────────────────────────
     These three lists used to repeat an id, a title, an image and a region by
     hand, and they drifted: the featured slot for Dead Sea carried id 2, which
     is Hadrian's City, and the Madaba slot carried id 3, which is the Red Sea
     dive. The card said one thing and the link opened another.

     They are now *derived*. A hand-written list may name ids only; every title,
     image, region, waypoint count and duration is read from libraryThreads /
     threadsById by id, so a card can no longer disagree with the thread it
     opens. threadSummary() returns null for an id with no thread, so an entry
     is dropped rather than rendering an empty card.                           */
  function libraryThreadById(threadId) {
    for (let i = 0; i < libraryThreads.length; i++) {
      if (libraryThreads[i].id === threadId) return libraryThreads[i];
    }
    return null;
  }

  function threadSummary(threadId) {
    const lib = libraryThreadById(threadId);
    const full = threadsById[threadId];
    if (!lib && !full) return null;
    return {
      id: threadId,
      title: (lib && lib.title) || (full && full.title) || 'Untitled thread',
      region: (lib && lib.region) || (full && full.city) || '',
      subtitle: (lib && lib.city) || (full && full.city) || '',
      image: (lib && lib.image) || (full && full.image) || null,
      /* Carried so a card's caption names the place the file depicts, and so an
         illustration is not described as a photograph. */
      imageStatus: (lib && lib.imageStatus) || (full && full.imageStatus) || null,
      imageSubject: (lib && lib.imageSubject) || null,
      category: (lib && lib.category) || '',
      waypoints: (lib && lib.waypoints) || ((full && full.waypoints || []).length),
      duration: (lib && lib.duration) || '',
      difficulty: (lib && lib.difficulty) || '',
      travelers: (lib && lib.travelers) || 0,
      progress: (lib && lib.progress) || 0,
      points: (lib && lib.points) || 0,
      hook: (lib && lib.hook) || '',
    };
  }

  function derivedThreads(ids) {
    const out = [];
    for (let i = 0; i < ids.length; i++) {
      const summary = threadSummary(ids[i]);
      if (summary) out.push(summary);
    }
    return out;
  }

  /* Ids only. 1 = Petra, 8 = Dead Sea, 9 = Madaba. */
  const FEATURED_THREAD_IDS = [1, 8, 9];
  const featuredThreads = derivedThreads(FEATURED_THREAD_IDS);

  /* The weaver's journey is a real state, not a copy of the featured list, so
     these keep their own ids and their own earned figures. */
  const completedThreads = derivedThreads([1, 9]).map(function (t) {
    return Object.assign({}, t, {
      pointsEarned: t.points,
      completedDate: null,
      demoSeed: true,
    });
  });

  const activeThreads = derivedThreads([6]).map(function (t) {
    return Object.assign({}, t, {
      progress: 43,
      nextWaypoint: 'Ajloun Castle Lookout',
      demoSeed: true,
    });
  });

  /* ── Landing statistics ───────────────────────────────────────────────────
     The old strip read 47 threads / 318 waypoints / 12k weavers / 94 partners.
     Those were roadmap numbers presented as live measurements, and the library
     actually holds 27 threads. Everything that describes *this build* is now
     computed from the catalogues, so it cannot drift again; nothing here claims
     a community size, because this build has no way to know one. */
  const libraryStats = (function () {
    let waypointTotal = 0;
    const regionNames = [];
    for (let i = 0; i < libraryThreads.length; i++) {
      waypointTotal += libraryThreads[i].waypoints || 0;
      const city = libraryThreads[i].city;
      if (city && regionNames.indexOf(city) < 0) regionNames.push(city);
    }
    return {
      threads: libraryThreads.length,
      waypoints: waypointTotal,
      regions: regionNames.length,
      /* Filled from the rewards catalogue just below, once it exists. */
      partners: 0,
    };
  })();

  const assets = {
    logoIcon: "assets/9920d.png",
    logoText: "assets/92fb6.png",
    petraHero: "assets/petra-hero.png",
    jordanMap: "assets/jordan-map-new.png",
  };

  // ── UserProfile.tsx ──────────────────────────────────────────────────────────
  const profileBadges = [
    { id: 1, name: 'North Explorer', icon: '🧭', desc: 'Completed all threads in Northern Jordan', earned: true, date: null, rarity: 'Rare', demoSeed: true },
    { id: 2, name: 'Olive Master', icon: '🫒', desc: 'Visited 3+ olive heritage sites', earned: true, date: null, rarity: 'Common', demoSeed: true },
    { id: 3, name: 'Rose Pilgrim', icon: '🌹', desc: 'Walked through Petra at dawn', earned: true, date: null, rarity: 'Epic', demoSeed: true },
    { id: 4, name: 'Desert Weaver', icon: '🏜', desc: 'Spent a night in Wadi Rum', earned: false, date: null, rarity: 'Rare' },
    { id: 5, name: 'Souk Sage', icon: '🏺', desc: 'Visited 5 traditional craft workshops', earned: false, date: null, rarity: 'Common' },
    { id: 6, name: 'Dead Sea Drifter', icon: '🌊', desc: 'Float the lowest point on earth', earned: false, date: null, rarity: 'Common' },
    { id: 7, name: 'Castle Keeper', icon: '🏰', desc: 'Completed all castle waypoints', earned: false, date: null, rarity: 'Epic' },
    { id: 8, name: 'Grand Loom', icon: '🎖', desc: 'Complete 10 full threads', earned: false, date: null, rarity: 'Legendary' },
    { id: 9, name: 'Thread Seer', icon: '🧵', desc: 'Found the living mystery thread at Yarmouk', earned: false, date: null, rarity: 'Epic' },
    { id: 10, name: 'Hidden Thread', icon: '🔒', desc: 'Found the secret challenge on the Yarmouk mystery', earned: false, date: null, rarity: 'Legendary' },
  ]

  /* completedThreads and activeThreads are derived above, from the ids of the
     threads the demo weaver has actually walked. They used to be hand-written
     literals here with ids that named different threads than their own titles —
     "The Castle Among Pines Thread" sat under id 1, which is Petra. */

  /* Each reward is a demo catalogue entry. Nothing here is redeemable for real,
     which the UI states plainly rather than simulating a partner voucher. */
  const rewards = [
    { id: 'ajloun-soap', name: 'Ajloun Soap House', discount: '15% off', points: 200, type: 'Craft', logo: '🧼', remaining: 5 },
    { id: 'orjan-coop', name: "Orjan Women's Coop", discount: '20% off', points: 300, type: 'Artisan', logo: '🧵', remaining: 3 },
    { id: 'wadi-rum-camp', name: 'Wadi Rum Bedouin Camp', discount: 'Free tea ceremony', points: 150, type: 'Experience', logo: '☕', remaining: 12 },
    { id: 'petra-kitchen', name: 'Petra Kitchen Restaurant', discount: '10% off dinner', points: 100, type: 'Dining', logo: '🍽', remaining: 8 },
  ]

  /* The partner figure is read straight off the catalogue, so the two can never
     disagree. */
  libraryStats.partners = rewards.length;

  const landingStats = [
    { value: String(libraryStats.threads), label: 'Story Threads' },
    { value: String(libraryStats.waypoints), label: 'Hidden Waypoints' },
    { value: String(libraryStats.regions), label: 'Regions Covered' },
    { value: String(libraryStats.partners), label: 'Demo Partners' },
  ];

  /* Printed under the strip so the numbers read as this build's inventory
     rather than as a claim about a live platform. */
  const landingStatsNote =
    'Counted from this build\u2019s thread library. Partner rewards are a demo catalogue, not live offers.';

  const totalPoints = 740

  /* ── Lookups ────────────────────────────────────────────────────────────── */

  /* The thread shown when a route carries no id (or an unknown one), matching
     the fallback in App.tsx / ActiveThread.tsx. */
  const DEFAULT_THREAD_ID = 7;

  /* The living-mystery thread. Every other thread keeps the original
     completion model (bare waypoint ids in session.completedWaypointIds); this
     one records progress in session.completedWaypointKeys, keyed by thread id,
     so the two representations are never mixed in one array. */
  const HERO_THREAD_ID = 10;
  const HERO_BADGE_ID = 9;
  const SECRET_BADGE_ID = 10;

  /* ── ATHAR ────────────────────────────────────────────────────────────────
     One balance: NASEEJ.session.points. That is the number the profile, the
     rewards tab and the hero thread's stat row all read, so a reward can never
     land in a second, parallel purse.

     The amounts live here and nowhere else. Callers name *what* happened
     (kind) and *which* one it was (key); they never pass an amount, so there is
     no path by which a caller can invent a payout. `awarded` is the ledger:
     one entry per reward, written once, which is what makes a duplicate award
     impossible rather than merely unlikely. */
  const ATHAR = {
    challenge: 150,
    clue: 100,
    chapter: 200,
    reveal: 500,
    secret: 250,
  };

  /* What paid a reward. `type` is the kind the product pays; `source` is the
     interaction that caused it. Both are closed sets, so the security rules can
     validate them against a literal list instead of trusting a free string —
     which is the difference between "a reward row" and "whatever was posted". */
  const REWARD_SOURCES = {
    challenge: 'challenge_answer',
    clue: 'clue_unlock',
    chapter: 'chapter_reached',
    reveal: 'thread_reveal',
    secret: 'secret_challenge',
  };

  /* Firestore document ids may not contain '/', nor be '.' or '..'. Every part
     of a reward key is an integer, a declared chapter key or a declared secret
     id, so the key is already safe — sanitising here means a future non-numeric
     key cannot produce a write that silently lands in a parent document. */
  function docSafe(value) {
    return String(value == null ? '' : value).replace(/[^A-Za-z0-9_-]/g, '_');
  }

  /* ── Levels ───────────────────────────────────────────────────────────────
     The profile used to carry a hard-coded levelName / levelProgress /
     pointsToNextLevel, so earning the mystery's 500-point reveal left the level
     bar and the "N pts to next level" line describing a level the weaver was no
     longer on. Those three numbers are gone; the level is now a pure function
     of the one real balance.

     The thresholds live here and nowhere else, and a weaver can never fall
     below the level they already reached: points only ever go up, but the
     formula is defensive about it anyway. */
  const LEVELS = [
    { at: 0, name: 'Guest Weaver' },
    { at: 400, name: 'North Explorer' },
    { at: 1000, name: 'Gold Weaver' },
    { at: 2000, name: 'Thread Keeper' },
    { at: 3600, name: 'Grand Loom' },
  ];

  function levelFor(points) {
    const p = isFiniteNumber(points) && points > 0 ? points : 0;
    let index = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (p >= LEVELS[i].at) index = i;
    }
    const current = LEVELS[index];
    const next = index + 1 < LEVELS.length ? LEVELS[index + 1] : null;
    const floor = current.at;
    const ceiling = next ? next.at : current.at;
    const span = ceiling - floor;
    return {
      index: index,
      name: current.name,
      nextName: next ? next.name : null,
      /* Whole percent, 0-100. At the top level this is 100 by definition
         rather than a division by zero. */
      percent: next ? Math.round(((p - floor) / span) * 100) : 100,
      pointsToNext: next ? next.at - p : 0,
      floor: floor,
      ceiling: ceiling,
      isMax: !next,
    };
  }

  /* A weaver's level is read from what they have *earned*, not from what they
     are holding. Redeeming a reward spends ATHAR, and a level that dropped
     because someone spent a discount would be a bug, not a mechanic. So the
     high-water mark is remembered, and levelForWeaver() is the number the UI
     shows. The balance is still the only purse; this is a floor, not a second
     one. */
  function levelForWeaver() {
    const held = isFiniteNumber(NASEEJ.session.points) && NASEEJ.session.points > 0
      ? NASEEJ.session.points
      : 0;
    const peak = isFiniteNumber(NASEEJ.session.atharPeak) && NASEEJ.session.atharPeak > 0
      ? NASEEJ.session.atharPeak
      : 0;
    return levelFor(Math.max(held, peak));
  }

  /* Called by the one place that adds ATHAR, so the mark can never be lower
     than the balance. */
  function noteAtharEarned(points) {
    if (!isFiniteNumber(points)) return;
    if (!isFiniteNumber(NASEEJ.session.atharPeak)) NASEEJ.session.atharPeak = 0;
    if (points > NASEEJ.session.atharPeak) NASEEJ.session.atharPeak = points;
  }

  /* ── Persistence ───────────────────────────────────────────────────────────
     Progress is written to sessionStorage on every change and hydrated on
     boot. A signed-out demo weaver gets exactly the same treatment; the key is
     namespaced to the app, not to an account. When sessionStorage is unavailable
     (private mode, quota, sandboxed iframe) it falls back to localStorage and
     finally to memory — progress is never the reason the page fails.

     Signed-in weavers still write here (so a refresh before Firestore returns
     is not a blank slate) and js/auth.js mirrors the same snapshot to
     weavers/{uid} through setCloudWriter / accountPayload. */
  const PROGRESS_KEY = 'naseej.progress.v1';

  function storage(kind) {
    try {
      const s = window[kind];
      /* Touch it: Safari private mode has the object but throws on use. */
      s.getItem(PROGRESS_KEY);
      return s;
    } catch (err) {
      return null;
    }
  }

  /* last resort: per-document in-memory store, so one page's session works. */
  let memoryStore = null;

  function readStored() {
    const stores = [storage('sessionStorage'), storage('localStorage')];
    for (let i = 0; i < stores.length; i++) {
      if (!stores[i]) continue;
      let raw = null;
      try { raw = stores[i].getItem(PROGRESS_KEY); } catch (err) { continue; }
      if (!raw) continue;
      const parsed = parseStored(raw);
      if (parsed) return parsed;
    }
    return memoryStore;
  }

  function writeStored(snapshot) {
    const raw = JSON.stringify(snapshot);
    const stores = [storage('sessionStorage'), storage('localStorage')];
    let stored = false;
    for (let i = 0; i < stores.length; i++) {
      if (!stores[i]) continue;
      try { stores[i].setItem(PROGRESS_KEY, raw); stored = true; } catch (err) { /* quota: try the next one */ }
    }
    memoryStore = snapshot;
    return stored;
  }

  /* ── Validation ───────────────────────────────────────────────────────────
     Hydration reads whatever is in storage, which may be half-written, from an
     older build, or hand-edited. Every field is checked against the shape the
     app writes: a record that fails any check is dropped whole rather than
     half-applied, so a corrupt blob can never leave the mystery in a state
     that no interaction could reach. */

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function numList(v) {
    if (!Array.isArray(v)) return null;
    const out = [];
    for (let i = 0; i < v.length; i++) {
      const n = +v[i];
      if (!isFiniteNumber(n)) return null;
      if (out.indexOf(n) < 0) out.push(n);
    }
    return out;
  }

  function stringMap(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const out = {};
    for (const key in v) {
      if (typeof v[key] === 'string') out[key] = v[key];
    }
    return out;
  }

  /* Award amounts live in ATHAR, never in storage: whatever the blob claims,
     it is read back out of the table by key, so a tampered "amount" is
     discarded rather than credited. */
  function awardedMap(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out = {};
    for (const key in v) {
      const kind = key.split(':')[0];
      if (ATHAR[kind]) out[key] = ATHAR[kind];
    }
    return out;
  }

  /* The stored answer map is the record of what was *earned*, so every entry in
     it is correct by construction. A wrong attempt is deliberately not written:
     it is kept in memory only to give the same wrong option a stable reply in
     the same visit, and persisting it would have to persist "incorrect" as well,
     since a stored answer is read back as a solved waypoint. */
  function answersMap(v) {
    const src = stringMap(v);
    if (!src) return {};
    const out = {};
    for (const key in src) {
      const n = +key;
      if (!isFiniteNumber(n)) continue;
      out[n] = { optionId: src[key], correct: true };
    }
    return out;
  }

  function parseRecord(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const clues = numList(raw.clues);
    const completed = numList(raw.completed);
    if (!clues || !completed) return null;
    const branch = raw.branch == null ? null : String(raw.branch);
    return {
      clues: clues,
      branch: branch,
      answers: answersMap(raw.answers),
      observations: stringMap(raw.observations) || {},
      awarded: awardedMap(raw.awarded),
      completed: completed,
      reveal: !!raw.reveal,
      secret: raw.secret ? String(raw.secret) : null,
      earned: 0,
    };
  }

  function parseStored(rawText) {
    let parsed;
    try { parsed = JSON.parse(rawText); } catch (err) { return null; }
    return parseSnapshot(parsed);
  }

  function parseSnapshot(parsed) {
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) return null;

    const snapshot = {
      v: 1,
      points: isFiniteNumber(parsed.points) && parsed.points >= 0 ? Math.floor(parsed.points) : null,
      atharPeak: isFiniteNumber(parsed.atharPeak) && parsed.atharPeak >= 0 ? Math.floor(parsed.atharPeak) : null,
      savedAt: isFiniteNumber(parsed.savedAt) && parsed.savedAt >= 0 ? parsed.savedAt : 0,
      completedWaypointIds: numList(parsed.completedWaypointIds) || [],
      completedWaypointKeys: {},
      threadProgress: {},
      mystery: {},
      badges: [],
    };

    if (parsed.completedWaypointKeys && typeof parsed.completedWaypointKeys === 'object' &&
        !Array.isArray(parsed.completedWaypointKeys)) {
      for (const tid in parsed.completedWaypointKeys) {
        const ids = numList(parsed.completedWaypointKeys[tid]);
        if (!ids) continue;
        if (!threadsById[tid]) continue;
        snapshot.completedWaypointKeys[tid] = ids;
      }
    }

    if (parsed.threadProgress && typeof parsed.threadProgress === 'object' &&
        !Array.isArray(parsed.threadProgress)) {
      for (const tid in parsed.threadProgress) {
        const pct = parsed.threadProgress[tid];
        if (!isFiniteNumber(pct) || pct < 0 || pct > 100) continue;
        if (!threadsById[tid]) continue;
        snapshot.threadProgress[tid] = Math.round(pct);
      }
    }

    if (parsed.mystery && typeof parsed.mystery === 'object' && !Array.isArray(parsed.mystery)) {
      for (const tid in parsed.mystery) {
        if (!threadsById[tid] || !isHeroThread(threadsById[tid])) continue;
        const record = parseRecord(parsed.mystery[tid]);
        if (record) snapshot.mystery[tid] = record;
      }
    }

    if (Array.isArray(parsed.badges)) {
      for (let i = 0; i < parsed.badges.length; i++) {
        const id = +parsed.badges[i];
        if (isFiniteNumber(id)) snapshot.badges.push(id);
      }
    }

    return snapshot;
  }

  function recordSnapshot(record) {
    const answers = {};
    for (const key in record.answers) {
      /* Only solved waypoints are stored; see answersMap. */
      if (record.answers[key] && record.answers[key].correct) answers[key] = record.answers[key].optionId;
    }
    const observations = {};
    for (const key in record.observations) {
      if (record.observations[key]) observations[key] = record.observations[key];
    }
    const awarded = {};
    for (const key in record.awarded) awarded[key] = record.awarded[key];
    return {
      clues: record.clues.slice(),
      branch: record.branch,
      answers: answers,
      observations: observations,
      awarded: awarded,
      completed: record.completed.slice(),
      reveal: !!record.reveal,
      secret: record.secret || null,
    };
  }

  /* ── Lookups ────────────────────────────────────────────────────────────── */

  function findWaypoint(waypoints, waypointId) {
    for (let i = 0; i < waypoints.length; i++) {
      if (waypoints[i].id === waypointId) return waypoints[i];
    }
    return null;
  }

  function waypointIndex(thread, waypoint) {
    const waypoints = (thread && thread.waypoints) || [];
    for (let i = 0; i < waypoints.length; i++) {
      if (waypoints[i].id === waypoint.id) return i;
    }
    return -1;
  }

  /* Most threads in threadsById carry no `id` field (they are keyed by it), so
     the id is resolved by reverse lookup when it is absent. Everything that
     needs to key session state by thread goes through here, so a synthetic
     stand-in object still resolves to its real thread. */
  const THREAD_ID_BY_OBJECT = [];
  for (const tid in threadsById) THREAD_ID_BY_OBJECT.push({ tid: +tid, thread: threadsById[tid] });

  function threadIdOf(thread) {
    if (!thread) return null;
    if (thread.id != null) return thread.id;
    if (thread.livingMystery) return HERO_THREAD_ID;
    for (let i = 0; i < THREAD_ID_BY_OBJECT.length; i++) {
      if (THREAD_ID_BY_OBJECT[i].thread === thread) return THREAD_ID_BY_OBJECT[i].tid;
    }
    return null;
  }

  function isHeroThread(thread) {
    if (!thread) return false;
    if (thread.livingMystery) return true;
    return thread.id === HERO_THREAD_ID;
  }

  /* Completion is unioned, never overridden: a waypoint the static data marks
     done stays done, and a future Firestore layer can only add to the set.
     Completion is monotonic, so there is no un-complete path to get wrong.

     The two representations are kept in two structures. session.completedWaypointIds
     holds bare numeric ids and is what every original thread matches on;
     session.completedWaypointKeys maps thread id -> waypoint ids and is what
     the hero thread matches on. Nothing is ever pushed into both. */
  function heroKeys(threadId) {
    const bag = NASEEJ.session.completedWaypointKeys;
    if (!bag[threadId]) bag[threadId] = [];
    return bag[threadId];
  }

  function isCompleted(waypoint, thread) {
    if (!waypoint) return false;
    if (isHeroThread(thread)) {
      return heroKeys(threadIdOf(thread)).indexOf(waypoint.id) >= 0;
    }
    if (waypoint.status === 'completed') return true;
    return NASEEJ.session.completedWaypointIds.indexOf(waypoint.id) >= 0;
  }

  function mysteryRecord(threadId) {
    const bag = NASEEJ.session.mystery;
    const tid = threadId == null ? HERO_THREAD_ID : threadId;
    if (!bag[tid]) {
      bag[tid] = {
        clues: [],
        branch: null,
        answers: {},
        observations: {},
        awarded: {},
        completed: [],
        earned: 0,
        reveal: false,
        secret: null,
      };
    }
    return bag[tid];
  }

  /* ATHAR earned on a thread is derived from the ledger, so it can never drift
     from the balance: the ledger is what awardAthar writes and what hydration
     validates, and this is only ever a sum over it. */
  function earnedAthar(threadId) {
    const m = mysteryRecord(threadId);
    let total = 0;
    for (const key in m.awarded) total += m.awarded[key];
    m.earned = total;
    return total;
  }

  /* Every payout is announced by the one function that makes it, so the chips
     shown after an action are the ledger, not a hand-written guess at it. A
     clue award happens inside unlockClue and a chapter award inside
     completeHeroWaypoint; if each call site assembled its own list, those two
     would silently go unannounced while the balance moved. */
  let chipLog = [];

  /* A chapter is announced by its name, not by the key it is stored under:
     "Chapter 2" is meaningless, "Chapter · Follow the Person" is the thing the
     weaver just reached. 'follow' resolves through the chosen branch, which is
     why the branch must already be set when that award happens. */
  function chapterTitleFor(threadId, key) {
    const thread = threadsById[threadId];
    const chapters = (thread && thread.chapters) || {};
    const m = mysteryRecord(threadId);
    if (key === 'entrance') return chapters.start || null;
    if (key === 'follow') return chapters[m.branch === 'object' ? 'object' : 'person'] || null;
    if (key === 'connection') return chapters.connection || null;
    return null;
  }

  function awardLabel(threadId, kind, key, label) {
    if (label) return label;
    if (kind === 'clue') return 'Clue ' + key;
    if (kind === 'chapter') {
      const title = chapterTitleFor(threadId, key);
      return title ? 'Chapter · ' + title.replace(/^The /, '') : 'Chapter';
    }
    if (kind === 'reveal') return 'Reveal';
    if (kind === 'secret') return 'Secret Challenge';
    return kind === 'observation' ? 'Observation' : 'Challenge';
  }

  function awardAthar(threadId, kind, key, label) {
    const amount = ATHAR[kind];
    if (!amount) return 0;
    const m = mysteryRecord(threadId);
    const entry = kind + ':' + key;
    if (m.awarded[entry]) return 0;
    m.awarded[entry] = amount;
    NASEEJ.session.points += amount;
    noteAtharEarned(NASEEJ.session.points);
    chipLog.push({ label: awardLabel(threadId, kind, key, label), athar: amount });
    return amount;
  }

  /* Chips are drained, never read: an action clears the log, does its work and
     takes whatever was paid, so a rejected attempt reports nothing. */
  function resetChips() { chipLog.length = 0; }
  function takeChips() {
    const chips = chipLog.slice();
    chipLog.length = 0;
    return chips;
  }

  /* ── Clues ─────────────────────────────────────────────────────────────────
     A clue opens because an interaction succeeded, never because a waypoint
     index was reached. The condition is declared on the clue; this is the only
     function that can open one, and it is not exported — a renderer cannot ask
     for a clue, so a plain button press cannot produce one. */
  function clueById(thread, clueId) {
    const clues = (thread && thread.clues) || [];
    for (let i = 0; i < clues.length; i++) {
      if (clues[i].id === clueId) return clues[i];
    }
    return null;
  }

  function isClueUnlocked(threadId, clueId) {
    return mysteryRecord(threadId).clues.indexOf(clueId) >= 0;
  }

  function unlockClueIfEarned(threadId, kind, waypointId) {
    const thread = threadsById[threadId];
    if (!thread) return null;
    const clues = thread.clues || [];
    for (let i = 0; i < clues.length; i++) {
      const unlock = clues[i].unlock || {};
      if (unlock.kind !== kind) continue;
      if (kind === 'branch') {
        if (unlock.waypoint != null && unlock.waypoint !== waypointId) continue;
      } else if (unlock.waypoint !== waypointId) continue;
      if (unlockClue(threadId, clues[i].id)) return clues[i];
    }
    return null;
  }

  function unlockClue(threadId, clueId) {
    const m = mysteryRecord(threadId);
    if (m.clues.indexOf(clueId) >= 0) return false;
    const thread = threadsById[threadId];
    /* Only a declared clue can be opened, and only once. */
    if (!clueById(thread, clueId)) return false;
    m.clues.push(clueId);
    awardAthar(threadId, 'clue', clueId);
    return true;
  }

  function getClueProgress(threadId) {
    const tid = threadId == null ? HERO_THREAD_ID : threadId;
    const thread = threadsById[tid] || threadsById[HERO_THREAD_ID];
    const total = ((thread && thread.clues) || []).length;
    const m = mysteryRecord(tid);
    return { unlocked: m.clues.length, total: total || 4, ids: m.clues.slice() };
  }

  /* ── Progress ───────────────────────────────────────────────────────────── */

  function completeHeroWaypoint(threadId, waypointId) {
    const thread = threadsById[threadId];
    const m = mysteryRecord(threadId);
    if (m.completed.indexOf(waypointId) < 0) m.completed.push(waypointId);
    const keys = heroKeys(threadId);
    if (keys.indexOf(waypointId) < 0) keys.push(waypointId);
    const wp = thread ? findWaypoint(thread.waypoints || [], waypointId) : null;
    if (wp && wp.chapterKey) awardAthar(threadId, 'chapter', wp.chapterKey);
    syncHeroProgress(threadId);
  }

  function syncHeroProgress(threadId) {
    const thread = threadsById[threadId];
    if (!thread) return;
    const wps = thread.waypoints || [];
    const n = wps.length || 1;
    const done = wps.filter(function (wp) { return isCompleted(wp, thread); }).length;
    const pct = Math.round((done / n) * 100);
    NASEEJ.session.threadProgress[threadId] = pct;
    syncHeroJourney(threadId);
  }

  /* The reveal opens only when the whole mystery is actually solved: every
     waypoint completed, every clue earned, a path chosen. */
  function maybeReveal(threadId) {
    const thread = threadsById[threadId];
    const m = mysteryRecord(threadId);
    if (!thread || m.reveal) return false;
    const clues = getClueProgress(threadId);
    const wps = thread.waypoints || [];
    let allDone = wps.length > 0;
    for (let i = 0; i < wps.length; i++) {
      if (!isCompleted(wps[i], thread)) allDone = false;
    }
    if (clues.unlocked < clues.total || !allDone || !m.branch) return false;
    m.reveal = true;
    awardAthar(threadId, 'reveal', 'final');
    earnHeroBadge();
    syncHeroJourney(threadId);
    return true;
  }

  function earnHeroBadge() {
    for (let i = 0; i < profileBadges.length; i++) {
      if (profileBadges[i].id === HERO_BADGE_ID) {
        profileBadges[i].earned = true;
        profileBadges[i].date = profileBadges[i].date || 'Today';
      }
    }
  }

  function earnSecretBadge() {
    for (let i = 0; i < profileBadges.length; i++) {
      if (profileBadges[i].id === SECRET_BADGE_ID) {
        profileBadges[i].earned = true;
        profileBadges[i].date = profileBadges[i].date || 'Today';
      }
    }
  }

  /* ── Journey (My Threads) ───────────────────────────────────────────────────
     session.activeThreads stays the list the profile renders; this keeps the
     hero thread's entry in step with live progress so the branch choice shows
     up there too. Written once when progress is first seen, updated after. */
  function heroJourneyEntry(threadId) {
    const thread = threadsById[threadId];
    if (!thread) return null;
    const m = mysteryRecord(threadId);
    const list = NASEEJ.session.activeThreads;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === threadId) return list[i];
    }
    const branch = branchOption(thread, m.branch);
    const entry = {
      id: threadId,
      title: thread.title,
      region: thread.subtitle,
      progress: 0,
      nextWaypoint: (thread.waypoints[0] || {}).name || thread.title,
      image: thread.image || ((thread.waypoints[0] || {}).image),
      livingMystery: true,
      branch: null,
    };
    if (branch) entry.branch = branch.label;
    list.unshift(entry);
    return entry;
  }

  function syncHeroJourney(threadId) {
    const thread = threadsById[threadId];
    if (!thread) return;
    const m = mysteryRecord(threadId);
    const pct = NASEEJ.session.threadProgress[threadId] || 0;
    const list = NASEEJ.session.activeThreads;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === threadId && !m.reveal) {
        list[i].progress = pct;
        const active = findActiveWaypoint(thread);
        if (active) list[i].nextWaypoint = active.name;
        const branch = branchOption(thread, m.branch);
        list[i].branch = branch ? branch.label : null;
      }
    }

    /* Solved: it stops being "in progress" and becomes a completed thread, once. */
    if (!m.reveal) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].id === threadId) list.splice(i, 1);
    }
    const done = NASEEJ.session.completedThreads;
    for (let i = 0; i < done.length; i++) {
      if (done[i].id === threadId) return;
    }
    const clues = getClueProgress(threadId);
    const branch = branchOption(thread, m.branch);
    done.unshift({
      id: threadId,
      title: thread.title,
      region: thread.subtitle,
      waypoints: (thread.waypoints || []).length,
      pointsEarned: earnedAthar(threadId),
      completedDate: 'Today',
      image: thread.image || ((thread.waypoints[0] || {}).image),
      livingMystery: true,
      /* Kept on the completed card: which of the two paths this weaver finished
         is part of the record of the thread, not of the running progress. */
      branch: branch ? branch.label : null,
      clues: clues.unlocked + ' / ' + clues.total,
    });
    if (isFiniteNumber(NASEEJ.session.threadsCompleted)) NASEEJ.session.threadsCompleted += 1;
  }

  /* ── Waypoint state ─────────────────────────────────────────────────────────
     Status is derived, never stored: the same inputs (completion, order,
     branch) always produce the same status, which is what lets the renderer
     treat it as read-only and keeps a reload from desynchronising the map. */
  function waypointLiveStatus(thread, waypoint) {
    if (!waypoint) return 'locked';
    if (!isHeroThread(thread)) return waypoint.status;
    if (isCompleted(waypoint, thread)) return 'completed';
    const wps = thread.waypoints || [];
    const idx = waypointIndex(thread, waypoint);
    if (idx <= 0) return idx === 0 ? 'active' : 'locked';
    if (!isCompleted(wps[idx - 1], thread)) return 'locked';
    /* The second waypoint is where the path is chosen: it stays shut until
       the weaver picks a branch, so CHOOSE YOUR PATH is the gate rather than
       decoration. */
    if (idx === 1 && !mysteryRecord(threadIdOf(thread)).branch) return 'locked';
    return 'active';
  }

  function findActiveWaypoint(thread) {
    const waypoints = (thread && thread.waypoints) || [];
    for (let i = 0; i < waypoints.length; i++) {
      if (isHeroThread(thread)) {
        if (waypointLiveStatus(thread, waypoints[i]) === 'active') return waypoints[i];
        continue;
      }
      if (isCompleted(waypoints[i], thread)) continue;
      if (waypoints[i].status === 'active') return waypoints[i];
    }
    /* A finished thread has no next node. This used to return waypoints[0]
       unconditionally, so a completed thread always reported an active waypoint
       and the thread page kept rendering a solid "Go to Active Node" that sent
       the visitor back to the first stop they had already finished. The
       waypoints[0] fallback is kept for the other odd case — a thread whose
       stops are all locked, where showing the first is more useful than showing
       nothing — but only when the thread is not done. */
    const allComplete = waypoints.length > 0 && waypoints.every(function (wp) {
      return isCompleted(wp, thread);
    });
    if (allComplete) return null;
    return waypoints[0] || null;
  }

  /* Branch overlay + live status in one read-only copy. Renderers get the
     decorated waypoint and never mutate the source data. */
  function resolveHeroWaypoint(thread, waypoint) {
    if (!waypoint || !isHeroThread(thread)) return waypoint;
    const m = mysteryRecord(threadIdOf(thread));
    const overlay = waypoint.branches && m.branch ? waypoint.branches[m.branch] : null;
    const decorated = Object.assign({}, waypoint);
    if (overlay) Object.assign(decorated, overlay);
    /* An interaction the weaver has already satisfied is not re-offered. */
    if (waypointLiveStatus(thread, waypoint) === 'completed') {
      decorated.interactionDone = true;
      if (waypoint.interaction === 'challenge') decorated.solvedOption = (m.answers[waypoint.id] || {}).optionId;
      if (waypoint.interaction === 'observation') decorated.solvedOption = m.observations[waypoint.id] || null;
    }
    decorated.status = waypointLiveStatus(thread, waypoint);
    return decorated;
  }

  /* ── Chapters, branch, KHAYT ─────────────────────────────────────────────── */

  function currentChapter(thread) {
    if (!isHeroThread(thread)) return '';
    const m = mysteryRecord(threadIdOf(thread));
    const ch = thread.chapters || {};
    if (m.reveal) return ch.reveal || 'The Thread';
    /* Connection is a milestone (waypoint 4 / clue 4), not "three clues".
       A branch plus an observation unlocks clue 3 and must still show the
       branch chapter until that milestone is actually completed. */
    if (isConnectionComplete(threadIdOf(thread))) return ch.connection || 'The Connection';
    if (m.branch === 'person') return ch.person || 'Follow the Person';
    if (m.branch === 'object') return ch.object || 'Follow the Object';
    return ch.start || 'The Entrance';
  }

  function isConnectionComplete(threadId) {
    const thread = threadsById[threadId];
    if (!thread) return false;
    const wp = findWaypoint(thread.waypoints || [], 4);
    if (wp && isCompleted(wp, thread)) return true;
    return isClueUnlocked(threadId, 4);
  }

  function branchOption(thread, branchId) {
    const opts = (thread && thread.branchOptions) || [];
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].id === branchId) return opts[i];
    }
    return null;
  }

  function branchState(thread) {
    const m = mysteryRecord(threadIdOf(thread));
    const chosen = branchOption(thread, m.branch);
    return {
      open: !!(thread.branchOptions || []).length,
      chosen: m.branch || null,
      label: chosen ? chosen.label : null,
      /* The choice is offered once the first clue is earned — that is what the
         trail head's ibex mark is for. */
      available: !m.branch && isClueUnlocked(threadIdOf(thread), 1),
      reaction: m.branch && thread.branchReaction ? thread.branchReaction[m.branch] : null,
      options: (thread.branchOptions || []).map(function (o) {
        return { id: o.id, label: o.label, prompt: o.prompt, selected: o.id === m.branch };
      }),
    };
  }

  function khaytMessage(thread, waypoint) {
    if (!isHeroThread(thread)) return '';
    const tid = threadIdOf(thread);
    const m = mysteryRecord(tid);
    if (m.reveal) return (thread.reveal && thread.reveal.khayt) || 'You found the thread.';
    if (m.branch && thread.branchReaction) return thread.branchReaction[m.branch];
    if (waypoint) {
      const status = waypointLiveStatus(thread, waypoint);
      const answered = m.answers[waypoint.id];
      const observed = m.observations[waypoint.id];
      if (status === 'locked') return 'Every story starts with a thread.';
      if (status === 'completed') {
        if (answered && !answered.correct) return 'Right place. Wrong mark. Look again.';
        return 'You\'re getting closer.';
      }
      if (answered && answered.correct) return 'That\'s the mark. Keep walking.';
      if (answered && !answered.correct) return 'Don\'t read. Look around you.';
      if (observed) return 'You saw it. That was a real observation.';
      if (waypoint.observation) return 'Look around you. Then tell me what you saw.';
      if (waypoint.quiz) return 'Don\'t read. Look around you.';
      return 'You found the place.';
    }
    if (isClueUnlocked(tid, 1)) return 'Now choose your path.';
    return 'You don\'t know where this one ends.';
  }

  /* ── KHAYT ───────────────────────────────────────────────────────────────
     KHAYT is a story companion, not a chatbot and not a language model. Every
     line it says is written in this file, keyed to the thread, the waypoint, the
     chapter, the branch and the answer the weaver just gave — so it is a
     narrator with opinions about the plot, not a general-purpose assistant.

     The three calls are the whole interface, and they are deliberately
     provider-shaped so a real model can be dropped in later without the UI
     changing:

       khaytAI.ask(context)      a line of dialogue for this moment
       khaytAI.getHint(context)  a nudge, given sparingly and never the answer
       khaytAI.react(context)    a reaction to what the weaver just did

     `provider` is 'local'. There is no network call, no API key and no model
     here, and the UI says so rather than implying a live AI is connected. A
     future Gemini/Claude adapter implements the same three functions; nothing in
     pages.js or navigation.js has to change, because neither of them knows how
     the words are produced. */
  const KHAYT_PROVIDER = 'local';

  function khaytContext(thread, waypoint) {
    if (!isHeroThread(thread)) return null;
    const tid = threadIdOf(thread);
    const m = mysteryRecord(tid);
    const status = waypoint ? waypointLiveStatus(thread, waypoint) : null;
    const answered = waypoint ? m.answers[waypoint.id] : null;
    const observed = waypoint ? m.observations[waypoint.id] : null;
    return {
      thread: thread,
      threadId: tid,
      waypoint: waypoint,
      waypointName: waypoint ? waypoint.name : null,
      status: status,
      chapter: currentChapter(thread),
      branch: m.branch,
      clueCount: getClueProgress(tid).unlocked,
      revealed: !!m.reveal,
      answered: answered,
      observed: observed,
    };
  }

  const khaytAI = {
    provider: KHAYT_PROVIDER,
    isLive: false,

    ask: function (context) {
      if (context && context.kind === 'dna') {
        return context.line || 'I\'ve noticed how you explore Jordan. Keep following the thread that pulls you.';
      }
      const c = context && context.thread ? context : khaytContext(context, null);
      if (!c) return '';
      return khaytMessage(c.thread, c.waypoint);
    },

    /* A nudge, never the answer. It says what kind of thing to look for; the
       weaver still has to choose. */
    getHint: function (context) {
      const c = context && context.thread ? context : khaytContext(context, null);
      if (!c || !c.waypoint) return 'Read the place before you answer.';
      if (c.status !== 'active') return 'This node is not open yet.';
      if (!heroQuestion(c.thread, c.waypoint)) return 'You have already answered this one.';
      if (c.waypoint.observation) {
        return 'Look at the ground and the rock face, not at the information board. What is actually there?';
      }
      return 'One of these four is really there. The other three are things travellers expect to find.';
    },

    /* What KHAYT says in response to the weaver's last action. */
    react: function (context) {
      const c = context && context.thread ? context : khaytContext(context, null);
      if (!c) return '';
      if (c.revealed) return 'You found the thread. Read it again — it changes with the path you chose.';
      if (c.branch) return (c.thread.branchReaction || {})[c.branch] || khaytMessage(c.thread, c.waypoint);
      if (c.observed) return 'You saw it. That was a real observation.';
      if (c.answered && c.answered.correct) return 'That\'s the mark. Keep walking.';
      if (c.answered && !c.answered.correct) return 'Wrong. Nothing is lost — but do not guess again. Look around you.';
      return khaytMessage(c.thread, c.waypoint);
    },
  };

  /* ── Interactions ──────────────────────────────────────────────────────────
     Both interactions answer the same shape of question, so one validated path
     covers them: pick an option, submit it, get the truth of it. A wrong answer
     changes nothing and can be retried; a right one is recorded once and pays
     once. */

  function heroQuestion(thread, waypoint) {
    if (!waypoint || waypoint.status === 'completed') return null;
    if (waypoint.status === 'locked') return null;
    const kind = waypoint.interaction;
    const body = kind === 'challenge' ? waypoint.quiz : kind === 'observation' ? waypoint.observation : null;
    if (!body || !Array.isArray(body.options) || !body.options.length) return null;
    return {
      kind: kind,
      waypointId: waypoint.id,
      prompt: body.prompt,
      options: body.options.map(function (o) { return { id: o.id, text: o.text }; }),
      lookPrompt: waypoint.lookPrompt || null,
    };
  }

  function answerHeroQuestion(threadId, waypointId, optionId) {
    /* One attempt, one chip log. */
    resetChips();
    const thread = threadsById[threadId];
    if (!thread || !isHeroThread(thread)) return { status: 'invalid' };
    const wp = findWaypoint(thread.waypoints || [], waypointId);
    if (!wp) return { status: 'invalid' };
    const kind = wp.interaction;
    const body = kind === 'challenge' ? wp.quiz : kind === 'observation' ? wp.observation : null;
    if (!body) return { status: 'invalid' };

    const status = waypointLiveStatus(thread, wp);
    if (status === 'locked') return { status: 'locked', waypointId: wp.id, chips: [] };
    /* Solved already: the panel hides Validate, so reaching this means a direct
       call. Report it the way the other duplicate paths do rather than as a bare
       status, so a caller cannot mistake it for a refusal. */
    if (status === 'completed') {
      return { status: 'duplicate', correct: true, kind: kind, waypointId: wp.id, chips: [],
        message: 'This waypoint is already solved. The ATHAR were paid once.' };
    }

    let known = false;
    for (let i = 0; i < body.options.length; i++) {
      if (body.options[i].id === optionId) known = true;
    }
    if (!known) return { status: 'invalid' };

    const m = mysteryRecord(threadId);
    const correct = optionId === body.correct;

    if (kind === 'challenge') {
      /* Already solved: re-submitting the right answer is a duplicate, not a
         second payout, and re-submitting a wrong one is refused outright. */
      const previous = m.answers[waypointId];
      if (previous && previous.correct) {
        return { status: 'duplicate', correct: true, kind: kind, waypointId: waypointId,
          message: 'Already solved here. The ATHAR were paid once.', chips: [] };
      }
      if (previous && previous.optionId === optionId) {
        return { status: 'incorrect', correct: false, kind: kind, waypointId: waypointId,
          message: 'That mark is not it. Look around you.', chips: [] };
      }
    } else {
      if (m.observations[waypointId]) {
        return { status: 'duplicate', correct: true, kind: kind, waypointId: waypointId,
          message: 'You already recorded that observation.', chips: [] };
      }
    }

    if (!correct) {
      /* Wrong answers change nothing durable: no completion, no clue, no ATHAR,
         and nothing written that a reload could read back as progress. The same
         question stays open so it can be answered again. Only the option just
         tried is remembered, and only for this visit, so a repeat gets a reply
         that names it instead of the generic one. */
      if (kind === 'challenge') m.answers[waypointId] = { optionId: optionId, correct: false };
      return { status: 'incorrect', correct: false, kind: kind, waypointId: waypointId,
        message: kind === 'observation'
          ? 'Nothing like that on the basalt. Look again.'
          : 'Not that mark. Look around you.',
        chips: [] };
    }

    if (kind === 'observation') m.observations[waypointId] = optionId;
    else m.answers[waypointId] = { optionId: optionId, correct: true };

    /* Order is the order the weaver experiences: the answer pays, the clue it
       earned pays, the chapter it reached pays, and if that was the last piece
       the ending pays. Each of those awards logs itself (see awardAthar), so
       this list is complete by construction. */
    awardAthar(threadId, 'challenge', waypointId,
      kind === 'observation' ? 'Observation' : 'Challenge');

    const clue = unlockClueIfEarned(threadId, kind, waypointId);

    completeHeroWaypoint(threadId, waypointId);
    /* Last waypoint solved is the only moment the reveal can open: before this
       the "everything solved" test is false, and the branch is chosen long
       before the last clue. Called here so the ending and its ATHAR arrive with
       the answer that earned them. */
    maybeReveal(threadId);
    const reveal = mysteryRecord(threadId).reveal;
    const chips = takeChips();
    saveProgress();
    return {
      status: 'correct',
      correct: true,
      kind: kind,
      waypointId: waypointId,
      clue: clue ? clue.id : null,
      reveal: reveal,
      message: reveal ? 'You found the thread.'
        : kind === 'observation' ? 'You saw it. That was a real observation.'
          : 'That\'s the mark. Keep walking.',
      chips: chips,
    };
  }

  /* Kept as the two named entry points the renderers use; both go through the
     same validated path. */
  function answerHeroChallenge(threadId, waypointId, optionId) {
    return answerHeroQuestion(threadId, waypointId, optionId);
  }

  function observeHeroWaypoint(threadId, waypointId, optionId) {
    return answerHeroQuestion(threadId, waypointId, optionId);
  }

  function setHeroBranch(threadId, branchId) {
    resetChips();
    const thread = threadsById[threadId];
    const m = mysteryRecord(threadId);
    if (!thread) return { status: 'invalid', branch: m.branch };
    /* A path is chosen once. Re-submitting returns what was already chosen
       rather than switching branches or paying twice. */
    if (m.branch) {
      return { status: 'duplicate', branch: m.branch, chips: [],
        message: 'You already chose ' + ((branchOption(thread, m.branch) || {}).label || 'a path') + '.' };
    }
    if (!branchOption(thread, branchId)) return { status: 'invalid', branch: null, chips: [] };
    if (!isClueUnlocked(threadId, 1)) return { status: 'locked', branch: null, chips: [] };

    m.branch = branchId;
    /* The choice is itself a solved interaction: it opens the third clue. */
    const clue = unlockClueIfEarned(threadId, 'branch', null);
    /* Opening the next chapter is its own reward, keyed on the chapter. */
    const next = findActiveWaypoint(thread);
    if (next && next.chapterKey) awardAthar(threadId, 'chapter', next.chapterKey);
    syncHeroProgress(threadId);
    maybeReveal(threadId);
    const chips = takeChips();
    saveProgress();
    return {
      status: 'ok',
      branch: m.branch,
      clue: clue ? clue.id : null,
      chips: chips,
      message: thread.branchReaction ? thread.branchReaction[branchId] : 'Path chosen.',
    };
  }

  function heroSecret(thread) {
    const t = thread || threadsById[HERO_THREAD_ID];
    return (t && t.secretChallenge) || null;
  }

  function isSecretUnlocked(threadId) {
    const thread = threadsById[threadId == null ? HERO_THREAD_ID : threadId];
    const secret = heroSecret(thread);
    if (!secret || !secret.unlockCondition) return false;
    const cond = secret.unlockCondition;
    const tid = threadId == null ? HERO_THREAD_ID : threadId;
    const m = mysteryRecord(tid);
    if (cond.clue && !isClueUnlocked(tid, cond.clue)) return false;
    if (cond.branch && !m.branch) return false;
    if (cond.waypoint) {
      const wp = findWaypoint(thread.waypoints || [], cond.waypoint);
      if (!wp || !isCompleted(wp, thread)) return false;
    }
    return true;
  }

  function secretState(threadId) {
    const tid = threadId == null ? HERO_THREAD_ID : threadId;
    const secret = heroSecret(threadsById[tid]);
    const m = mysteryRecord(tid);
    return {
      locked: !isSecretUnlocked(tid),
      solved: !!(secret && m.secret),
      optionId: m.secret || null,
      secret: secret,
    };
  }

  function answerSecretChallenge(threadId, optionId) {
    resetChips();
    const tid = threadId == null ? HERO_THREAD_ID : threadId;
    const thread = threadsById[tid];
    const secret = heroSecret(thread);
    if (!secret || !secret.quiz) return { status: 'invalid' };
    if (!isSecretUnlocked(tid)) return { status: 'locked', message: 'This secret is still sealed.' };
    const m = mysteryRecord(tid);
    if (m.secret) {
      return { status: 'duplicate', correct: true, chips: [],
        message: 'You already found this. The ATHAR were paid once.' };
    }
    let known = false;
    for (let i = 0; i < secret.quiz.options.length; i++) {
      if (secret.quiz.options[i].id === optionId) known = true;
    }
    if (!known) return { status: 'invalid' };
    if (optionId !== secret.quiz.correct) {
      return { status: 'incorrect', correct: false, chips: [],
        message: 'Most visitors walk past this. Look again.' };
    }
    m.secret = optionId;
    awardAthar(tid, 'secret', secret.id, 'Secret Challenge');
    earnSecretBadge();
    const chips = takeChips();
    saveProgress();
    return {
      status: 'correct',
      correct: true,
      chips: chips,
      message: 'You found what most visitors miss.',
    };
  }

  /* ── Final reveal ──────────────────────────────────────────────────────────
     Assembled from what the weaver actually did, in the order they did it, and
     ending on the text for the branch they chose. The renderer prints it; it
     does not compose it, so the two branches cannot drift apart.
     Gated on the reveal flag, not just on the content existing: this is the one
     function that can return the ending, so until the thread is solved it
     answers null and no renderer — or caller holding this namespace — can read
     the story, the clue texts or the chapter names early. */
  function revealStory(threadId) {
    const thread = threadsById[threadId == null ? HERO_THREAD_ID : threadId];
    if (!thread || !thread.reveal) return null;
    const m = mysteryRecord(threadId);
    if (!m.reveal) return null;
    const clues = getClueProgress(threadId);
    const chapters = thread.chapters || {};
    const chosen = branchOption(thread, m.branch);
    const wp2 = findWaypoint(thread.waypoints || [], 2);
    const overlay = wp2 && wp2.branches && m.branch ? wp2.branches[m.branch] : null;
    const clueText = function (id) {
      const c = clueById(thread, id);
      return c ? c.text : '';
    };
    const steps = [
      { label: 'Chapter 1 · ' + (chapters.start || 'The Entrance'), text: ((thread.waypoints || [])[0] || {}).desc || '' },
      { label: 'Clue 1', text: clueText(1) },
      { label: 'Your Choice', text: chosen ? chosen.label + ' — ' + chosen.prompt : 'You never chose a path.' },
      { label: 'Chapter 2 · ' + (m.branch === 'person' ? (chapters.person || '') : (chapters.object || '')), text: overlay ? overlay.desc : '' },
      { label: 'Clue 2', text: clueText(2) },
      { label: 'Clue 3', text: clueText(3) },
      { label: 'Clue 4', text: clueText(4) },
      { label: 'The Connection', text: thread.reveal.connection },
    ];
    return {
      headline: thread.reveal.headline,
      badge: profileBadges[HERO_BADGE_ID - 1] ? profileBadges[HERO_BADGE_ID - 1].name : '',
      badgeIcon: profileBadges[HERO_BADGE_ID - 1] ? profileBadges[HERO_BADGE_ID - 1].icon : '🧵',
      athar: ATHAR.reveal,
      branch: chosen ? chosen.label : 'The Thread',
      steps: steps,
      story: (thread.reveal.story || {})[m.branch] || thread.reveal.connection,
      khayt: thread.reveal.khayt,
      clues: clues.unlocked + ' / ' + clues.total,
    };
  }

  /* Live stat row for the hero thread, in the same shape as the static `stats`
     the other threads carry, so the thread renderer stays one renderer. */
  function heroStats(thread) {
    const tid = threadIdOf(thread);
    const m = mysteryRecord(tid);
    const clues = getClueProgress(tid);
    const total = (thread.waypoints || []).length;
    const done = (thread.waypoints || []).filter(function (wp) { return isCompleted(wp, thread); }).length;
    return [
      { label: 'ATHAR Earned', value: String(earnedAthar(tid)), icon: '✦' },
      { label: 'Clues', value: clues.unlocked + ' / ' + clues.total, icon: '◇' },
      { label: 'Chapter', value: currentChapter(thread), icon: '📖' },
      { label: 'Waypoints', value: done + ' / ' + total, icon: '⊕' },
    ].concat(m.reveal ? [{ label: 'Thread', value: 'Found', icon: '🧵' }] : []);
  }

  /* ── Persistence entry points ────────────────────────────────────────────── */

  function captureProgressSnapshot() {
    const snapshot = {
      v: 1,
      points: NASEEJ.session.points,
      atharPeak: NASEEJ.session.atharPeak,
      savedAt: Date.now(),
      completedWaypointIds: NASEEJ.session.completedWaypointIds.slice(),
      completedWaypointKeys: {},
      threadProgress: {},
      mystery: {},
      badges: [],
    };
    for (const tid in NASEEJ.session.completedWaypointKeys) {
      snapshot.completedWaypointKeys[tid] = NASEEJ.session.completedWaypointKeys[tid].slice();
    }
    for (const tid in NASEEJ.session.threadProgress) {
      snapshot.threadProgress[tid] = NASEEJ.session.threadProgress[tid];
    }
    for (const tid in NASEEJ.session.mystery) {
      snapshot.mystery[tid] = recordSnapshot(NASEEJ.session.mystery[tid]);
    }
    for (let i = 0; i < profileBadges.length; i++) {
      if (profileBadges[i].earned) snapshot.badges.push(profileBadges[i].id);
    }
    return snapshot;
  }

  let lastSavedAt = 0;

  function saveProgress() {
    const snapshot = captureProgressSnapshot();
    lastSavedAt = snapshot.savedAt;
    const ok = writeStored(snapshot);
    notifyCloud();
    return ok;
  }

  /* Called once at boot, before the first route renders. Anything that fails
     validation is dropped silently — a bad blob must never stop the site from
     starting — and the demo balance is kept when no valid one was stored. */
  function hydrateProgress() {
    return applyProgress(readStored());
  }

  function applyProgress(stored) {
    if (!stored) return false;
    if (stored.savedAt) lastSavedAt = stored.savedAt;

    if (stored.points != null) NASEEJ.session.points = stored.points;
    /* The peak can never be below the balance, whatever the file claims, and it
       can never fall either — a weaver who spent ATHAR keeps their level. */
    if (stored.atharPeak != null) NASEEJ.session.atharPeak = stored.atharPeak;
    noteAtharEarned(NASEEJ.session.points);

    if (stored.completedWaypointIds.length) {
      NASEEJ.session.completedWaypointIds = stored.completedWaypointIds.slice();
    }
    for (const tid in stored.completedWaypointKeys) {
      NASEEJ.session.completedWaypointKeys[tid] = stored.completedWaypointKeys[tid].slice();
    }
    for (const tid in stored.threadProgress) {
      NASEEJ.session.threadProgress[tid] = stored.threadProgress[tid];
    }
    for (const tid in stored.mystery) {
      NASEEJ.session.mystery[tid] = stored.mystery[tid];
    }
    for (let i = 0; i < profileBadges.length; i++) {
      if (stored.badges.indexOf(profileBadges[i].id) >= 0 &&
          (profileBadges[i].id === HERO_BADGE_ID || profileBadges[i].id === SECRET_BADGE_ID)) {
        profileBadges[i].earned = true;
        profileBadges[i].date = profileBadges[i].date || 'Today';
      }
    }
    syncHeroProgress(HERO_THREAD_ID);
    heroJourneyEntry(HERO_THREAD_ID);
    return true;
  }

  function findCity(cityId) {
    for (let i = 0; i < cities.length; i++) {
      if (cities[i].id === cityId) return cities[i];
    }
    return null;
  }

  function countVisitedWaypoints() {
    const seen = {};
    let n = 0;
    const keys = NASEEJ.session.completedWaypointKeys || {};
    for (const tid in keys) {
      const list = keys[tid] || [];
      for (let i = 0; i < list.length; i++) {
        const token = tid + ':' + list[i];
        if (seen[token]) continue;
        seen[token] = true;
        n += 1;
      }
    }
    const bare = NASEEJ.session.completedWaypointIds || [];
    for (let i = 0; i < bare.length; i++) {
      const token = 'id:' + bare[i];
      if (seen[token]) continue;
      seen[token] = true;
      n += 1;
    }
    return n;
  }

  function dnaBucket(category) {
    if (category === 'History') return 'History';
    if (category === 'Nature') return 'Nature';
    if (category === 'Culinary') return 'Food';
    if (category === 'Adventure') return 'Adventure';
    if (category === 'Local Culture' || category === 'Art & Craft' || category === 'Pilgrimage') return 'Culture';
    if (category === 'Wellness') return 'Nature';
    return 'Hidden Gems';
  }

  function addDna(scores, bucket, amount) {
    if (!scores[bucket]) scores[bucket] = 0;
    scores[bucket] += amount;
  }

  function jordanDna() {
    const labels = ['History', 'Nature', 'Culture', 'Food', 'Adventure', 'Hidden Gems'];
    const scores = {};
    for (let i = 0; i < labels.length; i++) scores[labels[i]] = 0;

    const progress = NASEEJ.session.threadProgress || {};
    for (const tid in progress) {
      if (!progress[tid] || progress[tid] <= 0) continue;
      const lib = libraryThreadById(+tid);
      addDna(scores, dnaBucket(lib && lib.category), progress[tid] >= 100 ? 4 : 2);
    }

    const m = mysteryRecord(HERO_THREAD_ID);
    const heroLib = libraryThreadById(HERO_THREAD_ID);
    if ((m.clues || []).length || m.branch || (m.completed || []).length) {
      addDna(scores, dnaBucket(heroLib && heroLib.category), 3);
      addDna(scores, 'Hidden Gems', 2 + (m.clues || []).length);
      if (m.branch === 'person') addDna(scores, 'Adventure', 3);
      if (m.branch === 'object') addDna(scores, 'Culture', 3);
      if (m.secret) addDna(scores, 'Hidden Gems', 5);
      if (m.reveal) addDna(scores, 'Hidden Gems', 3);
    }

    const wish = NASEEJ.session.wishlist || {};
    for (const id in wish) {
      if (!wish[id]) continue;
      const lib = libraryThreadById(+id);
      addDna(scores, dnaBucket(lib && lib.category), 1);
    }

    let total = 0;
    for (let i = 0; i < labels.length; i++) total += scores[labels[i]];
    const empty = total <= 0;
    const bars = labels.map(function (name) {
      return { name: name, percent: empty ? 0 : Math.round((scores[name] / total) * 100) };
    }).sort(function (a, b) { return b.percent - a.percent; });

    let leftover = 100;
    if (!empty) {
      for (let i = 0; i < bars.length; i++) leftover -= bars[i].percent;
      if (bars[0]) bars[0].percent += leftover;
    }

    const titles = {
      History: 'THE STORY HUNTER',
      Nature: 'THE GORGE WALKER',
      Culture: 'THE THREAD KEEPER',
      Food: 'THE TABLE FINDER',
      Adventure: 'THE PATH CHASER',
      'Hidden Gems': 'THE SECRET WEAVER',
    };
    const top = bars[0] && bars[0].percent > 0 ? bars[0].name : 'Hidden Gems';
    const line = empty
      ? 'Walk a thread and I will start to notice how you explore Jordan.'
      : 'I\'ve noticed how you explore Jordan. You lean toward ' + top.toLowerCase() +
        ' — keep following the thread that pulls you.';

    return {
      empty: empty,
      title: empty ? 'A THREAD NOT YET DRAWN' : titles[top] || 'THE STORY HUNTER',
      playful: true,
      bars: bars,
      khaytLine: line,
    };
  }

  function passportSummary() {
    const m = mysteryRecord(HERO_THREAD_ID);
    const regions = {};
    const liveCompleted = [];
    const demoCompleted = [];
    const done = NASEEJ.session.completedThreads || [];
    for (let i = 0; i < done.length; i++) {
      const t = done[i];
      const city = t.city || t.subtitle || t.region;
      if (city) regions[city] = true;
      if (t.demoSeed) demoCompleted.push(t);
      else liveCompleted.push(t);
    }
    if ((m.completed || []).length || m.reveal) regions.Irbid = true;
    const earned = profileBadges.filter(function (b) { return b.earned; });
    const mysteryFound = m.reveal ? 1 : 0;
    const secrets = m.secret ? 1 : 0;
    return {
      regions: Object.keys(regions),
      completedLive: liveCompleted,
      completedDemo: demoCompleted,
      badges: earned,
      athar: NASEEJ.session.points,
      mysteryFound: mysteryFound,
      secrets: secrets,
      clues: (m.clues || []).length,
      waypoints: countVisitedWaypoints(),
    };
  }

  /* ── Public content API ──────────────────────────────────────────────────── */

  NASEEJ.data = {
    assets: assets,
    categories: threadCategories,
    cities: cities,
    libraryThreads: libraryThreads,
    featuredThreads: featuredThreads,
    landingStats: landingStats,
    landingStatsNote: landingStatsNote,
    libraryStats: libraryStats,
    moodEmoji: moodEmoji,
    difficultyColor: difficultyColor,

    defaultThreadId: DEFAULT_THREAD_ID,

    /* Returns the requested thread, or the default thread when the id is
       null/unknown. Returns null only when the data itself is broken. */
    getThread: function (threadId) {
      const found = threadId != null ? threadsById[threadId] : null;
      return found || threadsById[DEFAULT_THREAD_ID] || null;
    },

    /* Whether an id names a real thread — the router uses it to tell a typo
       from a deliberate fallback. */
    hasThread: function (threadId) {
      return !!(threadId != null && threadsById[threadId]);
    },

    heroThreadId: HERO_THREAD_ID,
    isHeroThread: isHeroThread,
    /* The read-only view of a waypoint a renderer should use: branch overlay
       applied and live status derived. Always called with the REAL thread. */
    decorateWaypoint: resolveHeroWaypoint,
    waypointStatus: waypointLiveStatus,
    currentChapter: currentChapter,
    khaytMessage: khaytMessage,
    /* The provider-agnostic companion. Pages call khaytAI.ask / getHint /
       react and never learn that the words are local. */
    khaytAI: khaytAI,
    khaytContext: khaytContext,

    getClueProgress: getClueProgress,
    isClueUnlocked: isClueUnlocked,
    clueById: clueById,

    /* The validated question for a waypoint, or null when there is none to ask
       (already answered, or still locked). */
    heroQuestion: heroQuestion,
    answerHeroChallenge: answerHeroChallenge,
    observeHeroWaypoint: observeHeroWaypoint,
    branchState: branchState,
    setHeroBranch: setHeroBranch,
    isSecretUnlocked: isSecretUnlocked,
    secretState: secretState,
    answerSecretChallenge: answerSecretChallenge,
    heroSecret: heroSecret,
    passportSummary: passportSummary,
    jordanDna: jordanDna,
    visitedWaypointCount: countVisitedWaypoints,

    heroStats: heroStats,
    isRevealed: function (threadId) {
      return !!mysteryRecord(threadId == null ? HERO_THREAD_ID : threadId).reveal;
    },
    earnedAthar: earnedAthar,
    atharRewards: ATHAR,

    /* Level is derived from the balance, never stored. The thresholds are the
       only place a level number is defined. */
    levels: LEVELS,
    levelFor: levelFor,
    levelForWeaver: levelForWeaver,

    /* Wishlist, sharing, maps and demo redemption — all local-first, all behind
       a function the UI can call without knowing where the state lives. */
    isWishlisted: isWishlisted,
    toggleWishlist: toggleWishlist,
    wishlistCount: wishlistCount,
    sharePayload: sharePayload,
    waypointCoords: waypointCoords,
    mapsUrl: mapsUrl,
    redeemReward: redeemReward,
    rewardById: rewardById,
    hydrateFeatures: hydrateFeatures,
    revealStory: revealStory,

    saveProgress: saveProgress,
    hydrateProgress: hydrateProgress,
    accountPayload: accountPayload,
    /* The normalised cloud model. Read by js/firebase.js's writer, written by
       its reader — data.js keeps the transport out of this file entirely. */
    accountBundle: accountBundle,
    applyAccountBundle: applyAccountBundle,
    rewardRows: rewardRows,
    rewardTotal: rewardLedgerTotal,
    progressRows: progressRows,
    mysteryRows: mysteryRows,
    secretRows: secretRows,
    redeemedTotal: redeemedTotal,
    rewardSources: REWARD_SOURCES,
    docSafe: docSafe,
    setCloudWriter: setCloudWriter,
    applyAccountState: applyAccountState,
    restoreGuestSession: restoreGuestSession,
    lastSavedAt: function () {
      return lastSavedAt;
    },

    /* The waypoint a waypoint route should show: the requested one, else the
       thread's active waypoint, else its first. */
    getWaypoint: function (thread, waypointId) {
      const waypoints = (thread && thread.waypoints) || [];
      let wp = null;
      if (waypointId != null) {
        wp = findWaypoint(waypoints, waypointId) || findActiveWaypoint(thread);
      } else {
        wp = findActiveWaypoint(thread);
      }
      return resolveHeroWaypoint(thread, wp || waypoints[0] || null);
    },

    getActiveWaypoint: function (thread) {
      return resolveHeroWaypoint(thread, findActiveWaypoint(thread));
    },

    getCompletedCount: function (thread) {
      const waypoints = (thread && thread.waypoints) || [];
      return waypoints.filter(function (wp) {
        return isCompleted(wp, thread);
      }).length;
    },

    /* How far through a thread the weaver is, as a percentage. Firestore's
       figure wins once it exists; the static one is the fallback. */
    getThreadProgress: function (thread) {
      if (!thread) return 0;
      const id = thread.id != null ? thread.id : threadIdOf(thread);
      const stored = id != null ? NASEEJ.session.threadProgress[id] : undefined;
      return typeof stored === 'number' ? stored : thread.progress || 0;
    },

    getCity: function (cityId) {
      return findCity(cityId);
    },

    /* ── Photography ──────────────────────────────────────────────────────────
       There is no verified photograph of every waypoint in this build. The
       previous content filled every card with an Unsplash hit chosen for
       plausibility, which made a generic landscape read as "this is what the
       place looks like". That is the misattribution this replaces.

       What is real, under assets/places/: thirty-two files are photographs of
       the exact place their filename names, and eighty are SVG illustrations
       drawn for the exact stop. data marks which is which with
       `imageStatus: "placeholder"` on the illustration, and the media layer
       captions it as an illustration rather than as a photograph — a caption
       claiming otherwise would be the same lie in a smaller font.

       A thread may also show its city's photograph, and the caption says so —
       that is a truthful statement about a place the thread is in, not a claim
       about the waypoint. Every source returns `kind`, which is what lets the
       renderer say which of the three it is showing; returning an illustration
       and letting a caption call it a photograph is the failure mode here. */
    photoFor: function (thread) {
      const localPhoto = function (src, subject, scope, status) {
        if (typeof src !== 'string' || src.indexOf('assets/') !== 0) return null;
        if (/^https?:/i.test(src)) return null;
        return {
          src: src,
          subject: subject,
          scope: scope,
          kind: status === 'placeholder' ? 'placeholder' : 'photo',
        };
      };
      if (!thread) return null;
      /* imageSubject is the place the file depicts — for a thread cover wired
         from its first stop, that stop rather than the thread title. */
      const fromThread = localPhoto(thread.image, thread.imageSubject || thread.title, 'thread', thread.imageStatus);
      if (fromThread) return fromThread;
      const city = findCity(thread.city);
      if (city) {
        const fromCity = localPhoto(city.image, city.name || city.label || thread.city, 'city');
        if (fromCity) return fromCity;
      }
      return null;
    },

    /* Only a local file on that waypoint. Never a city or thread photograph
       presented as the stop itself, and never an illustration relabelled as a
       photograph: imageStatus decides `kind`, and the caption follows it. */
    waypointPhoto: function (waypoint) {
      if (!waypoint || typeof waypoint.image !== 'string') return null;
      const src = waypoint.image.trim();
      if (!src) return null;
      if (!/^https?:/i.test(src) && src.indexOf('assets/') !== 0) return null;
      const kind = waypoint.imageKind
        || (waypoint.imageStatus === 'placeholder' ? 'placeholder' : /^https?:/i.test(src) ? 'remote' : 'local');
      return { src: src, subject: waypoint.name, scope: 'waypoint', kind: kind };
    },

    /* Library filter, ported from ThreadsLibrary.tsx `match`. */
    matchesFilters: function (thread, filters) {
      const search = ((filters && filters.search) || '').toLowerCase();
      const category = (filters && filters.category) || 'All';
      if (category !== 'All' && thread.category !== category) return false;
      return (
        contains(thread.title, search) ||
        contains(thread.region, search) ||
        contains(thread.hook, search)
      );
    },

    filterLibrary: function (filters) {
      return libraryThreads.filter(function (thread) {
        return NASEEJ.data.matchesFilters(thread, filters);
      });
    },

    /* How many library threads carry each category. Static content, so the
       sidebar counts are computed once instead of on every keystroke. */
    categoryCounts: (function () {
      const counts = {};
      for (let i = 0; i < threadCategories.length; i++) {
        const name = threadCategories[i];
        counts[name] = 0;
      }
      for (let i = 0; i < libraryThreads.length; i++) {
        const name = libraryThreads[i].category;
        counts[name] = (counts[name] || 0) + 1;
      }
      return counts;
    })(),

    totalLibraryThreads: libraryThreads.length,
  };

  function contains(haystack, needle) {
    return String(haystack == null ? '' : haystack).toLowerCase().indexOf(needle) >= 0;
  }

  /* ── Session API (the signed-in weaver) ─────────────────────────────────────

     These are the values Firestore will own once Firebase is enabled: the
     profile document, the points balance, the badges earned, the waypoints
     already completed and the per-thread progress. They are hard-coded for
     now, exactly as they were in UserProfile.tsx, and are read through
     NASEEJ.session so no renderer has to know where they came from. */
  NASEEJ.session = {
    profile: {
      /* A signed-out visitor is a demo weaver, and is labelled as one: the
         previous "Layla Hassan / Verified / Amman" read as a real account with a
         real history. js/auth.js replaces these fields with the Google account's
         name and photo only after a real sign-in, and restores them on sign-out. */
      displayName: 'Demo Weaver',
      avatarUrl: null,
      memberSince: null,
      city: null,
      verified: false,
    },

    /* THE ATHAR BALANCE. One number, one owner: every reward the mystery pays
       adds to this, and the profile, the rewards tab and the thread stat row
       all read it back. Nothing else keeps a parallel purse.

       There is deliberately no levelName / levelProgress / pointsToNextLevel
       here. Those were static numbers that stopped being true the moment the
       weaver earned anything; use data.levelFor(session.points) instead, which
       is the only thing that decides a level. */
    points: totalPoints,
    /* Highest balance the weaver has ever held. Level is read from this, so
       spending ATHAR on a reward cannot demote anyone. Never decreases. */
    atharPeak: totalPoints,
    threadsCompleted: 2,

    badges: profileBadges,
    rewards: rewards,
    activeThreads: activeThreads,
    completedThreads: completedThreads,

    /* Waypoint ids already completed, and per-thread progress percentages.
       Both are consulted by data.getCompletedCount / getThreadProgress /
       getActiveWaypoint. They are empty here, so every helper falls through to
       the demo threads' own `status` and `progress` fields — which is why
       filling these two in is the only change needed to make the whole site
       read live Firestore progress.

       completedWaypointIds is the original model: bare numeric waypoint ids,
       matched against any thread. completedWaypointKeys is the same idea keyed
       by thread (thread id -> waypoint ids) and is what the living-mystery
       thread uses. The two are deliberately separate arrays: one list of
       numbers and one map of lists can never be confused for each other. */
    completedWaypointIds: [],
    completedWaypointKeys: {},
    threadProgress: {},
    /* threadId -> progress record for a living-mystery thread (clues, branch,
       answers, observations, awarded rewards, completed nodes, reveal). */
    mystery: {},

    /* Features with their own local documents (see the small stores above):
       threadId -> true for the wishlist, rewardId -> {at, cost} for the demo
       redemption log. The redemption log is what stops a reward being claimed
       twice, since the balance alone cannot tell a second claim from a first. */
    wishlist: {},
    redemptions: {},

    get badgesEarned() {
      return profileBadges.filter(function (badge) {
        return badge.earned;
      }).length;
    },
    get waypointsVisited() {
      return countVisitedWaypoints();
    },
  };

  /* ── Small local stores ───────────────────────────────────────────────────
     The wishlist and the redemption log are separate documents rather than
     more fields on the progress snapshot. Two reasons: a corrupt wishlist must
     not cost a weaver their mystery progress, and each is a shape Firestore can
     take over one at a time. Each store validates on the way in, so a
     hand-edited blob contributes nothing rather than something wrong. */
  const WISHLIST_KEY = 'naseej.wishlist.v1';
  const REDEMPTIONS_KEY = 'naseej.redemptions.v1';

  function readSmall(key, clean) {
    const stores = [storage('sessionStorage'), storage('localStorage')];
    for (let i = 0; i < stores.length; i++) {
      if (!stores[i]) continue;
      let raw = null;
      try { raw = stores[i].getItem(key); } catch (err) { continue; }
      if (!raw) continue;
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (err) { continue; }
      const value = clean(parsed);
      if (value) return value;
    }
    return null;
  }

  function writeSmall(key, value) {
    const raw = JSON.stringify(value);
    const stores = [storage('sessionStorage'), storage('localStorage')];
    for (let i = 0; i < stores.length; i++) {
      if (!stores[i]) continue;
      try { stores[i].setItem(key, raw); } catch (err) { /* quota: try the next one */ }
    }
    return true;
  }

  /* Only ids that name a real thread are kept, so a wishlist entry can never
     point at something the UI would have to render as a missing thread. */
  function cleanWishlist(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out = {};
    let any = false;
    for (const rawId in parsed) {
      if (!parsed[rawId]) continue;
      const id = +rawId;
      if (isNaN(id) || !threadsById[id]) continue;
      out[id] = true;
      any = true;
    }
    return any ? out : null;
  }

  /* A stored claim is only believed when it names a real reward and carries a
     non-negative cost that matches that reward's current price. */
  function cleanRedemptions(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out = {};
    let any = false;
    for (const id in parsed) {
      const entry = parsed[id];
      if (!entry || typeof entry !== 'object') continue;
      const reward = rewardById(id);
      if (!reward) continue;
      if (!isFiniteNumber(entry.cost) || entry.cost !== reward.points) continue;
      out[id] = { at: isFiniteNumber(entry.at) ? entry.at : 0, cost: entry.cost };
      any = true;
    }
    return any ? out : null;
  }

  function saveWishlist() {
    const ok = writeSmall(WISHLIST_KEY, NASEEJ.session.wishlist);
    notifyCloud();
    return ok;
  }

  function saveRedemptions() {
    const ok = writeSmall(REDEMPTIONS_KEY, NASEEJ.session.redemptions);
    notifyCloud();
    return ok;
  }

  /* ── Account mirror ───────────────────────────────────────────────────────
     auth.js is the only caller. data.js still does not touch the network: it
     just hands a validated snapshot to a writer auth.js registered, and applies
     one that writer loaded. Unsigned visitors never register a writer, so they
     keep the local demo/seeded behaviour. */
  let cloudWriter = null;
  let suppressCloud = false;

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  let guestSeed = null;

  function captureGuestSeed() {
    guestSeed = {
      points: NASEEJ.session.points,
      atharPeak: NASEEJ.session.atharPeak,
      threadsCompleted: NASEEJ.session.threadsCompleted,
      completedWaypointIds: NASEEJ.session.completedWaypointIds.slice(),
      completedWaypointKeys: cloneJson(NASEEJ.session.completedWaypointKeys),
      threadProgress: cloneJson(NASEEJ.session.threadProgress),
      mystery: cloneJson(NASEEJ.session.mystery),
      wishlist: cloneJson(NASEEJ.session.wishlist),
      redemptions: cloneJson(NASEEJ.session.redemptions),
      activeThreads: cloneJson(NASEEJ.session.activeThreads),
      completedThreads: cloneJson(NASEEJ.session.completedThreads),
      badges: profileBadges.map(function (b) {
        return { id: b.id, earned: !!b.earned, date: b.date || null };
      }),
      profile: {
        displayName: NASEEJ.session.profile.displayName,
        avatarUrl: NASEEJ.session.profile.avatarUrl,
        verified: NASEEJ.session.profile.verified,
        memberSince: NASEEJ.session.profile.memberSince,
        city: NASEEJ.session.profile.city,
      },
    };
  }

  function replaceList(target, items) {
    target.length = 0;
    for (let i = 0; i < items.length; i++) target.push(items[i]);
  }

  function restoreGuestSeed(opts) {
    if (!guestSeed) return;
    NASEEJ.session.points = guestSeed.points;
    NASEEJ.session.atharPeak = guestSeed.atharPeak;
    NASEEJ.session.threadsCompleted = guestSeed.threadsCompleted;
    NASEEJ.session.completedWaypointIds = guestSeed.completedWaypointIds.slice();
    NASEEJ.session.completedWaypointKeys = cloneJson(guestSeed.completedWaypointKeys);
    NASEEJ.session.threadProgress = cloneJson(guestSeed.threadProgress);
    NASEEJ.session.mystery = cloneJson(guestSeed.mystery);
    NASEEJ.session.wishlist = cloneJson(guestSeed.wishlist);
    NASEEJ.session.redemptions = cloneJson(guestSeed.redemptions);
    replaceList(NASEEJ.session.activeThreads, cloneJson(guestSeed.activeThreads));
    replaceList(NASEEJ.session.completedThreads, cloneJson(guestSeed.completedThreads));
    if (!(opts && opts.keepProfile)) {
      NASEEJ.session.profile.displayName = guestSeed.profile.displayName;
      NASEEJ.session.profile.avatarUrl = guestSeed.profile.avatarUrl;
      NASEEJ.session.profile.verified = guestSeed.profile.verified;
      NASEEJ.session.profile.memberSince = guestSeed.profile.memberSince;
      NASEEJ.session.profile.city = guestSeed.profile.city;
    }
    for (let i = 0; i < profileBadges.length; i++) {
      const seed = guestSeed.badges.filter(function (b) { return b.id === profileBadges[i].id; })[0];
      if (!seed) continue;
      profileBadges[i].earned = seed.earned;
      profileBadges[i].date = seed.date;
    }
  }

  /* ── Normalised cloud model ─────────────────────────────────────────────────
     The snapshot above is one document, which is the right shape for one
     browser. Firestore wants the same facts as documents a query can address,
     because the reward ledger only works if a reward is a *row keyed by a
     deterministic id*: a second grant for the same (thread, waypoint, kind)
     becomes literally the same document rather than a second row to reconcile
     afterwards.

     Export is derived entirely from state that already exists — `awarded` is
     the authority for what has been paid, and the amounts come out of the ATHAR
     table — so exporting cannot invent a payout. Import is the only place a
     remote value can enter, and it merges rather than replaces: progress
     unions, ATHAR only ever grows, and a row that does not name something the
     product actually has is discarded rather than believed.

     This section reads and writes NASEEJ.session and nothing else. It has no
     network access, which is what keeps it testable in Node and keeps data.js
     a pure domain layer; js/firebase.js owns the transport and js/auth.js
     decides when to call either side. */

  /* t{threadId}_{kind}_{key} — the whole point of the model. Waypoint ids are
     numbered 1..n per thread, so the thread id has to be in the key: 'challenge
     waypoint 2' in two threads is two different rewards, and without the thread
     one of them would be silently swallowed. */
  function rewardUniqueKey(threadId, kind, key) {
    return 't' + threadId + '_' + kind + '_' + docSafe(key);
  }

  /* The clue a reward was earned by. Clues declare the interaction that opens
     them and only that interaction can, so this is declared data rather than a
     guess. Chapter awards name the waypoint that carries the chapter. */
  function clueSourceWaypoint(thread, clueId) {
    const clues = (thread && thread.clues) || [];
    for (let i = 0; i < clues.length; i++) {
      if (clues[i].id !== clueId) continue;
      const unlock = clues[i].unlock || {};
      return unlock.waypoint != null ? unlock.waypoint : null;
    }
    return null;
  }

  function chapterSourceWaypoint(thread, chapterKey) {
    const waypoints = (thread && thread.waypoints) || [];
    for (let i = 0; i < waypoints.length; i++) {
      if (waypoints[i].chapterKey === chapterKey) return waypoints[i].id;
    }
    return null;
  }

  /* One ledger entry -> one reward row, or null when the entry does not
     describe a reward the product pays. `amount` is read from the ATHAR table
     and never from the map: what `awarded` stores is a marker that this was
     granted, not a price. */
  function buildRewardRow(threadId, entryKey) {
    const parts = String(entryKey).split(':');
    const kind = parts[0];
    const key = parts.slice(1).join(':');
    if (!ATHAR[kind] || !REWARD_SOURCES[kind]) return null;
    if (!threadsById[threadId]) return null;

    const row = {
      uniqueKey: rewardUniqueKey(threadId, kind, key),
      entryKey: kind + ':' + key,
      type: kind,
      source: REWARD_SOURCES[kind],
      threadId: threadId,
      waypointId: null,
      challengeId: null,
      clueId: null,
      chapterKey: null,
      secretId: null,
      amount: ATHAR[kind],
    };

    if (kind === 'challenge') {
      if (!isFiniteNumber(+key)) return null;
      const wp = findWaypoint(threadsById[threadId].waypoints || [], +key);
      if (!wp) return null;
      row.waypointId = wp.id;
      row.challengeId = 't' + threadId + '_w' + wp.id;
    } else if (kind === 'clue') {
      if (!clueById(threadsById[threadId], +key)) return null;
      row.clueId = +key;
      row.waypointId = clueSourceWaypoint(threadsById[threadId], +key);
    } else if (kind === 'chapter') {
      if (!chapterSourceWaypoint(threadsById[threadId], key)) return null;
      row.chapterKey = key;
      row.waypointId = chapterSourceWaypoint(threadsById[threadId], key);
    } else if (kind === 'reveal') {
      row.challengeId = 't' + threadId + '_final';
    } else if (kind === 'secret') {
      const secret = heroSecret(threadsById[threadId]);
      if (!secret || secret.id !== key) return null;
      row.secretId = secret.id;
    }
    return row;
  }

  /* Every reward this weaver holds, as rows ready to write. Sorted so two
     exports of the same state are byte-identical, which is what lets a caller
     diff a local bundle against a cloud one instead of guessing. */
  function rewardRows() {
    const rows = [];
    const seen = {};
    for (const tid in NASEEJ.session.mystery) {
      const record = NASEEJ.session.mystery[tid];
      if (!record || !record.awarded) continue;
      for (const entryKey in record.awarded) {
        const row = buildRewardRow(+tid, entryKey);
        if (!row || seen[row.uniqueKey]) continue;
        seen[row.uniqueKey] = true;
        rows.push(row);
      }
    }
    rows.sort(function (a, b) {
      return a.uniqueKey < b.uniqueKey ? -1 : a.uniqueKey > b.uniqueKey ? 1 : 0;
    });
    return rows;
  }

  function rewardLedgerTotal(rows) {
    const list = rows || rewardRows();
    let total = 0;
    for (let i = 0; i < list.length; i++) total += list[i].amount;
    return total;
  }

  function redeemedTotal() {
    const log = NASEEJ.session.redemptions || {};
    let spent = 0;
    for (const id in log) {
      /* Only a claim whose cost matches the reward's current price counts, the
         same check cleanRedemptions applies on the way in. */
      const reward = rewardById(id);
      const entry = log[id];
      if (!reward || !entry || entry.cost !== reward.points) continue;
      spent += reward.points;
    }
    return spent;
  }

  /* ── Progress rows ─────────────────────────────────────────────────────────
     One row per completed waypoint plus one per thread, because "which stop did
     I finish" and "how far through the thread am I" are different questions and
     the profile renders both. */
  function progressRows() {
    const rows = [];
    const seen = {};

    const push = function (threadId, waypointId, metadata) {
      if (!threadsById[threadId]) return;
      const id = waypointId == null
        ? 't' + threadId + '_progress'
        : 't' + threadId + '_w' + docSafe(waypointId);
      if (seen[id]) return;
      seen[id] = true;
      rows.push({
        id: id,
        threadId: threadId,
        waypointId: waypointId == null ? null : waypointId,
        completed: true,
        completedAt: Date.now(),
        metadata: metadata || {},
      });
    };

    const keys = NASEEJ.session.completedWaypointKeys || {};
    for (const tid in keys) {
      const list = keys[tid] || [];
      for (let i = 0; i < list.length; i++) {
        const wp = findWaypoint(threadsById[tid] ? threadsById[tid].waypoints || [] : [], list[i]);
        /* A key naming a waypoint that is not in its thread would let a remote
           document invent progress on content the product does not have. */
        if (!wp) continue;
        push(+tid, wp.id, {
          chapter: wp.chapterKey || null,
          name: wp.name || null,
        });
      }
      push(+tid, null, { progressPercent: NASEEJ.session.threadProgress[tid] || 0 });
    }

    /* Bare ids are not thread-scoped — they match a waypoint id in any thread.
       Attaching one to every thread that has a waypoint with that id is the
       only honest reading, and it is why this set is normally empty: only the
       living-mystery thread writes completed progress. */
    const bare = NASEEJ.session.completedWaypointIds || [];
    for (let i = 0; i < bare.length; i++) {
      for (const tid in threadsById) {
        const wp = findWaypoint(threadsById[tid].waypoints || [], bare[i]);
        if (!wp) continue;
        push(+tid, wp.id, { name: wp.name || null });
      }
    }
    return rows;
  }

  function mysteryRows() {
    const rows = [];
    for (const tid in NASEEJ.session.mystery) {
      const record = NASEEJ.session.mystery[tid];
      const thread = threadsById[tid];
      if (!record || !thread || !isHeroThread(thread)) continue;
      /* Only solved interactions are exported. A wrong answer is deliberately
         kept in memory and never persisted, so there is nothing to carry. */
      const answers = {};
      for (const wpId in record.answers) {
        if (record.answers[wpId] && record.answers[wpId].correct) {
          answers[wpId] = record.answers[wpId].optionId;
        }
      }
      const observations = {};
      for (const wpId in record.observations) {
        if (record.observations[wpId]) observations[wpId] = record.observations[wpId];
      }
      rows.push({
        id: String(threadIdOf(thread)),
        threadId: threadIdOf(thread),
        choices: {
          branch: record.branch || null,
          answers: answers,
          observations: observations,
        },
        currentChapter: currentChapter(thread),
        clues: (record.clues || []).slice(),
        completed: (record.completed || []).slice(),
        reveal: !!record.reveal,
        progressPercent: NASEEJ.session.threadProgress[tid] || 0,
        athar: earnedAthar(threadIdOf(thread)),
        updatedAt: Date.now(),
      });
    }
    return rows;
  }

  function secretRows() {
    const rows = [];
    for (const tid in NASEEJ.session.mystery) {
      const record = NASEEJ.session.mystery[tid];
      const secret = heroSecret(threadsById[tid]);
      if (!record || !secret) continue;
      rows.push({
        id: String(tid) + '_' + docSafe(secret.id),
        threadId: +tid,
        completed: !!record.secret,
        rewardGranted: !!record.secret,
        optionId: record.secret || null,
        completedAt: record.secret ? Date.now() : null,
      });
    }
    return rows;
  }

  /* The whole cloud model for the current weaver. `athar` is the total ever
     earned (a ledger sum), never the held balance: the balance can fall when a
     reward is redeemed, and the security rules require this figure to be
     monotonic. `atharBase` is the balance a weaver already held before this
     build existed — the demo weaver starts with one — and it is written once,
     at migration, which is the only reason it exists at all. */
  function accountBundle() {
    const rewards = rewardRows();
    const ledger = rewardLedgerTotal(rewards);
    const spent = redeemedTotal();
    /* What the weaver held before this build paid anything: the balance, plus
       whatever has since been spent back out of it, minus the ledger. Spending
       has to be added back here, or redeeming a reward would quietly shrink the
       base and the balance would not come back to where it started. */
    const base = Math.max(0, NASEEJ.session.points + spent - ledger);
    const earned = base + ledger;
    const badges = [];
    for (let i = 0; i < profileBadges.length; i++) {
      if (profileBadges[i].earned) badges.push(profileBadges[i].id);
    }
    return {
      schema: 1,
      savedAt: Date.now(),
      athar: earned,
      ledgerAthar: ledger,
      spentAthar: spent,
      atharBase: base,
      points: NASEEJ.session.points,
      atharPeak: Math.max(NASEEJ.session.atharPeak || 0, earned),
      profile: {
        displayName: NASEEJ.session.profile.displayName,
        email: '',
        photoURL: NASEEJ.session.profile.avatarUrl,
        memberSince: NASEEJ.session.profile.memberSince,
        verified: !!NASEEJ.session.profile.verified,
      },
      badges: badges,
      wishlist: cloneJson(NASEEJ.session.wishlist),
      redemptions: cloneJson(NASEEJ.session.redemptions),
      progress: progressRows(),
      rewards: rewards,
      mysteries: mysteryRows(),
      secrets: secretRows(),
    };
  }

  /* ── Import ─────────────────────────────────────────────────────────────────
     Merges a cloud bundle into the session. Nothing here replaces local state
     with remote state: completion unions, a mystery takes the union of its
     solved interactions, and the balance comes from the ledger so a stale
     `points` field can never lower a real total.

     Every incoming reward is rebuilt through buildRewardRow, which checks the
     kind, the amount and the thread/waypoint/clue against the product data.
     That is what stops a hand-written document from becoming ATHAR: the shape
     has to name a reward this build actually pays. */
  function mergeRewards(remoteRows) {
    const merged = {};
    const local = rewardRows();
    for (let i = 0; i < local.length; i++) merged[local[i].uniqueKey] = local[i];

    const added = [];
    for (let i = 0; i < (remoteRows || []).length; i++) {
      const doc = remoteRows[i];
      if (!doc || typeof doc !== 'object') continue;
      /* The document id is the uniqueKey, so a document that disagrees with its
         own path is not one this client wrote. */
      if (doc.id && doc.uniqueKey && doc.id !== doc.uniqueKey) continue;
      const row = buildRewardRow(doc.threadId, doc.entryKey);
      if (!row || merged[row.uniqueKey]) continue;
      merged[row.uniqueKey] = row;
      added.push(row);
    }
    return { merged: merged, added: added };
  }

  /* Writing a ledger back into session.mystery, one entry per reward, through
     the same map awardAthar() uses — so a remote award and a local one are the
     same state, not two shapes of the same thing. */
  function applyRewardLedger(merged) {
    for (const tid in NASEEJ.session.mystery) {
      const record = NASEEJ.session.mystery[tid];
      if (record && record.awarded) record.awarded = {};
    }
    for (const key in merged) {
      const row = merged[key];
      mysteryRecord(row.threadId).awarded[row.entryKey] = row.amount;
    }
  }

  function mergeProgress(remoteRows) {
    let touched = [];
    for (let i = 0; i < (remoteRows || []).length; i++) {
      const row = remoteRows[i];
      if (!row || !row.completed) continue;
      const tid = row.threadId;
      if (!threadsById[tid]) continue;
      if (row.waypointId != null) {
        const wp = findWaypoint(threadsById[tid].waypoints || [], row.waypointId);
        /* A completed waypoint must exist in the thread it claims to belong to.
           Without this a single document could complete anything. */
        if (!wp) continue;
        const keys = heroKeys(tid);
        if (keys.indexOf(wp.id) < 0) keys.push(wp.id);
        const record = mysteryRecord(tid);
        if (record.completed.indexOf(wp.id) < 0) record.completed.push(wp.id);
        touched.push(tid);
        continue;
      }
      const pct = row.metadata && row.metadata.progressPercent;
      if (isFiniteNumber(pct) && pct >= 0 && pct <= 100) {
        const current = NASEEJ.session.threadProgress[tid];
        if (typeof current !== 'number' || pct > current) {
          NASEEJ.session.threadProgress[tid] = Math.round(pct);
        }
      }
    }
    return touched;
  }

  function mergeMysteries(remoteRows) {
    for (let i = 0; i < (remoteRows || []).length; i++) {
      const doc = remoteRows[i];
      if (!doc || !threadsById[doc.threadId]) continue;
      if (!isHeroThread(threadsById[doc.threadId])) continue;
      const record = mysteryRecord(doc.threadId);
      const choices = doc.choices || {};

      if (typeof choices.branch === 'string' && branchOption(threadsById[doc.threadId], choices.branch)) {
        /* A path is chosen once. A document cannot switch it. */
        if (!record.branch) record.branch = choices.branch;
      }
      const answers = choices.answers || {};
      for (const wpId in answers) {
        const wp = findWaypoint(threadsById[doc.threadId].waypoints || [], +wpId);
        if (!wp || record.answers[wp.id]) continue;
        record.answers[wp.id] = { optionId: String(answers[wpId]), correct: true };
      }
      const observations = choices.observations || {};
      for (const wpId in observations) {
        const wp = findWaypoint(threadsById[doc.threadId].waypoints || [], +wpId);
        if (!wp || record.observations[wp.id]) continue;
        record.observations[wp.id] = String(observations[wp.id]);
      }
      if (Array.isArray(doc.clues)) {
        for (let c = 0; c < doc.clues.length; c++) {
          const clueId = +doc.clues[c];
          if (clueById(threadsById[doc.threadId], clueId) && record.clues.indexOf(clueId) < 0) {
            record.clues.push(clueId);
          }
        }
      }
      /* reveal is never taken from a document: it is recomputed by maybeReveal()
         from the state above, which is the only thing that can open it. That is
         what stops a single hand-written document from reading the ending, and
         it is also what reopens it on a second device — the ledger already
         carries the reveal reward, so the recomputation pays nothing twice. */
      syncHeroProgress(doc.threadId);
      maybeReveal(doc.threadId);
    }
  }

  function mergeSecrets(remoteRows) {
    for (let i = 0; i < (remoteRows || []).length; i++) {
      const doc = remoteRows[i];
      if (!doc || !doc.completed || !threadsById[doc.threadId]) continue;
      const secret = heroSecret(threadsById[doc.threadId]);
      if (!secret || doc.id !== String(doc.threadId) + '_' + docSafe(secret.id)) continue;
      const record = mysteryRecord(doc.threadId);
      if (!record.secret) record.secret = String(doc.optionId || secret.quiz.correct);
      earnSecretBadge();
    }
  }

  /* Apply a cloud bundle. Returns what the merge added, so the caller can push
     the new rows back rather than guessing which ones Firestore was missing.
     Never lowers a balance: the merged ledger plus what has been spent is a
     floor, and any locally-held excess is kept on top. */
  function applyAccountBundle(remote, opts) {
    if (!remote) return null;
    const options = opts || {};
    suppressCloud = true;
    try {
      restoreGuestSeed({ keepProfile: true });

      const rewards = mergeRewards(remote.rewards);
      applyRewardLedger(rewards.merged);

      const touched = mergeProgress(remote.progress);
      mergeMysteries(remote.mysteries);
      mergeSecrets(remote.secrets);

      if (remote.wishlist) {
        const wishlist = cleanWishlist(remote.wishlist);
        if (wishlist) {
          for (const id in wishlist) NASEEJ.session.wishlist[id] = true;
        }
      }
      if (remote.redemptions) {
        const redemptions = cleanRedemptions(remote.redemptions);
        if (redemptions) {
          for (const id in redemptions) {
            if (!NASEEJ.session.redemptions[id]) NASEEJ.session.redemptions[id] = redemptions[id];
          }
        }
      }

      /* The balance is derived, never copied: the ledger is what was paid, the
         claim log is what was spent, and the base is what a weaver held before
         any of it. The base is the larger of the cloud's and the local one —
         it is written once, at migration, so a higher local figure means this
         browser has something the account has never seen, not that the account
         lost anything. */
      const ledgerTotal = rewardLedgerTotal(rewardRows());
      const localBase = Math.max(0, NASEEJ.session.points + redeemedTotal() - ledgerTotal);
      const base = Math.max(isFiniteNumber(remote.atharBase) ? remote.atharBase : 0, localBase);
      const derived = base + ledgerTotal - redeemedTotal();
      const held = NASEEJ.session.points;
      NASEEJ.session.points = Math.max(derived, isFiniteNumber(held) ? held : 0);
      noteAtharEarned(NASEEJ.session.points);
      if (isFiniteNumber(remote.atharPeak) && remote.atharPeak > NASEEJ.session.atharPeak) {
        NASEEJ.session.atharPeak = remote.atharPeak;
      }
      for (const tid in NASEEJ.session.threadProgress) syncHeroProgress(+tid);
      syncHeroProgress(HERO_THREAD_ID);
      heroJourneyEntry(HERO_THREAD_ID);

      return {
        rewards: rewards.added,
        threads: touched,
        atharBase: base,
        pending: rewards.added,
      };
    } finally {
      suppressCloud = false;
    }
  }

  function accountPayload() {
    return {
      /* The legacy single-document shape is still produced: an account that has
         not migrated yet, or a Firestore outage, must not depend on the new
         model being readable. */
      progress: captureProgressSnapshot(),
      wishlist: NASEEJ.session.wishlist,
      redemptions: NASEEJ.session.redemptions,
      bundle: accountBundle(),
    };
  }

  function setCloudWriter(fn) {
    cloudWriter = typeof fn === 'function' ? fn : null;
  }

  function notifyCloud() {
    if (suppressCloud || typeof cloudWriter !== 'function') return;
    cloudWriter(accountPayload());
  }

  function applyAccountState(remote) {
    suppressCloud = true;
    restoreGuestSeed({ keepProfile: true });
    if (remote && remote.progress) {
      const stored = parseSnapshot(remote.progress);
      if (stored) applyProgress(stored);
    }
    if (remote && remote.wishlist) {
      const wishlist = cleanWishlist(remote.wishlist);
      NASEEJ.session.wishlist = wishlist || {};
    }
    if (remote && remote.redemptions) {
      const redemptions = cleanRedemptions(remote.redemptions);
      NASEEJ.session.redemptions = redemptions || {};
    }
    suppressCloud = false;
  }

  function restoreGuestSession() {
    suppressCloud = true;
    restoreGuestSeed();
    hydrateProgress();
    hydrateFeatures();
    suppressCloud = false;
  }

  captureGuestSeed();

  function hydrateFeatures() {
    const wishlist = readSmall(WISHLIST_KEY, cleanWishlist);
    if (wishlist) NASEEJ.session.wishlist = wishlist;
    const redemptions = readSmall(REDEMPTIONS_KEY, cleanRedemptions);
    if (redemptions) NASEEJ.session.redemptions = redemptions;
  }

  /* ── Wishlist ──────────────────────────────────────────────────────────────
     A real, working feature with a deliberately small surface: toggle a thread,
     read the set, count it. It is stored locally exactly like progress, and it
     is keyed by thread id so swapping the storage for a `weavers/{uid}/wishlist`
     document is a change of two functions, not of the UI. The renderer only
     ever asks isWishlisted / toggleWishlist; it never touches storage. */
  function isWishlisted(threadId) {
    return !!NASEEJ.session.wishlist[threadId];
  }

  function toggleWishlist(threadId) {
    if (threadId == null) return false;
    const added = !isWishlisted(threadId);
    if (added) NASEEJ.session.wishlist[threadId] = true;
    else delete NASEEJ.session.wishlist[threadId];
    saveWishlist();
    return added;
  }

  function wishlistCount() {
    return Object.keys(NASEEJ.session.wishlist).length;
  }

  /* ── Sharing ──────────────────────────────────────────────────────────────
     The payload is built here so the copy is written once, and so the title
     that is shared can never drift from the thread the page is showing. It
     carries the route rather than an absolute URL: data.js does not touch the
     DOM, so the caller supplies location and prefixes the hash. */
  function sharePayload(thread) {
    const id = threadIdOf(thread);
    const t = threadsById[id] || threadsById[DEFAULT_THREAD_ID];
    return {
      title: 'Naseej — ' + t.title,
      text: (threadSummary(id) || {}).hook || ('Follow the ' + t.title + ' story thread through Jordan.'),
      hash: '#/thread/' + id,
    };
  }

  /* ── Maps ─────────────────────────────────────────────────────────────────
     A waypoint only gets a maps link when it has real coordinates. Inventing
     them for the sake of a button would put a pin in the wrong place, so a
     waypoint without coordinates gets no button at all — see media() in
     pages.js, which applies the same rule to photography. */
  function waypointCoords(waypoint) {
    if (!waypoint) return null;
    const lat = typeof waypoint.lat === 'number' ? waypoint.lat : null;
    const lng = typeof waypoint.lng === 'number' ? waypoint.lng : null;
    if (lat == null || lng == null) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat: lat, lng: lng };
  }

  /* Both providers are addressed by the same coordinate pair; which one the
     user gets is the browser's choice, and neither is a fabricated location. */
  function mapsUrl(waypoint) {
    const c = waypointCoords(waypoint);
    if (!c) return null;
    return 'https://www.google.com/maps/search/?api=1&query=' + c.lat + ',' + c.lng;
  }

  /* ── Reward redemption ────────────────────────────────────────────────────
     There is no partner integration, so this does not pretend to be one. It
     spends real ATHAR out of the one balance, records the claim locally so it
     cannot be claimed twice, and returns a status the UI states plainly as a
     demo. `partner` is the thing a real redemption would need to prove, and it
     is null on purpose: nothing here contacts a partner. */
  function redeemReward(rewardId) {
    const reward = rewardById(rewardId);
    if (!reward) return { ok: false, reason: 'unknown' };
    if (NASEEJ.session.redemptions[rewardId]) {
      return { ok: false, reason: 'already', reward: reward };
    }
    const cost = reward.points;
    if (!isFiniteNumber(cost) || cost <= 0) return { ok: false, reason: 'invalid', reward: reward };
    /* Guard the direction of the check: a reward can never be claimed for a
       negative or missing cost, and can never be claimed for more ATHAR than
       the weaver holds. */
    if (NASEEJ.session.points < cost) {
      return { ok: false, reason: 'insufficient', missing: cost - NASEEJ.session.points, reward: reward };
    }
    NASEEJ.session.points -= cost;
    NASEEJ.session.redemptions[rewardId] = { at: Date.now(), cost: cost };
    /* Both stores are written. saveProgress() is what persists the reduced
       balance, and it is a separate key from the claim log: without it the
       ATHAR comes straight back on the next hydrate while the reward still
       reads as claimed, so the weaver gets it twice. */
    saveProgress();
    saveRedemptions();
    return { ok: true, reward: reward, cost: cost };
  }

  function rewardById(rewardId) {
    /* Reward ids are slugs ('ajloun-soap'), not numbers, so they are compared
       as strings. A numeric caller still resolves. */
    const key = String(rewardId);
    for (let i = 0; i < rewards.length; i++) {
      if (String(rewards[i].id) === key) return rewards[i];
    }
    return null;
  }

  /* Keep the registry usable when a different namespace already exists. */
})(window.NASEEJ || (window.NASEEJ = {}));
