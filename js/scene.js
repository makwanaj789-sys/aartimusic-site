/* ============================================================
   THE SCENE
   A full-page WebGL background: a receding grid floor, three
   nested rings of bars, and drifting embers. The camera is
   driven by scroll — it pulls back and rises as the page moves,
   so the whole site feels like one continuous space rather than
   a stack of separate blocks.

   Steering (mouse, finger, phone tilt) comes from motion.js.

   Deliberately cheap where it matters: fewer bars and no
   antialiasing on small screens, rendering paused when the tab
   is hidden. This has to run on a mid-range phone over Indian
   mobile data, not just a laptop.
   ============================================================ */
(function(){
  if (typeof THREE === 'undefined') return;

  var canvas = document.getElementById('scene');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg   = (window.AARTI && window.AARTI.scene) || {};
  var small = window.innerWidth < 760;

  var BASE   = cfg.bars   || (small ? 40 : 70);
  var RADIUS = cfg.radius || 6.0;
  var EMBERS = cfg.embers === undefined ? (small ? 45 : 110) : cfg.embers;
  var GRID   = cfg.grid !== false;

  // How much of the scene is left once you have scrolled past the
  // hero. Enough to keep the page feeling alive, not enough to
  // fight the text.
  var REST = cfg.restOpacity === undefined ? 0.16 : cfg.restOpacity;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: !small, alpha: true,
      powerPreference: 'high-performance'
    });
  } catch(e){
    document.documentElement.classList.add('no-webgl');
    return;                       // page still reads fine, just flat
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));

  var scene  = new THREE.Scene();
  scene.fog  = new THREE.FogExp2(0x0A0908, 0.021);

  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  var rig    = new THREE.Group();     // takes the lean
  var stack  = new THREE.Group();     // the rings
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

  /* ---------- grid floor ------------------------------------
     A wireframe plane far below, receding into the fog. This is
     what gives the page a floor and a horizon — without it the
     rings float in an empty void and the depth reads as flat. */
  var grid = null;
  if (GRID){
    grid = new THREE.GridHelper(180, 60, 0xE0A253, 0x8C6B45);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.material.depthWrite = false;
    grid.position.y = -7;
    scene.add(grid);
  }

  /* ---------- the rings ------------------------------------- */
  var LAYERS = [
    { r: RADIUS * 0.68, n: Math.round(BASE * 0.55), w: 0.14, dir: -1, spin: 1.55, y: -0.5, amp: 1.10, op: 0.62 },
    { r: RADIUS,        n: BASE,                    w: 0.18, dir:  1, spin: 1.00, y:  0.0, amp: 1.70, op: 0.94 },
    { r: RADIUS * 1.30, n: Math.round(BASE * 0.78), w: 0.11, dir: -1, spin: 0.58, y:  0.3, amp: 0.90, op: 0.40 }
  ];

  var rings = [];

  LAYERS.forEach(function(L){
    var g = new THREE.Group();
    g.position.y = L.y;
    var bars = [];

    for (var i = 0; i < L.n; i++){
      var t   = i / L.n;
      var geo = new THREE.BoxGeometry(L.w, 1, L.w);
      geo.translate(0, 0.5, 0);            // grow upward from the base

      var base = blend(t);
      var mat  = new THREE.MeshBasicMaterial({
        color: base.clone(), transparent: true,
        opacity: L.op, depthWrite: false
      });

      var bar = new THREE.Mesh(geo, mat);
      var a   = t * Math.PI * 2;
      bar.position.set(Math.cos(a) * L.r, 0, Math.sin(a) * L.r);
      bar.rotation.y = -a;

      g.add(bar);
      bars.push({ mesh: bar, base: base, phase: t * Math.PI * 4 });
    }

    var floorMat = new THREE.MeshBasicMaterial({
      color: cMid.clone(), transparent: true, opacity: L.op * 0.18,
      side: THREE.DoubleSide, depthWrite: false
    });
    var floor = new THREE.Mesh(
      new THREE.RingGeometry(L.r - 0.05, L.r + 0.05, 96), floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);

    stack.add(g);
    rings.push({ group: g, bars: bars, floor: floorMat, cfg: L });
  });

  /* ---------- embers ---------------------------------------- */
  var ember = null;
  if (EMBERS > 0 && !reduced){
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var cx = c.getContext('2d');
    var gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0,    'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,225,175,0.55)');
    gr.addColorStop(1,    'rgba(255,200,140,0)');
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 64, 64);

    var pos  = new Float32Array(EMBERS * 3);
    var rise = new Float32Array(EMBERS);
    var sway = new Float32Array(EMBERS);

    for (var e = 0; e < EMBERS; e++){
      var ea = Math.random() * Math.PI * 2;
      var er = RADIUS * (0.4 + Math.random() * 1.4);
      pos[e*3]     = Math.cos(ea) * er;
      pos[e*3 + 1] = Math.random() * 14 - 3;
      pos[e*3 + 2] = Math.sin(ea) * er;
      rise[e] = 0.35 + Math.random() * 0.8;
      sway[e] = Math.random() * Math.PI * 2;
    }

    var egeo = new THREE.BufferGeometry();
    egeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    ember = {
      mat: new THREE.PointsMaterial({
        size: small ? 0.28 : 0.22,
        map: new THREE.CanvasTexture(c),
        transparent: true, opacity: 0.7,
        depthWrite: false, sizeAttenuation: true
      }),
      pos: pos, rise: rise, sway: sway, geo: egeo
    };
    ember.points = new THREE.Points(egeo, ember.mat);
    rig.add(ember.points);
  }

  /* ---------- theme ----------------------------------------- *
     Additive light only glows against a dark page. On the cream
     day theme it washes out to nothing, so day mode paints
     solid and pulls the colours toward terracotta instead.    */
  window.__sceneTheme = function(mode){
    var day = (mode === 'day');
    var mix = day ? THREE.NormalBlending : THREE.AdditiveBlending;

    rings.forEach(function(R){
      R.bars.forEach(function(b){
        var m = b.mesh.material;
        m.blending = mix;
        m.opacity  = day ? R.cfg.op * 0.55 : R.cfg.op;
        m.color.copy(b.base);
        if (day) m.color.lerp(cCool, 0.55);
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
      ember.mat.opacity  = day ? 0.32 : 0.70;
      ember.mat.needsUpdate = true;
    }

    if (grid){
      grid.material.opacity = day ? 0.10 : 0.16;
      grid.material.needsUpdate = true;
    }

    if (scene.fog) scene.fog.color.set(day ? 0xF4EFE9 : 0x0A0908);
  };
  window.__sceneTheme(document.documentElement.getAttribute('data-theme'));

  /* ---------- framing --------------------------------------- */
  function resize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- render ---------------------------------------- */
  var motion = window.AARTI_MOTION || { x:0, y:0 };
  var awake  = true;
  var scroll = 0;        // eased 0..1 down the page

  document.addEventListener('visibilitychange', function(){
    awake = !document.hidden;
    if (awake) tick();
  });

  function scrollAmount(){
    var max = document.body.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.scrollY / max) : 0;
  }

  var t0 = performance.now();
  var queued = false;

  function tick(){
    if (!awake){ queued = false; return; }
    if (queued) return;
    queued = true;

    requestAnimationFrame(function(){
      queued = false;
      if (!awake) return;
      requestAnimationFrame(tick);

      var t = (performance.now() - t0) / 1000;

      // ease toward the real scroll position so the camera drifts
      // rather than snapping on every wheel notch
      scroll += (scrollAmount() - scroll) * 0.06;

      /* Fade the scene out as the hero leaves.
         It reads as atmosphere behind a wordmark, but behind a
         paragraph it is just noise competing with the words —
         badly so in day mode, where the bars turn solid. */
      var vh   = window.innerHeight || 1;
      var past = Math.min(1, window.scrollY / (vh * 0.85));
      canvas.style.opacity = (1 - past * (1 - REST)).toFixed(3);

      rig.rotation.x   =  motion.y * 0.26;
      rig.rotation.z   = -motion.x * 0.12;
      stack.rotation.y = t * 0.085 + motion.x * 0.45;

      /* The camera pulls back and climbs as the page scrolls.
         By the footer the rings are a small shape far below,
         which makes the page feel like one long descent.     */
      var dist = 17 + scroll * 26;
      var elev = 0.26 + scroll * 0.85 - motion.y * 0.14;
      var pan  = motion.x * 0.10 + scroll * 0.5;

      camera.position.set(
        Math.sin(pan)  * dist * Math.cos(elev),
        Math.sin(elev) * dist + 1.2,
        Math.cos(pan)  * dist * Math.cos(elev)
      );
      camera.lookAt(0, 0.6 - scroll * 2.2, 0);

      if (!reduced){
        for (var r = 0; r < rings.length; r++){
          var R = rings[r], L = R.cfg;
          R.group.rotation.y = t * 0.085 * L.spin * L.dir;

          for (var i = 0; i < R.bars.length; i++){
            var b    = R.bars[i];
            var wave = Math.sin(t * 1.15 * L.spin + b.phase) * 0.5 + 0.5;
            var slow = Math.sin(t * 0.42 + b.phase * 0.35)   * 0.5 + 0.5;
            b.mesh.scale.y = 0.45 + wave * L.amp + slow * (L.amp * 0.6);
          }
        }

        if (ember){
          var p = ember.pos;
          for (var k = 0; k < ember.rise.length; k++){
            var j = k * 3;
            p[j + 1] += ember.rise[k] * 0.02;
            p[j]     += Math.sin(t * 0.7 + ember.sway[k]) * 0.004;
            if (p[j + 1] > 12){
              var a2 = Math.random() * Math.PI * 2;
              var r2 = RADIUS * (0.4 + Math.random() * 1.4);
              p[j]     = Math.cos(a2) * r2;
              p[j + 1] = -3;
              p[j + 2] = Math.sin(a2) * r2;
            }
          }
          ember.geo.attributes.position.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    });
  }
  tick();
})();
