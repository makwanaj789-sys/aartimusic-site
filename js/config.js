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
  /* Two Instagram accounts: the official AartiMusic page a friend
     runs, and the owner's own. Leave either empty to drop its card. */
  instagram:      'aartimusic77',  // official page, handle only, no @
  instagramOwner: 'h81t6',         // owner's personal page
  email:          '',            // e.g. 'hello@aartimusic.com'

  /* --- hero artwork ---
     Small circular picture above the wordmark. Put the file in
     assets/. Leave empty ('') and it simply isn't shown.       */
  heroImage: 'assets/pfp.webp',
  heroImageFallback: 'assets/pfp.png',

  /* --- donations ---
     A UPI address, not a payment gateway. A gateway would add
     signup, KYC, fees and a cut on every rupee; a UPI link opens
     the payer's own app and the money lands in the same account
     either way. Phones get the link, desktops get the QR beside it.

     Leave upi empty and the whole section disappears.            */
  donate: {
    upi:  'makwanaj789-1@okhdfcbank',
    name: 'AartiMusic',
    note: 'Support AartiMusic'
  },

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
     Two short clips, both silent (the audio track is stripped from
     the file, not just muted) and both lazy: nothing downloads
     until the section is near the viewport, and playback pauses
     the moment it leaves. Empty a path and that clip disappears.

     ribbons    sits behind the effects rail
     moment     the hourglass in the "ready forever" band          */
  video: {
    /* WebM first where the browser takes it — same clip, roughly
       40% fewer bytes — with MP4 as the fallback everything plays.

       The `sm` pair is a 480-wide encode for phones. Serving the
       960-wide file to a 390px screen means decoding about six
       times the pixels that reach the display, and on a phone that
       is frames, not just bytes. */
    ribbons: {
      webm: 'assets/ribbons.webm',   mp4: 'assets/ribbons.mp4',
      smWebm: 'assets/ribbons-sm.webm', smMp4: 'assets/ribbons-sm.mp4'
    },
    moment: {
      webm: 'assets/hourglass.webm', mp4: 'assets/hourglass.mp4',
      smWebm: 'assets/hourglass-sm.webm', smMp4: 'assets/hourglass-sm.mp4'
    },
    /* On for phones too. The clips are small (WebM 853KB and
       405KB), neither downloads until its section is near the
       viewport, and both pause the moment it leaves — so a visitor
       who never scrolls that far never pays for them. */
    onMobile: true
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
