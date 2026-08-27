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
  heroImage: 'assets/pfp.jpg',

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

  /* --- card tilt ---
     Cards lean toward the pointer. Set enabled:false to switch
     it off everywhere. Touch screens skip it automatically.    */
  tilt: {
    enabled:  true,
    maxAngle: 9,    // degrees of lean; 4-6 is subtle, 12+ is loud
    lift:     16,   // px the card rises toward the viewer
    shine:    34    // % accent colour in the moving highlight
  },

  /* --- the 3D ring in the hero --- */
  ring: {
    hot:    '#F7DCA8',   // top of the flame
    mid:    '#E0A253',
    cool:   '#B0553C',   // base of the flame
    bars:   72,          // fewer = simpler, lighter
    radius: 6.2,
    speed:  0.085,       // rotation; 0 stops it spinning
    follow: true         // ring leans toward the pointer
  }
};