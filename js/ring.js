/* ============================================================
   THE FLAME RING
   Three nested rings of bars, embers rising through them, and
   a halo behind. Breathes like a diya flame, reads like an
   equaliser.

   Steering comes from motion.js — mouse, dragging finger, or
   the phone's own tilt all move it the same way.

   Two things this file is careful about:

   1. Blending changes with the theme. Additive light only
      glows on a dark background; on the cream day theme it
      washes out to nothing, so day mode paints solid instead
      and pulls the colours toward terracotta for contrast.

   2. The camera distance is computed from the outer radius,
      not hardcoded, so the widest ring always fits inside the
      canvas no matter what you set `radius` to.
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
  var SPEED  = cfg.speed  === undefined ? 0.085 : cfg.speed;
  var DEPTH  = cfg.depth  === undefined ? 1 : cfg.depth;
  var EMBERS = cfg.embers === undefined ? (small ? 60 : 120) : cfg.embers;
  var FOV    = 46;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: !small, alpha: true,
      powerPreference: 'high-performance'
    });
  } catch(e){ return; }          // no WebGL — page still reads fine, just flat

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

  var rig   = new THREE.Group();   // handles the lean
  var stack = new THREE.Group();   // holds the rings themselves
  rig.add(stack);
  scene.add(rig);

  var cHot  = new THREE.Color(cfg.hot  || '#F7DCA8');
  var cMid  = new THREE.Color(cfg.mid  || '#E0A253');
  var cCool = new THREE.Color(cfg.cool || '#B0553C');

  function blend(t){
    return t > 0.5
      ? cMid.clone().lerp(cHot, (t - 0.5) * 2)
      : cCool.clone().lerp(cMid, t * 2);
  }

  /* ---------- the three rings ------------------------------ *
     Different radii, speeds and directions. The counter-turn
     on the inner ring is what stops it reading as one solid
     spinning object.                                          */
  var LAYERS = [
    { r: RADIUS * 0.70, n: Math.round(BASE * 0.55), w: 0.15, dir: -1, spin: 1.55, y: -0.5, amp: 1.15, op: 0.66 },
    { r: RADIUS,        n: BASE,                    w: 0.19, dir:  1, spin: 1.00, y:  0.0, amp: 1.70, op: 0.92 },
    { r: RADIUS * 1.28, n: Math.round(BASE * 0.78), w: 0.12, dir: -1, spin: 0.58, y:  0.3, amp: 0.95, op: 0.42 }
  ];

  var OUTER = RADIUS * 1.28;
  var rings = [];

  LAYERS.forEach(function(L){
    var g = new THREE.Group();
    g.position.y = L.y;
    var bars = [];

    for (var i = 0; i < L.n; i++){
      var t   = i / L.n;
      var geo = new THREE.BoxGeometry(L.w, 1, L.w);
      geo.translate(0, 0.5, 0);                  // grow upward from the base

      var base = blend(t);
      var mat  = new THREE.MeshBasicMaterial({
        color: base.clone(), transparent: true, opacity: L.op, depthWrite: false
      });

      var bar = new THREE.Mesh(geo, mat);
      var a   = t * Math.PI * 2;
      bar.position.set(Math.cos(a) * L.r, 0, Math.sin(a) * L.r);
      bar.rotation.y = -a;

      g.add(bar);
      bars.push({ mesh: bar, base: base, phase: t * Math.PI * 4 });
    }

    // faint floor ring, for depth
    var floorMat = new THREE.MeshBasicMaterial({
      color: cMid.clone(), transparent: true, opacity: L.op * 0.18,
      side: THREE.DoubleSide, depthWrite: false
    });
    var floor = new THREE.Mesh(
      new THREE.RingGeometry(L.r - 0.06, L.r + 0.06, 96), floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);

    stack.add(g);
    rings.push({ group: g, bars: bars, floor: floorMat, cfg: L });
  });

  /* ---------- embers --------------------------------------- *
     Points drifting upward, recycled to the floor when they
     get too high. One soft dot drawn on a canvas — cheaper
     than a shader, and it survives the r128 CDN build.        */
  var ember = null;
  if (EMBERS > 0){
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0,    'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,225,175,0.55)');
    grd.addColorStop(1,    'rgba(255,200,140,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);

    var pos  = new Float32Array(EMBERS * 3);
    var rise = new Float32Array(EMBERS);
    var sway = new Float32Array(EMBERS);

    for (var e = 0; e < EMBERS; e++){
      var ea = Math.random() * Math.PI * 2;
      var er = RADIUS * (0.5 + Math.random() * 0.9);
      pos[e*3]     = Math.cos(ea) * er;
      pos[e*3 + 1] = Math.random() * 11 - 1.5;
      pos[e*3 + 2] = Math.sin(ea) * er;
      rise[e] = 0.35 + Math.random() * 0.75;
      sway[e] = Math.random() * Math.PI * 2;
    }

    var egeo = new THREE.BufferGeometry();
    egeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    ember = {
      mat: new THREE.PointsMaterial({
        size: small ? 0.30 : 0.24,
        map: new THREE.CanvasTexture(c),
        transparent: true, opacity: 0.75,
        depthWrite: false, sizeAttenuation: true
      }),
      pos: pos, rise: rise, sway: sway, geo: egeo
    };
    ember.points = new THREE.Points(egeo, ember.mat);
    rig.add(ember.points);
  }

  /* ---------- halo ----------------------------------------- */
  var halo = null;
  if (cfg.halo !== false){
    var hc = document.createElement('canvas');
    hc.width = hc.height = 256;
    var hx = hc.getContext('2d');
    var hg = hx.createRadialGradient(128, 128, 0, 128, 128, 128);
    hg.addColorStop(0,    'rgba(255,215,160,0.42)');
    hg.addColorStop(0.45, 'rgba(224,162,83,0.16)');
    hg.addColorStop(1,    'rgba(176,85,60,0)');
    hx.fillStyle = hg;
    hx.fillRect(0, 0, 256, 256);

    halo = new THREE.Mesh(
      new THREE.PlaneGeometry(OUTER * 3.4, OUTER * 3.4),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(hc), transparent: true,
        depthWrite: false, opacity: 0.9
      })
    );
    halo.position.set(0, 1.2, -3);
    scene.add(halo);
  }

  /* ---------- theme ---------------------------------------- *
     Called by theme.js on every switch, and once on load.

     Night: additive blending, so overlapping bars brighten
     into a glow against the dark room.

     Day: normal blending at near-full opacity, with every
     colour pulled toward terracotta. Additive light on a
     cream page is invisible — this is the fix for the ring
     vanishing in day mode.                                    */
  window.__ringTheme = function(mode){
    var day = (mode === 'day');
    var mix = day ? THREE.NormalBlending : THREE.AdditiveBlending;

    rings.forEach(function(R){
      R.bars.forEach(function(b){
        var m = b.mesh.material;
        m.blending = mix;
        m.opacity  = day ? Math.min(0.96, R.cfg.op + 0.28) : R.cfg.op;
        m.color.copy(b.base);
        if (day) m.color.lerp(cCool, 0.42);   // deepen so it reads on cream
        m.needsUpdate = true;
      });

      R.floor.blending = mix;
      R.floor.color.copy(cMid);
      if (day) R.floor.color.lerp(cCool, 0.5);
      R.floor.opacity = R.cfg.op * (day ? 0.30 : 0.18);
      R.floor.needsUpdate = true;
    });

    if (ember){
      ember.mat.blending = mix;
      ember.mat.color.copy(day ? cCool : cHot);
      ember.mat.opacity  = day ? 0.34 : 0.75;
      ember.mat.needsUpdate = true;
    }

    // a glow behind a light background is just haze —
    // it earns its place at night only
    if (halo){
      halo.material.blending = mix;
      halo.material.opacity  = day ? 0.16 : 0.90;
      halo.material.needsUpdate = true;
    }
  };
  window.__ringTheme(document.documentElement.getAttribute('data-theme'));

  /* ---------- framing -------------------------------------- *
     How far back the camera has to sit for the widest ring to
     fit, with margin for the lean. Computed, so changing
     `radius` in config can't push it off the canvas.          */
  var half = Math.tan((FOV / 2) * Math.PI / 180);
  var DIST = (OUTER * 1.22) / half;

  function resize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- render --------------------------------------- */
  var motion  = window.AARTI_MOTION || { x:0, y:0 };
  var visible = true;
  var awake   = true;

  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(en){
      visible = en[0].isIntersecting;
      if (visible && awake) tick();
    }, { threshold: 0.01 }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function(){
    awake = !document.hidden;
    if (awake && visible) tick();
  });

  var t0 = performance.now();
  var queued = false;

  function tick(){
    if (!visible || !awake){ queued = false; return; }
    if (queued) return;
    queued = true;

    requestAnimationFrame(function(){
      queued = false;
      if (!visible || !awake) return;
      requestAnimationFrame(tick);

      var t = (performance.now() - t0) / 1000;

      /* lean toward whoever is steering */
      rig.rotation.x   =  motion.y * 0.30 * DEPTH;
      rig.rotation.z   = -motion.x * 0.14 * DEPTH;
      stack.rotation.y = t * SPEED + motion.x * 0.50 * DEPTH;

      /* orbit at a fixed distance, so the framing never breaks.
         A lower elevation than before — the old high angle
         squashed the whole thing into a flat ellipse.         */
      var elev = 0.30 - motion.y * 0.16 * DEPTH;    // radians above the floor
      var pan  = motion.x * 0.10 * DEPTH;

      camera.position.set(
        Math.sin(pan)  * DIST * Math.cos(elev),
        Math.sin(elev) * DIST,
        Math.cos(pan)  * DIST * Math.cos(elev)
      );
      camera.lookAt(0, 0.9, 0);

      /* bars */
      for (var r = 0; r < rings.length; r++){
        var R = rings[r], L = R.cfg;
        R.group.rotation.y = t * SPEED * L.spin * L.dir;

        for (var i = 0; i < R.bars.length; i++){
          var b    = R.bars[i];
          var wave = Math.sin(t * 1.15 * L.spin + b.phase) * 0.5 + 0.5;
          var slow = Math.sin(t * 0.42 + b.phase * 0.35)   * 0.5 + 0.5;
          b.mesh.scale.y = 0.45 + wave * L.amp + slow * (L.amp * 0.62);
        }
      }

      /* embers */
      if (ember){
        var p = ember.pos;
        for (var k = 0; k < ember.rise.length; k++){
          var j = k * 3;
          p[j + 1] += ember.rise[k] * 0.021;
          p[j]     += Math.sin(t * 0.7 + ember.sway[k]) * 0.004;
          if (p[j + 1] > 10){                      // recycle to the floor
            var a2 = Math.random() * Math.PI * 2;
            var r2 = RADIUS * (0.5 + Math.random() * 0.9);
            p[j]     = Math.cos(a2) * r2;
            p[j + 1] = -1.8;
            p[j + 2] = Math.sin(a2) * r2;
          }
        }
        ember.geo.attributes.position.needsUpdate = true;
      }

      if (halo) halo.position.x = motion.x * -1.1;

      renderer.render(scene, camera);
    });
  }
  tick();
})();
