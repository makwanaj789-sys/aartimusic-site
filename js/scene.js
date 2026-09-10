/* ============================================================
   THE SCENE  —  instanced build
   A full-page WebGL background: a receding grid floor, three
   nested rings of bars, and drifting embers. The camera is
   driven by scroll — it pulls back and rises as the page moves,
   so the whole site feels like one continuous space rather than
   a stack of separate blocks.

   Steering (mouse, finger, phone tilt) comes from motion.js.

   PERFORMANCE
   The rings used to be ~165 individual Mesh objects, each with
   its own geometry and its own material — 165 draw calls every
   frame, which is what made this crawl on a phone. They are now
   three InstancedMesh objects sharing one BoxGeometry: three
   draw calls, whatever the bar count.

   On top of that:
     - one rAF chain (the old one hopped through two frames per
       render, capping the whole scene at 30fps)
     - rendering stops when the tab is hidden AND when the canvas
       has scrolled out of view
     - a quality governor watches real frame times and steps the
       device pixel ratio down if the device can't keep up
   ============================================================ */
(function(){
  if (typeof THREE === 'undefined') return;

  var canvas = document.getElementById('scene');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg   = (window.AARTI && window.AARTI.scene) || {};
  var width = window.innerWidth;
  var small = width < 760;
  var tiny  = width <= 420;

  /* Rough device tier. Cores and memory are crude signals but they
     are the only ones available before the first frame, and they
     keep a weak phone from opening at a quality it can't hold. */
  var cores = navigator.hardwareConcurrency || 4;
  var mem   = navigator.deviceMemory || 4;
  var weak  = cores <= 4 || mem <= 4;

  var mobileFactor = tiny ? 0.42 : (small ? 0.56 : (weak ? 0.72 : 1));

  var BASE   = Math.max(24, Math.round((cfg.bars || 64) * mobileFactor));
  var RADIUS = cfg.radius || 6.0;
  var EMBERS = cfg.embers === undefined
    ? Math.round(90 * mobileFactor)
    : Math.max(0, Math.round(cfg.embers * mobileFactor));
  var GRID   = cfg.grid !== false;
  var GRID_DIVISIONS = tiny ? 24 : (small ? 32 : 48);

  // Ceilings, not targets — the governor below can lower these live.
  var DPR_CAP = tiny ? 1 : (small ? 1.2 : (weak ? 1.25 : 1.5));

  // How much of the scene is left once you have scrolled past the
  // hero. Enough to keep the page feeling alive, not enough to
  // fight the text.
  var REST = cfg.restOpacity === undefined ? 0.16 : cfg.restOpacity;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !small && !weak,
      alpha: true,
      powerPreference: (small || weak) ? 'low-power' : 'high-performance',
      stencil: false,
      depth: true
    });
  } catch(e){
    document.documentElement.classList.add('no-webgl');
    return;                       // page still reads fine, just flat
  }

  var dprCap = DPR_CAP;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  var scene  = new THREE.Scene();
  scene.fog  = new THREE.FogExp2(0x0A0908, 0.021);

  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
  var rig    = new THREE.Group();     // takes the lean
  var stack  = new THREE.Group();     // the rings
  rig.add(stack);
  scene.add(rig);

  var cHot  = new THREE.Color(cfg.hot  || '#F7DCA8');
  var cMid  = new THREE.Color(cfg.mid  || '#E0A253');
  var cCool = new THREE.Color(cfg.cool || '#B0553C');

  var _blend = new THREE.Color();
  function blendInto(target, t){
    if (t > 0.5) target.copy(cMid).lerp(cHot, (t - 0.5) * 2);
    else         target.copy(cCool).lerp(cMid, t * 2);
    return target;
  }

  /* ---------- grid floor ------------------------------------
     A wireframe plane far below, receding into the fog. This is
     what gives the page a floor and a horizon — without it the
     rings float in an empty void and the depth reads as flat.
     One LineSegments object, so one draw call. */
  var grid = null;
  if (GRID){
    grid = new THREE.GridHelper(160, GRID_DIVISIONS, 0xE0A253, 0x8C6B45);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.material.depthWrite = false;
    grid.position.y = -7;
    scene.add(grid);
  }

  /* ---------- the rings -------------------------------------
     One shared unit-box geometry, translated so bars grow upward
     from their base, reused by all three InstancedMesh rings.  */
  var barGeo = new THREE.BoxGeometry(1, 1, 1);
  barGeo.translate(0, 0.5, 0);

  var LAYERS = [
    { r: RADIUS * 0.68, n: Math.round(BASE * 0.55), w: 0.14, dir: -1, spin: 1.55, y: -0.5, amp: 1.10, op: 0.62 },
    { r: RADIUS,        n: BASE,                    w: 0.18, dir:  1, spin: 1.00, y:  0.0, amp: 1.70, op: 0.94 },
    { r: RADIUS * 1.30, n: Math.round(BASE * 0.78), w: 0.11, dir: -1, spin: 0.58, y:  0.3, amp: 0.90, op: 0.40 }
  ];

  var rings = [];
  var _m4 = new THREE.Matrix4();
  var _q  = new THREE.Quaternion();
  var _up = new THREE.Vector3(0, 1, 0);
  var _pos = new THREE.Vector3();
  var _scl = new THREE.Vector3();

  LAYERS.forEach(function(L){
    var n = Math.max(1, L.n);

    var mat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: L.op, depthWrite: false
    });

    var mesh = new THREE.InstancedMesh(barGeo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;          // it is always on screen; skip the test
    mesh.position.y = L.y;

    // Per-bar colour lives on the instance buffer, so the whole
    // ring still gradients from ember to flame in one draw call.
    var colors = new Float32Array(n * 3);
    var baseColors = new Float32Array(n * 3);
    var phases = new Float32Array(n);
    var angles = new Float32Array(n);

    for (var i = 0; i < n; i++){
      var t = i / n;
      var a = t * Math.PI * 2;
      angles[i] = a;
      phases[i] = t * Math.PI * 4;

      blendInto(_blend, t);
      baseColors[i*3] = colors[i*3] = _blend.r;
      baseColors[i*3+1] = colors[i*3+1] = _blend.g;
      baseColors[i*3+2] = colors[i*3+2] = _blend.b;

      _pos.set(Math.cos(a) * L.r, 0, Math.sin(a) * L.r);
      _q.setFromAxisAngle(_up, -a);
      _scl.set(L.w, 1, L.w);
      _m4.compose(_pos, _q, _scl);
      mesh.setMatrixAt(i, _m4);
    }

    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;

    // The thin disc under each ring — one more draw call each, and
    // cheap enough at 64 segments to be worth the grounding it gives.
    var floorMat = new THREE.MeshBasicMaterial({
      color: cMid.clone(), transparent: true, opacity: L.op * 0.18,
      side: THREE.DoubleSide, depthWrite: false
    });
    var floor = new THREE.Mesh(
      new THREE.RingGeometry(L.r - 0.05, L.r + 0.05, 64), floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = L.y;
    floor.frustumCulled = false;

    stack.add(mesh);
    stack.add(floor);

    rings.push({
      mesh: mesh, floor: floorMat, cfg: L, count: n,
      colors: colors, baseColors: baseColors,
      phases: phases, angles: angles
    });
  });

  /* ---------- atmospheric light volumes ---------------------
     Soft sprite glows create the bloom-like halo without pulling
     in a post-processing stack. They sit behind the bars and move
     with the same rig, so the WebGL world still feels dimensional. */
  var glowTexture = (function(){
    var gc = document.createElement('canvas'); gc.width = gc.height = 128;
    var gx = gc.getContext('2d');
    var gg = gx.createRadialGradient(64,64,0,64,64,64);
    gg.addColorStop(0,'rgba(255,235,190,0.72)');
    gg.addColorStop(0.22,'rgba(244,190,105,0.34)');
    gg.addColorStop(0.62,'rgba(191,86,48,0.09)');
    gg.addColorStop(1,'rgba(0,0,0,0)');
    gx.fillStyle=gg; gx.fillRect(0,0,128,128);
    var tex = new THREE.CanvasTexture(gc);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  })();
  var glowGroup = new THREE.Group();
  rig.add(glowGroup);
  var glowA = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xF7DCA8,transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending}));
  var glowB = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xB0553C,transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending}));
  glowA.scale.set(13,13,1); glowA.position.set(0,1.8,0.8);
  glowB.scale.set(22,22,1); glowB.position.set(0,-1.5,-1.8);
  glowGroup.add(glowB, glowA);

  /* ---------- embers ----------------------------------------
     One Points object over a BufferGeometry — the whole drift is
     a single draw call however many sparks there are. */
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
    var emberTex = new THREE.CanvasTexture(c);
    emberTex.generateMipmaps = false;
    emberTex.minFilter = THREE.LinearFilter;

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
    var eattr = new THREE.BufferAttribute(pos, 3);
    eattr.setUsage(THREE.DynamicDrawUsage);
    egeo.setAttribute('position', eattr);
    egeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    ember = {
      mat: new THREE.PointsMaterial({
        size: small ? 0.28 : 0.22,
        map: emberTex,
        transparent: true, opacity: 0.7,
        depthWrite: false, sizeAttenuation: true
      }),
      pos: pos, rise: rise, sway: sway, geo: egeo, attr: eattr
    };
    ember.points = new THREE.Points(egeo, ember.mat);
    ember.points.frustumCulled = false;
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
      R.mesh.material.blending = mix;
      R.mesh.material.opacity  = day ? R.cfg.op * 0.55 : R.cfg.op;
      R.mesh.material.needsUpdate = true;

      // Recolour the instance buffer rather than N materials.
      for (var i = 0; i < R.count; i++){
        _blend.setRGB(R.baseColors[i*3], R.baseColors[i*3+1], R.baseColors[i*3+2]);
        if (day) _blend.lerp(cCool, 0.55);
        R.colors[i*3]   = _blend.r;
        R.colors[i*3+1] = _blend.g;
        R.colors[i*3+2] = _blend.b;
      }
      R.mesh.instanceColor.needsUpdate = true;

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
    dirty = true;
  };
  window.__sceneTheme(document.documentElement.getAttribute('data-theme'));

  // theme.js is the single source of truth. Listen for live changes so
  // WebGL updates immediately without a reload, including mobile taps.
  document.documentElement.addEventListener('aarti:themechange', function(e){
    var mode = e && e.detail && e.detail.mode;
    if (mode === 'day' || mode === 'night') window.__sceneTheme(mode);
  });

  /* ---------- framing --------------------------------------- */
  var resizeTimer = 0;
  function resize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var liveSmall = w < 760;
    var liveTiny  = w <= 420;
    dprCap = liveTiny ? 1 : (liveSmall ? 1.2 : (weak ? 1.25 : 1.5));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap * quality));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  function requestResize(){
    // Mobile browsers fire resize on every URL-bar nudge; a WebGL
    // buffer reallocation per scroll pixel is its own kind of jank.
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  }
  resize();
  window.addEventListener('resize', requestResize, { passive:true });
  window.addEventListener('orientationchange', requestResize, { passive:true });

  /* ---------- run state -------------------------------------
     Three things can stop the loop: the tab going away, the
     canvas scrolling out of view, and reduced-motion settling
     into a static frame. */
  var visible = true;      // tab
  var onScreen = true;     // canvas intersects the viewport
  var running = false;
  var dirty = true;

  document.addEventListener('visibilitychange', function(){
    visible = !document.hidden;
    if (visible) start();
  });

  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
    }, { threshold: 0 }).observe(canvas);
  }

  /* ---------- render rate -----------------------------------
     A background is the one thing on the page that can afford to
     run at half rate: nothing here is read, clicked or typed into.
     Phones render at 30, which leaves the other half of every
     frame's budget to the scrolling the visitor is actually doing.
     Desktop takes every frame it is offered. */
  var minInterval = (small || weak) ? (1000 / 30) - 1 : 0;

  /* ---------- quality governor ------------------------------
     Frame cost is the only honest measure of what a device can
     do. If we spend several seconds over budget, drop resolution
     a step; if it stays comfortable, allow one step back. */
  var quality = 1;
  var slowFrames = 0, fastFrames = 0;

  function governor(dt){
    // Budget is whatever cadence this device is running at, plus a
    // little slack — 26ms against 60fps, 42ms against a capped 30.
    var over  = minInterval ? 42 : 26;
    var under = minInterval ? 30 : 15;
    if (dt > over){ slowFrames++; fastFrames = 0; }
    else if (dt < under){ fastFrames++; slowFrames = 0; }

    if (slowFrames > 45 && quality > 0.6){
      quality = Math.max(0.6, quality - 0.2);
      slowFrames = 0;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap * quality));
    } else if (fastFrames > 240 && quality < 1){
      quality = Math.min(1, quality + 0.2);
      fastFrames = 0;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap * quality));
    }
  }

  /* ---------- render ---------------------------------------- */
  var motion = window.AARTI_MOTION || { x:0, y:0 };
  var sceneProgress = window.AARTI_SCROLL || { progress:0, hero:0 };
  var lastCanvasOpacity = -1;
  var t0 = performance.now();
  var prev = t0;

  function smoothstep(t){ return t * t * (3 - 2 * t); }

  function frame(now){
    if (!visible || !onScreen){ running = false; return; }
    requestAnimationFrame(frame);

    var dt = now - prev;
    // Skip without touching prev, so the elapsed time keeps adding up
    // and the cadence stays even instead of drifting.
    if (minInterval && dt < minInterval) return;
    prev = now;
    governor(dt);

    var t = (now - t0) / 1000;

    if (motion && typeof motion.update === 'function') motion.update();

    /* Fade the scene out as the hero leaves.
       It reads as atmosphere behind a wordmark, but behind a
       paragraph it is just noise competing with the words —
       badly so in day mode, where the bars turn solid. */
    sceneProgress = window.AARTI_SCROLL || sceneProgress;
    var targetSceneProgress = sceneProgress.progress || 0;
    var heroP = sceneProgress.hero || 0;
    var chapterP = smoothstep(Math.min(1, Math.max(0, (targetSceneProgress - 0.10) / 0.90)));

    /* The WebGL world remains present beyond the hero, but its
       contrast breathes with the story instead of disappearing. */
    var visibility = 1 - heroP * 0.36 + Math.sin(t * 0.32) * 0.018;
    var canvasOpacity = Math.max(REST, visibility);
    if (Math.abs(canvasOpacity - lastCanvasOpacity) > 0.004){
      canvas.style.opacity = canvasOpacity.toFixed(3);
      lastCanvasOpacity = canvasOpacity;
    }

    /* Choreographed movement: the same object backs away from
       the wordmark, drifts through the numbers/features, then
       settles into a quieter final state. */
    var heroExit = smoothstep(Math.min(1, Math.max(0, heroP * 1.08)));
    var driftX = Math.sin(chapterP * Math.PI * 2.2) * 1.55 + chapterP * 0.7;
    var driftY = -heroExit * 1.0 + Math.sin(chapterP * Math.PI * 1.6) * 0.45;
    var worldScale = 1.0 + heroExit * 0.22 + Math.sin(chapterP * Math.PI) * 0.08;
    rig.position.x += (driftX + motion.x * 0.75 - rig.position.x) * 0.055;
    rig.position.y += (driftY + motion.y * 0.30 - rig.position.y) * 0.055;
    rig.scale.x += (worldScale - rig.scale.x) * 0.055;
    rig.scale.y = rig.scale.x;
    rig.scale.z = rig.scale.x;
    rig.rotation.x   =  motion.y * 0.26 + heroExit * 0.08;
    rig.rotation.z   = -motion.x * 0.12 + Math.sin(chapterP * Math.PI * 1.5) * 0.025;
    stack.rotation.y = t * 0.085 + motion.x * 0.45 + chapterP * 0.85;

    var dist = 16.5 + chapterP * 17.5;
    var elev = 0.22 + chapterP * 0.78 - motion.y * 0.14;
    var pan  = motion.x * 0.10 + chapterP * 0.62;

    camera.position.set(
      Math.sin(pan)  * dist * Math.cos(elev),
      Math.sin(elev) * dist + 1.15,
      Math.cos(pan)  * dist * Math.cos(elev)
    );
    camera.lookAt(driftX * 0.16, 0.45 - chapterP * 1.75, 0);

    glowA.material.opacity = 0.32 + (1 - chapterP) * 0.18;
    glowB.material.opacity = 0.14 + (1 - chapterP) * 0.10;

    if (!reduced){
      /* Only a bar's height changes from frame to frame — its place
         on the ring and its facing are fixed. Every bar is rotated
         about Y, so in its instance matrix the Y basis column is
         (0, h, 0): element 5 IS the height, and elements 0-4 and
         6-15 never move. Writing that one float straight into the
         instance buffer replaces a quaternion, a compose and a
         sixteen-float copy per bar per frame. */
      for (var r = 0; r < rings.length; r++){
        var R = rings[r], L = R.cfg;
        R.mesh.rotation.y = t * 0.085 * L.spin * L.dir;

        var arr = R.mesh.instanceMatrix.array;
        var chapterWave = chapterP * Math.PI;
        var spinT = t * 1.15 * L.spin;
        var slowT = t * 0.42;
        var amp = L.amp, amp2 = L.amp * 0.6;

        for (var i = 0; i < R.count; i++){
          var ph   = R.phases[i];
          var wave = Math.sin(spinT + ph) * 0.5 + 0.5;
          var slow = Math.sin(slowT + ph * 0.35) * 0.5 + 0.5;
          arr[i * 16 + 5] = (0.45 + wave * amp + slow * amp2) *
                            (1 + Math.sin(chapterWave + ph) * 0.06);
        }
        R.mesh.instanceMatrix.needsUpdate = true;
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
        ember.attr.needsUpdate = true;
      }
    }

    renderer.render(scene, camera);
  }

  function start(){
    if (running) return;
    running = true;
    prev = performance.now();
    requestAnimationFrame(frame);
  }

  start();
})();
