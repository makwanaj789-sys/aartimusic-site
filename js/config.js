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
  heroImage: 'assets/pfp.webp',
  heroImageFallback: 'assets/pfp.png',

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

     onMobile decides whether the page-wide overlay loads on phones.
     It is off there now, and the reason is frame cost rather than
     the 3.5 MB: screen-blending a fullscreen video over the whole
     document forces the browser to recomposite every layer beneath
     it for every video frame. On a phone that alone was eating the
     frame budget. Desktop keeps it.                                */
  video: {
    showcase: 'assets/showcase.mp4',
    overlay:  'assets/overlay.mp4',
    overlayOpacity: 0.30,
    onMobile: false
  },

  /* --- the effects rail ---
     The seven effect cards travel through a perspective rail while
     the section is pinned. It is the most expensive thing on the
     page for a phone to composite, so:

       flat: true    keep the travel, drop the 3D turn (cheapest)
       flat: false   force the full 3D turn everywhere
       omit it       decide per device, which is the default

     enabled: false  falls back to a plain grid of the same cards. */
  gallery: {
    // flat: true,
    enabled: true
  },

  /* --- the nebula ---
     One cloud of particles that holds the shape of a spinning
     record through the hero, then bursts into a drifting nebula
     as you scroll. It is drawn in a single call and animated
     entirely in the vertex shader, so the particle count below
     costs the CPU nothing — raising it changes what you see, not
     what it costs to run. Fill rate is the real limit, so the
     scene halves the count on phones and lowers resolution by
     itself if it measures frames running long.                 */
  scene: {
    particles: 90000,

    /* The four lights of the ramp. Every particle sits somewhere
       between them, so the cloud reads as one spectrum. */
    palette: {
      a: '#7C4DFF',   // violet
      b: '#FF3DA6',   // magenta
      c: '#35E6E2',   // cyan
      d: '#FFC46B'    // gold
    },

    /* What is left of the cloud once the hero has scrolled away. */
    restOpacity: 0.30
  }
};
