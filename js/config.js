/* ============================================================
   CONFIG
   Everything you might want to change is in this one file.
   Leave a contact field empty ('') and that card disappears
   from the page automatically.
   ============================================================ */

window.AARTI = {

  /* --- Telegram --- */
  botUsername:    'AartiMusic_bot',
  ownerHandle:    'umclon',
  updatesChannel: 'clon_ch1t',
  supportGroup:   '',            // e.g. 'aartimusic_support'
  instagram:      'h81t6',       // handle only, no @
  email:          '',            // e.g. 'hello@aartimusic.com'

  /* --- hero artwork ---
     Small circular picture above the wordmark. Put the file in
     assets/. Leave empty ('') and it simply isn't shown.       */
  heroImage: 'assets/pfp.png',

  /* --- live stats ---
     Where the numbers come from: a file sitting next to
     index.html that the bot rewrites once a day, or a full
     https address. Empty means the tiles say so honestly
     instead of showing invented numbers.                       */
  statsSource: 'stats.json',
  statsRefreshMinutes: 60,

  /* --- motion input ---
     One steering signal feeds the scene and the card tilt: a
     mouse, a dragging finger, or the phone's own tilt.          */
  motion: {
    ease: 0.075,   // how lazily it follows. 0.02 is syrup, 0.2 is snappy
    gyro: true     // false switches off phone-tilt steering everywhere
  },

  /* --- card tilt --- */
  tilt: {
    enabled:  true,
    maxAngle: 8,    // degrees of lean; 4-6 is subtle, 12+ is loud
    lift:     14,   // px the card rises toward the viewer
    shine:    30    // % accent colour in the moving highlight
  },

  /* --- video ---
     showcase   plays in its own section, only once it scrolls into
                view. Nothing downloads until then.
     overlay    a looping clip screened over the whole page. It needs a
                black background — screen blend makes black vanish and
                keeps the light.
     Both are optional: empty the path and the block disappears.

     onMobile:false keeps the page-wide overlay off phones. It is the
     single heaviest thing here and most visitors arrive on mobile
     data, so it is opt-in rather than on by default.               */
  video: {
    showcase: 'assets/showcase.mp4',
    overlay:  'assets/overlay.mp4',
    overlayOpacity: 0.30,
    onMobile: false
  },

  /* --- the WebGL scene ---
     Three nested rings of bars over a receding grid floor, with
     embers drifting up through them. The camera pulls back as
     the page scrolls, so the whole site sits in one space.
     Bars and embers are cut automatically on small screens.    */
  scene: {
    hot:    '#F7DCA8',   // top of the flame
    mid:    '#E0A253',
    cool:   '#B0553C',   // base of the flame

    bars:   70,          // bars in the middle ring; the others scale off it
    radius: 6.0,
    embers: 110,         // rising sparks; 0 removes them
    grid:   true         // the wireframe floor. false leaves the rings floating
  }
};
