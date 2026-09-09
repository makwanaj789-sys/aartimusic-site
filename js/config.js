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
  email:          '',            // e.g. 'hello@aartimusic.com'

  /* --- hero artwork ---
     The picture that sits inside the ring. Put the file in an
     assets/ folder in your repo. Leave empty ('') and the ring
     simply appears on its own.                                 */
  heroImage: 'assets/pfp.png',

  /* --- live stats ---
     Your bot's public HTTPS address. Leave empty until the
     endpoint is reachable — the tiles will say so honestly
     instead of showing invented numbers.
     Example: 'https://api.aartimusic.example'                */
  statsApi: '',

  /* how often the page re-checks, in minutes.
     The server caches for a full day, so this only matters
     for a tab someone left open.                             */
  statsRefreshMinutes: 30,

  /* --- motion input ---
     One steering signal feeds both the hero ring and the card
     tilt: a mouse, a dragging finger, or the phone's own tilt,
     whichever the visitor is using.                            */
  motion: {
    ease: 0.075,   // how lazily it follows. 0.02 is syrup, 0.2 is snappy
    gyro: true     // false switches off phone-tilt steering everywhere
  },

  /* --- card tilt ---
     Cards lean toward the pointer on desktop, and with the
     handset on phones. Set enabled:false to switch it off.     */
  tilt: {
    enabled:  true,
    maxAngle: 9,    // degrees of lean; 4-6 is subtle, 12+ is loud
    lift:     16,   // px the card rises toward the viewer
    shine:    34    // % accent colour in the moving highlight
  },

  /* --- the 3D ring in the hero ---
     Three nested rings of bars, embers rising through them,
     and a halo behind.                                         */
  ring: {
    hot:    '#F7DCA8',   // top of the flame
    mid:    '#E0A253',
    cool:   '#B0553C',   // base of the flame

    bars:   72,          // bars in the middle ring; the other two scale off it
    radius: 6.2,
    speed:  0.085,       // rotation; 0 stops it spinning

    depth:  1,           // how hard it leans. 0.6 is calm, 1.6 is dramatic
    embers: 120,         // rising sparks; 0 removes them
    halo:   true         // soft glow behind the rings
  }
};
