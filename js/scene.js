/* ============================================================
   NEBULA
   A single cloud of light. Tens of thousands of particles hold
   the shape of a spinning record, breathe with a pulse, and blow
   apart into a drifting nebula as the page scrolls — then gather
   again. Colour is iridescent: violet through magenta into cyan
   and gold, shifting with where a particle sits and how fast it
   is moving.

   HOW IT RUNS
   The whole thing is ONE draw call. Every particle's position,
   size, colour and life is computed in the vertex shader from a
   per-particle seed and a handful of uniforms; JavaScript writes
   about six floats per frame and never touches a particle. That
   is why the count can be in the tens of thousands and still
   leave the main thread free for scrolling.

   Steering (mouse, finger, phone tilt) comes from motion.js.
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

  var cores = navigator.hardwareConcurrency || 4;
  var mem   = navigator.deviceMemory || 4;
  var weak  = cores <= 4 || mem <= 4;

  /* Particle count is the one dial that matters. Vertices are
     cheap; the pixels they cover are not, so the mobile tiers cut
     hard and the governor below can still pull it down live. */
  var COUNT = cfg.particles || 90000;
  if (weak) COUNT = Math.round(COUNT * 0.30);
  if (small) COUNT = Math.round(COUNT * 0.42);
  if (tiny)  COUNT = Math.round(COUNT * 0.62);
  COUNT = Math.max(6000, Math.min(COUNT, 160000));

  var DPR_CAP = tiny ? 1 : (small ? 1.2 : (weak ? 1.25 : 1.6));
  var REST = cfg.restOpacity === undefined ? 0.30 : cfg.restOpacity;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true,
      antialias: false,               // points don't benefit; it just costs
      powerPreference: (small || weak) ? 'low-power' : 'high-performance',
      stencil: false, depth: false
    });
  } catch(e){
    document.documentElement.classList.add('no-webgl');
    return;
  }

  var dprCap = DPR_CAP;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
  var rig    = new THREE.Group();
  scene.add(rig);

  /* ---------- the particle cloud ----------------------------
     Each particle carries a seed and nothing else. Where it sits
     on the record, where it flies to when the cloud bursts, how
     it drifts and what colour it takes are all derived from that
     seed in the shader, so the buffer is written once. */
  var N = COUNT;
  var positions = new Float32Array(N * 3);   // required by three; the
                                             // shader overwrites it
  var seed  = new Float32Array(N * 4);
  var seed2 = new Float32Array(N * 4);

  for (var i = 0; i < N; i++){
    var a = Math.random() * Math.PI * 2;            // angle on the record
    var band = Math.random();                        // which groove
    var rr = 0.52 + band * 0.48;                     // normalised radius (annulus)
    var jitter = Math.pow(Math.random(), 2.2);       // clumping toward grooves

    seed[i*4]     = a;
    seed[i*4 + 1] = rr;
    seed[i*4 + 2] = jitter;
    seed[i*4 + 3] = Math.random();

    // A second seed drives the burst direction and the drift.
    var pa = Math.random() * Math.PI * 2;
    var pz = Math.random() * 2 - 1;
    seed2[i*4]     = pa;
    seed2[i*4 + 1] = pz;
    seed2[i*4 + 2] = Math.random();
    seed2[i*4 + 3] = Math.random();
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed',  new THREE.BufferAttribute(seed, 4));
  geo.setAttribute('aSeed2', new THREE.BufferAttribute(seed2, 4));
  // The shader places everything, so three.js cannot infer bounds.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

  var VERT = [
    'attribute vec4 aSeed;',
    'attribute vec4 aSeed2;',
    'uniform float uTime;',
    'uniform float uBurst;',     // 0 = record, 1 = nebula
    'uniform float uPulse;',
    'uniform float uSize;',
    'uniform float uPixelRatio;',
    'uniform vec2  uPointer;',
    'varying float vTone;',
    'varying float vGlow;',

    'const float TAU = 6.2831853;',

    // Cheap hash-based value noise — enough for organic drift, and
    // far cheaper than a real simplex implementation per vertex.
    'float hash(float n){ return fract(sin(n) * 43758.5453123); }',

    'void main(){',
    '  float ang  = aSeed.x;',
    '  float rr   = aSeed.y;',
    '  float jit  = aSeed.z;',
    '  float rnd  = aSeed.w;',

    /* ---- the gathered shape: a record, grooved and warped ---- */
    '  float radius = 6.6 * rr;',
    // Grooves: push particles toward discrete rings.
    '  float groove = sin(rr * 46.0) * 0.055;',
    '  radius += groove;',
    // A slow warp so the disc is never perfectly flat.
    '  float warp = sin(ang * 3.0 + uTime * 0.35) * 0.30 + sin(rr * 8.0 - uTime * 0.5) * 0.22;',
    '  float spin = uTime * 0.30;',
    '  vec3 formed = vec3(',
    '    cos(ang + spin) * radius,',
    '    warp * (0.35 + jit * 0.9) + (rnd - 0.5) * 0.55,',
    '    sin(ang + spin) * radius',
    '  );',
    // The pulse pushes the whole record outward on the beat.
    '  formed.xz *= 1.0 + uPulse * 0.075 * (0.4 + 0.6 * jit);',

    /* ---- the burst: a slow nebula the cloud expands into ---- */
    '  float pa = aSeed2.x, pz = aSeed2.y, pr = aSeed2.z, pd = aSeed2.w;',
    '  float sr = sqrt(max(0.0, 1.0 - pz * pz));',
    '  vec3 dir = vec3(cos(pa) * sr, pz, sin(pa) * sr);',
    '  float reach = 9.0 + pr * 26.0;',
    '  vec3 burst = dir * reach;',
    // Drift so the nebula keeps moving instead of sitting still.
    '  burst.x += sin(uTime * 0.22 + pd * TAU) * 2.2;',
    '  burst.y += cos(uTime * 0.18 + pr * TAU) * 1.8;',
    '  burst.z += sin(uTime * 0.15 + pa) * 2.2;',

    /* Particles do not all leave at once — each has its own
       threshold, so the record dissolves from the edges inward
       instead of snapping. */
    '  float lag = smoothstep(0.0, 1.0, clamp((uBurst - pd * 0.55) / 0.45, 0.0, 1.0));',
    '  vec3 pos = mix(formed, burst, lag);',

    /* ---- pointer repulsion, in world space ---- */
    '  vec2 toP = pos.xz - uPointer * 7.0;',
    '  float d = length(toP);',
    '  pos.xz += normalize(toP + 0.0001) * (1.6 / (1.0 + d * d * 0.35));',

    '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
    '  float dist = -mv.z;',

    /* Colour band: where it sits on the record, plus how far it
       has travelled. Read by the fragment shader as a ramp. */
    '  vTone = fract(ang / TAU + uTime * 0.03 + lag * 0.22 + rr * 0.10 + rnd * 0.02);',
    '  vGlow = (0.35 + 0.65 * jit) * (1.0 - lag * 0.55) * (0.6 + 0.4 * uPulse);',

    '  gl_PointSize = uSize * uPixelRatio * (0.5 + jit * 0.9) / max(dist, 0.001);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform vec3 uA;',   // violet
    'uniform vec3 uB;',   // magenta
    'uniform vec3 uC;',   // cyan
    'uniform vec3 uD;',   // gold
    'uniform float uOpacity;',
    'varying float vTone;',
    'varying float vGlow;',
    'void main(){',
    // Round the square point into a soft dot.
    '  vec2 uv = gl_PointCoord - 0.5;',
    '  float r2 = dot(uv, uv);',
    '  if (r2 > 0.25) discard;',
    '  float fall = 1.0 - smoothstep(0.0, 0.25, r2);',

    /* A four-stop iridescent ramp. Each particle sits somewhere on
       it, so the cloud reads as one continuous spectrum rather
       than four coloured groups. */
    '  float t = vTone * 4.0;',
    '  vec3 col;',
    '  if (t < 1.0)      col = mix(uA, uB, t);',
    '  else if (t < 2.0) col = mix(uB, uC, t - 1.0);',
    '  else if (t < 3.0) col = mix(uC, uD, t - 2.0);',
    '  else              col = mix(uD, uA, t - 3.0);',

    /* Each particle contributes very little. Hundreds overlap in
       the bright grooves, and additive blending sums them — at a
       higher per-particle alpha that sum clips to white and the
       whole ramp disappears into grey. */
    '  float a = fall * fall * vGlow * uOpacity * 0.10;',
    '  if (a < 0.004) discard;',
    /* Push saturation before it is summed: additive blending
       washes hue out toward white, so the colour going in has to
       be more saturated than the colour you want coming out. */
    '  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.45);',
    '  gl_FragColor = vec4(max(col, 0.0) * (1.0 + fall * 2.2), a);',
    '}'
  ].join('\n');

  var PAL = cfg.palette || {};
  var uniforms = {
    uTime:   { value: 0 },
    uBurst:  { value: 0 },
    uPulse:  { value: 0 },
    uSize:   { value: small ? 120 : 105 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uPointer:{ value: new THREE.Vector2(0, 0) },
    uOpacity:{ value: 1 },
    uA: { value: new THREE.Color(PAL.a || '#7C4DFF') },
    uB: { value: new THREE.Color(PAL.b || '#FF3DA6') },
    uC: { value: new THREE.Color(PAL.c || '#35E6E2') },
    uD: { value: new THREE.Color(PAL.d || '#FFC46B') }
  };

  var mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: uniforms,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending
  });

  var cloud = new THREE.Points(geo, mat);
  cloud.frustumCulled = false;
  rig.add(cloud);

  /* ---------- theme -----------------------------------------
     The nebula is additive light, which only exists against a
     dark page. Day mode keeps the same hues but drops the
     brightness so the cloud reads as ink rather than neon. */
  window.__sceneTheme = function(mode){
    var day = (mode === 'day');
    mat.blending = day ? THREE.NormalBlending : THREE.AdditiveBlending;
    uniforms.uOpacity.value = day ? 0.42 : 1;
    mat.needsUpdate = true;
  };
  window.__sceneTheme(document.documentElement.getAttribute('data-theme'));
  document.documentElement.addEventListener('aarti:themechange', function(e){
    var m = e && e.detail && e.detail.mode;
    if (m === 'day' || m === 'night') window.__sceneTheme(m);
  });

  /* ---------- framing --------------------------------------- */
  var quality = 1;
  var resizeTimer = 0;
  function applySize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var liveSmall = w < 760, liveTiny = w <= 420;
    dprCap = liveTiny ? 1 : (liveSmall ? 1.2 : (weak ? 1.25 : 1.6));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap * quality));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }
  function requestResize(){
    // Mobile fires resize on every URL-bar nudge; reallocating the
    // drawing buffer per scroll pixel is its own kind of jank.
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applySize, 140);
  }
  window.addEventListener('resize', requestResize, { passive:true });
  window.addEventListener('orientationchange', requestResize, { passive:true });
  applySize();

  /* ---------- run state ------------------------------------- */
  var visible = true, onScreen = true, running = false;
  document.addEventListener('visibilitychange', function(){
    visible = !document.hidden; if (visible) start();
  });
  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(e){
      onScreen = e[0].isIntersecting; if (onScreen) start();
    }, { threshold: 0 }).observe(canvas);
  }

  var minInterval = (small || weak) ? (1000 / 30) - 1 : 0;

  /* ---------- quality governor ------------------------------
     Points are fill-bound, so the lever that actually helps is
     resolution. Frame cost decides, not a device string. */
  var slowFrames = 0, fastFrames = 0;
  function governor(dt){
    var over  = minInterval ? 42 : 26;
    var under = minInterval ? 30 : 15;
    if (dt > over){ slowFrames++; fastFrames = 0; }
    else if (dt < under){ fastFrames++; slowFrames = 0; }
    if (slowFrames > 45 && quality > 0.55){
      quality = Math.max(0.55, quality - 0.2); slowFrames = 0; applySize();
    } else if (fastFrames > 240 && quality < 1){
      quality = Math.min(1, quality + 0.2); fastFrames = 0; applySize();
    }
  }

  /* ---------- reacting to the page --------------------------
     The gallery announces which effect is in front. The cloud
     answers with a kick that decays over about a second, so
     moving through the rail feels connected to the scene behind
     it rather than happening in front of a loop. */
  var kick = 0;
  document.documentElement.addEventListener('aarti:effect', function(){
    kick = 1;
  });

  /* ---------- render ---------------------------------------- */
  var motion = window.AARTI_MOTION || { x:0, y:0 };
  var progress = window.AARTI_SCROLL || { progress:0, hero:0 };
  var lastOpacity = -1;
  var t0 = performance.now(), prev = t0;
  function smoothstep(t){ return t * t * (3 - 2 * t); }

  function frame(now){
    if (!visible || !onScreen){ running = false; return; }
    requestAnimationFrame(frame);
    var dt = now - prev;
    if (minInterval && dt < minInterval) return;   // keep prev; cadence stays even
    prev = now;
    governor(dt);

    var t = (now - t0) / 1000;
    if (motion && typeof motion.update === 'function') motion.update();

    progress = window.AARTI_SCROLL || progress;
    var p = progress.progress || 0;
    var heroP = progress.hero || 0;

    /* The record holds through the hero, bursts as you leave it,
       and hangs as a nebula for the rest of the page. */
    var burst = smoothstep(Math.min(1, Math.max(0, (heroP - 0.05) / 0.85)));
    uniforms.uBurst.value = burst;
    uniforms.uTime.value = t;
    // Decay is framerate-independent, so a 30fps phone and a
    // 60fps desktop see the same kick over the same wall time.
    if (kick > 0) kick = Math.max(0, kick - dt / 900);
    var beat = Math.pow(Math.sin(t * 1.15) * 0.5 + 0.5, 2.4);
    uniforms.uPulse.value = reduced ? 0.4 : Math.min(1.6, beat + kick * kick * 1.1);
    uniforms.uPointer.value.set(motion.x, motion.y);

    var vis = Math.max(REST, 1 - heroP * 0.42);
    if (Math.abs(vis - lastOpacity) > 0.004){
      canvas.style.opacity = vis.toFixed(3);
      lastOpacity = vis;
    }

    // The camera pulls back and rises, so the disc turns from a
    // ring into a horizon as the page runs on.
    var dist = 14.5 + smoothstep(p) * 15.0;
    var elev = 0.46 + smoothstep(p) * 0.50 - motion.y * 0.12;
    var pan  = motion.x * 0.22 + p * 0.5;

    camera.position.set(
      Math.sin(pan)  * dist * Math.cos(elev),
      Math.sin(elev) * dist + 0.9,
      Math.cos(pan)  * dist * Math.cos(elev)
    );
    camera.lookAt(0, -p * 1.4, 0);

    rig.rotation.z = motion.x * 0.06;
    rig.rotation.x = motion.y * 0.10;

    renderer.render(scene, camera);
  }
  function start(){
    if (running) return;
    running = true; prev = performance.now();
    requestAnimationFrame(frame);
  }
  start();
})();
