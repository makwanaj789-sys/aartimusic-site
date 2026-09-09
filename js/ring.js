/* ============================================================
   THE FLAME RING
   Three nested rings of bars, a drift of embers rising through
   them, and a soft halo behind. It breathes like a diya flame
   and reads like an equaliser.

   Steering comes from motion.js, so a mouse, a dragging finger
   and the phone's own tilt all move it the same way.

   Everything tunable lives in AARTI.ring in config.js.
   Skipped entirely if the visitor prefers reduced motion.
   ============================================================ */
(function(){
  if (typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('ring');
  if (!canvas) return;

  var cfg   = (window.AARTI && window.AARTI.ring) || {};
  var small = window.innerWidth < 640;

  var BASE   = cfg.bars   || (small ? 44 : 72);
  var RADIUS = cfg.radius || 6.2;
  var SPEED  = cfg.speed === undefined ? 0.085 : cfg.speed;
  var DEPTH  = cfg.depth === undefined ? 1 : cfg.depth;   // 0 = flat, 1 = full lean
  var EMBERS = cfg.embers === undefined ? (small ? 60 : 120) : cfg.embers;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: !small, alpha: true,